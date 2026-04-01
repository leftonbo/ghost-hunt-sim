import type { GhostType } from '../core/types'
import type { Human } from './Human'
import { Ghost, type GhostConfig } from './Ghost'
import {
  GHOST_WOBBLE_AMPLITUDE,
  GHOST_WOBBLE_SPEED,
  FERAL_DASH_DURATION,
  FERAL_DASH_COOLDOWN,
  FERAL_DASH_RANGE,
  CAPTURE_DISTANCE,
} from '../core/constants'
import { rand, dist, normalize } from '../core/utils'

/** フェラル固有の速度倍率 */
const FERAL_NORMAL_MULTIPLIER = 0.7
const FERAL_DASH_MULTIPLIER = 5

/**
 * ダッシュ中のみ捕食できるフェラルおばけ。
 */
export class FeralGhost extends Ghost {
  override ghostType: GhostType = 'feral'
  dashState: 'ready' | 'dashing' | 'cooldown' = 'ready'
  dashTimer: number = 0
  dashCooldown: number = 0
  dashDirX: number = 0
  dashDirY: number = 0
  dashTrail: { x: number; y: number; alpha: number }[] = []

  /**
   * フェラルおばけを生成する。
   * @param x 初期X座標
   * @param y 初期Y座標
   * @param config 実行時設定
   */
  constructor(x: number, y: number, config?: GhostConfig) {
    super(x, y, config)
    // フェラルは赤系の色
    this.color = `hsl(${rand(340, 370) % 360}, ${rand(60, 80)}%, ${rand(50, 65)}%)`
  }

  /**
   * 現在フレームで捕食可能かを返す。
   */
  override canCapture(): boolean {
    return this.state === 'hunting' && this.dashState === 'dashing'
  }

  /**
   * 狩猟状態の更新を行う。
   * @param humans 現在生存しているニンゲン配列
   * @param dt 経過フレーム時間
   * @param ghosts 全おばけ配列
   */
  override updateHunting(humans: Human[], dt: number, ghosts: Ghost[]): void {
    // ダッシュトレイル更新
    this.dashTrail = this.dashTrail.filter((t) => {
      t.alpha -= 0.05 * dt
      return t.alpha > 0
    })

    const target = this.findNearestHuman(humans)

    switch (this.dashState) {
      case 'ready': {
        if (target) {
          const d = dist(this, target)
          if (d < FERAL_DASH_RANGE && d > CAPTURE_DISTANCE) {
            // ダッシュ開始
            const n = normalize(target.x - this.x, target.y - this.y)
            this.dashDirX = n.x
            this.dashDirY = n.y
            this.dashState = 'dashing'
            this.dashTimer = FERAL_DASH_DURATION
          } else {
            this.moveTowardTarget(target, this.baseSpeed * FERAL_NORMAL_MULTIPLIER, dt)
          }
        } else {
          this.vx *= 0.95
          this.vy *= 0.95
          this.x += this.vx * dt
          this.y += this.vy * dt
        }
        break
      }
      case 'dashing': {
        const dashSpeed = this.baseSpeed * FERAL_DASH_MULTIPLIER
        this.vx = this.dashDirX * dashSpeed
        this.vy = this.dashDirY * dashSpeed
        this.x += this.vx * dt
        this.y += this.vy * dt

        this.dashTrail.push({ x: this.x, y: this.y, alpha: 0.8 })

        this.dashTimer -= dt
        if (this.dashTimer <= 0) {
          this.dashState = 'cooldown'
          this.dashCooldown = FERAL_DASH_COOLDOWN
          this.vx *= 0.2
          this.vy *= 0.2
        }
        break
      }
      case 'cooldown': {
        if (target) {
          this.moveTowardTarget(target, this.baseSpeed * FERAL_NORMAL_MULTIPLIER * 0.5, dt)
        } else {
          this.vx *= 0.95
          this.vy *= 0.95
          this.x += this.vx * dt
          this.y += this.vy * dt
        }
        this.dashCooldown -= dt
        if (this.dashCooldown <= 0) {
          this.dashState = 'ready'
        }
        break
      }
    }

    this.applySeparation(ghosts, dt)
  }

  /**
   * スタン状態の更新を行う。
   * @param dt 経過フレーム時間
   */
  override updateStunned(dt: number): void {
    super.updateStunned(dt)
    if (this.state === 'hunting') {
      // スタン解除後、クールダウンを設定
      this.dashState = 'cooldown'
      this.dashCooldown = FERAL_DASH_COOLDOWN * 0.5
    }
  }

