import { describe, expect, it } from 'vitest'
import {
  SAVE_KEY,
  addItem,
  clearState,
  defaultState,
  itemCount,
  loadState,
  removeItem,
  reviveState,
  saveState,
  serialiseState,
} from '../src/engine/state'

const T0 = 1_000_000

function memoryStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  }
}

describe('game state persistence', () => {
  it('round-trips a save', () => {
    const storage = memoryStorage()
    const state = defaultState(T0)
    state.rsn = 'Zezima'
    state.skills.mining = 70
    state.inventory.logs = 12
    state.upgrades.frame = 2
    state.raceWins.market_dash = 3
    state.currentActivity = 'chop_logs'

    saveState(storage, state)
    const loaded = loadState(storage, T0 + 1000)
    expect(loaded).toEqual(state)
    expect(storage.data.has(SAVE_KEY)).toBe(true)
  })

  it('returns defaults for missing or corrupt saves', () => {
    const storage = memoryStorage()
    expect(loadState(storage, T0)).toEqual(defaultState(T0))

    storage.data.set(SAVE_KEY, '{not json')
    expect(loadState(storage, T0)).toEqual(defaultState(T0))
  })

  it('sanitises hostile or broken saves', () => {
    const revived = reviveState(
      {
        rsn: 'x'.repeat(100),
        skills: { mining: 5000, magic: 'ninety nine', bogus: 50 },
        inventory: { logs: -5, coins: 12.7, junk: 'lots' },
        upgrades: { frame: -2, axles: 3.9 },
        lastProcessed: Number.MAX_SAFE_INTEGER,
        raceWins: { market_dash: 2.5 },
      },
      T0,
    )
    expect(revived.rsn).toHaveLength(12)
    expect(revived.skills.mining).toBe(99)
    expect(revived.skills.magic).toBe(1)
    expect(revived.inventory.logs).toBeUndefined()
    expect(revived.inventory.coins).toBe(12)
    expect(revived.upgrades.frame).toBe(0)
    expect(revived.upgrades.axles).toBe(3)
    // Future timestamps can't be used to farm offline progress.
    expect(revived.lastProcessed).toBeLessThanOrEqual(T0)
    expect(revived.raceWins.market_dash).toBe(2)
  })

  it('migrates legacy item and activity ids from old saves', () => {
    const revived = reviveState(
      {
        inventory: { sailcloth: 7, linen: 2, logs: 3 },
        currentActivity: 'salvage_sailcloth',
      },
      T0,
    )
    expect(revived.inventory.sailcloth).toBeUndefined()
    expect(revived.inventory.linen).toBe(9)
    expect(revived.inventory.logs).toBe(3)
    expect(revived.currentActivity).toBe('weave_linen')

    const essence = reviveState({ currentActivity: 'siphon_essence' }, T0)
    expect(essence.currentActivity).toBe('imbue_rune_essence')
  })

  it('manages inventory stacks', () => {
    const state = defaultState(T0)
    addItem(state, 'logs', 3)
    addItem(state, 'logs', 2)
    expect(itemCount(state, 'logs')).toBe(5)
    expect(removeItem(state, 'logs', 6)).toBe(false)
    expect(removeItem(state, 'logs', 5)).toBe(true)
    expect(state.inventory.logs).toBeUndefined()
    expect(serialiseState(state)).toContain('"version":1')
  })

  it('clears a saved game so the next load starts fresh', () => {
    const storage = memoryStorage()
    const state = defaultState(T0)
    state.rsn = 'Zezima'
    state.introSeen = true
    saveState(storage, state)
    expect(storage.data.has(SAVE_KEY)).toBe(true)

    clearState(storage)
    expect(storage.data.has(SAVE_KEY)).toBe(false)
    expect(loadState(storage, T0)).toEqual(defaultState(T0))
  })
})
