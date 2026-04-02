import type { GhostType } from '../core/types'
import type { Human } from './Human'
import { Ghost, type GhostConfig } from './Ghost'
import {
  GHOST_WOBBLE_AMPLITUDE,
  GHOST_WOBBLE_SPEED,
  HEALTH_DRAIN_RATE,
  MULTI_CAPTURE_DRAIN_MULTIPLIER,
  INVINCIBILITY_DURATION,
  SUCTION_SPEED_MULTIPLIER,
  SUCTION_START_RANGE,
  SUCTION_RANGE,
  SUCTION_CONE_HALF_ANGLE,
  SUCTION_PULL_STRENGTH,
  SUCTION_DURATION,
  SUCTION_COOLDOWN,
  SUCTION_DRAIN_MULTIPLIER,
} from '../core/constants'
import { rand, dist, normalize, angleDiff } from '../core/utils'

/**
 * コーン範囲で複数のニンゲンを吸い込み、同時に消化するおばけ。
 */
export class SuctionGhost extends Ghost {
  override ghostType: GhostType = 'suction'
  isSucking: boolean = false
  suctionTimer: number = 0
  suctionCooldown: number = 0
  suctionAngle: number = 0
  suctionCapturedHumans: Human[] = []

  /**
   * すいこみおばけを生成する。
   * @param x 初期X座標
   * @param y 初期Y座標
   * @param config 実行時設定
   */
  constructor(x: number, y: number, config?: GhostConfig) {
    super(x, y, config)
    // すいこみは紫系の色
    this.color = `hsl(${rand(270, 290)}, ${rand(50, 70)}%, ${rand(45, 60)}%)`
    this.baseRadius *= 1.15
    this.currentRadius = this.baseRadius
    this.targetRadius = this.baseRadius
  }

  /**
   * 現在フレームで捕食可能かを返す。
   */
  override canCapture(): boolean {
    return this.state === 'hunting' || this.state === 'digesting'
  }

  /**
   * 捕食インデックスに応じた生気吸収レートを返す。
   * @param index 捕食リスト内のインデックス（0始まり）
   */
  override getHealthDrainRate(index: number): number {
    const base = HEALTH_DRAIN_RATE * SUCTION_DRAIN_MULTIPLIER
    return index === 0 ? base : base * MULTI_CAPTURE_DRAIN_MULTIPLIER
  }

  /**
   * 狩猟状態の更新を行う。
   * @param humans 現在生存しているニンゲン配列
   * @param dt 経過フレーム時間
   * @param ghosts 全おばけ配列
   */
  override updateHunting(humans: Human[], dt: number, ghosts: Ghost[]): void {
    if (this.isSucking) {
      // 吸い込み中: ほぼ動けない
      this.vx *= 0.9
      this.vy *= 0.9
      this.x += this.vx * dt * 0.1
      this.y += this.vy * dt * 0.1

      // コーン内のニンゲンを引き寄せる
      for (const human of humans) {
        if (human.captured || human.invincibilityTimer > 0) continue
        const dx = human.x - this.x
        const dy = human.y - this.y
        const d = Math.hypot(dx, dy)
        if (d > SUCTION_RANGE || d < 1) continue

        const angle = Math.atan2(dy, dx)
        const diff = Math.abs(angleDiff(angle, this.suctionAngle))
        if (diff > SUCTION_CONE_HALF_ANGLE) continue

        // ニンゲンを引き寄せる
        const pullStrength = SUCTION_PULL_STRENGTH * (1 - d / SUCTION_RANGE) * dt
        human.x -= (dx / d) * pullStrength
        human.y -= (dy / d) * pullStrength
      }

      this.suctionTimer -= dt
      if (this.suctionTimer <= 0) {
        this.isSucking = false
        this.suctionCooldown = SUCTION_COOLDOWN

        // 吸い込んだニンゲンがいれば消化開始
        if (this.suctionCapturedHumans.length > 0) {
          for (const human of this.suctionCapturedHumans) {
            this.capturedHumans.push(human)
          }
          this.suctionCapturedHumans = []
          this.state = 'digesting'
          this.targetRadius =
            this.baseRadius * 1.5 +
            (this.capturedHumans.length - 1) * this.baseRadius * 0.15
        }
      }
    } else {
      // 通常時: ゆっくり移動
      const speed = this.baseSpeed * SUCTION_SPEED_MULTIPLIER
      const target = this.findNearestHuman(humans)

      if (target) {
        const d = dist(this, target)
        if (d < SUCTION_START_RANGE && this.suctionCooldown <= 0) {
          // 吸い込み開始
          this.isSucking = true
          this.suctionTimer = SUCTION_DURATION
          this.suctionAngle = Math.atan2(target.y - this.y, target.x - this.x)
        } else {
          const dx = target.x - this.x
          const dy = target.y - this.y
          const n = normalize(dx, dy)
          const wobble =
            Math.sin(this.wobbleTime * GHOST_WOBBLE_SPEED + this.wobbleOffset) *
            GHOST_WOBBLE_AMPLITUDE
          const perpX = -n.y
          const perpY = n.x
          this.vx = n.x * speed + perpX * wobble * 0.3
          this.vy = n.y * speed + perpY * wobble * 0.3
        }
      } else {
        this.vx *= 0.95
        this.vy *= 0.95
      }
      this.x += this.vx * dt
      this.y += this.vy * dt
      this.suctionCooldown = Math.max(0, this.suctionCooldown - dt)
    }

    this.applySeparation(ghosts, dt)
  }