  private moveTowardTarget(target: Human, speed: number, dt: number): void {
    const dx = target.x - this.x
    const dy = target.y - this.y
    const n = normalize(dx, dy)
    const wobble =
      Math.sin(this.wobbleTime * GHOST_WOBBLE_SPEED + this.wobbleOffset) * GHOST_WOBBLE_AMPLITUDE
    const perpX = -n.y
    const perpY = n.x
    this.vx = n.x * speed + perpX * wobble * 0.3
    this.vy = n.y * speed + perpY * wobble * 0.3
    this.x += this.vx * dt
    this.y += this.vy * dt
  }

  /**
   * フェラルおばけ本体を描画する。
   * @param ctx 描画コンテキスト
   * @param time 現在時刻（ms）
   */
  override draw(ctx: CanvasRenderingContext2D, time: number): void {
    // ダッシュトレイル描画（ワールド座標）
    for (const t of this.dashTrail) {
      ctx.save()
      ctx.globalAlpha = t.alpha * 0.3
      ctx.fillStyle = this.color
      ctx.beginPath()
      ctx.arc(t.x, t.y, this.baseRadius * 0.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

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

    // ダッシュ中は速度線
    if (this.dashState === 'dashing') {
      ctx.globalAlpha = this.opacity * 1.2
    }

    // 体（スパイク付き）
    this.drawFeralBody(ctx, r)
    this.drawGlow(ctx, r)
    this.drawDigestingSilhouette(ctx, r, time)
    this.drawFeralFace(ctx, r, scale)

    ctx.restore()
  }

  private drawFeralBody(ctx: CanvasRenderingContext2D, r: number): void {
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(0, -r * 0.15, r, Math.PI, 0, false)

    // スパイク付きの波形スカート
    const spikeCount = 4
    const spikeW = (r * 2) / spikeCount
    const baseY = -r * 0.15 + r * 0.6
    ctx.lineTo(r, baseY)
    for (let i = spikeCount; i > 0; i--) {
      const sx = r - (spikeCount - i) * spikeW - spikeW * 0.5
      const sy = baseY + r * 0.45 // 鋭いスパイク
      const sx2 = r - (spikeCount - i + 1) * spikeW
      ctx.lineTo(sx, sy)
      ctx.lineTo(sx2, baseY)
    }
    ctx.closePath()
    ctx.fill()

    // 頭部のツノ（背中のスパイク）
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.moveTo(-r * 0.5, -r * 0.9)
    ctx.lineTo(-r * 0.35, -r * 1.3)
    ctx.lineTo(-r * 0.15, -r * 0.85)
    ctx.closePath()
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(r * 0.3, -r * 0.95)
    ctx.lineTo(r * 0.5, -r * 1.25)
    ctx.lineTo(r * 0.6, -r * 0.8)
    ctx.closePath()
    ctx.fill()
  }

  private drawFeralFace(ctx: CanvasRenderingContext2D, r: number, scale: number): void {
    const eyeY = -r * 0.3
    const eyeSpacing = r * 0.35
    const eyeR = r * 0.18

    // 怒り目（吊り上がり）
    ctx.fillStyle = '#ff4444'
    ctx.globalAlpha = 0.9 * scale
    ctx.beginPath()
    ctx.ellipse(-eyeSpacing, eyeY, eyeR, eyeR * 0.9, -0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(eyeSpacing, eyeY, eyeR, eyeR * 0.9, 0.2, 0, Math.PI * 2)
    ctx.fill()

    // 瞳（縦長スリット）
    ctx.fillStyle = '#1a0a0e'
    ctx.globalAlpha = 1.0 * scale
    const pupilR = eyeR * 0.4
    ctx.beginPath()
    ctx.ellipse(-eyeSpacing, eyeY, pupilR * 0.4, pupilR * 1.2, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(eyeSpacing, eyeY, pupilR * 0.4, pupilR * 1.2, 0, 0, Math.PI * 2)
    ctx.fill()

    // 牙のある口
    ctx.globalAlpha = 0.8 * scale
    ctx.fillStyle = '#1a0a2e'
    ctx.beginPath()
    const mouthY = eyeY + r * 0.4
    const mouthW = r * 0.35
    ctx.arc(0, mouthY, mouthW, 0, Math.PI)
    ctx.fill()

    // 牙
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.moveTo(-mouthW * 0.6, mouthY)
    ctx.lineTo(-mouthW * 0.4, mouthY + r * 0.2)
    ctx.lineTo(-mouthW * 0.2, mouthY)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(mouthW * 0.2, mouthY)
    ctx.lineTo(mouthW * 0.4, mouthY + r * 0.2)
    ctx.lineTo(mouthW * 0.6, mouthY)
    ctx.fill()
  }
}
