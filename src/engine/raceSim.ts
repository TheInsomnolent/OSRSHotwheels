import type { RaceDef, RacerStats } from './types'
import { mulberry32 } from './rng'

export const SIM_DT = 0.1
const MAX_TIME_S = 180
const CORNER_WINDOW_M = 18
const BRAKE_MS2 = 3.5

export interface SimRacer {
  id: string
  name: string
  colour: number
  isPlayer: boolean
  stats: RacerStats
}

export interface Placement {
  racerId: string
  name: string
  isPlayer: boolean
  /** Finish time in seconds, or null for a DNF. */
  timeS: number | null
  position: number
}

export interface RaceSimOutput {
  /** Placements sorted best-first. */
  placements: Placement[]
  /** distances[racerIndex][tick] = metres travelled at tick*SIM_DT seconds. */
  distances: number[][]
  racers: SimRacer[]
  dt: number
  totalLengthM: number
}

/** Target speed limit near a corner, based on severity and the racer's handling. */
function cornerLimit(stats: RacerStats, severity: number): number {
  return stats.topSpeed * (1 - severity * (1 - stats.handling))
}

/**
 * Simulate a race deterministically from a seed. Returns full per-tick
 * position data so the 3D scene can play the race back faithfully.
 */
export function simulateRace(
  race: RaceDef,
  player: { name: string; stats: RacerStats },
  seed: number,
): RaceSimOutput {
  const rng = mulberry32(seed)
  const totalLength = race.lengthM * race.laps

  const racers: SimRacer[] = [
    {
      id: 'player',
      name: player.name,
      colour: 0x7a4a21,
      isPlayer: true,
      stats: { ...player.stats },
    },
    ...race.opponents.map((o) => ({
      id: o.id,
      name: o.name,
      colour: o.colour,
      isPlayer: false,
      // Opponents have an on-the-day variance of roughly ±3%.
      stats: {
        topSpeed: o.stats.topSpeed * (0.97 + 0.06 * rng()),
        acceleration: o.stats.acceleration * (0.97 + 0.06 * rng()),
        handling: o.stats.handling,
      },
    })),
  ]

  const dist = racers.map(() => 0)
  const speed = racers.map(() => 0)
  const finish: (number | null)[] = racers.map(() => null)
  const distances: number[][] = racers.map(() => [0])

  const maxTicks = Math.ceil(MAX_TIME_S / SIM_DT)
  for (let tick = 1; tick <= maxTicks; tick++) {
    let anyRunning = false
    for (let i = 0; i < racers.length; i++) {
      if (finish[i] !== null) {
        // Roll gently past the line so the playback doesn't freeze mid-stride.
        dist[i] += speed[i] * SIM_DT
        distances[i].push(dist[i])
        continue
      }
      anyRunning = true
      const stats = racers[i].stats
      const lapDist = dist[i] % race.lengthM

      // Is a corner coming up (or are we inside one)?
      let limit = stats.topSpeed
      for (const corner of race.corners) {
        const gap = corner.at - lapDist
        if (gap > -6 && gap < CORNER_WINDOW_M) {
          limit = Math.min(limit, cornerLimit(stats, corner.severity))
        }
      }

      // A little on-the-day randomness in effort each tick.
      const effort = 0.85 + 0.3 * rng()
      if (speed[i] > limit) {
        speed[i] = Math.max(limit, speed[i] - BRAKE_MS2 * SIM_DT)
      } else {
        speed[i] = Math.min(limit, speed[i] + stats.acceleration * effort * SIM_DT)
      }

      const before = dist[i]
      dist[i] += speed[i] * SIM_DT
      distances[i].push(dist[i])

      if (before < totalLength && dist[i] >= totalLength) {
        // Interpolate the exact crossing time inside this tick.
        const over = dist[i] - totalLength
        const inTick = speed[i] > 0 ? over / speed[i] : 0
        finish[i] = tick * SIM_DT - inTick
      }
    }
    if (!anyRunning) break
  }

  const order = racers
    .map((r, i) => ({ racer: r, index: i }))
    .sort((a, b) => {
      const fa = finish[a.index]
      const fb = finish[b.index]
      if (fa !== null && fb !== null) return fa - fb
      if (fa !== null) return -1
      if (fb !== null) return 1
      return dist[b.index] - dist[a.index]
    })

  const placements: Placement[] = order.map((entry, pos) => ({
    racerId: entry.racer.id,
    name: entry.racer.name,
    isPlayer: entry.racer.isPlayer,
    timeS: finish[entry.index],
    position: pos + 1,
  }))

  return { placements, distances, racers, dt: SIM_DT, totalLengthM: totalLength }
}
