import type { GhostState } from '../core/types'
import type { Human } from './Human'
import {
  GHOST_BASE_SPEED,
  GHOST_BASE_RADIUS,
  GHOST_WOBBLE_AMPLITUDE,
  GHOST_WOBBLE_SPEED,
  GHOST_SEPARATION_RADIUS,
  GHOST_SEPARATION_STRENGTH,
  CAPTURE_DISTANCE,
  DIGESTION_TIME_MIN,
  DIGESTION_TIME_MAX,
  WALL_MARGIN,
} from '../core/constants'
import { rand, dist, normalize, pickGhostColor } from '../core/utils'

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
  digestionTimer: number
  digestionDuration: number
  wobbleOffset: number
  wobbleTime: number
  opacity: number
  spawnScale: number
  mistTimer: number

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
    this.vx = 0
    this.vy = 0
    this.color = pickGhostColor()
    this.baseRadius = GHOST_BASE_RADIUS
    this.currentRadius = GHOST_BASE_RADIUS
    this.targetRadius = GHOST_BASE_RADIUS
    this.state = 'hunting'
    this.digestionTimer = 0
    this.digestionDuration = 0
    this.wobbleOffset = rand(0, Math.PI * 2)
    this.wobbleTime = 0
    this.opacity = rand(0.55, 0.8)
    this.spawnScale = 0
    this.mistTimer = 0
  }

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
      case 'hunting': {
        const target = this.findNearestHuman(humans)
        if (target) {
          const dx = target.x - this.x
          const dy = target.y - this.y
          const n = normalize(dx, dy)
          const speed = GHOST_BASE_SPEED
          // sin波で横揺れ
          const wobble =
            Math.sin(this.wobbleTime * GHOST_WOBBLE_SPEED + this.wobbleOffset) *
            GHOST_WOBBLE_AMPLITUDE
          // 進行方向に垂直な方向にゆらぎ
          const perpX = -n.y
          const perpY = n.x
          this.vx = n.x * speed + perpX * wobble * 0.3
          this.vy = n.y * speed + perpY * wobble * 0.3
        } else {
          // ニンゲンがいない → ゆらゆら浮遊
          this.vx *= 0.95
          this.vy *= 0.95
        }

        // おばけ同士の分離力
        this.applySeparation(ghosts, dt)

        this.x += this.vx * dt
        this.y += this.vy * dt
        break
      }
      case 'digesting': {
        this.digestionTimer -= 16.67 * dt
        // ゆっくり浮遊
        this.x += Math.sin(this.wobbleTime * 1.5 + this.wobbleOffset) * 0.15 * dt
        this.y += Math.cos(this.wobbleTime * 1.2 + this.wobbleOffset * 0.7) * 0.1 * dt

        if (this.digestionTimer <= 0) {
          this.state = 'releasing'
        }
        break
      }
      case 'releasing': {
        // releasing は Simulation 側で処理してすぐ hunting に戻す
        break
      }
    }

    // 壁反射
    this.bounceOffWalls(canvasW, canvasH)
  }

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

  checkCapture(human: Human): boolean {
    return dist(this, human) < CAPTURE_DISTANCE + this.currentRadius * 0.3
  }

  startDigestion(): void {
    this.state = 'digesting'
    this.digestionDuration = rand(DIGESTION_TIME_MIN, DIGESTION_TIME_MAX)
    this.digestionTimer = this.digestionDuration
    this.targetRadius = this.baseRadius * 1.5
  }

  finishDigestion(): void {
    this.state = 'hunting'
    this.targetRadius = this.baseRadius
  }

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

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    const scale = this.spawnScale
    if (scale <= 0) return

    const r = this.currentRadius * scale
    const floatY =
      Math.sin(time * 0.002 + this.wobbleOffset) * GHOST_WOBBLE_AMPLITUDE

    ctx.save()
    ctx.translate(this.x, this.y + floatY)
    ctx.scale(scale, scale)
    ctx.globalAlpha = this.opacity

    // おばけの体（丸い形状 + 下部の波形）
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(0, -r * 0.15, r, Math.PI, 0, false)
    // 下部の波形スカート
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

    // 内部グロウ
    const glow = ctx.createRadialGradient(0, -r * 0.2, 0, 0, -r * 0.2, r * 0.8)
    glow.addColorStop(0, 'rgba(255,255,255,0.15)')
    glow.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(0, -r * 0.2, r * 0.8, 0, Math.PI * 2)
    ctx.fill()

    // 消化中: 内部にニンゲンのシルエット
    if (this.state === 'digesting') {
      const progress = 1 - this.digestionTimer / this.digestionDuration
      const silAlpha = 0.3 * (1 - progress)
      ctx.globalAlpha = silAlpha
      ctx.fillStyle = '#3a2520'
      ctx.beginPath()
      ctx.arc(0, r * 0.05, r * 0.35 * (1 - progress * 0.3), 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = this.opacity
    }

    // 目
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

    // 瞳
    ctx.fillStyle = '#1a0a2e'
    ctx.globalAlpha = 1.0 * scale
    const pupilR = eyeR * 0.5
    ctx.beginPath()
    ctx.arc(-eyeSpacing + pupilR * 0.2, eyeY + pupilR * 0.15, pupilR, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(eyeSpacing + pupilR * 0.2, eyeY + pupilR * 0.15, pupilR, 0, Math.PI * 2)
    ctx.fill()

    // 口（にっこり）
    ctx.globalAlpha = 0.7 * scale
    ctx.strokeStyle = '#1a0a2e'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    const mouthW = r * 0.3
    const mouthY = eyeY + r * 0.4
    ctx.arc(0, mouthY - r * 0.1, mouthW, 0.15 * Math.PI, 0.85 * Math.PI)
    ctx.stroke()

    ctx.restore()
  }
}
