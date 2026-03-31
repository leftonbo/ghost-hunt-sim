import type { GhostMode, SimulationState, UIElements } from '../core/types'
import {
  DEFAULT_GHOST_COUNT,
  DEFAULT_HUMAN_COUNT,
  DEFAULT_LANTERN_COUNT,
  LANTERN_PICKUP_DISTANCE,
  LANTERN_ACTIVATION_DISTANCE,
  LANTERN_STUN_RADIUS,
  LANTERN_INITIAL_CARRY_RATIO,
  BG_COLOR_TOP,
  BG_COLOR_BOTTOM,
} from '../core/constants'
import { rand, randInt, dist, formatTime } from '../core/utils'
import { Ghost } from './Ghost'
import { Human } from './Human'
import { Particle } from './Particle'
import { Lantern } from './Lantern'
import { createGhost, pickGhostType } from './ghost-factory'

export class Simulation {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  ghosts: Ghost[]
  humans: Human[]
  particles: Particle[]
  lanterns: Lantern[]
  state: SimulationState
  elapsedTime: number
  speedMultiplier: number
  lastTimestamp: number
  animFrameId: number | null
  bgGradient: CanvasGradient | null
  ghostCountInit: number
  humanCountInit: number
  lanternCountInit: number
  ghostMode: GhostMode
  width: number
  height: number
  ui: UIElements

  constructor(canvas: HTMLCanvasElement, ui: UIElements) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.ghosts = []
    this.humans = []
    this.particles = []
    this.lanterns = []
    this.state = 'idle'
    this.elapsedTime = 0
    this.speedMultiplier = 1.0
    this.lastTimestamp = 0
    this.animFrameId = null
    this.bgGradient = null

    this.ghostCountInit = DEFAULT_GHOST_COUNT
    this.humanCountInit = DEFAULT_HUMAN_COUNT
    this.lanternCountInit = DEFAULT_LANTERN_COUNT
    this.ghostMode = 'random'

    this.width = 0
    this.height = 0
    this.ui = ui

