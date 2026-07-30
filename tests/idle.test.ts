import { describe, expect, it } from 'vitest'
import { OFFLINE_CAP_MS, actionMs, processIdle, setActivity } from '../src/engine/idle'
import { defaultState } from '../src/engine/state'
import { ACTIVITIES_BY_ID } from '../src/data/activities'

const T0 = 1_000_000

describe('idle engine', () => {
  it('gathers resources over elapsed time', () => {
    const state = defaultState(T0)
    expect(setActivity(state, 'chop_logs', T0)).toBe(true)

    // chop_logs is 4000ms per action at level 1.
    const report = processIdle(state, T0 + 20_000)
    expect(report.actions).toBe(5)
    expect(state.inventory.logs).toBe(5)
    expect(state.lastProcessed).toBe(T0 + 20_000)
  })

  it('banks partial progress between ticks', () => {
    const state = defaultState(T0)
    setActivity(state, 'chop_logs', T0)

    processIdle(state, T0 + 3_000) // not enough for an action
    expect(state.inventory.logs ?? 0).toBe(0)
    processIdle(state, T0 + 4_500) // 4.5s total => 1 action, 0.5s banked
    expect(state.inventory.logs).toBe(1)
    processIdle(state, T0 + 8_000) // 8s total => 2 actions
    expect(state.inventory.logs).toBe(2)
  })

  it('gates activities behind skill levels', () => {
    const state = defaultState(T0)
    expect(setActivity(state, 'chop_mahogany', T0)).toBe(false)
    expect(state.currentActivity).toBeNull()

    state.skills.woodcutting = 50
    expect(setActivity(state, 'chop_mahogany', T0)).toBe(true)
  })

  it('speeds up with higher levels', () => {
    const def = ACTIVITIES_BY_ID.chop_logs
    expect(actionMs(def, 1)).toBe(4000)
    expect(actionMs(def, 51)).toBe(3000) // 50 levels over req => 25% faster
    expect(actionMs(def, 99)).toBe(2400) // 98 levels over req hits the 60% floor
  })

  it('caps offline progress at 12 hours', () => {
    const state = defaultState(T0)
    setActivity(state, 'chop_logs', T0)

    const dayLater = T0 + 24 * 60 * 60 * 1000
    const report = processIdle(state, dayLater)
    expect(report.actions).toBe(OFFLINE_CAP_MS / 4000)
    expect(state.inventory.logs).toBe(OFFLINE_CAP_MS / 4000)
  })

  it('consumes inputs for processing activities and starves gracefully', () => {
    const state = defaultState(T0)
    state.skills.smithing = 10
    state.inventory.copper_ore = 3
    state.inventory.tin_ore = 3
    setActivity(state, 'smelt_bronze', T0)

    // smelt_bronze is 3000ms/action at level 1; level 10 => 4.5% faster (2865ms).
    const report = processIdle(state, T0 + 60_000)
    expect(report.actions).toBe(3)
    expect(report.starved).toBe(true)
    expect(state.inventory.bronze_bar).toBe(3)
    expect(state.inventory.copper_ore).toBeUndefined()
    // Starved time doesn't bank: the clock catches up to now.
    expect(state.lastProcessed).toBe(T0 + 60_000)
  })

  it('stops the activity if levels no longer qualify', () => {
    const state = defaultState(T0)
    state.skills.woodcutting = 15
    setActivity(state, 'chop_oak', T0)
    state.skills.woodcutting = 1 // hiscores refresh went badly

    const report = processIdle(state, T0 + 10_000)
    expect(report.actions).toBe(0)
    expect(state.currentActivity).toBeNull()
  })

  it('banks progress when switching activities', () => {
    const state = defaultState(T0)
    setActivity(state, 'chop_logs', T0)
    setActivity(state, 'mine_copper_tin', T0 + 8_000)
    expect(state.inventory.logs).toBe(2)
    expect(state.currentActivity).toBe('mine_copper_tin')
  })
})
