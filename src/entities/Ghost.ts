import type { GhostState, GhostType } from '../core/types'
import type { Human } from './Human'
import {
  GHOST_BASE_SPEED,
  GHOST_BASE_RADIUS,
  GHOST_WOBBLE_AMPLITUDE,
  GHOST_WOBBLE_SPEED,
  GHOST_SEPARATION_RADIUS,
  GHOST_SEPARATION_STRENGTH,
  CAPTURE_DISTANCE,
  HEALTH_DRAIN_RATE,
  MULTI_CAPTURE_DRAIN_MULTIPLIER,
  ESCAPE_THRESHOLD,
  STUN_DURATION,
  INVINCIBILITY_DURATION,
  WALL_MARGIN,
} from '../core/constants'
import { rand, dist, normalize, pickGhostColor } from '../core/utils'

/** おばけの実行時設定 */
export interface GhostConfig {
  ghostBaseSpeed: number
}

/**
 * すべてのおばけ種別の基底となるクラス。
 */
export class Ghost {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  baseRadius: number
  currentRadius: number
  targetRadius: number
  state: GhostState
  ghostType: GhostType
  capturedHumans: Human[]
  convertedHumans: Human[]
  escapedHumans: Human[]
  stunTimer: number
  wobbleOffset: number
  wobbleTime: number
  opacity: number
  spawnScale: number
  mistTimer: number
  baseSpeed: number

  /**
   * おばけを生成する。
   * @param x 初期X座標
   * @param y 初期Y座標
   * @param config 実行時設定
   */
  constructor(x: number, y: number, config?: GhostConfig) {
    this.x = x
    this.y = y
    this.vx = 0
    this.vy = 0
    this.color = pickGhostColor()
    this.baseRadius = GHOST_BASE_RADIUS
    this.currentRadius = GHOST_BASE_RADIUS
    this.targetRadius = GHOST_BASE_RADIUS
    this.state = 'hunting'
    this.ghostType = 'normal'
    this.capturedHumans = []
    this.convertedHumans = []
    this.escapedHumans = []
    this.stunTimer = 0
    this.wobbleOffset = rand(0, Math.PI * 2)
    this.wobbleTime = 0
    this.opacity = rand(0.55, 0.8)
    this.spawnScale = 0
    this.mistTimer = 0
    this.baseSpeed = config?.ghostBaseSpeed ?? GHOST_BASE_SPEED
  }

  /**
   * おばけの状態更新を行う。
   * @param humans 現在生存しているニンゲン配列
   * @param dt 経過フレーム時間
   * @param _time 現在時刻（未使用）
   * @param canvasW キャンバス幅
   * @param canvasH キャンバス高さ
   * @param ghosts 全おばけ配列
   */
  update(
    humans: Human[],
    dt: number,
    _time: number,
    canvasW: number,
    canvasH: number,
    ghosts: Ghost[],
  ): void {
    this.wobbleTime += dt * 0.016

    // 出現アニメーション
    if (this.spawnScale < 1) {
      this.spawnScale = Math.min(1, this.spawnScale + 0.04 * dt)
    }

    // 半径の補間
    this.currentRadius += (this.targetRadius - this.currentRadius) * 0.08 * dt

    switch (this.state) {
      case 'hunting':
        this.updateHunting(humans, dt, ghosts)
        break
      case 'digesting':
        this.updateDigesting(dt)
        break
      case 'stunned':
        this.updateStunned(dt)
        break
    }

    // 壁反射
    this.bounceOffWalls(canvasW, canvasH)
  }

  /**
   * 狩猟状態の更新を行う。
   * @param humans 現在生存しているニンゲン配列
   * @param dt 経過フレーム時間
   * @param ghosts 全おばけ配列
   */
  updateHunting(humans: Human[], dt: number, ghosts: Ghost[]): void {
    const target = this.findNearestHuman(humans)
    if (target) {
      const dx = target.x - this.x
      const dy = target.y - this.y
      const n = normalize(dx, dy)
      const speed = this.baseSpeed
      const wobble =
        Math.sin(this.wobbleTime * GHOST_WOBBLE_SPEED + this.wobbleOffset) * GHOST_WOBBLE_AMPLITUDE
      const perpX = -n.y
      const perpY = n.x
      this.vx = n.x * speed + perpX * wobble * 0.3
      this.vy = n.y * speed + perpY * wobble * 0.3
    } else {
      this.vx *= 0.95
      this.vy *= 0.95
    }
    this.applySeparation(ghosts, dt)
    this.x += this.vx * dt
    this.y += this.vy * dt
  }