  /**
   * 吸い込みフェーズを考慮した捕食開始処理を行う。
   * @param human 捕食対象のニンゲン
   */
  override startFeeding(human: Human): void {
    human.captured = true
    human.escapeProgress = 0

    if (this.isSucking) {
      // 吸い込み中: 吸い込みキューに追加、状態は変えない
      this.suctionCapturedHumans.push(human)
      this.targetRadius = this.baseRadius * (1.2 + this.suctionCapturedHumans.length * 0.15)
    } else {
      // 通常の捕食開始（基底の配列管理に委譲）
      this.capturedHumans.push(human)
      if (this.state !== 'digesting') {
        this.state = 'digesting'
      }
      this.targetRadius =
        this.baseRadius * 1.5 + (this.capturedHumans.length - 1) * this.baseRadius * 0.15
    }
  }

  /**
   * 外部スタン時に吸い込み中と消化中のニンゲンを全解放する。
   */
  override stunExternal(): void {
    // 吸い込み中のニンゲンを解放
    for (const human of this.suctionCapturedHumans) {
      human.captured = false
      human.invincibilityTimer = INVINCIBILITY_DURATION
      this.releaseHumanFromBody(human)
    }
    this.suctionCapturedHumans = []
    this.isSucking = false

    // 消化中のニンゲンは基底クラスが解放
    super.stunExternal()
  }

