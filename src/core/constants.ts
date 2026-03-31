// ============================================================
// 定数
// ============================================================

// エンティティ数
export const DEFAULT_GHOST_COUNT = 1
export const DEFAULT_HUMAN_COUNT = 30

// 速度
export const HUMAN_BASE_SPEED = 2.5
export const GHOST_SPEED_RATIO = 0.8
export const GHOST_BASE_SPEED = HUMAN_BASE_SPEED * GHOST_SPEED_RATIO

// 捕食パラメータ
export const CAPTURE_DISTANCE = 18
export const DIGESTION_TIME_MIN = 3000
export const DIGESTION_TIME_MAX = 5000

// ニンゲン視界・群れ行動
export const HUMAN_VISION_RADIUS = 150
export const HUMAN_FLOCK_RADIUS = 80
export const FLOCK_COHESION = 0.015
export const FLOCK_SEPARATION = 0.05
export const FLOCK_ALIGNMENT = 0.02

// ニンゲン逃走時パラメータ
export const FLEE_SEPARATION = 0.08
export const FLEE_COOLDOWN = 60

// おばけサイズ・ゆらぎ
export const GHOST_BASE_RADIUS = 18
export const HUMAN_RADIUS = 7
export const GHOST_WOBBLE_AMPLITUDE = 3
export const GHOST_WOBBLE_SPEED = 3.0

// おばけ分離行動
export const GHOST_SEPARATION_RADIUS = 60
export const GHOST_SEPARATION_STRENGTH = 0.08

// 色定義
export const GHOST_COLORS_HSL: [number, number, number][] = [
  [220, 60, 70], // 青白い
  [260, 50, 65], // 紫
  [280, 45, 60], // 深紫
  [140, 40, 60], // 緑
  [350, 50, 65], // 赤
  [190, 50, 65], // シアン
]

export const HUMAN_HUE_MIN = 15
export const HUMAN_HUE_MAX = 45

// 背景色
export const BG_COLOR_TOP = '#1a0a2e'
export const BG_COLOR_BOTTOM = '#0d1b3e'

// 壁マージン
export const WALL_MARGIN = 10

// 壁回避ステアリング
export const WALL_AVOIDANCE_RADIUS = 60
export const WALL_AVOIDANCE_STRENGTH = 1.5