  /**
   * 消化状態の更新を行う。
   * @param dt 経過フレーム時間
   */
  updateDigesting(dt: number): void {
    let hadEscape = false
    for (let i = this.capturedHumans.length - 1; i >= 0; i--) {
      const human = this.capturedHumans[i]
      human.health -= this.getHealthDrainRate(i) * dt
      human.updateCaptured(dt)

      if (human.escapeProgress >= ESCAPE_THRESHOLD) {
        // 脱出成功
        human.captured = false
        human.invincibilityTimer = INVINCIBILITY_DURATION
        this.releaseHumanFromBody(human)
        this.capturedHumans.splice(i, 1)
        hadEscape = true
        continue
      }

      if (human.health <= 0) {
        human.health = 0
        this.capturedHumans.splice(i, 1)
        this.convertedHumans.push(human)
      }
    }

    if (this.capturedHumans.length === 0) {
      if (hadEscape) {
        this.state = 'stunned'
        this.stunTimer = STUN_DURATION
      } else {
        this.state = 'hunting'
      }
      this.targetRadius = this.baseRadius
    } else {
      this.targetRadius =
        this.baseRadius * 1.5 + (this.capturedHumans.length - 1) * this.baseRadius * 0.15
    }

    this.x += Math.sin(this.wobbleTime * 1.5 + this.wobbleOffset) * 0.15 * dt
    this.y += Math.cos(this.wobbleTime * 1.2 + this.wobbleOffset * 0.7) * 0.1 * dt
  }

  /**
   * スタン状態の更新を行う。
   * @param dt 経過フレーム時間
   */
  updateStunned(dt: number): void {
    this.vx = 0
    this.vy = 0
    this.stunTimer -= dt
    if (this.stunTimer <= 0) {
      this.state = 'hunting'
    }
  }

  /**
   * 最寄りのニンゲンを検索する。
   * @param humans 現在生存しているニンゲン配列
   */
  findNearestHuman(humans: Human[]): Human | null {
    let nearest: Human | null = null
    let minD = Infinity
    for (const h of humans) {
      const d = dist(this, h)
      if (d < minD) {
        minD = d
        nearest = h
      }
    }
    return nearest
  }

  /**
   * 現在フレームで捕食可能かを返す。
   */
  canCapture(): boolean {
    return this.state === 'hunting' || this.state === 'digesting'
  }

  /**
   * 指定したニンゲンが捕食距離内か判定する。
   * @param human 判定対象のニンゲン
   */
  checkCapture(human: Human): boolean {
    return dist(this, human) < CAPTURE_DISTANCE + this.currentRadius * 0.3
  }

  /**
   * 指定した中心座標・半径の範囲内にいるか判定する。
   * @param sourceX 判定中心X座標
   * @param sourceY 判定中心Y座標
   * @param radius 判定半径
   */
  isInRange(sourceX: number, sourceY: number, radius: number): boolean {
    const dx = sourceX - this.x
    const dy = sourceY - this.y
    return Math.hypot(dx, dy) < radius
  }

  /**
   * 捕食を開始して消化状態へ遷移する。
   * @param human 捕食対象のニンゲン
   */
  startFeeding(human: Human): void {
    human.captured = true
    human.escapeProgress = 0
    this.capturedHumans.push(human)
    if (this.state !== 'digesting') {
      this.state = 'digesting'
    }
    this.targetRadius =
      this.baseRadius * 1.5 + (this.capturedHumans.length - 1) * this.baseRadius * 0.15
  }

