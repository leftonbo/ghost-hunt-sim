import type { GhostType } from '../core/types'
import type { Human } from './Human'
import { Ghost } from './Ghost'
import {
  GHOST_BASE_SPEED,
  GHOST_WOBBLE_AMPLITUDE,
  GHOST_WOBBLE_SPEED,
  TONGUE_SPEED_MULTIPLIER,
  TONGUE_RANGE,
  TONGUE_EXTEND_SPEED,
  TONGUE_HOMING_STRENGTH,
  TONGUE_COOLDOWN,
  TONGUE_TIP_CAPTURE_DIST,
  TONGUE_REEL_SPEED,
} from '../core/constants'
import { rand, dist, normalize } from '../core/utils'

export class TongueGhost extends Ghost {
  override ghostType: GhostType = 'tongue'
  tongueState: 'idle' | 'extending' | 'retracting' = 'idle'
  tongueTipX: number = 0
  tongueTipY: number = 0
  tongueDirX: number = 0
  tongueDirY: number = 0
  tongueTargetHuman: Human | null = null
  tongueGrabbedHuman: Human | null = null
  tongueCooldown: number = 0

  constructor(x: number, y: number) {
    super(x, y)
    // べろべろは緑系の色
    this.color = `hsl(${rand(100, 140)}, ${rand(50, 70)}%, ${rand(50, 65)}%)`
  }

  override canCapture(): boolean {
    return this.tongueGrabbedHuman !== null && this.state === 'hunting'
  }

  override checkCapture(human: Human): boolean {
    return this.tongueGrabbedHuman === human
  }

  // ランタンの光が舌にも当たる
  override isInRange(sourceX: number, sourceY: number, radius: number): boolean {
    if (super.isInRange(sourceX, sourceY, radius)) return true
    if (this.tongueState !== 'idle') {
      const dx = sourceX - this.tongueTipX
      const dy = sourceY - this.tongueTipY
      return Math.hypot(dx, dy) < radius
    }
    return false
  }

  override startFeeding(human: Human): void {
    human.grabbed = false
    super.startFeeding(human)
    this.tongueGrabbedHuman = null
    this.tongueState = 'idle'
    this.tongueTargetHuman = null
    this.tongueCooldown = TONGUE_COOLDOWN
  }

  override updateHunting(humans: Human[], dt: number, ghosts: Ghost[]): void {
    const speed = GHOST_BASE_SPEED * TONGUE_SPEED_MULTIPLIER

    // 舌の状態更新
    switch (this.tongueState) {
      case 'idle': {
        // クールダウン
        this.tongueCooldown = Math.max(0, this.tongueCooldown - dt)

        // ターゲット探索
        const target = this.findNearestHuman(humans)
        if (target && this.tongueCooldown <= 0) {
          const d = dist(this, target)
          if (d < TONGUE_RANGE && d > TONGUE_TIP_CAPTURE_DIST) {
            // 舌を伸ばす
            this.tongueState = 'extending'
            this.tongueTargetHuman = target
            this.tongueTipX = this.x
            this.tongueTipY = this.y
            const n = normalize(target.x - this.x, target.y - this.y)
            this.tongueDirX = n.x
            this.tongueDirY = n.y
          }
        }

        // 通常移動
        if (target) {
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
        } else {
          this.vx *= 0.95
          this.vy *= 0.95
        }
        this.x += this.vx * dt
        this.y += this.vy * dt
        break
      }
      case 'extending': {
        // 舌を伸ばし中は減速
        this.vx *= 0.9
        this.vy *= 0.9
        this.x += this.vx * dt * 0.3
        this.y += this.vy * dt * 0.3

        // ターゲットが捕獲済みなら舌を引っ込める
        if (this.tongueTargetHuman && this.tongueTargetHuman.captured) {
          this.tongueState = 'retracting'
          this.tongueTargetHuman = null
          break
        }

        // 舌先をターゲット方向にホーミング
        if (this.tongueTargetHuman) {
          const dx = this.tongueTargetHuman.x - this.tongueTipX
          const dy = this.tongueTargetHuman.y - this.tongueTipY
          const d = Math.hypot(dx, dy)
          if (d > 0) {
            this.tongueDirX += (dx / d) * TONGUE_HOMING_STRENGTH * dt
            this.tongueDirY += (dy / d) * TONGUE_HOMING_STRENGTH * dt
            const len = Math.hypot(this.tongueDirX, this.tongueDirY)
            if (len > 0) {
              this.tongueDirX /= len
              this.tongueDirY /= len
            }
          }
        }

        // 舌先を伸ばす
        this.tongueTipX += this.tongueDirX * TONGUE_EXTEND_SPEED * dt
        this.tongueTipY += this.tongueDirY * TONGUE_EXTEND_SPEED * dt

        // ニンゲンに当たったか判定
        for (const human of humans) {
          if (human.captured || human.grabbed) continue
          if (dist({ x: this.tongueTipX, y: this.tongueTipY }, human) < TONGUE_TIP_CAPTURE_DIST) {
            this.tongueGrabbedHuman = human
            human.grabbed = true
            this.tongueState = 'retracting'
            this.tongueTargetHuman = null
            break
          }
        }

        // 最大射程判定
        const tongueLength = dist(this, { x: this.tongueTipX, y: this.tongueTipY })
        if (tongueLength > TONGUE_RANGE) {
          this.tongueState = 'retracting'
          this.tongueTargetHuman = null
        }
        break
      }
      case 'retracting': {
        // 掴んだニンゲンが他のおばけに捕食された場合はリセット
        if (this.tongueGrabbedHuman && this.tongueGrabbedHuman.captured) {
          this.tongueGrabbedHuman.grabbed = false
          this.tongueGrabbedHuman = null
        }

        // 舌を引っ込める
        const dx = this.x - this.tongueTipX
        const dy = this.y - this.tongueTipY
        const d = Math.hypot(dx, dy)
        if (d < TONGUE_TIP_CAPTURE_DIST) {
          // 舌が戻った
          this.tongueState = 'idle'
          if (!this.tongueGrabbedHuman) {
            this.tongueCooldown = TONGUE_COOLDOWN
          }
          // tongueGrabbedHuman がいれば canCapture() が true になり
          // Simulation の捕食判定で処理される
        } else {
          // ニンゲンを掴んでいる場合は引き寄せ速度（遅め）
          const retractSpeed = this.tongueGrabbedHuman
            ? TONGUE_REEL_SPEED
            : TONGUE_EXTEND_SPEED * 1.5
          this.tongueTipX += (dx / d) * retractSpeed * dt
          this.tongueTipY += (dy / d) * retractSpeed * dt

          // 掴んだニンゲンを舌先に追従させる
          if (this.tongueGrabbedHuman) {
            this.tongueGrabbedHuman.x = this.tongueTipX
            this.tongueGrabbedHuman.y = this.tongueTipY
          }
        }

        // 移動は停止
        this.vx *= 0.9
        this.vy *= 0.9
        this.x += this.vx * dt * 0.2
        this.y += this.vy * dt * 0.2
        break
      }
    }

    this.applySeparation(ghosts, dt)
  }

