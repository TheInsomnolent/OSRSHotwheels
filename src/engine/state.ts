import type { GameState, SkillId, UpgradeSlot } from './types'
import { clampLevel } from './xp'

export const SAVE_KEY = 'osrshotwheels.save.v1'

/** Items renamed by content updates; old saves are migrated on load. */
const LEGACY_ITEMS: Record<string, string> = {
  sailcloth: 'linen',
}

/** Activities renamed by content updates; old saves are migrated on load. */
const LEGACY_ACTIVITIES: Record<string, string> = {
  salvage_sailcloth: 'weave_linen',
  siphon_essence: 'imbue_rune_essence',
}

export const ALL_SKILLS: SkillId[] = [
  'woodcutting',
  'mining',
  'smithing',
  'fletching',
  'crafting',
  'construction',
  'herblore',
  'farming',
  'magic',
  'sailing',
]

export const ALL_SLOTS: UpgradeSlot[] = ['frame', 'axles', 'wheels', 'harness', 'aero', 'enchant']

export function defaultState(now: number = Date.now()): GameState {
  return {
    version: 1,
    rsn: null,
    skills: Object.fromEntries(ALL_SKILLS.map((s) => [s, 1])) as Record<SkillId, number>,
    inventory: {},
    currentActivity: null,
    lastProcessed: now,
    upgrades: Object.fromEntries(ALL_SLOTS.map((s) => [s, 0])) as Record<UpgradeSlot, number>,
    selectedPotion: null,
    raceWins: {},
    dogName: 'Scruffius',
    introSeen: false,
    pendingBet: null,
  }
}

/** Re-shape an untrusted parsed save into a valid GameState. */
export function reviveState(raw: unknown, now: number = Date.now()): GameState {
  const state = defaultState(now)
  if (typeof raw !== 'object' || raw === null) return state
  const data = raw as Record<string, unknown>

  if (typeof data.rsn === 'string' && data.rsn.length > 0) state.rsn = data.rsn.slice(0, 12)
  if (typeof data.dogName === 'string' && data.dogName.length > 0) {
    state.dogName = data.dogName.slice(0, 20)
  }
  if (typeof data.currentActivity === 'string') {
    state.currentActivity = LEGACY_ACTIVITIES[data.currentActivity] ?? data.currentActivity
  }
  if (typeof data.selectedPotion === 'string') state.selectedPotion = data.selectedPotion
  if (data.introSeen === true) state.introSeen = true
  if (typeof data.lastProcessed === 'number' && Number.isFinite(data.lastProcessed)) {
    state.lastProcessed = Math.min(data.lastProcessed, now)
  }

  if (typeof data.skills === 'object' && data.skills !== null) {
    const skills = data.skills as Record<string, unknown>
    for (const id of ALL_SKILLS) {
      if (typeof skills[id] === 'number') state.skills[id] = clampLevel(skills[id])
    }
  }
  if (typeof data.inventory === 'object' && data.inventory !== null) {
    for (const [item, qty] of Object.entries(data.inventory as Record<string, unknown>)) {
      if (typeof qty === 'number' && Number.isFinite(qty) && qty > 0) {
        const id = LEGACY_ITEMS[item] ?? item
        state.inventory[id] = (state.inventory[id] ?? 0) + Math.floor(qty)
      }
    }
  }
  if (typeof data.upgrades === 'object' && data.upgrades !== null) {
    const upgrades = data.upgrades as Record<string, unknown>
    for (const slot of ALL_SLOTS) {
      if (typeof upgrades[slot] === 'number') {
        state.upgrades[slot] = Math.max(0, Math.floor(upgrades[slot]))
      }
    }
  }
  if (typeof data.raceWins === 'object' && data.raceWins !== null) {
    for (const [race, wins] of Object.entries(data.raceWins as Record<string, unknown>)) {
      if (typeof wins === 'number' && wins > 0) state.raceWins[race] = Math.floor(wins)
    }
  }
  if (typeof data.pendingBet === 'object' && data.pendingBet !== null) {
    const bet = data.pendingBet as Record<string, unknown>
    if (
      typeof bet.raceId === 'string' &&
      typeof bet.racerId === 'string' &&
      typeof bet.racerName === 'string' &&
      typeof bet.stake === 'number' &&
      Number.isFinite(bet.stake) &&
      bet.stake > 0 &&
      typeof bet.odds === 'number' &&
      Number.isFinite(bet.odds) &&
      bet.odds >= 1
    ) {
      state.pendingBet = {
        raceId: bet.raceId,
        racerId: bet.racerId,
        racerName: bet.racerName.slice(0, 30),
        stake: Math.floor(bet.stake),
        odds: bet.odds,
      }
    }
  }
  return state
}

export function serialiseState(state: GameState): string {
  return JSON.stringify(state)
}

export function loadState(storage: Pick<Storage, 'getItem'>, now: number = Date.now()): GameState {
  try {
    const raw = storage.getItem(SAVE_KEY)
    if (!raw) return defaultState(now)
    return reviveState(JSON.parse(raw), now)
  } catch {
    return defaultState(now)
  }
}

export function saveState(storage: Pick<Storage, 'setItem'>, state: GameState): void {
  try {
    storage.setItem(SAVE_KEY, serialiseState(state))
  } catch {
    // Storage may be unavailable (private browsing, quota). The game keeps running.
  }
}

/** Wipe the saved game so the next load starts from the very beginning. */
export function clearState(storage: Pick<Storage, 'removeItem'>): void {
  try {
    storage.removeItem(SAVE_KEY)
  } catch {
    // Storage may be unavailable (private browsing, quota); nothing more to do.
  }
}

/** Add items to the inventory. */
export function addItem(state: GameState, item: string, qty: number): void {
  if (qty <= 0) return
  state.inventory[item] = (state.inventory[item] ?? 0) + qty
}

/** Remove items; returns false (and removes nothing) if there aren't enough. */
export function removeItem(state: GameState, item: string, qty: number): boolean {
  const have = state.inventory[item] ?? 0
  if (have < qty) return false
  if (have === qty) delete state.inventory[item]
  else state.inventory[item] = have - qty
  return true
}

export function itemCount(state: GameState, item: string): number {
  return state.inventory[item] ?? 0
}
