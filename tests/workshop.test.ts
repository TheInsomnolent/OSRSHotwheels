import { describe, expect, it } from 'vitest'
import { buildUpgrade, canAfford, computeStats, nextTier } from '../src/engine/workshop'
import { defaultState } from '../src/engine/state'
import { BASE_DOG_STATS } from '../src/data/upgrades'

const T0 = 1_000_000

describe('workshop', () => {
  it('reports the next buildable tier per slot', () => {
    const state = defaultState(T0)
    expect(nextTier(state, 'frame')?.id).toBe('frame_wood')
    state.upgrades.frame = 1
    expect(nextTier(state, 'frame')?.id).toBe('frame_oak')
    state.upgrades.frame = 4
    expect(nextTier(state, 'frame')).toBeUndefined()
  })

  it('refuses builds without the level', () => {
    const state = defaultState(T0)
    state.inventory.bronze_bar = 99
    const result = buildUpgrade(state, 'axles', 1)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('level')
  })

  it('refuses builds without the resources', () => {
    const state = defaultState(T0)
    state.inventory.logs = 5
    const result = buildUpgrade(state, 'frame', 1)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('resources')
    expect(canAfford(state, nextTier(state, 'frame')!)).toBe(false)
  })

  it('builds sequentially and consumes resources', () => {
    const state = defaultState(T0)
    state.inventory.logs = 25

    // Can't skip to tier 2.
    expect(buildUpgrade(state, 'frame', 2).ok).toBe(false)

    const result = buildUpgrade(state, 'frame', 1)
    expect(result.ok).toBe(true)
    expect(state.upgrades.frame).toBe(1)
    expect(state.inventory.logs).toBe(5)

    // Can't rebuild an owned tier.
    expect(buildUpgrade(state, 'frame', 1).reason).toBe('already-owned')
  })

  it('computes stats from parts, enchants and potions', () => {
    const state = defaultState(T0)
    const base = computeStats(state)
    expect(base).toEqual(BASE_DOG_STATS)

    state.upgrades.frame = 1 // +0.2 speed +0.15 accel
    state.upgrades.harness = 1 // +0.1 handling
    const parts = computeStats(state)
    expect(parts.topSpeed).toBeCloseTo(6.7)
    expect(parts.acceleration).toBeCloseTo(1.35)
    expect(parts.handling).toBeCloseTo(0.4)

    state.upgrades.enchant = 1 // ×1.03 speed & accel
    const enchanted = computeStats(state)
    expect(enchanted.topSpeed).toBeCloseTo(6.7 * 1.03)
    expect(enchanted.acceleration).toBeCloseTo(1.35 * 1.03)
    expect(enchanted.handling).toBeCloseTo(0.4)

    const potioned = computeStats(state, 'harralander_haste_potion')
    expect(potioned.topSpeed).toBeCloseTo((6.7 + 1.0) * 1.03)
  })

  it('caps handling below 1', () => {
    const state = defaultState(T0)
    state.upgrades.harness = 3
    state.upgrades.aero = 3
    const stats = computeStats(state, 'irit_surefoot_potion')
    expect(stats.handling).toBeLessThanOrEqual(0.95)
  })
})
