import type { Ghost } from './Ghost'
import type { Lantern } from './Lantern'
import {
  HUMAN_BASE_SPEED,
  HUMAN_VISION_RADIUS,
  HUMAN_FLOCK_RADIUS,
  HUMAN_RADIUS,
  FLOCK_COHESION,
  FLOCK_SEPARATION,
  HUMAN_FLEE_ACCEL,
  HUMAN_FLEE_DODGE,
  HUMAN_ESCAPE_URGENCY_DECAY,
  FLEE_SEPARATION,
  FLEE_COOLDOWN,
  CORNER_ESCAPE_ACCEL_BOOST,
  CORNER_SEPARATION_BOOST,
  CORNER_WALL_OPPOSING_DAMP,
  CORNER_WALL_AVOID_REDUCTION,
  WALL_MARGIN,
  WALL_BOUNCE_BOOST,
  WALL_BOUNCE_JITTER,
  WALL_AVOIDANCE_RADIUS,
  WALL_AVOIDANCE_STRENGTH,
  MAX_HEALTH,
  MAX_STAMINA,
  STAMINA_DRAIN_RATE,
  STAMINA_RECOVERY_RATE,
  FATIGUE_SPEED_MULTIPLIER,
  STRUGGLE_STAMINA_COST,
  ESCAPE_PROGRESS_RATE,
} from '../core/constants'
import { rand, dist, normalize, pickHumanColor } from '../core/utils'

/** ニンゲンの実行時設定 */
export interface HumanConfig {
  humanBaseSpeed: number
  maxHealth: number
  maxStamina: number
  escapeProgressRate: number
}

