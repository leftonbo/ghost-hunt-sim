export type GhostState = 'hunting' | 'digesting' | 'stunned'
export type GhostType = 'normal' | 'feral' | 'suction' | 'tongue'
export type GhostMode = 'random' | 'hard' | 'normal' | 'feral' | 'suction' | 'tongue'
export type ParticleType = 'mist' | 'flash' | 'star' | 'pop' | 'lantern'
export type SimulationState = 'idle' | 'running' | 'paused' | 'finished'

/**
 * シミュレーション内の位置を表すインターフェース。
 * すべてのエンティティ（おばけ、ニンゲン、ランタンなど）で共通して使用される。
 */
export interface Position {
  x: number
  y: number
}

/**
 * UI要素の参照をまとめたインターフェース。
 * シミュレーションの状態更新や終了時にこれらの要素を更新するために使用される。
 * 追加のUI要素を実装する際はこのインターフェースを更新すること。
 */
export interface UIElements {
  ghostCount: HTMLElement
  humanCount: HTMLElement
  digestingCount: HTMLElement
  lanternCount: HTMLElement
  elapsedTime: HTMLElement
  endOverlay: HTMLElement
  endStats: HTMLElement
}
