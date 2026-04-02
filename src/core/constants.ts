// ============================================================
// 定数
// ============================================================

// エンティティ数
/** 初期のおばけ数 */
export const DEFAULT_GHOST_COUNT = 1
/** 初期のニンゲン数 */
export const DEFAULT_HUMAN_COUNT = 50

// 速度
/** ニンゲンの基準移動速度 */
export const HUMAN_BASE_SPEED = 2.5
/** おばけの基準移動速度 */
export const GHOST_BASE_SPEED = 2.0

// 捕食パラメータ
/** おばけがニンゲンを捕食判定できる距離 */
export const CAPTURE_DISTANCE = 18

// 生気パラメータ
/** ニンゲンの最大生気 */
export const MAX_HEALTH = 100
/** 捕食中に生気が減少するフレームあたりの量 */
export const HEALTH_DRAIN_RATE = 0.5

// スタミナパラメータ
/** ニンゲンの最大スタミナ */
export const MAX_STAMINA = 100
/** 逃走・もがき時に消費するスタミナ量（フレーム単位） */
export const STAMINA_DRAIN_RATE = 0.4
/** 非逃走時に回復するスタミナ割合（最大スタミナに対するフレーム単位の割合） */
export const STAMINA_RECOVERY_RATE = 0.005
/** 疲労時に適用される速度倍率 */
export const FATIGUE_SPEED_MULTIPLIER = 0.5

// もがき・脱出パラメータ
/** もがき時に追加で消費するスタミナ量 */
export const STRUGGLE_STAMINA_COST = 0.4
/** もがきによって増える脱出進捗量（フレーム単位） */
export const ESCAPE_PROGRESS_RATE = 0.8
/** 脱出成功に必要な進捗しきい値 */
export const ESCAPE_THRESHOLD = 100

// おばけスタンパラメータ
/** おばけがスタンする継続フレーム数 */
export const STUN_DURATION = 120

// ニンゲン無敵パラメータ
/** 脱出後の無敵フレーム数（3秒 @60fps） */
export const INVINCIBILITY_DURATION = 180

// ニンゲン視界・群れ行動
/** ニンゲンがおばけを検知する視界半径 */
export const HUMAN_VISION_RADIUS = 150
/** 群れ行動で近傍判定に使う半径 */
export const HUMAN_FLOCK_RADIUS = 80
/** 群れの集合（cohesion）強度 */
export const FLOCK_COHESION = 0.015
/** 群れの分離（separation）強度 */
export const FLOCK_SEPARATION = 0.05
/** 群れの整列（alignment）強度 */
export const FLOCK_ALIGNMENT = 0.02

// ニンゲン逃走時パラメータ
/** ニンゲンの基本逃走加速度係数 */
export const HUMAN_FLEE_ACCEL = 0.3
/** 逃走時に直線化を崩す横ステップ係数 */
export const HUMAN_FLEE_DODGE = 0.12
/** 逃走緊急度（escapeUrgency）の減衰率（フレーム単位） */
export const HUMAN_ESCAPE_URGENCY_DECAY = 0.03
/** 逃走時のニンゲン同士の分離強度 */
export const FLEE_SEPARATION = 0.08
/** 逃走後の再逃走を抑制するクールダウンフレーム数 */
export const FLEE_COOLDOWN = 60
/** 角に追い詰められた際に逃走加速度へ乗せる追加倍率 */
export const CORNER_ESCAPE_ACCEL_BOOST = 0.9
/** 角に追い詰められた際のニンゲン同士分離の追加倍率 */
export const CORNER_SEPARATION_BOOST = 1.1
/** 角で相反する壁回避力を抑制する倍率 */
export const CORNER_WALL_OPPOSING_DAMP = 0.35
/** 角で逃走優先にする際の壁回避低減率 */
export const CORNER_WALL_AVOID_REDUCTION = 0.65

// おばけサイズ・ゆらぎ
/** おばけの基本半径 */
export const GHOST_BASE_RADIUS = 18
/** ニンゲンの基本半径 */
export const HUMAN_RADIUS = 7
/** おばけのゆらぎ振幅 */
export const GHOST_WOBBLE_AMPLITUDE = 3
/** おばけのゆらぎ速度 */
export const GHOST_WOBBLE_SPEED = 3.0

// おばけ分離行動
/** おばけ同士が分離を開始する距離 */
export const GHOST_SEPARATION_RADIUS = 60
/** おばけ同士の分離ステアリング強度 */
export const GHOST_SEPARATION_STRENGTH = 0.08

