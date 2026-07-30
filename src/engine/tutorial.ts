/**
 * The guided tutorial that interrupts the opening "Hotwheels" cinematic.
 *
 * The cinematic stops at the smith's parts list and hands the player the game
 * with most of it hidden: first gather the materials for the entry-level
 * frame, axles, wheels and harness, then build them in the workshop, then take
 * the finished chair out on the "Test Drive". Once that lap is done the
 * cinematic finishes and the game opens up.
 */

import type { GameState, ItemStack, RaceDef, TutorialStage } from './types'
import { RACES, TEST_DRIVE_RACE } from '../data/races'
import { tierDef } from '../data/upgrades'
import { itemName } from '../data/items'
import { itemCount } from './state'
import { REQUIRED_RACE_SLOTS, missingRaceParts } from './workshop'

export type MainTab = 'gather' | 'workshop' | 'race'

export interface TutorialMaterial extends ItemStack {
  /** How many the player currently has. */
  have: number
}

/**
 * Materials still outstanding for the tier-1 frame, axles, wheels and harness.
 * Slots that are already built no longer contribute.
 */
export function tutorialMaterials(state: GameState): TutorialMaterial[] {
  const wanted = new Map<string, number>()
  for (const slot of REQUIRED_RACE_SLOTS) {
    if ((state.upgrades[slot] ?? 0) >= 1) continue
    const tier = tierDef(slot, 1)
    if (!tier) continue
    for (const cost of tier.cost) wanted.set(cost.item, (wanted.get(cost.item) ?? 0) + cost.qty)
  }
  return [...wanted].map(([item, qty]) => ({ item, qty, have: itemCount(state, item) }))
}

/** True once the player can afford every basic wheelchair part they still need. */
export function hasTutorialMaterials(state: GameState): boolean {
  return tutorialMaterials(state).every((m) => m.have >= m.qty)
}

/**
 * Move the tutorial on if the player has met the current stage's goal.
 * Returns the stage moved to, or null if nothing changed. The final step
 * ('test_drive' -> 'done') is driven by finishing the test drive itself.
 */
export function advanceTutorial(state: GameState): TutorialStage | null {
  const before = state.tutorial
  if (state.tutorial === 'gather' && hasTutorialMaterials(state)) state.tutorial = 'workshop'
  if (state.tutorial === 'workshop' && missingRaceParts(state).length === 0) {
    state.tutorial = 'test_drive'
  }
  return state.tutorial === before ? null : state.tutorial
}

/** Mark the tutorial finished; the cinematic's finale plays next. */
export function completeTutorial(state: GameState): void {
  state.tutorial = 'done'
}

/** Tabs are revealed one at a time as the tutorial progresses. */
export function isTabUnlocked(state: GameState, tab: MainTab): boolean {
  if (tab === 'workshop') return state.tutorial !== 'intro' && state.tutorial !== 'gather'
  if (tab === 'race') return state.tutorial === 'test_drive' || state.tutorial === 'done'
  return true
}

export function unlockedTabs(state: GameState, tabs: MainTab[]): MainTab[] {
  return tabs.filter((tab) => isTabUnlocked(state, tab))
}

/**
 * Races unlock progressively: the Fortis Market Dash is always open, and each
 * further race unlocks once its predecessor on the roster has been won at
 * least once.
 */
export function isRaceUnlocked(state: GameState, race: RaceDef): boolean {
  const index = RACES.findIndex((r) => r.id === race.id)
  if (index <= 0) return true
  return (state.raceWins[RACES[index - 1].id] ?? 0) > 0
}

/** How many races on the roster are currently unlocked. */
export function unlockedRaceCount(state: GameState): number {
  let count = 1
  while (count < RACES.length && (state.raceWins[RACES[count - 1].id] ?? 0) > 0) count++
  return count
}

/**
 * Races on offer: only the Test Drive during that stage of the tutorial;
 * once the tutorial is over, every unlocked race plus the next one up
 * (shown locked, as a preview of what's coming).
 */
export function visibleRaces(state: GameState): RaceDef[] {
  if (state.tutorial === 'test_drive') return [TEST_DRIVE_RACE]
  return RACES.slice(0, Math.min(unlockedRaceCount(state) + 1, RACES.length))
}

/** Test drives are a shakedown lap: no prizes, no bookie, no win counter. */
export function isTestDrive(race: RaceDef): boolean {
  return race.id === TEST_DRIVE_RACE.id
}

/** A one-line nudge shown above the panels while the tutorial is running. */
export function tutorialHint(state: GameState): string | null {
  if (state.tutorial === 'intro' || state.tutorial === 'gather') {
    const outstanding = tutorialMaterials(state).filter((m) => m.have < m.qty)
    if (outstanding.length === 0) return null
    return (
      'Gather the materials the smith asked for: ' +
      outstanding.map((m) => `${m.have}/${m.qty} ${itemName(m.item)}`).join(', ') +
      '.'
    )
  }
  if (state.tutorial === 'workshop') {
    const missing = missingRaceParts(state)
    return (
      'Head to the Workshop and build the basic wheelchair: ' +
      missing.map((slot) => slot.name.toLowerCase()).join(', ') +
      ' still to go.'
    )
  }
  if (state.tutorial === 'test_drive') {
    return 'Open the Race tab and take the Test Drive for a shakedown lap.'
  }
  return null
}