  /**
   * すいこみおばけ本体と吸い込みエフェクトを描画する。
   * @param ctx 描画コンテキスト
   * @param time 現在時刻（ms）
   */
  override draw(ctx: CanvasRenderingContext2D, time: number): void {
    // 吸い込みコーン描画（ワールド座標）
    if (this.isSucking) {
      ctx.save()
      ctx.globalAlpha = 0.08 + Math.sin(time * 0.01) * 0.04
      const gradient = ctx.createRadialGradient(
        this.x,
        this.y,
        this.currentRadius,
        this.x,
        this.y,
        SUCTION_RANGE,
      )
      gradient.addColorStop(0, 'rgba(160, 80, 255, 0.4)')
      gradient.addColorStop(1, 'rgba(160, 80, 255, 0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.moveTo(this.x, this.y)
      ctx.arc(
        this.x,
        this.y,
        SUCTION_RANGE,
        this.suctionAngle - SUCTION_CONE_HALF_ANGLE,
        this.suctionAngle + SUCTION_CONE_HALF_ANGLE,
      )
      ctx.closePath()
      ctx.fill()

      // 吸い込み線パーティクル
      ctx.strokeStyle = 'rgba(200, 150, 255, 0.3)'
      ctx.lineWidth = 1
      for (let i = 0; i < 5; i++) {
        const a =
          this.suctionAngle + rand(-SUCTION_CONE_HALF_ANGLE * 0.8, SUCTION_CONE_HALF_ANGLE * 0.8)
        const startDist =
          SUCTION_RANGE *
          (0.3 + ((time * 0.003 + i * 0.2) % 1) * 0.7) *
          (1 - ((time * 0.003 + i * 0.2) % 1))
        const endDist = startDist * 0.5
        ctx.beginPath()
        ctx.moveTo(this.x + Math.cos(a) * startDist, this.y + Math.sin(a) * startDist)
        ctx.lineTo(this.x + Math.cos(a) * endDist, this.y + Math.sin(a) * endDist)
        ctx.stroke()
      }
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

    // 横に広い体
    this.drawSuctionBody(ctx, r)
    this.drawGlow(ctx, r)
    this.drawDigestingSilhouette(ctx, r, time)
    this.drawSuctionFace(ctx, r, scale)

    ctx.restore()
  }

  private drawSuctionBody(ctx: CanvasRenderingContext2D, r: number): void {
    ctx.fillStyle = this.color
    ctx.beginPath()
    // 横幅を広くした楕円的な体
    ctx.ellipse(0, -r * 0.1, r * 1.1, r * 0.95, 0, Math.PI, 0, false)
    const waveCount = 6
    const waveW = (r * 2.2) / waveCount
    const baseY = -r * 0.1 + r * 0.55
    ctx.lineTo(r * 1.1, baseY)
    for (let i = waveCount; i > 0; i--) {
      const wx = r * 1.1 - (waveCount - i) * waveW - waveW * 0.5
      const wy = baseY + r * 0.25
      const wx2 = r * 1.1 - (waveCount - i + 1) * waveW
      ctx.quadraticCurveTo(wx, wy, wx2, baseY)
    }
    ctx.closePath()
    ctx.fill()
  }

  private drawSuctionFace(ctx: CanvasRenderingContext2D, r: number, scale: number): void {
    // 大きな目
    const eyeY = -r * 0.4
    const eyeSpacing = r * 0.45
    const eyeR = r * 0.2

    ctx.fillStyle = '#ffffff'
    ctx.globalAlpha = 0.9 * scale
    ctx.beginPath()
    ctx.ellipse(-eyeSpacing, eyeY, eyeR, eyeR * 1.3, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(eyeSpacing, eyeY, eyeR, eyeR * 1.3, 0, 0, Math.PI * 2)
    ctx.fill()

    // 瞳
    ctx.fillStyle = '#1a0a2e'
    ctx.globalAlpha = 1.0 * scale
    const pupilR = eyeR * 0.5
    ctx.beginPath()
    ctx.arc(-eyeSpacing, eyeY + pupilR * 0.1, pupilR, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(eyeSpacing, eyeY + pupilR * 0.1, pupilR, 0, Math.PI * 2)
    ctx.fill()

    // 大きな口（吸い込み中は開く）
    ctx.globalAlpha = 0.8 * scale
    const mouthY = eyeY + r * 0.5
    const mouthW = this.isSucking ? r * 0.5 : r * 0.35
    const mouthH = this.isSucking ? r * 0.4 : r * 0.15

    ctx.fillStyle = '#0a0020'
    ctx.beginPath()
    ctx.ellipse(0, mouthY, mouthW, mouthH, 0, 0, Math.PI * 2)
    ctx.fill()

    // 口の内側のグラデーション
    if (this.isSucking) {
      const mouthGlow = ctx.createRadialGradient(0, mouthY, 0, 0, mouthY, mouthW)
      mouthGlow.addColorStop(0, 'rgba(160, 80, 255, 0.5)')
      mouthGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = mouthGlow
      ctx.beginPath()
      ctx.ellipse(0, mouthY, mouthW, mouthH, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
