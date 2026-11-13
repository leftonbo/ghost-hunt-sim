import type { GhostType, Position } from '../core/types'
import {
  HUMAN_FLOCK_RADIUS,
  INVINCIBILITY_DURATION,
  STITCH_CINCH_DURATION,
  STITCH_RADIUS,
  STITCH_SEGMENTS,
  STITCH_SPEED_MULTIPLIER,
  STITCH_START_RANGE,
  WALL_MARGIN,
} from '../core/constants'
import { clamp, dist } from '../core/utils'
import { Ghost } from './Ghost'
import type { Human } from './Human'

interface StitchLoop {
  points: Position[]
  needle: Position
  nextPoint: number
  cinchRemaining: number
  width: number
  height: number
}

/** 赤い糸で群れを囲み、縫い始めに戻った瞬間に内側のニンゲンを布で包むおばけ。 */
export class StitchGhost extends Ghost {
  override ghostType: GhostType = 'stitch'
  override color = '#f2cba6'
  private loop: StitchLoop | null = null
  private justClosed = false
  /** 布で引き寄せているニンゲンと、輪が閉じた瞬間の位置。 */
  private readonly bundledHumans = new Map<Human, Position>()

  /**
   * 群れの位置から縫い始めを決め、閉じた布を絞る。
   * @param humans フィールド上のニンゲン
   * @param dt 経過フレーム数
   * @param time 現在時刻（ms）
   * @param width フィールド幅
   * @param height フィールド高さ
   * @param ghosts フィールド上のおばけ
   */
  override update(
    humans: Human[],
    dt: number,
    time: number,
    width: number,
    height: number,
    ghosts: Ghost[],
  ): void {
    // 輪を閉じた直後は、同じ更新フレーム内で複数人が捕食判定を受ける。
    this.justClosed = false
    const loop = this.loop
    if (
      loop?.cinchRemaining === 0 &&
      (loop.width !== width || loop.height !== height || humans.length === 0)
    ) {
      this.loop = null
    }
    if (!this.loop && this.state === 'hunting') {
      this.loop = this.planLoop(humans, width, height)
    }
    super.update(humans, dt, time, width, height, ghosts)
    // 壁反射後の本体位置を布とニンゲンの共通の引き寄せ先にする。
    if (loop && loop.cinchRemaining > 0 && !this.justClosed) this.cinchLoop(loop, dt)
  }

  private cinchLoop(loop: StitchLoop, dt: number): void {
    loop.cinchRemaining = Math.max(0, loop.cinchRemaining - dt)
    const scale = loop.cinchRemaining / STITCH_CINCH_DURATION
    for (const [human, start] of this.bundledHumans) {
      human.x = this.x + (start.x - this.x) * scale
      human.y = this.y + (start.y - this.y) * scale
    }

    if (loop.cinchRemaining === 0) {
      for (const human of this.bundledHumans.keys()) {
        human.grabbed = false
        super.startFeeding(human)
      }
      this.bundledHumans.clear()
      this.loop = null
    }
  }

  private planLoop(humans: Human[], width: number, height: number): StitchLoop | null {
    const target = this.findNearestHuman(humans)
    if (!target || dist(this, target) > STITCH_START_RANGE) return null

    let x = 0
    let y = 0
    let count = 0
    for (const human of humans) {
      if (dist(target, human) > HUMAN_FLOCK_RADIUS) continue
      x += human.x
      y += human.y
      count++
    }
    const center = { x: x / count, y: y / count }
    const startAngle = Math.atan2(this.y - center.y, this.x - center.x)
    const direction = Math.random() < 0.5 ? -1 : 1
    const points: Position[] = []
    for (let i = 0; i < STITCH_SEGMENTS; i++) {
      const angle = startAngle + (direction * i * 2 * Math.PI) / STITCH_SEGMENTS
      points.push({
        x: clamp(center.x + Math.cos(angle) * STITCH_RADIUS, WALL_MARGIN, width - WALL_MARGIN),
        y: clamp(center.y + Math.sin(angle) * STITCH_RADIUS, WALL_MARGIN, height - WALL_MARGIN),
      })
    }
    points.push(points[0])
    return {
      points,
      needle: { x: this.x, y: this.y },
      nextPoint: 0,
      cinchRemaining: 0,
      width,
      height,
    }
  }

  /**
   * 群れに近づき、縫い始めに着いたら針を各頂点へ順に運ぶ。
   * @param humans フィールド上のニンゲン
   * @param dt 経過フレーム数
   * @param ghosts フィールド上のおばけ
   */
  override updateHunting(humans: Human[], dt: number, ghosts: Ghost[]): void {
    const loop = this.loop
    if (!loop) {
      super.updateHunting(humans, dt, ghosts)
      return
    }
    if (loop.cinchRemaining > 0) return

    let travel = this.baseSpeed * STITCH_SPEED_MULTIPLIER * dt
    while (loop.nextPoint < loop.points.length) {
      const next = loop.points[loop.nextPoint]
      const distance = dist(loop.needle, next)
      if (distance > travel) {
        loop.needle.x += ((next.x - loop.needle.x) / distance) * travel
        loop.needle.y += ((next.y - loop.needle.y) / distance) * travel
        break
      }
      loop.needle.x = next.x
      loop.needle.y = next.y
      travel -= distance
      loop.nextPoint++
    }
    // 壁際では本体だけが壁反射で押し戻される。針先は糸の上に残す。
    this.x = loop.needle.x
    this.y = loop.needle.y
    if (loop.nextPoint === loop.points.length) {
      this.justClosed = true
      loop.cinchRemaining = STITCH_CINCH_DURATION
    }
  }

