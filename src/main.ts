import styles from './style.module.css'
import { Simulation } from './entities/Simulation'
import type { GhostMode, UIElements } from './core/types'

// ============================================================
// DOM要素取得
// ============================================================
function getElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id)
  if (!el) throw new Error(`Element #${id} not found`)
  return el as T
}

// CSS Modules クラス適用
document.getElementById('info-panel')!.className = styles.infoPanel
document.querySelectorAll('.stat').forEach((el) => el.classList.add(styles.stat))
document.querySelectorAll('.label').forEach((el) => el.classList.add(styles.label))
document.querySelectorAll('.value').forEach((el) => el.classList.add(styles.value))
document.getElementById('canvas-container')!.className = styles.canvasContainer
document.getElementById('end-overlay')!.className = styles.endOverlay
document.querySelector('.end-title')!.classList.add(styles.endTitle)
document.querySelector('.end-stats')!.classList.add(styles.endStats)
document.getElementById('control-panel')!.className = styles.controlPanel
document.querySelectorAll('.slider-group').forEach((el) => el.classList.add(styles.sliderGroup))
document.querySelectorAll('.slider-value').forEach((el) => el.classList.add(styles.sliderValue))

// UI要素
const ui: UIElements = {
  ghostCount: getElement('ghost-count'),
  humanCount: getElement('human-count'),
  digestingCount: getElement('digesting-count'),
  lanternCount: getElement('lantern-count'),
  elapsedTime: getElement('elapsed-time'),
  endOverlay: getElement('end-overlay'),
  endStats: getElement('end-stats'),
}

const canvas = getElement<HTMLCanvasElement>('sim-canvas')
const sim = new Simulation(canvas, ui)

// ============================================================
// ボタン
// ============================================================
const btnStart = getElement<HTMLButtonElement>('btn-start')
const btnPause = getElement<HTMLButtonElement>('btn-pause')
const btnReset = getElement<HTMLButtonElement>('btn-reset')

btnStart.addEventListener('click', () => {
  if (sim.state === 'idle') {
    sim.init()
    sim.start()
    btnStart.disabled = true
    btnPause.disabled = false
  } else if (sim.state === 'finished') {
    // 終了後に開始ボタンを押したらリセット＆開始
    sim.reset()
    sim.start()
    btnStart.disabled = true
    btnPause.disabled = false
  }
})

btnPause.addEventListener('click', () => {
  if (sim.state === 'running') {
    sim.pause()
    btnPause.textContent = '▶ 再開'
  } else if (sim.state === 'paused') {
    sim.pause() // toggles back to running
    btnPause.textContent = '⏸ 一時停止'
  }
})

btnReset.addEventListener('click', () => {
  sim.reset()
  btnStart.disabled = false
  btnPause.disabled = true
  btnPause.textContent = '⏸ 一時停止'
})

// ============================================================
// スライダー
// ============================================================
const sliderGhosts = getElement<HTMLInputElement>('slider-ghosts')
const sliderHumans = getElement<HTMLInputElement>('slider-humans')
const sliderSpeed = getElement<HTMLInputElement>('slider-speed')
const sliderLanterns = getElement<HTMLInputElement>('slider-lanterns')
const valGhosts = getElement('val-ghosts')
const valHumans = getElement('val-humans')
const valSpeed = getElement('val-speed')
const valLanterns = getElement('val-lanterns')

sliderGhosts.addEventListener('input', () => {
  const v = parseInt(sliderGhosts.value, 10)
  valGhosts.textContent = String(v)
  sim.ghostCountInit = v
})

sliderHumans.addEventListener('input', () => {
  const v = parseInt(sliderHumans.value, 10)
  valHumans.textContent = String(v)
  sim.humanCountInit = v
})

sliderSpeed.addEventListener('input', () => {
  const v = parseInt(sliderSpeed.value, 10) / 10
  valSpeed.textContent = v.toFixed(1) + 'x'
  sim.speedMultiplier = v
})

sliderLanterns.addEventListener('input', () => {
  const v = parseInt(sliderLanterns.value, 10)
  valLanterns.textContent = String(v)
  sim.lanternCountInit = v
})

// おばけモード選択
const selectGhostMode = getElement<HTMLSelectElement>('select-ghost-mode')
selectGhostMode.addEventListener('change', () => {
  sim.ghostMode = selectGhostMode.value as GhostMode
})

// ============================================================
// リサイズ
// ============================================================
window.addEventListener('resize', () => {
  sim.resize()
  if (sim.state === 'idle') {
    sim.init()
  }
})

// ============================================================
// 初期描画
// ============================================================
sim.init()
