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

// 生気パラメータ
export const MAX_LIFE_FORCE = 100
export const LIFE_FORCE_DRAIN_RATE = 0.5

// スタミナパラメータ
export const MAX_STAMINA = 100
export const STAMINA_DRAIN_RATE = 0.4
export const STAMINA_RECOVERY_RATE = 0.5
export const FATIGUE_SPEED_MULTIPLIER = 0.5

// もがき・脱出パラメータ
export const STRUGGLE_STAMINA_COST = 0.4
export const ESCAPE_PROGRESS_RATE = 0.8
export const ESCAPE_THRESHOLD = 100

// おばけスタンパラメータ
export const STUN_DURATION = 120

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

// ランタンパラメータ
export const DEFAULT_LANTERN_COUNT = 5
export const LANTERN_PICKUP_DISTANCE = 25
export const LANTERN_ACTIVATION_DISTANCE = 80
export const LANTERN_STUN_RADIUS = 120
export const LANTERN_COOLDOWN = 300
export const LANTERN_INITIAL_CARRY_RATIO = 0.3
export const LANTERN_RADIUS = 8

// フェラルおばけ
export const FERAL_NORMAL_SPEED = GHOST_BASE_SPEED * 0.7
export const FERAL_DASH_SPEED = GHOST_BASE_SPEED * 5
export const FERAL_DASH_DURATION = 30
export const FERAL_DASH_COOLDOWN = 180
export const FERAL_DASH_RANGE = 360

// すいこみおばけ
export const SUCTION_SPEED_MULTIPLIER = 0.7
export const SUCTION_START_RANGE = 200
export const SUCTION_RANGE = 300
export const SUCTION_CONE_HALF_ANGLE = Math.PI / 4
export const SUCTION_PULL_STRENGTH = 6
export const SUCTION_DURATION = 90
export const SUCTION_COOLDOWN = 120
export const SUCTION_DRAIN_MULTIPLIER = 0.6

// べろべろおばけ
export const TONGUE_SPEED_MULTIPLIER = 0.6
export const TONGUE_RANGE = 200
export const TONGUE_EXTEND_SPEED = 6
export const TONGUE_HOMING_STRENGTH = 0.08
export const TONGUE_COOLDOWN = 150
export const TONGUE_TIP_CAPTURE_DIST = 15
export const TONGUE_REEL_SPEED = TONGUE_EXTEND_SPEED * 0.7

// おばけモード出現確率
export const RANDOM_MODE_SPECIAL_CHANCE = 0.15
export const HARD_MODE_SPECIAL_CHANCE = 0.6
