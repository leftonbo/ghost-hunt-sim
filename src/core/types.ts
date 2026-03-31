export type GhostState = 'hunting' | 'digesting' | 'releasing' | 'stunned'
export type GhostType = 'normal' | 'feral' | 'suction' | 'tongue'
export type GhostMode = 'random' | 'hard' | 'normal' | 'feral' | 'suction' | 'tongue'
export type ParticleType = 'mist' | 'flash' | 'star' | 'pop' | 'lantern'
export type SimulationState = 'idle' | 'running' | 'paused' | 'finished'

export interface Position {
  x: number
  y: number
}

export interface UIElements {
  ghostCount: HTMLElement
  humanCount: HTMLElement
  digestingCount: HTMLElement
  lanternCount: HTMLElement
  elapsedTime: HTMLElement
  endOverlay: HTMLElement
  endStats: HTMLElement
}
