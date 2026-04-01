import type { Ghost } from './Ghost'
import type { Lantern } from './Lantern'
import {
  HUMAN_BASE_SPEED,
  HUMAN_VISION_RADIUS,
  HUMAN_FLOCK_RADIUS,
  HUMAN_RADIUS,
  FLOCK_COHESION,
  FLOCK_SEPARATION,
  FLEE_SEPARATION,
  FLEE_COOLDOWN,
  WALL_MARGIN,
  WALL_AVOIDANCE_RADIUS,
  WALL_AVOIDANCE_STRENGTH,
  MAX_LIFE_FORCE,
  MAX_STAMINA,
  STAMINA_DRAIN_RATE,
  STAMINA_RECOVERY_RATE,
  FATIGUE_SPEED_MULTIPLIER,
  STRUGGLE_STAMINA_COST,
  ESCAPE_PROGRESS_RATE,
} from '../core/constants'
import { rand, dist, normalize, pickHumanColor } from '../core/utils'

export class Human {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  wanderAngle: number
  wanderTimer: number
  legPhase: number
  fleeing: boolean
  fleeTimer: number
  health: number
  stamina: number
  isFatigued: boolean
  captured: boolean
  grabbed: boolean
  escapeProgress: number
  lantern: Lantern | null

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
    this.vx = rand(-0.5, 0.5)
    this.vy = rand(-0.5, 0.5)
    this.color = pickHumanColor()
    this.wanderAngle = rand(0, Math.PI * 2)
    this.wanderTimer = 0
    this.legPhase = rand(0, Math.PI * 2)
    this.fleeing = false
    this.fleeTimer = 0
    this.health = MAX_LIFE_FORCE
    this.stamina = MAX_STAMINA
    this.isFatigued = false
    this.captured = false
    this.grabbed = false
    this.escapeProgress = 0
    this.lantern = null
  }

  effectiveMaxStamina(): number {
    return MAX_STAMINA * (this.health / MAX_LIFE_FORCE)
  }

  pickUpLantern(lantern: Lantern): void {
    this.lantern = lantern
  }

  dropLantern(): Lantern | null {
    const lantern = this.lantern
    this.lantern = null
    return lantern
  }

  updateCaptured(dt: number): void {
    // スタミナ管理
    const maxSt = this.effectiveMaxStamina()
    if (this.isFatigued) {
      // スタミナ切れ
      this.stamina = Math.min(maxSt, this.stamina + STAMINA_RECOVERY_RATE * dt)
      if (this.stamina >= maxSt) {
        this.isFatigued = false
      }
    } else if (!this.isFatigued) {
      // スタミナがある間はもがいて脱出進捗を蓄積
      this.stamina = Math.max(0, this.stamina - STRUGGLE_STAMINA_COST * dt)
      this.escapeProgress += ESCAPE_PROGRESS_RATE * dt

      // 疲労判定
      if (this.stamina <= 0) {
        this.isFatigued = true
      }
    }
  }

  update(ghosts: Ghost[], humans: Human[], dt: number, canvasW: number, canvasH: number): void {
    // 捕食されている場合は通常の移動をスキップ
    if (this.captured) {
      this.updateCaptured(dt)
      return
    }

    // 舌に掴まれている場合は移動をスキップ（座標はTongueGhostが制御）
    if (this.grabbed) return

    const speedMultiplier = this.isFatigued ? FATIGUE_SPEED_MULTIPLIER : 1.0
    const speed = HUMAN_BASE_SPEED * speedMultiplier

    // おばけ検知
    let fleeVx = 0
    let fleeVy = 0
    let threatened = false

    for (const g of ghosts) {
      const d = dist(this, g)
      if (d < HUMAN_VISION_RADIUS && d > 0) {
        const dx = this.x - g.x
        const dy = this.y - g.y
        const urgency = 1 - d / HUMAN_VISION_RADIUS
        fleeVx += (dx / d) * urgency
        fleeVy += (dy / d) * urgency
        threatened = true
      }
    }

    // 逃走クールダウン管理
    if (threatened) {
      this.fleeTimer = FLEE_COOLDOWN
    } else {
      this.fleeTimer = Math.max(0, this.fleeTimer - dt)
    }
    this.fleeing = this.fleeTimer > 0

    if (this.fleeing) {
      // 逃走（脅威検知中は加速、クールダウン中は慣性で移動）
      if (threatened) {
        const n = normalize(fleeVx, fleeVy)
        this.vx += n.x * speed * 0.3 * dt
        this.vy += n.y * speed * 0.3 * dt
      }
      // 逃走中もニンゲン同士の分離力を適用（固まり防止）
      this.applySeparation(humans, dt, FLEE_SEPARATION)
      // 速度制限
      const currentSpeed = Math.hypot(this.vx, this.vy)
      if (currentSpeed > speed) {
        this.vx = (this.vx / currentSpeed) * speed
        this.vy = (this.vy / currentSpeed) * speed
      }
    } else {
      // ランダム移動 + 群れ行動
      this.wanderTimer -= dt
      if (this.wanderTimer <= 0) {
        this.wanderAngle += rand(-0.8, 0.8)
        this.wanderTimer = rand(30, 90)
      }

      const wanderSpeed = speed * 0.3
      this.vx += Math.cos(this.wanderAngle) * wanderSpeed * 0.05 * dt
      this.vy += Math.sin(this.wanderAngle) * wanderSpeed * 0.05 * dt

      // 群れ行動
      this.applyFlocking(humans, dt)

      // 速度制限（ゆっくり）
      const currentSpeed = Math.hypot(this.vx, this.vy)
      const maxWander = speed * 0.4
      if (currentSpeed > maxWander) {
        this.vx = (this.vx / currentSpeed) * maxWander
        this.vy = (this.vy / currentSpeed) * maxWander
      }
    }

    // 壁回避ステアリング（壁に近づくと離れる方向に力を加える）
    this.applyWallAvoidance(canvasW, canvasH, speed, dt)

    this.x += this.vx * dt
    this.y += this.vy * dt

    // スタミナ管理
    const maxSt = this.effectiveMaxStamina()
    if (this.fleeing && !this.isFatigued) {
      this.stamina = Math.max(0, this.stamina - STAMINA_DRAIN_RATE * dt)
    } else {
      this.stamina = Math.min(maxSt, this.stamina + STAMINA_RECOVERY_RATE * dt)
    }

    // 疲労判定
    if (this.stamina <= 0) {
      this.isFatigued = true
    }
    if (this.isFatigued && this.stamina >= maxSt) {
      this.isFatigued = false
    }

    // 足のアニメ
    const moveSpeed = Math.hypot(this.vx, this.vy)
    this.legPhase += moveSpeed * 0.15 * dt

    // 壁反射
    this.bounceOffWalls(canvasW, canvasH)
  }

  applySeparation(humans: Human[], dt: number, strength: number): void {
    let sepX = 0,
      sepY = 0

    for (const other of humans) {
      if (other === this) continue
      const d = dist(this, other)
      if (d < HUMAN_FLOCK_RADIUS * 0.4 && d > 0) {
        sepX += (this.x - other.x) / d
        sepY += (this.y - other.y) / d
      }
    }

    this.vx += sepX * strength * dt
    this.vy += sepY * strength * dt
  }

  applyFlocking(humans: Human[], dt: number): void {
    let cohX = 0,
      cohY = 0,
      cohCount = 0

    for (const other of humans) {
      if (other === this) continue
      const d = dist(this, other)
      if (d < HUMAN_FLOCK_RADIUS && d > 0) {
        // Cohesion
        cohX += other.x
        cohY += other.y
        cohCount++
      }
    }

    if (cohCount > 0) {
      cohX = cohX / cohCount - this.x
      cohY = cohY / cohCount - this.y
      this.vx += cohX * FLOCK_COHESION * dt
      this.vy += cohY * FLOCK_COHESION * dt
    }

    // Separation
    this.applySeparation(humans, dt, FLOCK_SEPARATION)
  }

  applyWallAvoidance(w: number, h: number, speed: number, dt: number): void {
    const m = WALL_MARGIN + HUMAN_RADIUS
    let avoidVx = 0
    let avoidVy = 0

    const distLeft = this.x - m
    const distRight = w - m - this.x
    const distTop = this.y - m
    const distBottom = h - m - this.y

    if (distLeft < WALL_AVOIDANCE_RADIUS && distLeft >= 0) {
      const strength = 1 - distLeft / WALL_AVOIDANCE_RADIUS
      avoidVx += strength * strength
    }
    if (distRight < WALL_AVOIDANCE_RADIUS && distRight >= 0) {
      const strength = 1 - distRight / WALL_AVOIDANCE_RADIUS
      avoidVx -= strength * strength
    }
    if (distTop < WALL_AVOIDANCE_RADIUS && distTop >= 0) {
      const strength = 1 - distTop / WALL_AVOIDANCE_RADIUS
      avoidVy += strength * strength
    }
    if (distBottom < WALL_AVOIDANCE_RADIUS && distBottom >= 0) {
      const strength = 1 - distBottom / WALL_AVOIDANCE_RADIUS
      avoidVy -= strength * strength
    }

    this.vx += avoidVx * WALL_AVOIDANCE_STRENGTH * speed * dt
    this.vy += avoidVy * WALL_AVOIDANCE_STRENGTH * speed * dt
  }

  bounceOffWalls(w: number, h: number): void {
    const m = WALL_MARGIN + HUMAN_RADIUS
    if (this.x < m) {
      this.x = m
      this.vx = Math.abs(this.vx)
      this.wanderAngle = rand(-Math.PI / 2, Math.PI / 2)
    }
    if (this.x > w - m) {
      this.x = w - m
      this.vx = -Math.abs(this.vx)
      this.wanderAngle = rand(Math.PI / 2, Math.PI * 1.5)
    }
    if (this.y < m) {
      this.y = m
      this.vy = Math.abs(this.vy)
      this.wanderAngle = rand(0, Math.PI)
    }
    if (this.y > h - m) {
      this.y = h - m
      this.vy = -Math.abs(this.vy)
      this.wanderAngle = rand(-Math.PI, 0)
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // 捕食中は描画しない（おばけ側のシルエットとして描画される）
    if (this.captured) return

    const r = HUMAN_RADIUS
    const x = this.x
    const y = this.y
    const legSwing = Math.sin(this.legPhase) * (this.fleeing ? 5 : 3)

    ctx.save()
    // 生気低下で薄くなる + 疲労で更に薄くなる
    const lifeAlpha = 0.5 + 0.5 * (this.health / MAX_LIFE_FORCE)
    const fatigueAlpha = this.isFatigued ? 0.6 : 1.0
    ctx.globalAlpha = 0.9 * lifeAlpha * fatigueAlpha

    // 体
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.ellipse(x, y, r * 0.7, r * 1.0, 0, 0, Math.PI * 2)
    ctx.fill()

    // 頭
    ctx.beginPath()
    ctx.arc(x, y - r * 1.4, r * 0.55, 0, Math.PI * 2)
    ctx.fill()

    // 足
    ctx.strokeStyle = this.color
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x - r * 0.3, y + r * 0.8)
    ctx.lineTo(x - r * 0.3 + legSwing * 0.4, y + r * 1.8)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x + r * 0.3, y + r * 0.8)
    ctx.lineTo(x + r * 0.3 - legSwing * 0.4, y + r * 1.8)
    ctx.stroke()

    // 腕
    const armSwing = legSwing * 0.3
    ctx.beginPath()
    ctx.moveTo(x - r * 0.7, y - r * 0.2)
    ctx.lineTo(x - r * 1.3 - armSwing * 0.3, y + r * 0.5)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x + r * 0.7, y - r * 0.2)
    ctx.lineTo(x + r * 1.3 + armSwing * 0.3, y + r * 0.5)
    ctx.stroke()

    // 目（白い点）
    ctx.fillStyle = '#ffffff'
    ctx.globalAlpha = 0.8
    const eyeSize = r * 0.18
    ctx.beginPath()
    ctx.arc(x - r * 0.2, y - r * 1.5, eyeSize, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x + r * 0.2, y - r * 1.5, eyeSize, 0, Math.PI * 2)
    ctx.fill()

    // 逃走中は汗マーク
    if (this.fleeing) {
      ctx.globalAlpha = 0.6
      ctx.fillStyle = '#88ccff'
      ctx.font = `${r * 1.2}px sans-serif`
      ctx.fillText('💧', x + r * 0.8, y - r * 1.2)
    }

    // 疲労中は疲労マーク
    if (this.isFatigued) {
      ctx.globalAlpha = 0.7
      ctx.fillStyle = '#ffaa44'
      ctx.font = `${r * 1.0}px sans-serif`
      ctx.fillText('💤', x + r * 0.6, y - r * 2.0)
    }

    // ランタン所持表示
    if (this.lantern) {
      this.lantern.drawCarried(ctx, x + r * 1.5, y + r * 0.3)
    }

    ctx.restore()
  }
}
