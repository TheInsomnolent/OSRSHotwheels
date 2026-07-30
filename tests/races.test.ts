import { describe, expect, it } from 'vitest'
import { RACES, RACES_BY_ID } from '../src/data/races'
import { simulateRace } from '../src/engine/raceSim'
import type { RacerStats } from '../src/engine/types'

describe('race roster', () => {
  it('ships the market dash plus six extra races, all with unique ids', () => {
    expect(RACES).toHaveLength(7)
    expect(RACES[0].id).toBe('market_dash')
    const ids = RACES.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(RACES_BY_ID[id]).toBe(RACES.find((r) => r.id === id))
  })

  it('every race has three opponents, a compiled track and four reward tiers', () => {
    for (const race of RACES) {
      expect(race.opponents).toHaveLength(3)
      expect(race.track.lengthM).toBeGreaterThan(100)
      expect(race.rewards).toHaveLength(4)
      // Rewards should get worse further down the podium.
      for (let i = 1; i < race.rewards.length; i++) {
        expect(race.rewards[i].coins).toBeLessThan(race.rewards[i - 1].coins)
      }
    }
  })

  it('gets harder from race to race: top speeds ratchet up across the roster', () => {
    const avgTopSpeed = (race: (typeof RACES)[number]) =>
      race.opponents.reduce((sum, o) => sum + o.stats.topSpeed, 0) / race.opponents.length
    for (let i = 1; i < RACES.length; i++) {
      expect(avgTopSpeed(RACES[i])).toBeGreaterThan(avgTopSpeed(RACES[i - 1]))
    }
  })

  it('every race simulates cleanly: all racers finish, placements are ordered', () => {
    const stats: RacerStats = { topSpeed: 9.0, acceleration: 1.7, handling: 0.5 }
    for (const race of RACES) {
      const out = simulateRace(race, { name: 'Buster', stats }, 123)
      expect(out.placements).toHaveLength(1 + race.opponents.length)
      for (const p of out.placements) expect(p.timeS).not.toBeNull()
      const times = out.placements.map((p) => p.timeS!)
      expect([...times].sort((a, b) => a - b)).toEqual(times)
    }
  })

  it('a maxed-out dog is competitive even in the final Fight Cave gauntlet', () => {
    // Roughly the best stats reachable through the workshop's top tiers.
    const maxedStats: RacerStats = { topSpeed: 13.0, acceleration: 2.9, handling: 0.66 }
    const race = RACES_BY_ID.tzhaar_fight_cave_gauntlet
    let wins = 0
    for (let seed = 0; seed < 20; seed++) {
      const out = simulateRace(race, { name: 'Buster', stats: maxedStats }, seed)
      if (out.placements[0].isPlayer) wins++
    }
    expect(wins).toBeGreaterThan(0)
  })
})
