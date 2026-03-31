import type { ParticleType } from '../core/types'
import { rand } from '../core/utils'

export class Particle {
  x: number
  y: number
  type: ParticleType
  color: string
  life: number
  maxLife: number
  size: number
  vx: number
  vy: number
  decay: number
  maxSize: number
  rotation: number

  constructor(x: number, y: number, type: ParticleType, color?: string) {
    this.x = x
    this.y = y
    this.type = type
    this.color = color || 'rgba(200,180,255,0.3)'
    this.life = 1.0
    this.maxLife = 1.0
    this.size = 4
    this.vx = 0
    this.vy = 0
    this.decay = 0.02
    this.maxSize = 60
    this.rotation = 0

    switch (type) {
      case 'mist':
        this.size = rand(8, 20)
        this.vx = rand(-0.3, 0.3)
        this.vy = rand(-0.5, -0.1)
        this.decay = rand(0.005, 0.015)
        break
      case 'flash':
        this.size = 5
        this.maxSize = 60
        this.decay = 0.06
        break
      case 'star': {
        this.size = rand(3, 6)
        const angle = rand(0, Math.PI * 2)
        const speed = rand(1.5, 4)
        this.vx = Math.cos(angle) * speed
        this.vy = Math.sin(angle) * speed
        this.decay = rand(0.02, 0.04)
        this.rotation = rand(0, Math.PI * 2)
        break
      }
      case 'pop':
        this.size = rand(10, 25)
        this.decay = 0.04
        break
      case 'lantern':
        this.size = 5
        this.maxSize = 120
        this.decay = 0.03
        this.color = color || 'rgba(255, 220, 80, 0.6)'
        break
    }
  }

  update(dt: number): boolean {
    this.life -= this.decay * dt
    this.x += this.vx * dt
    this.y += this.vy * dt

    if (this.type === 'flash') {
      this.size = this.maxSize * (1 - this.life)
    }

    if (this.type === 'lantern') {
      this.size = this.maxSize * (1 - this.life)
    }

    if (this.type === 'star') {
      this.vx *= 1 - 0.02 * dt
      this.vy *= 1 - 0.02 * dt
    }

    return this.life > 0
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.life <= 0) return
    const alpha = Math.max(0, this.life)

    ctx.save()
    switch (this.type) {
      case 'mist': {
        ctx.globalAlpha = alpha * 0.25
        ctx.fillStyle = this.color
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()
        break
      }
      case 'flash': {
        ctx.globalAlpha = alpha * 0.5
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()
        break
      }
      case 'star': {
        ctx.globalAlpha = alpha * 0.9
        ctx.fillStyle = this.color
        ctx.translate(this.x, this.y)
        ctx.rotate(this.rotation)
        // 十字形
        const s = this.size
        ctx.fillRect(-s, -s * 0.25, s * 2, s * 0.5)
        ctx.fillRect(-s * 0.25, -s, s * 0.5, s * 2)
        break
      }
      case 'pop': {
        ctx.globalAlpha = alpha * 0.6
        ctx.strokeStyle = this.color
        ctx.lineWidth = 2
        const r = this.size * (1 + (1 - alpha) * 1.5)
        ctx.beginPath()
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2)
        ctx.stroke()
        break
      }
      case 'lantern': {
        ctx.globalAlpha = alpha * 0.4
        ctx.strokeStyle = this.color
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.stroke()

        // 内側の光
        ctx.globalAlpha = alpha * 0.15
        ctx.fillStyle = this.color
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size * 0.8, 0, Math.PI * 2)
        ctx.fill()
        break
      }
    }
    ctx.restore()
  }
}
