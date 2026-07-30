import { describe, expect, it } from 'vitest'
import { defaultState } from '../src/engine/state'
import { isActivityRelevant, neededItems, relevantActivities } from '../src/engine/relevance'
import { ACTIVITIES_BY_ID } from '../src/data/activities'

const T0 = 1_000_000

describe('activity relevance', () => {
  it('needs only next-tier materials for a fresh account', () => {
    const needed = neededItems(defaultState(T0))
    // Tier-1 projects: logs (frame & wheels), bronze bars, leather, linen, essence.
    expect(needed.has('logs')).toBe(true)
    expect(needed.has('bronze_bar')).toBe(true)
    expect(needed.has('leather')).toBe(true)
    expect(needed.has('linen')).toBe(true)
    expect(needed.has('rune_essence')).toBe(true)
    // Later tiers aren't valid projects yet.
    expect(needed.has('oak_logs')).toBe(false)
    expect(needed.has('iron_bar')).toBe(false)
    expect(needed.has('canvas')).toBe(false)
    expect(needed.has('cotton')).toBe(false)
    expect(needed.has('pure_essence')).toBe(false)
    expect(needed.has('daeyalt_essence')).toBe(false)
    expect(needed.has('rope')).toBe(false)
  })

  it('expands transitively through processing recipes', () => {
    const needed = neededItems(defaultState(T0))
    // Bronze bars smelt from copper and tin; leather tans from cowhide.
    expect(needed.has('copper_ore')).toBe(true)
    expect(needed.has('tin_ore')).toBe(true)
    expect(needed.has('cowhide')).toBe(true)
    // Coal only enters at mithril and above.
    expect(needed.has('coal')).toBe(false)
  })

  it('always keeps potion brewing supplies relevant', () => {
    const state = defaultState(T0)
    for (const slot of Object.keys(state.upgrades) as (keyof typeof state.upgrades)[]) {
      state.upgrades[slot] = 99
    }
    const needed = neededItems(state)
    expect(needed.has('grimy_guam')).toBe(true)
    expect(needed.has('grimy_irit')).toBe(true)
    expect(needed.has('vial_of_water')).toBe(true)
    expect(needed.has('logs')).toBe(false)
  })

  it('moves the goalposts as tiers are built', () => {
    const state = defaultState(T0)
    state.upgrades.frame = 1
    state.upgrades.wheels = 1
    const needed = neededItems(state)
    expect(needed.has('logs')).toBe(false)
    expect(needed.has('oak_logs')).toBe(true)
  })

  it('filters gathering activities to needed outputs', () => {
    const state = defaultState(T0)
    const ids = relevantActivities(state).map((a) => a.id)
    expect(ids).toContain('chop_logs')
    expect(ids).toContain('mine_copper_tin')
    expect(ids).toContain('smelt_bronze')
    expect(ids).toContain('weave_linen')
    expect(ids).toContain('imbue_rune_essence')
    expect(ids).toContain('brew_guam_vigour')
    expect(ids).not.toContain('chop_oak')
    expect(ids).not.toContain('mine_coal')
    expect(ids).not.toContain('weave_canvas')
    expect(ids).not.toContain('imbue_daeyalt_essence')
    expect(ids).not.toContain('rig_ropes')
  })

  it('never hides the activity the player is running', () => {
    const state = defaultState(T0)
    state.currentActivity = 'chop_mahogany'
    const needed = neededItems(state)
    expect(isActivityRelevant(ACTIVITIES_BY_ID.chop_mahogany, needed)).toBe(false)
    const ids = relevantActivities(state).map((a) => a.id)
    expect(ids).toContain('chop_mahogany')
  })
})
