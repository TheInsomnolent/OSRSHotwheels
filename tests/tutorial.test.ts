import { describe, expect, it } from 'vitest'
import { defaultState, reviveState } from '../src/engine/state'
import {
  advanceTutorial,
  completeTutorial,
  hasTutorialMaterials,
  isRaceUnlocked,
  isTabUnlocked,
  isTestDrive,
  tutorialHint,
  tutorialMaterials,
  unlockedRaceCount,
  visibleRaces,
} from '../src/engine/tutorial'
import { RACES, RACES_BY_ID, TEST_DRIVE_RACE } from '../src/data/races'
import { simulateRace } from '../src/engine/raceSim'
import type { GameState } from '../src/engine/types'

const T0 = 1_000_000

/** A save that has watched the opening cinematic and is gathering materials. */
function gatheringState(): GameState {
  const state = defaultState(T0)
  state.tutorial = 'gather'
  return state
}

/** Everything the smith asks for: 35 logs, 8 bronze bars and 10 leather. */
function stockUp(state: GameState): void {
  for (const material of tutorialMaterials(state)) {
    state.inventory[material.item] = material.qty
  }
}

describe('tutorial stages', () => {
  it('starts a fresh save on the opening cinematic', () => {
    expect(defaultState(T0).tutorial).toBe('intro')
  })

  it('treats saves from before the tutorial as finished', () => {
    expect(reviveState({ introSeen: true }, T0).tutorial).toBe('done')
    expect(reviveState({}, T0).tutorial).toBe('intro')
    expect(reviveState({ tutorial: 'workshop' }, T0).tutorial).toBe('workshop')
    expect(reviveState({ tutorial: 'nonsense' }, T0).tutorial).toBe('intro')
  })

  it('asks for the tier-1 frame, axles, wheels and harness materials', () => {
    const state = gatheringState()
    const wanted = Object.fromEntries(tutorialMaterials(state).map((m) => [m.item, m.qty]))
    // Frame (20 logs) and wheels (15 logs) share the same material.
    expect(wanted).toEqual({ logs: 35, bronze_bar: 8, leather: 10 })
    expect(hasTutorialMaterials(state)).toBe(false)
  })

  it('stops asking for parts already built', () => {
    const state = gatheringState()
    state.upgrades.frame = 1
    state.upgrades.wheels = 1
    expect(tutorialMaterials(state).map((m) => m.item)).toEqual(['bronze_bar', 'leather'])
  })

  it('moves to the workshop once the materials are gathered', () => {
    const state = gatheringState()
    expect(advanceTutorial(state)).toBeNull()
    stockUp(state)
    expect(advanceTutorial(state)).toBe('workshop')
    expect(advanceTutorial(state)).toBeNull()
  })

  it('moves to the test drive once the basic wheelchair is built', () => {
    const state = gatheringState()
    stockUp(state)
    advanceTutorial(state)
    state.upgrades.frame = 1
    state.upgrades.axles = 1
    state.upgrades.wheels = 1
    expect(advanceTutorial(state)).toBeNull()
    state.upgrades.harness = 1
    expect(advanceTutorial(state)).toBe('test_drive')
  })

  it('skips straight to the test drive for a player who already has everything', () => {
    const state = gatheringState()
    for (const slot of ['frame', 'axles', 'wheels', 'harness'] as const) {
      state.upgrades[slot] = 1
    }
    expect(advanceTutorial(state)).toBe('test_drive')
  })

  it('only finishes when the test drive is run', () => {
    const state = defaultState(T0)
    state.tutorial = 'test_drive'
    expect(advanceTutorial(state)).toBeNull()
    completeTutorial(state)
    expect(state.tutorial).toBe('done')
    expect(advanceTutorial(state)).toBeNull()
  })

  it('hints at the current goal, and stays quiet once done', () => {
    const state = gatheringState()
    expect(tutorialHint(state)).toContain('Logs')
    state.tutorial = 'workshop'
    expect(tutorialHint(state)).toContain('Workshop')
    state.tutorial = 'test_drive'
    expect(tutorialHint(state)).toContain('Test Drive')
    state.tutorial = 'done'
    expect(tutorialHint(state)).toBeNull()
  })
})

