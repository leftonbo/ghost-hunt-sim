import type { GhostType, GhostMode } from '../core/types'
import { RANDOM_MODE_SPECIAL_CHANCE, HARD_MODE_SPECIAL_CHANCE } from '../core/constants'
import { randInt } from '../core/utils'
import { Ghost } from './Ghost'
import { FeralGhost } from './FeralGhost'
import { SuctionGhost } from './SuctionGhost'
import { TongueGhost } from './TongueGhost'

const SPECIAL_TYPES: GhostType[] = ['feral', 'suction', 'tongue']

export function createGhost(x: number, y: number, type: GhostType): Ghost {
  switch (type) {
    case 'feral':
      return new FeralGhost(x, y)
    case 'suction':
      return new SuctionGhost(x, y)
    case 'tongue':
      return new TongueGhost(x, y)
    default:
      return new Ghost(x, y)
  }
}

export function pickGhostType(mode: GhostMode): GhostType {
  switch (mode) {
    case 'normal':
      return 'normal'
    case 'feral':
      return 'feral'
    case 'suction':
      return 'suction'
    case 'tongue':
      return 'tongue'
    case 'random':
      return Math.random() < RANDOM_MODE_SPECIAL_CHANCE
        ? SPECIAL_TYPES[randInt(0, SPECIAL_TYPES.length - 1)]
        : 'normal'
    case 'hard':
      return Math.random() < HARD_MODE_SPECIAL_CHANCE
        ? SPECIAL_TYPES[randInt(0, SPECIAL_TYPES.length - 1)]
        : 'normal'
  }
}