  override stunExternal(): void {
    // 掴んだニンゲンを解放
    if (this.tongueGrabbedHuman) {
      this.tongueGrabbedHuman.grabbed = false
    }
    // 舌をリセット
    this.tongueState = 'idle'
    this.tongueTargetHuman = null
    this.tongueGrabbedHuman = null
    this.tongueCooldown = TONGUE_COOLDOWN
    super.stunExternal()
  }

  override draw(ctx: CanvasRenderingContext2D, time: number): void {
    const scale = this.spawnScale
    if (scale <= 0) return

    // 舌の描画（ワールド座標）
    if (this.tongueState !== 'idle') {
      const floatY = Math.sin(time * 0.002 + this.wobbleOffset) * GHOST_WOBBLE_AMPLITUDE
      ctx.save()
      ctx.globalAlpha = 0.9

      // 舌本体
      ctx.strokeStyle = '#ff6688'
      ctx.lineWidth = 5
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(this.x, this.y + floatY)

      // 舌のうねり
      const midX = (this.x + this.tongueTipX) / 2
      const midY = (this.y + floatY + this.tongueTipY) / 2
      const waveOffset = Math.sin(time * 0.01) * 8
      ctx.quadraticCurveTo(midX + waveOffset, midY - waveOffset, this.tongueTipX, this.tongueTipY)
      ctx.stroke()

      // 舌先（丸い）
      ctx.fillStyle = '#ff4466'
      ctx.beginPath()
      ctx.arc(this.tongueTipX, this.tongueTipY, 6, 0, Math.PI * 2)
      ctx.fill()

      // 掴んだニンゲンの表示
      if (this.tongueGrabbedHuman) {
        ctx.fillStyle = 'rgba(255, 200, 100, 0.6)'
        ctx.beginPath()
        ctx.arc(this.tongueTipX, this.tongueTipY, 8, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.restore()
    }

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
    this.drawTongueFace(ctx, r, scale)

    ctx.restore()
  }

  private drawTongueFace(ctx: CanvasRenderingContext2D, r: number, scale: number): void {
    // ぐるぐる目
    const eyeY = -r * 0.3
    const eyeSpacing = r * 0.35
    const eyeR = r * 0.2

    ctx.fillStyle = '#ffffff'
    ctx.globalAlpha = 0.9 * scale
    ctx.beginPath()
    ctx.arc(-eyeSpacing, eyeY, eyeR, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(eyeSpacing, eyeY, eyeR, 0, Math.PI * 2)
    ctx.fill()

    // 螺旋の瞳
    ctx.strokeStyle = '#1a2e0a'
    ctx.lineWidth = 1.5
    ctx.globalAlpha = 0.8 * scale
    for (const xOff of [-eyeSpacing, eyeSpacing]) {
      ctx.beginPath()
      const spiralR = eyeR * 0.6
      for (let t = 0; t < Math.PI * 3; t += 0.3) {
        const sr = (spiralR * t) / (Math.PI * 3)
        const sx = xOff + Math.cos(t) * sr
        const sy = eyeY + Math.sin(t) * sr
        if (t === 0) ctx.moveTo(sx, sy)
        else ctx.lineTo(sx, sy)
      }
      ctx.stroke()
    }

    // 舌が出てる口
    const mouthY = eyeY + r * 0.4
    ctx.globalAlpha = 0.8 * scale
    ctx.fillStyle = '#1a0a2e'
    ctx.beginPath()
    ctx.ellipse(0, mouthY, r * 0.25, r * 0.2, 0, 0, Math.PI * 2)
    ctx.fill()

    // 口から出てる短い舌（舌が伸びていないとき）
    if (this.tongueState === 'idle') {
      ctx.fillStyle = '#ff6688'
      ctx.beginPath()
      ctx.ellipse(0, mouthY + r * 0.15, r * 0.1, r * 0.12, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
