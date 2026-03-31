import { GHOST_COLORS_HSL, HUMAN_HUE_MIN, HUMAN_HUE_MAX } from './constants'
import type { Position } from './types'

export function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

export function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1))
}

export function dist(a: Position, b: Position): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

export function normalize(vx: number, vy: number): Position {
  const len = Math.hypot(vx, vy)
  if (len === 0) return { x: 0, y: 0 }
  return { x: vx / len, y: vy / len }
}

export function pickGhostColor(): string {
  const c = GHOST_COLORS_HSL[randInt(0, GHOST_COLORS_HSL.length - 1)]
  const h = c[0] + rand(-15, 15)
  const s = c[1] + rand(-10, 10)
  const l = c[2] + rand(-8, 8)
  return `hsl(${h}, ${s}%, ${l}%)`
}

export function pickHumanColor(): string {
  const h = rand(HUMAN_HUE_MIN, HUMAN_HUE_MAX)
  const s = rand(45, 70)
  const l = rand(55, 75)
  return `hsl(${h}, ${s}%, ${l}%)`
}

export function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function angleDiff(a: number, b: number): number {
  let d = a - b
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}