// 色定義
/** おばけ描画に使うHSLカラーパレット */
export const GHOST_COLORS_HSL: [number, number, number][] = [
  [220, 60, 70], // 青白い
  [260, 50, 65], // 紫
  [280, 45, 60], // 深紫
  [140, 40, 60], // 緑
  [350, 50, 65], // 赤
  [190, 50, 65], // シアン
]

/** ニンゲン色相の最小値 */
export const HUMAN_HUE_MIN = 15
/** ニンゲン色相の最大値 */
export const HUMAN_HUE_MAX = 45

// 背景色
/** 背景グラデーション上端の色 */
export const BG_COLOR_TOP = '#1a0a2e'
/** 背景グラデーション下端の色 */
export const BG_COLOR_BOTTOM = '#0d1b3e'

// 壁マージン
/** 壁との最小マージン */
export const WALL_MARGIN = 10
/** 壁反射時の速度ブースト倍率 */
export const WALL_BOUNCE_BOOST = 1.2
/** 壁反射時に進行方向へ与える角度ゆらぎ（ラジアン） */
export const WALL_BOUNCE_JITTER = Math.PI / 6

// 壁回避ステアリング
/** 壁回避を開始する距離 */
export const WALL_AVOIDANCE_RADIUS = 60
/** 壁回避ステアリングの強度 */
export const WALL_AVOIDANCE_STRENGTH = 1.5

// ランタンパラメータ
/** 初期配置するランタン数 */
export const DEFAULT_LANTERN_COUNT = 7
/** ニンゲンがランタンを拾える距離 */
export const LANTERN_PICKUP_DISTANCE = 25
/** ランタンが自動発動する敵接近距離 */
export const LANTERN_ACTIVATION_DISTANCE = 80
/** ランタン発動時のスタン有効半径 */
export const LANTERN_STUN_RADIUS = 120
/** ランタンの再使用クールダウンフレーム数 */
export const LANTERN_COOLDOWN = 300
/** 初期状態でランタンを持つニンゲンの割合 */
export const LANTERN_INITIAL_CARRY_RATIO = 0.3
/** ランタン描画の半径 */
export const LANTERN_RADIUS = 8

// フェラルおばけ
/** フェラルおばけの通常移動速度 */
export const FERAL_NORMAL_SPEED = GHOST_BASE_SPEED * 0.7
/** フェラルおばけのダッシュ速度 */
export const FERAL_DASH_SPEED = GHOST_BASE_SPEED * 5
/** フェラルおばけのダッシュ継続フレーム数 */
export const FERAL_DASH_DURATION = 30
/** フェラルおばけのダッシュ再使用クールダウン */
export const FERAL_DASH_COOLDOWN = 180
/** フェラルおばけがダッシュ開始を検討する距離 */
export const FERAL_DASH_RANGE = 360

// すいこみおばけ
/** すいこみおばけの移動速度倍率 */
export const SUCTION_SPEED_MULTIPLIER = 0.7
/** すいこみ開始を検討する距離 */
export const SUCTION_START_RANGE = 200
/** すいこみが有効な最大距離 */
export const SUCTION_RANGE = 300
/** すいこみコーンの半角（ラジアン） */
export const SUCTION_CONE_HALF_ANGLE = Math.PI / 4
/** すいこみ時の引き寄せ強度 */
export const SUCTION_PULL_STRENGTH = 6
/** すいこみ継続フレーム数 */
export const SUCTION_DURATION = 90
/** すいこみの再使用クールダウン */
export const SUCTION_COOLDOWN = 120
/** すいこみおばけの生気吸収倍率 */
export const SUCTION_DRAIN_MULTIPLIER = 0.6

// べろべろおばけ
/** べろべろおばけの移動速度倍率 */
export const TONGUE_SPEED_MULTIPLIER = 0.6
/** 舌の最大射程 */
export const TONGUE_RANGE = 200
/** 舌先の伸長速度 */
export const TONGUE_EXTEND_SPEED = 6
/** 舌先のホーミング強度 */
export const TONGUE_HOMING_STRENGTH = 0.08
/** 舌攻撃の再使用クールダウン */
export const TONGUE_COOLDOWN = 150
/** 舌先で捕捉とみなす距離 */
export const TONGUE_TIP_CAPTURE_DIST = 15
/** 舌を巻き取る速度 */
export const TONGUE_REEL_SPEED = TONGUE_EXTEND_SPEED * 0.7

// おばけモード出現確率
/** ランダムモードで特殊おばけが選ばれる確率 */
export const RANDOM_MODE_SPECIAL_CHANCE = 0.15
/** HARDモードで特殊おばけが選ばれる確率 */
export const HARD_MODE_SPECIAL_CHANCE = 0.6