/**
 * 逃走・疲労・もがき・ランタン所持を管理するニンゲンクラス。
 */
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
  invincibilityTimer: number
  lantern: Lantern | null
  escapeUrgency: number
  corneredness: number
  cfgBaseSpeed: number
  cfgMaxHealth: number
  cfgMaxStamina: number
  cfgEscapeProgressRate: number

  /**
   * ニンゲンを生成する。
   * @param x 初期X座標
   * @param y 初期Y座標
   * @param config 実行時設定
   */
  constructor(x: number, y: number, config?: HumanConfig) {
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
    this.cfgBaseSpeed = config?.humanBaseSpeed ?? HUMAN_BASE_SPEED
    this.cfgMaxHealth = config?.maxHealth ?? MAX_HEALTH
    this.cfgMaxStamina = config?.maxStamina ?? MAX_STAMINA
    this.cfgEscapeProgressRate = config?.escapeProgressRate ?? ESCAPE_PROGRESS_RATE
    this.health = this.cfgMaxHealth
    this.stamina = this.cfgMaxStamina
    this.isFatigued = false
    this.captured = false
    this.grabbed = false
    this.escapeProgress = 0
    this.invincibilityTimer = 0
    this.lantern = null
    this.escapeUrgency = 0
    this.corneredness = 0
  }

  /**
   * 現在の生気に応じた実効スタミナ上限を返す。
   */
  effectiveMaxStamina(): number {
    return this.cfgMaxStamina * (this.health / this.cfgMaxHealth)
  }

  /**
   * ランタンを拾って所持状態にする。
   * @param lantern 拾得するランタン
   */
  pickUpLantern(lantern: Lantern): void {
    this.lantern = lantern
  }

  /**
   * 所持ランタンを手放して返す。
   */
  dropLantern(): Lantern | null {
    const lantern = this.lantern
    this.lantern = null
    return lantern
  }

  /**
   * 捕食中のもがき・スタミナ・疲労状態を更新する。
   * @param dt 経過フレーム時間
   */
  updateCaptured(dt: number): void {
    // スタミナ管理
    const maxSt = this.effectiveMaxStamina()
    if (this.isFatigued) {
      // スタミナ切れ
      this.stamina = Math.min(maxSt, this.stamina + maxSt * STAMINA_RECOVERY_RATE * dt)
      if (this.stamina >= maxSt) {
        this.isFatigued = false
      }
    } else if (!this.isFatigued) {
      // スタミナがある間はもがいて脱出進捗を蓄積
      this.stamina = Math.max(0, this.stamina - STRUGGLE_STAMINA_COST * dt)
      this.escapeProgress += this.cfgEscapeProgressRate * dt

      // 疲労判定
      if (this.stamina <= 0) {
        this.isFatigued = true
      }
    }
  }

  /**
   * ニンゲンの行動状態を更新する。
   * @param ghosts 全おばけ配列
   * @param humans 全ニンゲン配列
   * @param dt 経過フレーム時間
   * @param canvasW キャンバス幅
   * @param canvasH キャンバス高さ
   */
  update(ghosts: Ghost[], humans: Human[], dt: number, canvasW: number, canvasH: number): void {
    // 捕食されている場合は通常の移動をスキップ
    if (this.captured) {
      this.updateCaptured(dt)
      return
    }

    // 舌に掴まれている場合は移動をスキップ（座標はTongueGhostが制御）
    if (this.grabbed) return

    // 無敵タイマー減少
    if (this.invincibilityTimer > 0) {
      this.invincibilityTimer = Math.max(0, this.invincibilityTimer - dt)
    }

    const speedMultiplier = this.isFatigued ? FATIGUE_SPEED_MULTIPLIER : 1.0
    const speed = this.cfgBaseSpeed * speedMultiplier
    this.corneredness = this.computeCorneredness(canvasW, canvasH)

    // おばけ検知
    let fleeVx = 0
    let fleeVy = 0
    let threatened = false
    let maxUrgency = 0

    for (const g of ghosts) {
      const d = dist(this, g)
      if (d < HUMAN_VISION_RADIUS && d > 0) {
        const dx = this.x - g.x
        const dy = this.y - g.y
        const urgency = 1 - d / HUMAN_VISION_RADIUS
        fleeVx += (dx / d) * urgency
        fleeVy += (dy / d) * urgency
        threatened = true
        maxUrgency = Math.max(maxUrgency, urgency)
      }
    }

    // 逃走クールダウン管理
    if (threatened) {
      this.fleeTimer = FLEE_COOLDOWN
      this.escapeUrgency = maxUrgency
    } else {
      this.fleeTimer = Math.max(0, this.fleeTimer - dt)
      this.escapeUrgency = Math.max(0, this.escapeUrgency - HUMAN_ESCAPE_URGENCY_DECAY * dt)
    }
    this.fleeing = this.fleeTimer > 0

    if (this.fleeing) {
      // 逃走（脅威検知中は加速、クールダウン中は慣性で移動）
      if (threatened) {
        const n = normalize(fleeVx, fleeVy)
        const toCenter = normalize(canvasW * 0.5 - this.x, canvasH * 0.5 - this.y)
        const perpX = -n.y
        const perpY = n.x
        let dodgeSign = Math.sign(perpX * toCenter.x + perpY * toCenter.y)
        if (dodgeSign === 0) {
          dodgeSign = Math.sin(this.legPhase * 0.3) >= 0 ? 1 : -1
        }

        const fleeAccel = HUMAN_FLEE_ACCEL * (1 + this.corneredness * CORNER_ESCAPE_ACCEL_BOOST)
        const dodgeAccel = HUMAN_FLEE_DODGE * (0.4 + this.escapeUrgency * 0.6)
        this.vx += (n.x * fleeAccel + perpX * dodgeSign * dodgeAccel) * speed * dt
        this.vy += (n.y * fleeAccel + perpY * dodgeSign * dodgeAccel) * speed * dt
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
    if (this.fleeing && !this.isFatigued && this.invincibilityTimer <= 0) {
      this.stamina = Math.max(0, this.stamina - STAMINA_DRAIN_RATE * dt)
    } else {
      this.stamina = Math.min(maxSt, this.stamina + maxSt * STAMINA_RECOVERY_RATE * dt)
    }

    // 疲労判定
    if (this.stamina <= 0) {
      this.isFatigued = true
    }
    if (this.isFatigued && (this.stamina >= maxSt || this.invincibilityTimer > 0)) {
      this.isFatigued = false
    }

    // 足のアニメ
    const moveSpeed = Math.hypot(this.vx, this.vy)
    this.legPhase += moveSpeed * 0.15 * dt

    // 壁反射
    this.bounceOffWalls(canvasW, canvasH)
  }

  /**
   * 角に追い詰められている度合いを 0〜1 で算出する。
   * @param w キャンバス幅
   * @param h キャンバス高さ
   */
  computeCorneredness(w: number, h: number): number {
    const m = WALL_MARGIN + HUMAN_RADIUS
    const distLeft = Math.max(0, this.x - m)
    const distRight = Math.max(0, w - m - this.x)
    const distTop = Math.max(0, this.y - m)
    const distBottom = Math.max(0, h - m - this.y)

    const nearX =
      1 - Math.min(WALL_AVOIDANCE_RADIUS, Math.min(distLeft, distRight)) / WALL_AVOIDANCE_RADIUS
    const nearY =
      1 - Math.min(WALL_AVOIDANCE_RADIUS, Math.min(distTop, distBottom)) / WALL_AVOIDANCE_RADIUS

    return Math.max(0, Math.min(1, nearX * nearY))
  }

  /**
   * 近接した他ニンゲンとの分離ベクトルを速度に反映する。
   * @param humans 全ニンゲン配列
   * @param dt 経過フレーム時間
   * @param strength 分離力の強さ
   */
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

    const cornerBoost = this.fleeing ? 1 + this.corneredness * CORNER_SEPARATION_BOOST : 1
    this.vx += sepX * strength * cornerBoost * dt
    this.vy += sepY * strength * cornerBoost * dt
  }

  /**
   * 群れ行動（Cohesion / Separation）を適用する。
   * @param humans 全ニンゲン配列
   * @param dt 経過フレーム時間
   */
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

  /**
   * 壁に近づいた際の回避ステアリングを適用する。
   * @param w キャンバス幅
   * @param h キャンバス高さ
   * @param speed 現在の基準速度
   * @param dt 経過フレーム時間
   */
  applyWallAvoidance(w: number, h: number, speed: number, dt: number): void {
    const m = WALL_MARGIN + HUMAN_RADIUS

    const distLeft = this.x - m
    const distRight = w - m - this.x
    const distTop = this.y - m
    const distBottom = h - m - this.y

    let leftStrength = 0
    let rightStrength = 0
    let topStrength = 0
    let bottomStrength = 0

    if (distLeft < WALL_AVOIDANCE_RADIUS && distLeft >= 0) {
      const strength = 1 - distLeft / WALL_AVOIDANCE_RADIUS
      leftStrength = strength * strength
    }
    if (distRight < WALL_AVOIDANCE_RADIUS && distRight >= 0) {
      const strength = 1 - distRight / WALL_AVOIDANCE_RADIUS
      rightStrength = strength * strength
    }
    if (distTop < WALL_AVOIDANCE_RADIUS && distTop >= 0) {
      const strength = 1 - distTop / WALL_AVOIDANCE_RADIUS
      topStrength = strength * strength
    }
    if (distBottom < WALL_AVOIDANCE_RADIUS && distBottom >= 0) {
      const strength = 1 - distBottom / WALL_AVOIDANCE_RADIUS
      bottomStrength = strength * strength
    }

    // 角近傍で相反する回避力が相殺されるのを防ぐ。
    if (leftStrength > 0 && rightStrength > 0) {
      const preferX = this.vx !== 0 ? Math.sign(this.vx) : this.x < w * 0.5 ? 1 : -1
      if (preferX >= 0) {
        rightStrength *= CORNER_WALL_OPPOSING_DAMP
      } else {
        leftStrength *= CORNER_WALL_OPPOSING_DAMP
      }
    }

    if (topStrength > 0 && bottomStrength > 0) {
      const preferY = this.vy !== 0 ? Math.sign(this.vy) : this.y < h * 0.5 ? 1 : -1
      if (preferY >= 0) {
        bottomStrength *= CORNER_WALL_OPPOSING_DAMP
      } else {
        topStrength *= CORNER_WALL_OPPOSING_DAMP
      }
    }

    const avoidVx = leftStrength - rightStrength
    const avoidVy = topStrength - bottomStrength

    let avoidMultiplier = 1
    if (this.fleeing && this.corneredness > 0) {
      const pressure = this.corneredness * (0.4 + this.escapeUrgency * 0.6)
      avoidMultiplier = Math.max(0.25, 1 - pressure * CORNER_WALL_AVOID_REDUCTION)
    }

    this.vx += avoidVx * WALL_AVOIDANCE_STRENGTH * avoidMultiplier * speed * dt
    this.vy += avoidVy * WALL_AVOIDANCE_STRENGTH * avoidMultiplier * speed * dt
  }

  /**
   * 壁衝突時の反射と徘徊角度の再設定を行う。
   * @param w キャンバス幅
   * @param h キャンバス高さ
   */
  bounceOffWalls(w: number, h: number): void {
    const m = WALL_MARGIN + HUMAN_RADIUS
    let hitX = 0
    let hitY = 0

    if (this.x < m) {
      this.x = m
      this.vx = Math.abs(this.vx) * WALL_BOUNCE_BOOST
      hitX = 1
    }
    if (this.x > w - m) {
      this.x = w - m
      this.vx = -Math.abs(this.vx) * WALL_BOUNCE_BOOST
      hitX = -1
    }
    if (this.y < m) {
      this.y = m
      this.vy = Math.abs(this.vy) * WALL_BOUNCE_BOOST
      hitY = 1
    }
    if (this.y > h - m) {
      this.y = h - m
      this.vy = -Math.abs(this.vy) * WALL_BOUNCE_BOOST
      hitY = -1
    }

    if (hitX !== 0 || hitY !== 0) {
      const inward = normalize(hitX, hitY)
      const baseAngle = Math.atan2(inward.y, inward.x)
      const jitter = this.fleeing ? WALL_BOUNCE_JITTER : Math.PI / 3
      this.wanderAngle = rand(baseAngle - jitter, baseAngle + jitter)
    }
  }

  /**
   * ニンゲン本体を描画する。
   * @param ctx 描画コンテキスト
   */
  draw(ctx: CanvasRenderingContext2D): void {
    // 捕食中は描画しない（おばけ側のシルエットとして描画される）
    if (this.captured) return

    const r = HUMAN_RADIUS
    const x = this.x
    const y = this.y
    const legSwing = Math.sin(this.legPhase) * (this.fleeing ? 5 : 3)

    ctx.save()
    // 生気低下で薄くなる + 疲労で更に薄くなる
    const lifeAlpha = 0.5 + 0.5 * (this.health / MAX_HEALTH)
    const fatigueAlpha = this.isFatigued ? 0.6 : 1.0
    // 無敵中は点滅表示
    const invincibleAlpha = this.invincibilityTimer > 0 ? 0.3 + Math.abs(Math.sin(Date.now() * 0.008)) * 0.7 : 1.0
    ctx.globalAlpha = 0.9 * lifeAlpha * fatigueAlpha * invincibleAlpha

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