describe('tutorial tab and race visibility', () => {
  it('reveals the workshop and race tabs one stage at a time', () => {
    const state = defaultState(T0)
    for (const stage of ['intro', 'gather'] as const) {
      state.tutorial = stage
      expect(isTabUnlocked(state, 'gather')).toBe(true)
      expect(isTabUnlocked(state, 'workshop')).toBe(false)
      expect(isTabUnlocked(state, 'race')).toBe(false)
    }

    state.tutorial = 'workshop'
    expect(isTabUnlocked(state, 'workshop')).toBe(true)
    expect(isTabUnlocked(state, 'race')).toBe(false)

    state.tutorial = 'test_drive'
    expect(isTabUnlocked(state, 'race')).toBe(true)

    state.tutorial = 'done'
    for (const tab of ['gather', 'workshop', 'race'] as const) {
      expect(isTabUnlocked(state, tab)).toBe(true)
    }
  })

  it('offers only the test drive during that stage, and hides it afterwards', () => {
    const state = defaultState(T0)
    state.tutorial = 'test_drive'
    expect(visibleRaces(state)).toEqual([TEST_DRIVE_RACE])

    state.tutorial = 'done'
    expect(visibleRaces(state)).not.toContain(TEST_DRIVE_RACE)
  })

  it('unlocks races progressively as each predecessor is won', () => {
    const state = defaultState(T0)
    state.tutorial = 'done'

    // Only the market dash is unlocked to begin with, plus the next race is
    // shown (locked) as a preview.
    expect(unlockedRaceCount(state)).toBe(1)
    expect(isRaceUnlocked(state, RACES[0])).toBe(true)
    expect(isRaceUnlocked(state, RACES[1])).toBe(false)
    expect(visibleRaces(state)).toEqual(RACES.slice(0, 2))

    // Winning the market dash unlocks the Falador park dash.
    state.raceWins[RACES[0].id] = 1
    expect(unlockedRaceCount(state)).toBe(2)
    expect(isRaceUnlocked(state, RACES[1])).toBe(true)
    expect(isRaceUnlocked(state, RACES[2])).toBe(false)
    expect(visibleRaces(state)).toEqual(RACES.slice(0, 3))

    // Winning every race unlocks the whole roster, with nothing left hidden.
    for (const race of RACES) state.raceWins[race.id] = 1
    expect(unlockedRaceCount(state)).toBe(RACES.length)
    expect(visibleRaces(state)).toEqual(RACES)
    expect(RACES.every((race) => isRaceUnlocked(state, race))).toBe(true)
  })
})

describe('the test drive race', () => {
  it('is a single solo lap with no rewards', () => {
    expect(TEST_DRIVE_RACE.opponents).toHaveLength(0)
    expect(TEST_DRIVE_RACE.rewards).toHaveLength(0)
    expect(TEST_DRIVE_RACE.laps).toBe(1)
    expect(isTestDrive(TEST_DRIVE_RACE)).toBe(true)
    expect(RACES.every((race) => !isTestDrive(race))).toBe(true)
  })

  it('runs on the first race map and is still looked up by id', () => {
    expect(TEST_DRIVE_RACE.track).toBe(RACES[0].track)
    expect(RACES_BY_ID[TEST_DRIVE_RACE.id]).toBe(TEST_DRIVE_RACE)
  })

  it('simulates cleanly with the player alone on track', () => {
    const out = simulateRace(
      TEST_DRIVE_RACE,
      { name: 'Scruffius', stats: { topSpeed: 7.2, acceleration: 1.35, handling: 0.35 } },
      42,
    )
    expect(out.placements).toHaveLength(1)
    expect(out.placements[0].isPlayer).toBe(true)
    expect(out.placements[0].timeS).toBeGreaterThan(0)
  })
})
