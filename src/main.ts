import styles from './style.module.css'
import { Simulation } from './entities/Simulation'
import type { GhostMode, SimulationState, UIElements } from './core/types'
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
import {
  applyDocumentTranslations,
  changeLanguage,
  getCurrentLanguage,
  initI18n,
  t,
  type AppLanguage,
} from './core/i18n'

// ============================================================
// DOM要素取得
// ============================================================
function getElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id)
  if (!el) throw new Error(`Element #${id} not found`)
  return el as T
}

function getPlayButtonKey(state: SimulationState): string {
  const labels: Record<SimulationState, string> = {
    idle: 'ui.controls.play.start',
    running: 'ui.controls.play.pause',
    paused: 'ui.controls.play.resume',
    finished: 'ui.controls.play.start',
  }
  return labels[state]
}

async function bootstrap(): Promise<void> {
  await initI18n()

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
    lanternCount: getElement('lantern-count'),
    elapsedTime: getElement('elapsed-time'),
    endOverlay: getElement('end-overlay'),
    endStats: getElement('end-stats'),
  }

  const canvas = getElement<HTMLCanvasElement>('sim-canvas')
  const sim = new Simulation(canvas, ui)

  const settingsOverlay = getElement('settings-overlay')
  const settingsPanel = getElement('settings-panel')
  const btnPlay = getElement<HTMLButtonElement>('btn-play')
  const selectLanguage = getElement<HTMLSelectElement>('select-language')

  function updatePlayButtonLabel(): void {
    btnPlay.textContent = t(getPlayButtonKey(sim.state))
  }

  function refreshLocalizedUi(): void {
    applyDocumentTranslations()
    updatePlayButtonLabel()
    sim.refreshLocalizedText()
  }

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

  btnPlay.addEventListener('click', () => {
    if (sim.state === 'idle') {
      sim.init()
      sim.start()
    } else if (sim.state === 'running') {
      sim.pause()
    } else if (sim.state === 'paused') {
      sim.pause()
    } else if (sim.state === 'finished') {
      sim.reset()
      sim.start()
    }

    updatePlayButtonLabel()
  })

  getElement<HTMLButtonElement>('btn-reset').addEventListener('click', () => {
    sim.reset()
    updatePlayButtonLabel()
  })

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
    const value = parseInt(sliderGhosts.value, 10)
    valGhosts.textContent = String(value)
    sim.ghostCountInit = value
  })

  sliderHumans.addEventListener('input', () => {
    const value = parseInt(sliderHumans.value, 10)
    valHumans.textContent = String(value)
    sim.humanCountInit = value
  })

  sliderSpeed.addEventListener('input', () => {
    const value = parseInt(sliderSpeed.value, 10) / 10
    valSpeed.textContent = value.toFixed(1) + 'x'
    sim.speedMultiplier = value
  })

  sliderLanterns.addEventListener('input', () => {
    const value = parseInt(sliderLanterns.value, 10)
    valLanterns.textContent = String(value)
    sim.lanternCountInit = value
  })

  sliderGhostSpeed.addEventListener('input', () => {
    const value = parseInt(sliderGhostSpeed.value, 10) / 10
    valGhostSpeed.textContent = value.toFixed(1)
    sim.ghostBaseSpeed = value
  })

  sliderHumanSpeed.addEventListener('input', () => {
    const value = parseInt(sliderHumanSpeed.value, 10) / 10
    valHumanSpeed.textContent = value.toFixed(1)
    sim.humanBaseSpeed = value
  })

  sliderMaxHealth.addEventListener('input', () => {
    const value = parseInt(sliderMaxHealth.value, 10)
    valMaxHealth.textContent = String(value)
    sim.maxHealth = value
  })

  sliderMaxStamina.addEventListener('input', () => {
    const value = parseInt(sliderMaxStamina.value, 10)
    valMaxStamina.textContent = String(value)
    sim.maxStamina = value
  })

  sliderEscapeRate.addEventListener('input', () => {
    const value = parseInt(sliderEscapeRate.value, 10) / 10
    valEscapeRate.textContent = value.toFixed(1)
    sim.escapeProgressRate = value
  })

  const selectGhostMode = getElement<HTMLSelectElement>('select-ghost-mode')
  selectGhostMode.addEventListener('change', () => {
    sim.ghostMode = selectGhostMode.value as GhostMode
  })

  selectLanguage.value = getCurrentLanguage()
  selectLanguage.addEventListener('change', async () => {
    await changeLanguage(selectLanguage.value as AppLanguage)
    refreshLocalizedUi()
  })

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

  window.addEventListener('resize', () => {
    sim.resize()
    if (sim.state === 'idle') {
      sim.init()
    }
  })

  sim.init()
  refreshLocalizedUi()
}

void bootstrap()