    this.resize()
  }

  resize(): void {
    const container = this.canvas.parentElement!
    const dpr = window.devicePixelRatio || 1
    const w = container.clientWidth
    const h = container.clientHeight
    this.canvas.width = w * dpr
    this.canvas.height = h * dpr
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.width = w
    this.height = h

    // 背景グラデーション
    this.bgGradient = this.ctx.createLinearGradient(0, 0, 0, h)
    this.bgGradient.addColorStop(0, BG_COLOR_TOP)
    this.bgGradient.addColorStop(1, BG_COLOR_BOTTOM)
  }

  init(): void {
    this.ghosts = []
    this.humans = []
    this.particles = []
    this.lanterns = []
    this.elapsedTime = 0
    this.state = 'idle'

    const margin = 60

    for (let i = 0; i < this.ghostCountInit; i++) {
      const g = createGhost(
        rand(margin, this.width - margin),
        rand(margin, this.height - margin),
        pickGhostType(this.ghostMode),
      )
      g.spawnScale = 1 // 初期配置は即表示
      this.ghosts.push(g)
    }

    for (let i = 0; i < this.humanCountInit; i++) {
      this.humans.push(
        new Human(rand(margin, this.width - margin), rand(margin, this.height - margin)),
      )
    }

    // ランタン生成・配布
    const carryCount = Math.min(
      Math.floor(this.lanternCountInit * LANTERN_INITIAL_CARRY_RATIO),
      this.humans.length,
    )
    const groundCount = this.lanternCountInit - carryCount

    // 一部のニンゲンにランタンを持たせる
    const candidates = [...this.humans]
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = randInt(0, i)
      ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
    }
    for (let i = 0; i < carryCount; i++) {
      candidates[i].pickUpLantern(new Lantern(0, 0))
    }

    // 残りは地面に配置
    for (let i = 0; i < groundCount; i++) {
      this.lanterns.push(
        new Lantern(rand(margin, this.width - margin), rand(margin, this.height - margin)),
      )
    }

    this.updateUI()
    this.drawFrame(0)
  }

  start(): void {
    if (this.state === 'finished') return
    if (this.state === 'idle' || this.state === 'paused') {
      this.state = 'running'
      this.lastTimestamp = performance.now()
      this.loop()
    }
  }

  pause(): void {
    if (this.state === 'running') {
      this.state = 'paused'
      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId)
        this.animFrameId = null
      }
    } else if (this.state === 'paused') {
      this.start()
    }
  }

  reset(): void {
    this.state = 'idle'
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = null
    }
    this.ui.endOverlay.classList.remove('visible')
    this.init()
  }

  loop(): void {
    if (this.state !== 'running') return
    this.animFrameId = requestAnimationFrame((ts) => {
      const rawDt = ts - this.lastTimestamp
      this.lastTimestamp = ts
      // dt をフレーム単位に正規化（16.67ms = 1フレーム）、上限キャップ
      const dt = Math.min(rawDt / 16.67, 3) * this.speedMultiplier

      this.elapsedTime += rawDt * this.speedMultiplier
      this.update(dt, ts)
      this.drawFrame(ts)
      this.updateUI()
      this.loop()
    })
  }

  update(dt: number, time: number): void {
    // ゴースト更新
    for (const ghost of this.ghosts) {
      ghost.update(this.humans, dt, time, this.width, this.height, this.ghosts)
    }

    // ランタン拾得判定（未所持ニンゲンが地面のランタンに近づくと拾う）
    for (const human of this.humans) {
      if (human.lantern || human.captured) continue
      for (let i = this.lanterns.length - 1; i >= 0; i--) {
        if (dist(human, this.lanterns[i]) < LANTERN_PICKUP_DISTANCE) {
          human.pickUpLantern(this.lanterns[i])
          this.lanterns.splice(i, 1)
          break
        }
      }
    }

    // ランタン自動発動判定
    for (const human of this.humans) {
      if (!human.lantern || !human.lantern.isReady() || human.captured) continue

      // おばけが近くにいるか判定
      let threatened = false
      for (const ghost of this.ghosts) {
        if (ghost.state === 'stunned') continue
        if (dist(human, ghost) < LANTERN_ACTIVATION_DISTANCE) {
          threatened = true
          break
        }
      }

      if (threatened) {
        // ランタン発動: 範囲内の全おばけをスタン
        human.lantern.activate()
        for (const ghost of this.ghosts) {
          if (ghost.state === 'stunned') continue
          if (ghost.isInRange(human.x, human.y, LANTERN_STUN_RADIUS)) {
            ghost.stunExternal()
          }
        }
        // 発動エフェクト
        this.particles.push(new Particle(human.x, human.y, 'lantern', 'rgba(255, 220, 80, 0.7)'))
        this.particles.push(new Particle(human.x, human.y, 'flash', '#ffffcc'))
        for (let j = 0; j < 5; j++) {
          this.particles.push(
            new Particle(
              human.x,
              human.y,
              'star',
              ['#ffee88', '#ffffff', '#ffcc44'][randInt(0, 2)],
            ),
          )
        }
      }
    }

    // 捕食判定
    for (const ghost of this.ghosts) {
      if (!ghost.canCapture()) continue
      for (let i = this.humans.length - 1; i >= 0; i--) {
        if (ghost.checkCapture(this.humans[i])) {
          const human = this.humans[i]
          this.humans.splice(i, 1)

          // ランタンをドロップ
          const droppedLantern = human.dropLantern()
          if (droppedLantern) {
            droppedLantern.x = human.x
            droppedLantern.y = human.y
            this.lanterns.push(droppedLantern)
          }

          ghost.startFeeding(human)

          // フラッシュエフェクト
          this.particles.push(new Particle(human.x, human.y, 'flash', '#ffffff'))

          if (!ghost.canCapture()) break // 捕食不可になったら次のおばけへ
        }
      }
    }

    // 消化完了 → 新おばけ生成
    for (const ghost of this.ghosts) {
      if (ghost.state === 'releasing') {
        ghost.finishDigestion()

        // 新おばけを生成
        const angle = rand(0, Math.PI * 2)
        const spawnDist = ghost.baseRadius * 2
        const newGhost = createGhost(
          ghost.x + Math.cos(angle) * spawnDist,
          ghost.y + Math.sin(angle) * spawnDist,
          pickGhostType(this.ghostMode),
        )
        newGhost.spawnScale = 0
        newGhost.vx = Math.cos(angle) * 3
        newGhost.vy = Math.sin(angle) * 3
        this.ghosts.push(newGhost)

        // 星パーティクル
        for (let j = 0; j < 7; j++) {
          const colors = ['#ffee88', '#ffffff', '#ffcc44', '#aaddff']
          this.particles.push(
            new Particle(newGhost.x, newGhost.y, 'star', colors[randInt(0, colors.length - 1)]),
          )
        }

        // ポップエフェクト
        this.particles.push(new Particle(ghost.x, ghost.y, 'pop', ghost.color))
      }
    }

    // 脱出したニンゲンを回収して humans 配列に復帰
    for (const ghost of this.ghosts) {
      for (const human of ghost.escapedHumans) {
        this.humans.push(human)

        // 脱出エフェクト（星パーティクル）
        for (let j = 0; j < 5; j++) {
          const colors = ['#ffee88', '#ffffff', '#88ffaa']
          this.particles.push(
            new Particle(human.x, human.y, 'star', colors[randInt(0, colors.length - 1)]),
          )
        }
        this.particles.push(new Particle(ghost.x, ghost.y, 'flash', '#ffaa44'))
      }
      ghost.escapedHumans = []
    }

    // ニンゲン更新
    for (const human of this.humans) {
      human.update(this.ghosts, this.humans, dt, this.width, this.height)
    }

    // ランタン更新（地面のランタン + ニンゲン所持のランタン）
    for (const lantern of this.lanterns) {
      lantern.update(dt)
    }
    for (const human of this.humans) {
      if (human.lantern) human.lantern.update(dt)
    }

    // パーティクル更新
    this.particles = this.particles.filter((p) => p.update(dt))

    // 霧パーティクル生成（おばけごと）
    for (const ghost of this.ghosts) {
      ghost.mistTimer -= dt
      if (ghost.mistTimer <= 0) {
        ghost.mistTimer = rand(8, 15)
        this.particles.push(
          new Particle(
            ghost.x + rand(-ghost.currentRadius, ghost.currentRadius),
            ghost.y + rand(-ghost.currentRadius * 0.5, ghost.currentRadius * 0.8),
            'mist',
            ghost.color,
          ),
        )
      }
    }

    // 終了判定（自由なニンゲンがおらず、消化中のおばけもいない場合に終了）
    const hasDigesting = this.ghosts.some((g) => g.state === 'digesting')
    if (this.humans.length === 0 && !hasDigesting && this.state === 'running') {
      this.state = 'finished'
      this.ui.endOverlay.classList.add('visible')
      this.ui.endStats.textContent = `おばけ ${this.ghosts.length} 体 ・ 経過時間 ${formatTime(this.elapsedTime)}`
      // 終了後もアニメーションは続ける
      this.loopFinished()
    }
  }

  loopFinished(): void {
    this.animFrameId = requestAnimationFrame((ts) => {
      const rawDt = ts - this.lastTimestamp
      this.lastTimestamp = ts
      const dt = Math.min(rawDt / 16.67, 3)

      // おばけだけゆらゆら動かす
      for (const ghost of this.ghosts) {
        ghost.wobbleTime += dt * 0.016
        ghost.x += Math.sin(ghost.wobbleTime * 1.5 + ghost.wobbleOffset) * 0.3 * dt
        ghost.y += Math.cos(ghost.wobbleTime * 1.2 + ghost.wobbleOffset * 0.7) * 0.2 * dt
        ghost.bounceOffWalls(this.width, this.height)
        if (ghost.spawnScale < 1) ghost.spawnScale = Math.min(1, ghost.spawnScale + 0.04 * dt)
        ghost.mistTimer -= dt
        if (ghost.mistTimer <= 0) {
          ghost.mistTimer = rand(8, 15)
          this.particles.push(
            new Particle(
              ghost.x + rand(-ghost.currentRadius, ghost.currentRadius),
              ghost.y + rand(-ghost.currentRadius * 0.5, ghost.currentRadius * 0.8),
              'mist',
              ghost.color,
            ),
          )
        }
      }
      this.particles = this.particles.filter((p) => p.update(dt))
      this.drawFrame(ts)
      this.loopFinished()
    })
  }

  drawFrame(time: number): void {
    const ctx = this.ctx
    const w = this.width
    const h = this.height

    // 背景
    if (this.bgGradient) {
      ctx.fillStyle = this.bgGradient
    }
    ctx.fillRect(0, 0, w, h)

    // 霧パーティクル（エンティティの裏）
    for (const p of this.particles) {
      if (p.type === 'mist') p.draw(ctx)
    }

    // 地面のランタン描画
    for (const lantern of this.lanterns) {
      lantern.draw(ctx)
    }

    // ニンゲン描画
    for (const human of this.humans) {
      human.draw(ctx)
    }

    // ゴースト描画
    for (const ghost of this.ghosts) {
      ghost.draw(ctx, time)
    }

    // エフェクトパーティクル（エンティティの表）
    for (const p of this.particles) {
      if (p.type !== 'mist') p.draw(ctx)
    }
  }

  updateUI(): void {
    this.ui.ghostCount.textContent = String(this.ghosts.length)
    this.ui.humanCount.textContent = String(this.humans.length)
    this.ui.digestingCount.textContent = String(
      this.ghosts.filter((g) => g.state === 'digesting').length,
    )
    const carriedCount = this.humans.filter((h) => h.lantern).length
    this.ui.lanternCount.textContent = String(this.lanterns.length + carriedCount)
    this.ui.elapsedTime.textContent = formatTime(this.elapsedTime)
  }
}
