import type { GhostType } from '../core/types'
import type { Human } from './Human'
import { Ghost, type GhostConfig } from './Ghost'
import {
  CAPTURE_DISTANCE,
  GHOST_WOBBLE_AMPLITUDE,
  GHOST_WOBBLE_SPEED,
  SMOKE_CLOUD_DURATION,
  SMOKE_CLOUD_RADIUS,
  SMOKE_COOLDOWN,
  SMOKE_DEBUFF_DURATION,
  SMOKE_PROJECTILE_SPEED,
  SMOKE_SPEED_MULTIPLIER,
  SMOKE_THROW_RANGE,
  SMOKE_WEAK_HEALTH_RATIO,
} from '../core/constants'
import { rand, dist, normalize } from '../core/utils'

/**
 * 遠距離の煙幕でニンゲンを弱らせてから捕食するおばけ。
 */
export class SmokeGhost extends Ghost {
  override ghostType: GhostType = 'smoke'
  smokeCooldown: number = 0
  smokeOrbActive: boolean = false
  smokeOrbX: number = 0
  smokeOrbY: number = 0
  smokeOrbTargetX: number = 0
  smokeOrbTargetY: number = 0
  smokeCloudX: number = 0
  smokeCloudY: number = 0
  smokeCloudTimer: number = 0

  /**
   * けむりおばけを生成する。
   * @param x 初期X座標
   * @param y 初期Y座標
   * @param config 実行時設定
   */
  constructor(x: number, y: number, config?: GhostConfig) {
    super(x, y, config)
    this.color = `hsl(${rand(165, 190)}, ${rand(20, 35)}%, ${rand(48, 58)}%)`
    this.baseRadius *= 0.95
    this.currentRadius = this.baseRadius
    this.targetRadius = this.baseRadius
    this.opacity = rand(0.45, 0.65)
    this.smokeCooldown = rand(0, SMOKE_COOLDOWN * 0.5)
  }

  /**
   * 煙で弱らせたニンゲンだけを捕食対象にする。
   * @param human 判定対象のニンゲン
   */
  override checkCapture(human: Human): boolean {
    if (!super.checkCapture(human)) return false
    return this.isWeakened(human)
  }

  /**
   * 煙を浴びた状態を解除して捕食を開始する。
   * @param human 捕食対象のニンゲン
   */
  override startFeeding(human: Human): void {
    human.smokeDebuffTimer = 0
    super.startFeeding(human)
  }

  /**
   * 狩猟状態と煙幕攻撃を更新する。
   * @param humans 現在生存しているニンゲン配列
   * @param dt 経過フレーム時間
   * @param ghosts 全おばけ配列
   */
  override updateHunting(humans: Human[], dt: number, ghosts: Ghost[]): void {
    this.updateSmokeAttack(humans, dt)

    const target = this.findPreferredTarget(humans)
    if (target) {
      const dx = target.x - this.x
      const dy = target.y - this.y
      const n = normalize(dx, dy)
      const speed = this.baseSpeed * SMOKE_SPEED_MULTIPLIER
      const wobble =
        Math.sin(this.wobbleTime * GHOST_WOBBLE_SPEED + this.wobbleOffset) * GHOST_WOBBLE_AMPLITUDE
      const perpX = -n.y
      const perpY = n.x
      this.vx = n.x * speed + perpX * wobble * 0.18
      this.vy = n.y * speed + perpY * wobble * 0.18
    } else {
      this.vx *= 0.95
      this.vy *= 0.95
    }

    this.applySeparation(ghosts, dt)
    this.x += this.vx * dt
    this.y += this.vy * dt
  }

  /**
   * スタン時に煙弾を消す。
   */
  override stunExternal(): void {
    this.smokeOrbActive = false
    this.smokeCloudTimer = 0
    super.stunExternal()
  }

  private updateSmokeAttack(humans: Human[], dt: number): void {
    this.smokeCooldown = Math.max(0, this.smokeCooldown - dt)

    if (this.smokeOrbActive) {
      const dx = this.smokeOrbTargetX - this.smokeOrbX
      const dy = this.smokeOrbTargetY - this.smokeOrbY
      const d = Math.hypot(dx, dy)
      if (d <= SMOKE_PROJECTILE_SPEED * dt || d === 0) {
        this.smokeOrbActive = false
        this.smokeCloudX = this.smokeOrbTargetX
        this.smokeCloudY = this.smokeOrbTargetY
        this.smokeCloudTimer = SMOKE_CLOUD_DURATION
      } else {
        this.smokeOrbX += (dx / d) * SMOKE_PROJECTILE_SPEED * dt
        this.smokeOrbY += (dy / d) * SMOKE_PROJECTILE_SPEED * dt
      }
    }

    if (this.smokeCloudTimer > 0) {
      this.smokeCloudTimer = Math.max(0, this.smokeCloudTimer - dt)
      for (const human of humans) {
        if (human.captured || human.invincibilityTimer > 0) continue
        if (dist({ x: this.smokeCloudX, y: this.smokeCloudY }, human) < SMOKE_CLOUD_RADIUS) {
          human.applySmokeDebuff(SMOKE_DEBUFF_DURATION)
        }
      }
    }

    if (!this.smokeOrbActive && this.smokeCloudTimer <= 0 && this.smokeCooldown <= 0) {
      const target = this.findSmokeTarget(humans)
      if (target) {
        this.throwSmokeOrb(target)
      }
    }
  }

