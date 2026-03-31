import { LANTERN_COOLDOWN, LANTERN_RADIUS } from '../core/constants'
import { rand } from '../core/utils'

export class Lantern {
  x: number
  y: number
  cooldownTimer: number
  glowPhase: number

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
    this.cooldownTimer = 0
    this.glowPhase = rand(0, Math.PI * 2)
  }

  isReady(): boolean {
    return this.cooldownTimer <= 0
  }

  activate(): void {
    this.cooldownTimer = LANTERN_COOLDOWN
  }

  update(dt: number): void {
    this.glowPhase += dt * 0.02
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= dt
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const r = LANTERN_RADIUS
    const ready = this.isReady()
    const glow = Math.sin(this.glowPhase) * 0.3 + 0.7

    ctx.save()

    // 光の輪（準備完了時のみ）
    if (ready) {
      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r * 3)
      gradient.addColorStop(0, `rgba(255, 220, 80, ${0.25 * glow})`)
      gradient.addColorStop(1, 'rgba(255, 220, 80, 0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(this.x, this.y, r * 3, 0, Math.PI * 2)
      ctx.fill()
    }

    // ランタン本体
    ctx.globalAlpha = ready ? 0.9 : 0.4
    ctx.fillStyle = ready ? `hsl(45, 90%, ${55 + glow * 15}%)` : 'hsl(45, 30%, 35%)'
    ctx.beginPath()
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2)
    ctx.fill()

    // 内側のハイライト
    if (ready) {
      ctx.fillStyle = `rgba(255, 255, 200, ${0.5 * glow})`
      ctx.beginPath()
      ctx.arc(this.x - r * 0.2, this.y - r * 0.2, r * 0.4, 0, Math.PI * 2)
      ctx.fill()
    }

    // クールダウン中はインジケーター表示
    if (!ready) {
      const ratio = this.cooldownTimer / LANTERN_COOLDOWN
      ctx.strokeStyle = 'rgba(255, 220, 80, 0.6)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(this.x, this.y, r + 3, -Math.PI / 2, -Math.PI / 2 + (1 - ratio) * Math.PI * 2)
      ctx.stroke()
    }

    ctx.restore()
  }

  drawCarried(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const r = LANTERN_RADIUS * 0.7
    const ready = this.isReady()
    const glow = Math.sin(this.glowPhase) * 0.3 + 0.7

    ctx.save()

    // 光の輪（準備完了時のみ、小さめ）
    if (ready) {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, r * 2.5)
      gradient.addColorStop(0, `rgba(255, 220, 80, ${0.2 * glow})`)
      gradient.addColorStop(1, 'rgba(255, 220, 80, 0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(x, y, r * 2.5, 0, Math.PI * 2)
      ctx.fill()
    }

    // ランタン本体（小さめ）
    ctx.globalAlpha = ready ? 0.85 : 0.35
    ctx.fillStyle = ready ? `hsl(45, 90%, ${55 + glow * 15}%)` : 'hsl(45, 30%, 35%)'
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()

    // クールダウン中はインジケーター
    if (!ready) {
      const ratio = this.cooldownTimer / LANTERN_COOLDOWN
      ctx.strokeStyle = 'rgba(255, 220, 80, 0.5)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(x, y, r + 2, -Math.PI / 2, -Math.PI / 2 + (1 - ratio) * Math.PI * 2)
      ctx.stroke()
    }

    ctx.restore()
  }
}