  /** 同じ輪に入った全員に対し、輪が閉じたフレームだけ捕食を許可する。 */
  override canCapture(): boolean {
    return this.justClosed
  }

  /**
   * ニンゲンの中心が、実際に張った糸の内側にあるかを判定する。
   * @param human 判定対象のニンゲン
   */
  override checkCapture(human: Human): boolean {
    if (!this.loop || !this.justClosed || human.grabbed) return false
    let inside = false
    const points = this.loop.points
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]
      const b = points[i]
      if (human.y < Math.min(a.y, b.y) || human.y >= Math.max(a.y, b.y)) continue
      const crossingX = a.x + ((human.y - a.y) * (b.x - a.x)) / (b.y - a.y)
      if (human.x < crossingX) inside = !inside
    }
    return inside
  }

  /**
   * ニンゲンを布につなぎ、輪が閉じた位置から引き寄せ始める。
   * @param human 輪の内側にいたニンゲン
   */
  override startFeeding(human: Human): void {
    human.grabbed = true
    this.bundledHumans.set(human, { x: human.x, y: human.y })
  }

  /** 引き寄せ中または消化中のニンゲンが残っているかを返す。 */
  override hasPendingHumans(): boolean {
    return this.bundledHumans.size > 0 || super.hasPendingHumans()
  }

  /** ランタンで糸がほどけたら、引き寄せ途中のニンゲンをその位置で解放する。 */
  override stunExternal(): void {
    for (const human of this.bundledHumans.keys()) {
      human.grabbed = false
      human.invincibilityTimer = INVINCIBILITY_DURATION
      this.escapedHumans.push(human)
    }
    this.bundledHumans.clear()
    this.loop = null
    this.justClosed = false
    super.stunExternal()
  }

  /**
   * 赤い糸と針を描き、輪が閉じたら布を本体へたぐり寄せる。
   * @param ctx 描画コンテキスト
   * @param time 現在時刻（ms）
   */
  override draw(ctx: CanvasRenderingContext2D, time: number): void {
    for (const human of this.bundledHumans.keys()) human.draw(ctx)
    const loop = this.loop
    if (loop && loop.nextPoint > 0) this.drawThread(ctx, loop)
    super.draw(ctx, time)
  }

  private drawThread(ctx: CanvasRenderingContext2D, loop: StitchLoop): void {
    ctx.save()
    const start = loop.points[0]
    const hasBundle = this.bundledHumans.size > 0
    if (loop.cinchRemaining > 0) {
      const scale = loop.cinchRemaining / STITCH_CINCH_DURATION
      ctx.translate(this.x, this.y)
      ctx.scale(scale, scale)
      ctx.translate(-this.x, -this.y)
      if (!hasBundle) ctx.globalAlpha = scale
    }
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    for (let i = 1; i < loop.nextPoint; i++) {
      ctx.lineTo(loop.points[i].x, loop.points[i].y)
    }
    ctx.lineTo(loop.needle.x, loop.needle.y)
    if (loop.cinchRemaining > 0) {
      ctx.closePath()
      if (hasBundle) {
        ctx.fillStyle = 'rgba(239, 94, 110, 0.35)'
        ctx.fill()
      }
    }
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#e94b67'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.strokeStyle = '#ffc3af'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 6])
    ctx.stroke()

    ctx.setLineDash([])
    if (hasBundle) {
      ctx.strokeStyle = 'rgba(255, 210, 186, 0.5)'
      ctx.beginPath()
      for (let i = 2; i < loop.points.length - 1; i += 4) {
        const fold = loop.points[i]
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(fold.x, fold.y)
      }
      ctx.stroke()
    }
    ctx.fillStyle = '#ffb5a4'
    ctx.beginPath()
    ctx.arc(start.x, start.y, 3.5, 0, 2 * Math.PI)
    ctx.fill()
    if (loop.cinchRemaining === 0) {
      const next = loop.points[loop.nextPoint]
      const angle = Math.atan2(next.y - loop.needle.y, next.x - loop.needle.x)
      const length = this.currentRadius * 1.45
      ctx.translate(loop.needle.x, loop.needle.y)
      ctx.rotate(angle)
      ctx.fillStyle = '#eae4e9'
      ctx.beginPath()
      ctx.moveTo(0, -2)
      ctx.lineTo(length, 0)
      ctx.lineTo(0, 2)
      ctx.fill()
    }
    ctx.restore()
  }

  /**
   * 布のおばけにボタンの目と裾の縫い目を描く。
   * @param ctx 描画コンテキスト
   * @param r 本体の半径
   * @param scale 出現スケール
   */
  override drawFace(ctx: CanvasRenderingContext2D, r: number, scale: number): void {
    super.drawFace(ctx, r, scale)
    ctx.fillStyle = '#a8304f'
    ctx.beginPath()
    ctx.arc(-r * 0.35, -r * 0.3, r * 0.25, 0, 2 * Math.PI)
    ctx.fill()
    ctx.strokeStyle = '#ffe6c9'
    ctx.lineWidth = r * 0.075
    ctx.beginPath()
    ctx.moveTo(-r * 0.45, -r * 0.4)
    ctx.lineTo(-r * 0.25, -r * 0.2)
    ctx.moveTo(-r * 0.25, -r * 0.4)
    ctx.lineTo(-r * 0.45, -r * 0.2)
    ctx.stroke()
    ctx.setLineDash([r * 0.19, r * 0.15])
    ctx.strokeStyle = '#98344d'
    ctx.beginPath()
    ctx.moveTo(-r * 0.74, r * 0.55)
    ctx.quadraticCurveTo(0, r * 0.28, r * 0.75, r * 0.45)
    ctx.stroke()
  }
}