  private findPreferredTarget(humans: Human[]): Human | null {
    let preferred: Human | null = null
    let preferredD = Infinity
    let nearest: Human | null = null
    let nearestD = Infinity

    for (const human of humans) {
      const d = dist(this, human)
      if (this.isWeakened(human) && d < preferredD) {
        preferred = human
        preferredD = d
      }
      if (d < nearestD) {
        nearest = human
        nearestD = d
      }
    }

    return preferred ?? nearest
  }

  private findSmokeTarget(humans: Human[]): Human | null {
    let target: Human | null = null
    let minD = Infinity

    for (const human of humans) {
      if (human.captured || human.invincibilityTimer > 0 || this.isWeakened(human)) continue
      const d = dist(this, human)
      if (d < SMOKE_THROW_RANGE && d > CAPTURE_DISTANCE && d < minD) {
        target = human
        minD = d
      }
    }

    return target
  }

  private throwSmokeOrb(target: Human): void {
    this.smokeOrbActive = true
    this.smokeOrbX = this.x
    this.smokeOrbY = this.y
    this.smokeOrbTargetX = target.x + target.vx * 18
    this.smokeOrbTargetY = target.y + target.vy * 18
    this.smokeCooldown = SMOKE_COOLDOWN
  }

  private isWeakened(human: Human): boolean {
    return (
      human.smokeDebuffTimer > 0 ||
      human.isFatigued ||
      human.health <= human.cfgMaxHealth * SMOKE_WEAK_HEALTH_RATIO
    )
  }

  /**
   * けむりおばけ本体と煙幕を描画する。
   * @param ctx 描画コンテキスト
   * @param time 現在時刻（ms）
   */
  override draw(ctx: CanvasRenderingContext2D, time: number): void {
    this.drawSmokeEffects(ctx, time)

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

    this.drawSmokeBody(ctx, r, time)
    this.drawGlow(ctx, r)
    this.drawDigestingSilhouette(ctx, r, time)
    this.drawSmokeFace(ctx, r, scale)

    ctx.restore()
  }

  private drawSmokeEffects(ctx: CanvasRenderingContext2D, time: number): void {
    if (this.smokeCloudTimer > 0) {
      const lifeRatio = this.smokeCloudTimer / SMOKE_CLOUD_DURATION
      ctx.save()
      const gradient = ctx.createRadialGradient(
        this.smokeCloudX,
        this.smokeCloudY,
        SMOKE_CLOUD_RADIUS * 0.15,
        this.smokeCloudX,
        this.smokeCloudY,
        SMOKE_CLOUD_RADIUS,
      )
      gradient.addColorStop(0, `rgba(135, 165, 150, ${0.22 * lifeRatio})`)
      gradient.addColorStop(1, 'rgba(70, 85, 80, 0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(this.smokeCloudX, this.smokeCloudY, SMOKE_CLOUD_RADIUS, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = 'rgba(170, 195, 180, 0.16)'
      for (let i = 0; i < 7; i++) {
        const angle = time * 0.0008 + i * ((Math.PI * 2) / 7)
        const orbit = SMOKE_CLOUD_RADIUS * (0.25 + (i % 3) * 0.13)
        ctx.beginPath()
        ctx.arc(
          this.smokeCloudX + Math.cos(angle) * orbit,
          this.smokeCloudY + Math.sin(angle * 1.3) * orbit,
          SMOKE_CLOUD_RADIUS * (0.2 + (i % 2) * 0.06),
          0,
          Math.PI * 2,
        )
        ctx.fill()
      }
      ctx.restore()
    }

    if (this.smokeOrbActive) {
      ctx.save()
      ctx.globalAlpha = 0.75
      ctx.fillStyle = 'rgba(165, 200, 180, 0.7)'
      ctx.beginPath()
      ctx.arc(this.smokeOrbX, this.smokeOrbY, 8 + Math.sin(time * 0.02) * 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  private drawSmokeBody(ctx: CanvasRenderingContext2D, r: number, time: number): void {
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.ellipse(0, -r * 0.2, r * 0.85, r * 1.05, 0, Math.PI, 0, false)

    const waveCount = 4
    const waveW = (r * 1.7) / waveCount
    const baseY = r * 0.35
    ctx.lineTo(r * 0.85, baseY)
    for (let i = waveCount; i > 0; i--) {
      const wx = r * 0.85 - (waveCount - i) * waveW - waveW * 0.5
      const wy = baseY + r * (0.45 + Math.sin(time * 0.006 + i) * 0.08)
      const wx2 = r * 0.85 - (waveCount - i + 1) * waveW
      ctx.quadraticCurveTo(wx, wy, wx2, baseY)
    }
    ctx.closePath()
    ctx.fill()

    ctx.globalAlpha *= 0.55
    ctx.fillStyle = 'rgba(225, 245, 235, 0.55)'
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.arc(-r * 0.35 + i * r * 0.35, -r * (0.65 + i * 0.08), r * 0.22, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private drawSmokeFace(ctx: CanvasRenderingContext2D, r: number, scale: number): void {
    const eyeY = -r * 0.35
    const eyeSpacing = r * 0.32
    ctx.globalAlpha = 0.9 * scale
    ctx.fillStyle = '#f4fff8'
    ctx.beginPath()
    ctx.arc(-eyeSpacing, eyeY, r * 0.14, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(eyeSpacing, eyeY, r * 0.14, 0, Math.PI * 2)
    ctx.fill()

    ctx.globalAlpha = 0.75 * scale
    ctx.strokeStyle = '#253530'
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.moveTo(-r * 0.28, eyeY + r * 0.35)
    ctx.quadraticCurveTo(0, eyeY + r * 0.5, r * 0.28, eyeY + r * 0.35)
    ctx.stroke()
  }
}
