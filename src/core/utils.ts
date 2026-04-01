import { GHOST_COLORS_HSL, HUMAN_HUE_MIN, HUMAN_HUE_MAX } from './constants'
import type { Position } from './types'

/**
 * 指定範囲内のランダムな数値を生成する関数。
 * @param min 最小値
 * @param max 最大値
 * @returns min 以上 max 未満のランダムな数値
 */
export function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

/**
 * 指定範囲内のランダムな整数を生成する関数。
 * @param min 最小値
 * @param max 最大値
 * @returns min 以上 max 以下のランダムな整数
 */
export function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1))
}

/**
 * 2つの位置間の距離を計算する関数。
 * @param a 位置A
 * @param b 位置B
 * @returns 位置Aと位置Bの距離
 */
export function dist(a: Position, b: Position): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/**
 * 値を指定範囲内に制限する関数。
 * @param v 制限する値
 * @param lo 最小値
 * @param hi 最大値
 * @returns 制限された値
 */
export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

/**
 * ベクトルを正規化する関数。
 * @param vx X成分
 * @param vy Y成分
 * @returns 正規化されたベクトル（長さ1のベクトル）。入力がゼロベクトルの場合は { x: 0, y: 0 } を返す。
 */
export function normalize(vx: number, vy: number): Position {
  const len = Math.hypot(vx, vy)
  if (len === 0) return { x: 0, y: 0 }
  return { x: vx / len, y: vy / len }
}

/**
 * おばけの色をランダムに選択する関数。
 * @returns ランダムに選択されたおばけの色（HSL形式）
 */
export function pickGhostColor(): string {
  const c = GHOST_COLORS_HSL[randInt(0, GHOST_COLORS_HSL.length - 1)]
  const h = c[0] + rand(-15, 15)
  const s = c[1] + rand(-10, 10)
  const l = c[2] + rand(-8, 8)
  return `hsl(${h}, ${s}%, ${l}%)`
}

/**
 * ニンゲンの色をランダムに選択する関数。
 * @returns ランダムに選択されたニンゲンの色（HSL形式）
 */
export function pickHumanColor(): string {
  const h = rand(HUMAN_HUE_MIN, HUMAN_HUE_MAX)
  const s = rand(45, 70)
  const l = rand(55, 75)
  return `hsl(${h}, ${s}%, ${l}%)`
}

/**
 * ミリ秒を分:秒形式の文字列に変換する関数。
 * @param ms ミリ秒
 * @returns 分:秒形式の文字列
 */
export function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * 2つの角度の差を -π から π の範囲で計算する関数。
 * @param a 角度A（ラジアン）
 * @param b 角度B（ラジアン）
 * @returns 角度Aと角度Bの差（-π ≤ 差 < π）
 */
export function angleDiff(a: number, b: number): number {
  let d = a - b
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}
