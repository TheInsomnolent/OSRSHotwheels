import { describe, expect, it } from 'vitest'
import { simulateRace } from '../src/engine/raceSim'
import { RACES_BY_ID } from '../src/data/races'
import type { RacerStats } from '../src/engine/types'

const race = RACES_BY_ID.market_dash

function run(stats: RacerStats, seed = 42) {
  return simulateRace(race, { name: 'Buster', stats }, seed)
}

describe('race simulator', () => {
  it('is deterministic for a given seed', () => {
    const stats: RacerStats = { topSpeed: 7.5, acceleration: 1.5, handling: 0.4 }
    const a = run(stats, 7)
    const b = run(stats, 7)
    expect(a.placements).toEqual(b.placements)
    expect(a.distances).toEqual(b.distances)
  })

  it('everyone finishes and placements are ordered by time', () => {
    const out = run({ topSpeed: 7.5, acceleration: 1.5, handling: 0.4 })
    expect(out.placements).toHaveLength(4)
    for (const p of out.placements) expect(p.timeS).not.toBeNull()
    const times = out.placements.map((p) => p.timeS!)
    expect([...times].sort((x, y) => x - y)).toEqual(times)
    expect(out.placements.map((p) => p.position)).toEqual([1, 2, 3, 4])
  })

  it('a slow unupgraded dog loses; an upgraded dog wins', () => {
    let slowWins = 0
    let fastWins = 0
    for (let seed = 0; seed < 20; seed++) {
      const slow = run({ topSpeed: 6.5, acceleration: 1.2, handling: 0.3 }, seed)
      const fast = run({ topSpeed: 9.0, acceleration: 2.0, handling: 0.6 }, seed)
      if (slow.placements[0].isPlayer) slowWins++
      if (fast.placements[0].isPlayer) fastWins++
    }
    expect(slowWins).toBeLessThanOrEqual(2)
    expect(fastWins).toBeGreaterThanOrEqual(18)
  })

  it('produces playback distances that reach the finish and never regress', () => {
    const out = run({ topSpeed: 7.5, acceleration: 1.5, handling: 0.4 })
    for (const track of out.distances) {
      expect(track[0]).toBe(0)
      for (let i = 1; i < track.length; i++) {
        expect(track[i]).toBeGreaterThanOrEqual(track[i - 1])
      }
      expect(track[track.length - 1]).toBeGreaterThanOrEqual(out.totalLengthM)
    }
  })

  it('better handling helps on this cornery market circuit', () => {
    const avg = (handling: number) => {
      let total = 0
      for (let seed = 0; seed < 10; seed++) {
        const out = run({ topSpeed: 7.5, acceleration: 1.5, handling }, seed)
        total += out.placements.find((p) => p.isPlayer)!.timeS!
      }
      return total / 10
    }
    expect(avg(0.9)).toBeLessThan(avg(0.1))
  })
})