  /**
   * 指定したニンゲンをランダム方向にはじき出す。
   * @param human 解放対象のニンゲン
   */
  releaseHumanFromBody(human: Human): void {
    const angle = rand(0, Math.PI * 2)
    const escapeDist = this.currentRadius + 10
    human.x = this.x + Math.cos(angle) * escapeDist
    human.y = this.y + Math.sin(angle) * escapeDist
    human.vx = Math.cos(angle) * 3
    human.vy = Math.sin(angle) * 3
    this.escapedHumans.push(human)
  }

  /**
   * 捕食インデックスに応じた生気吸収レートを返す。
   * @param index 捕食リスト内のインデックス（0始まり）
   */
  getHealthDrainRate(index: number): number {
    return index === 0 ? HEALTH_DRAIN_RATE : HEALTH_DRAIN_RATE * MULTI_CAPTURE_DRAIN_MULTIPLIER
  }

  /**
   * ランタンなど外部要因によるスタン処理を行う。
   */
  stunExternal(): void {
    // 消化中の場合、全ニンゲンを吐き出す
    for (const human of this.capturedHumans) {
      human.captured = false
      human.invincibilityTimer = INVINCIBILITY_DURATION
      this.releaseHumanFromBody(human)
    }
    this.capturedHumans = []
    this.state = 'stunned'
    this.stunTimer = STUN_DURATION
    this.targetRadius = this.baseRadius
  }

  /**
   * 変換済みニンゲンをクリアし、まだ消化中のニンゲンがいなければ通常状態へ戻す。
   */
  finishDigestion(): void {
    this.convertedHumans = []
    if (this.capturedHumans.length === 0) {
      this.state = 'hunting'
      this.targetRadius = this.baseRadius
    }
  }

  /**
   * 他のおばけとの分離ベクトルを速度に反映する。
   * @param ghosts 全おばけ配列
   * @param dt 経過フレーム時間
   */
  applySeparation(ghosts: Ghost[], dt: number): void {
    let sepX = 0
    let sepY = 0
    for (const other of ghosts) {
      if (other === this) continue
      const d = dist(this, other)
      if (d < GHOST_SEPARATION_RADIUS && d > 0) {
        sepX += (this.x - other.x) / d
        sepY += (this.y - other.y) / d
      }
    }
    this.vx += sepX * GHOST_SEPARATION_STRENGTH * dt
    this.vy += sepY * GHOST_SEPARATION_STRENGTH * dt
  }

  /**
   * 壁との衝突を処理して速度を反射させる。
   * @param w キャンバス幅
   * @param h キャンバス高さ
   */
  bounceOffWalls(w: number, h: number): void {
    const m = WALL_MARGIN + this.currentRadius
    if (this.x < m) {
      this.x = m
      this.vx = Math.abs(this.vx) * 0.5
    }
    if (this.x > w - m) {
      this.x = w - m
      this.vx = -Math.abs(this.vx) * 0.5
    }
    if (this.y < m) {
      this.y = m
      this.vy = Math.abs(this.vy) * 0.5
    }
    if (this.y > h - m) {
      this.y = h - m
      this.vy = -Math.abs(this.vy) * 0.5
    }
  }

  /**
   * おばけ本体を描画する。
   * @param ctx 描画コンテキスト
   * @param time 現在時刻（ms）
   */
  draw(ctx: CanvasRenderingContext2D, time: number): void {
    const scale = this.spawnScale
    if (scale <= 0) return

    const r = this.currentRadius * scale
    const floatY = Math.sin(time * 0.002 + this.wobbleOffset) * GHOST_WOBBLE_AMPLITUDE

    ctx.save()
    ctx.translate(this.x, this.y + floatY)
    ctx.scale(scale, scale)

    if (this.state === 'stunned') {
      ctx.globalAlpha = this.opacity * (0.3 + Math.abs(Math.sin(time * 0.008)) * 0.5)
    } else {
      ctx.globalAlpha = this.opacity
    }

    this.drawBody(ctx, r)
    this.drawGlow(ctx, r)
    this.drawDigestingSilhouette(ctx, r, time)
    this.drawFace(ctx, r, scale)

    ctx.restore()
  }

