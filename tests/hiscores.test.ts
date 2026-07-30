import { describe, expect, it } from 'vitest'
import {
  PlayerNotRankedError,
  fetchHiscores,
  parseHiscores,
  validRsn,
} from '../src/engine/hiscores'

const SAMPLE = {
  skills: [
    { id: 0, name: 'Overall', rank: 100, level: 1500, xp: 50_000_000 },
    { id: 8, name: 'Woodcutting', rank: 5000, level: 82, xp: 2_500_000 },
    { id: 14, name: 'Mining', rank: 9000, level: 70, xp: 750_000 },
    { id: 13, name: 'Smithing', rank: 11000, level: 65, xp: 460_000 },
    { id: 9, name: 'Fletching', rank: 2000, level: 91, xp: 6_000_000 },
    { id: 12, name: 'Crafting', rank: 15000, level: 60, xp: 280_000 },
    { id: 22, name: 'Construction', rank: 25000, level: 55, xp: 170_000 },
    { id: 15, name: 'Herblore', rank: 30000, level: 50, xp: 102_000 },
    { id: 19, name: 'Farming', rank: 1000, level: 99, xp: 13_100_000 },
    { id: 6, name: 'Magic', rank: 8000, level: 88, xp: 4_500_000 },
  ],
  activities: [{ id: 0, name: 'League Points', rank: -1, score: -1 }],
}

describe('hiscores parsing', () => {
  it('extracts the skills the minigame cares about, by name', () => {
    const levels = parseHiscores(SAMPLE)
    expect(levels).toEqual({
      woodcutting: 82,
      mining: 70,
      smithing: 65,
      fletching: 91,
      crafting: 60,
      construction: 55,
      herblore: 50,
      farming: 99,
      magic: 88,
    })
    // Sailing isn't on the hiscores (yet); it stays undefined.
    expect(levels.sailing).toBeUndefined()
  })

  it('picks up Sailing automatically if Jagex ships it', () => {
    const withSailing = {
      skills: [...SAMPLE.skills, { id: 23, name: 'Sailing', rank: 1, level: 42, xp: 50_000 }],
    }
    expect(parseHiscores(withSailing).sailing).toBe(42)
  })

  it('clamps absurd levels and skips malformed entries', () => {
    const messy = {
      skills: [
        { name: 'Mining', level: 12345, xp: 1 },
        { name: 'Magic' }, // missing level
        'not-an-object',
        { name: 42, level: 42 },
      ],
    }
    expect(parseHiscores(messy)).toEqual({ mining: 99 })
  })

  it('throws on malformed payloads', () => {
    expect(() => parseHiscores(null)).toThrow()
    expect(() => parseHiscores({})).toThrow()
    expect(() => parseHiscores({ skills: 'nope' })).toThrow()
  })

  it('validates RSNs', () => {
    expect(validRsn('Zezima')).toBe(true)
    expect(validRsn('a b-c_1')).toBe(true)
    expect(validRsn('')).toBe(false)
    expect(validRsn('waaaaay too long name')).toBe(false)
    expect(validRsn('bad!chars')).toBe(false)
  })
})

describe('fetchHiscores', () => {
  it('returns parsed levels from the first working endpoint', async () => {
    const fetchFn = (async () => ({
      ok: true,
      status: 200,
      json: async () => SAMPLE,
    })) as unknown as typeof fetch
    const levels = await fetchHiscores('Zezima', fetchFn)
    expect(levels.farming).toBe(99)
  })

  it('falls back to a proxy when direct access fails (CORS)', async () => {
    let calls = 0
    const fetchFn = (async () => {
      calls++
      if (calls === 1) throw new TypeError('Failed to fetch')
      return { ok: true, status: 200, json: async () => SAMPLE }
    }) as unknown as typeof fetch
    const levels = await fetchHiscores('Zezima', fetchFn)
    expect(calls).toBe(2)
    expect(levels.magic).toBe(88)
  })

  it('reports unranked players distinctly', async () => {
    const fetchFn = (async () => ({
      ok: false,
      status: 404,
      json: async () => ({}),
    })) as unknown as typeof fetch
    await expect(fetchHiscores('nobody', fetchFn)).rejects.toBeInstanceOf(PlayerNotRankedError)
  })

  it('throws when every route fails', async () => {
    const fetchFn = (async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof fetch
    await expect(fetchHiscores('Zezima', fetchFn)).rejects.toThrow('Failed to fetch')
  })
})
