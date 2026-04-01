import styles from './style.module.css'
import { Simulation } from './entities/Simulation'
import type { GhostMode, UIElements } from './core/types'
import {
  DEFAULT_GHOST_COUNT,
  DEFAULT_HUMAN_COUNT,
  DEFAULT_LANTERN_COUNT,
  GHOST_BASE_SPEED,
  HUMAN_BASE_SPEED,
  MAX_HEALTH,
  MAX_STAMINA,
  ESCAPE_PROGRESS_RATE,
} from './core/constants'

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
document.getElementById('btn-settings')!.classList.add(styles.settingsButton)
document.getElementById('settings-overlay')!.className = styles.settingsOverlay
document.getElementById('settings-panel')!.className = styles.settingsPanel
document.querySelector('.settings-header')!.classList.add(styles.settingsHeader)
document.querySelectorAll('.settings-section').forEach((el) => el.classList.add(styles.settingsSection))
document.querySelectorAll('.section-title').forEach((el) => el.classList.add(styles.sectionTitle))
document.querySelector('.settings-footer')!.classList.add(styles.settingsFooter)

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
// 設定パネル開閉
// ============================================================
const settingsOverlay = getElement('settings-overlay')
const settingsPanel = getElement('settings-panel')

function openSettings() {
  settingsOverlay.classList.add(styles.visible)
  settingsPanel.classList.add(styles.visible)
}

function closeSettings() {
  settingsOverlay.classList.remove(styles.visible)
  settingsPanel.classList.remove(styles.visible)
}

getElement('btn-settings').addEventListener('click', openSettings)
getElement('btn-close-settings').addEventListener('click', closeSettings)
settingsOverlay.addEventListener('click', closeSettings)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSettings()
})

// ============================================================
// ボタン
// ============================================================
const btnPlay = getElement<HTMLButtonElement>('btn-play')
const btnReset = getElement<HTMLButtonElement>('btn-reset')

btnPlay.addEventListener('click', () => {
  if (sim.state === 'idle') {
    sim.init()
    sim.start()
    btnPlay.textContent = '⏸ 一時停止'
  } else if (sim.state === 'running') {
    sim.pause()
    btnPlay.textContent = '▶ 再開'
  } else if (sim.state === 'paused') {
    sim.pause()
    btnPlay.textContent = '⏸ 一時停止'
  } else if (sim.state === 'finished') {
    sim.reset()
    sim.start()
    btnPlay.textContent = '⏸ 一時停止'
  }
})

btnReset.addEventListener('click', () => {
  sim.reset()
  btnPlay.textContent = '▶ 開始'
})

// ============================================================
// スライダー
// ============================================================
const sliderGhosts = getElement<HTMLInputElement>('slider-ghosts')
const sliderHumans = getElement<HTMLInputElement>('slider-humans')
const sliderSpeed = getElement<HTMLInputElement>('slider-speed')
const sliderLanterns = getElement<HTMLInputElement>('slider-lanterns')
const sliderGhostSpeed = getElement<HTMLInputElement>('slider-ghost-speed')
const sliderHumanSpeed = getElement<HTMLInputElement>('slider-human-speed')
const sliderMaxHealth = getElement<HTMLInputElement>('slider-max-health')
const sliderMaxStamina = getElement<HTMLInputElement>('slider-max-stamina')
const sliderEscapeRate = getElement<HTMLInputElement>('slider-escape-rate')
const valGhosts = getElement('val-ghosts')
const valHumans = getElement('val-humans')
const valSpeed = getElement('val-speed')
const valLanterns = getElement('val-lanterns')
const valGhostSpeed = getElement('val-ghost-speed')
const valHumanSpeed = getElement('val-human-speed')
const valMaxHealth = getElement('val-max-health')
const valMaxStamina = getElement('val-max-stamina')
const valEscapeRate = getElement('val-escape-rate')

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

sliderGhostSpeed.addEventListener('input', () => {
  const v = parseInt(sliderGhostSpeed.value, 10) / 10
  valGhostSpeed.textContent = v.toFixed(1)
  sim.ghostBaseSpeed = v
})

sliderHumanSpeed.addEventListener('input', () => {
  const v = parseInt(sliderHumanSpeed.value, 10) / 10
  valHumanSpeed.textContent = v.toFixed(1)
  sim.humanBaseSpeed = v
})

sliderMaxHealth.addEventListener('input', () => {
  const v = parseInt(sliderMaxHealth.value, 10)
  valMaxHealth.textContent = String(v)
  sim.maxHealth = v
})

sliderMaxStamina.addEventListener('input', () => {
  const v = parseInt(sliderMaxStamina.value, 10)
  valMaxStamina.textContent = String(v)
  sim.maxStamina = v
})

sliderEscapeRate.addEventListener('input', () => {
  const v = parseInt(sliderEscapeRate.value, 10) / 10
  valEscapeRate.textContent = v.toFixed(1)
  sim.escapeProgressRate = v
})

// おばけモード選択
const selectGhostMode = getElement<HTMLSelectElement>('select-ghost-mode')
selectGhostMode.addEventListener('change', () => {
  sim.ghostMode = selectGhostMode.value as GhostMode
})

// ============================================================
// デフォルトに戻す
// ============================================================
getElement('btn-defaults').addEventListener('click', () => {
  sliderGhosts.value = String(DEFAULT_GHOST_COUNT)
  valGhosts.textContent = String(DEFAULT_GHOST_COUNT)
  sim.ghostCountInit = DEFAULT_GHOST_COUNT

  sliderHumans.value = String(DEFAULT_HUMAN_COUNT)
  valHumans.textContent = String(DEFAULT_HUMAN_COUNT)
  sim.humanCountInit = DEFAULT_HUMAN_COUNT

  sliderLanterns.value = String(DEFAULT_LANTERN_COUNT)
  valLanterns.textContent = String(DEFAULT_LANTERN_COUNT)
  sim.lanternCountInit = DEFAULT_LANTERN_COUNT

  sliderGhostSpeed.value = String(Math.round(GHOST_BASE_SPEED * 10))
  valGhostSpeed.textContent = GHOST_BASE_SPEED.toFixed(1)
  sim.ghostBaseSpeed = GHOST_BASE_SPEED

  sliderHumanSpeed.value = String(Math.round(HUMAN_BASE_SPEED * 10))
  valHumanSpeed.textContent = HUMAN_BASE_SPEED.toFixed(1)
  sim.humanBaseSpeed = HUMAN_BASE_SPEED

  sliderMaxHealth.value = String(MAX_HEALTH)
  valMaxHealth.textContent = String(MAX_HEALTH)
  sim.maxHealth = MAX_HEALTH

  sliderMaxStamina.value = String(MAX_STAMINA)
  valMaxStamina.textContent = String(MAX_STAMINA)
  sim.maxStamina = MAX_STAMINA

  sliderEscapeRate.value = String(Math.round(ESCAPE_PROGRESS_RATE * 10))
  valEscapeRate.textContent = ESCAPE_PROGRESS_RATE.toFixed(1)
  sim.escapeProgressRate = ESCAPE_PROGRESS_RATE

  sliderSpeed.value = '10'
  valSpeed.textContent = '1.0x'
  sim.speedMultiplier = 1

  selectGhostMode.value = 'random'
  sim.ghostMode = 'random'
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