  /**
   * おばけの体を描画する。
   * @param ctx 描画コンテキスト
   * @param r 現在半径
   */
  drawBody(ctx: CanvasRenderingContext2D, r: number): void {
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(0, -r * 0.15, r, Math.PI, 0, false)
    const waveCount = 5
    const waveW = (r * 2) / waveCount
    const baseY = -r * 0.15 + r * 0.6
    ctx.lineTo(r, baseY)
    for (let i = waveCount; i > 0; i--) {
      const wx = r - (waveCount - i) * waveW - waveW * 0.5
      const wy = baseY + r * 0.3
      const wx2 = r - (waveCount - i + 1) * waveW
      ctx.quadraticCurveTo(wx, wy, wx2, baseY)
    }
    ctx.closePath()
    ctx.fill()
  }

  /**
   * 体の発光グラデーションを描画する。
   * @param ctx 描画コンテキスト
   * @param r 現在半径
   */
  drawGlow(ctx: CanvasRenderingContext2D, r: number): void {
    const glow = ctx.createRadialGradient(0, -r * 0.2, 0, 0, -r * 0.2, r * 0.8)
    glow.addColorStop(0, 'rgba(255,255,255,0.15)')
    glow.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(0, -r * 0.2, r * 0.8, 0, Math.PI * 2)
    ctx.fill()
  }

  /**
   * 消化中のニンゲンシルエットを描画する。
   * @param ctx 描画コンテキスト
   * @param r 現在半径
   * @param time 現在時刻（ms）
   */
  drawDigestingSilhouette(ctx: CanvasRenderingContext2D, r: number, time: number): void {
    if (this.state !== 'digesting' || this.capturedHumans.length === 0) return
    const count = this.capturedHumans.length
    for (let i = 0; i < count; i++) {
      const human = this.capturedHumans[i]
      const lifeRatio = human.health / 100
      const silAlpha = 0.3 * lifeRatio
      const angleOffset = count > 1 ? ((Math.PI * 2) / count) * i : 0
      const spread = count > 1 ? r * 0.2 : 0
      const offsetX = Math.cos(angleOffset) * spread
      const offsetY = Math.sin(angleOffset) * spread
      const struggleShake = !human.isFatigued ? Math.sin(time * 0.02 + i * 1.5) * r * 0.15 : 0
      ctx.globalAlpha = silAlpha
      ctx.fillStyle = '#3a2520'
      ctx.beginPath()
      ctx.arc(
        offsetX + struggleShake,
        r * 0.05 + offsetY,
        r * 0.35 * (0.7 + lifeRatio * 0.3) * (count > 1 ? 0.8 : 1),
        0,
        Math.PI * 2,
      )
      ctx.fill()
    }
    ctx.globalAlpha = this.opacity
  }

  /**
   * おばけの顔を描画する。
   * @param ctx 描画コンテキスト
   * @param r 現在半径
   * @param scale 出現スケール
   */
  drawFace(ctx: CanvasRenderingContext2D, r: number, scale: number): void {
    const eyeY = -r * 0.3
    const eyeSpacing = r * 0.35
    const eyeR = r * 0.18
    ctx.fillStyle = '#ffffff'
    ctx.globalAlpha = 0.9 * scale
    ctx.beginPath()
    ctx.ellipse(-eyeSpacing, eyeY, eyeR, eyeR * 1.2, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(eyeSpacing, eyeY, eyeR, eyeR * 1.2, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#1a0a2e'
    ctx.globalAlpha = 1.0 * scale
    const pupilR = eyeR * 0.5
    ctx.beginPath()
    ctx.arc(-eyeSpacing + pupilR * 0.2, eyeY + pupilR * 0.15, pupilR, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(eyeSpacing + pupilR * 0.2, eyeY + pupilR * 0.15, pupilR, 0, Math.PI * 2)
    ctx.fill()

    ctx.globalAlpha = 0.7 * scale
    ctx.strokeStyle = '#1a0a2e'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    const mouthW = r * 0.3
    const mouthY = eyeY + r * 0.4
    ctx.arc(0, mouthY - r * 0.1, mouthW, 0.15 * Math.PI, 0.85 * Math.PI)
    ctx.stroke()
  }
}
