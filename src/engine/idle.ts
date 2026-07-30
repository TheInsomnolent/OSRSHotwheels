import type { ActivityDef, GameState, ItemStack } from './types'
import { ACTIVITIES_BY_ID } from '../data/activities'
import { addItem, itemCount, removeItem } from './state'

/** Offline progress is capped at 12 hours, like any respectable idle game. */
export const OFFLINE_CAP_MS = 12 * 60 * 60 * 1000

export interface IdleReport {
  activity: ActivityDef | null
  actions: number
  gained: ItemStack[]
  consumed: ItemStack[]
  /** Set when a processing activity ran out of inputs. */
  starved: boolean
}

/** Milliseconds per action for a player level; each level above the requirement shaves 0.5% off, down to 60%. */
export function actionMs(def: ActivityDef, level: number): number {
  const speedup = Math.max(0.6, 1 - 0.005 * Math.max(0, level - def.levelReq))
  return Math.max(250, Math.round(def.baseMs * speedup))
}

export function canStartActivity(state: GameState, def: ActivityDef): boolean {
  return (state.skills[def.skill] ?? 1) >= def.levelReq
}

/** How many actions the inventory can feed. Infinity for gathering activities. */
function actionsSupportedByInputs(state: GameState, def: ActivityDef): number {
  if (!def.inputs || def.inputs.length === 0) return Number.POSITIVE_INFINITY
  let limit = Number.POSITIVE_INFINITY
  for (const input of def.inputs) {
    limit = Math.min(limit, Math.floor(itemCount(state, input.item) / input.qty))
  }
  return limit
}

/**
 * Advance the idle engine to `now`, producing and consuming resources.
 * Mutates `state` and returns a report of what happened (for the chatbox).
 */
export function processIdle(state: GameState, now: number): IdleReport {
  const report: IdleReport = {
    activity: null,
    actions: 0,
    gained: [],
    consumed: [],
    starved: false,
  }

  const def = state.currentActivity ? ACTIVITIES_BY_ID[state.currentActivity] : undefined
  if (!def) {
    state.currentActivity = null
    state.lastProcessed = now
    return report
  }
  report.activity = def

  if (!canStartActivity(state, def)) {
    // Levels may have dropped after a hiscores refresh; stop gracefully.
    state.currentActivity = null
    state.lastProcessed = now
    return report
  }

  let elapsed = now - state.lastProcessed
  if (elapsed <= 0) return report
  if (elapsed > OFFLINE_CAP_MS) {
    elapsed = OFFLINE_CAP_MS
    state.lastProcessed = now - OFFLINE_CAP_MS
  }

  const perAction = actionMs(def, state.skills[def.skill] ?? 1)
  const possible = Math.floor(elapsed / perAction)
  if (possible <= 0) return report

  const supported = actionsSupportedByInputs(state, def)
  const actions = Math.min(possible, supported)

  if (actions > 0) {
    for (const input of def.inputs ?? []) {
      removeItem(state, input.item, input.qty * actions)
      report.consumed.push({ item: input.item, qty: input.qty * actions })
    }
    for (const output of def.outputs) {
      addItem(state, output.item, output.qty * actions)
      report.gained.push({ item: output.item, qty: output.qty * actions })
    }
    report.actions = actions
  }

  if (supported < possible) {
    // Ran out of inputs part-way; stop the activity like OSRS would ("You have
    // run out of ores."). Unused time is not banked.
    report.starved = true
    state.currentActivity = null
    state.lastProcessed = now
  } else {
    state.lastProcessed += actions * perAction
  }
  return report
}

/** Set (or clear) the current activity. Returns false if the level gate fails. */
export function setActivity(state: GameState, activityId: string | null, now: number): boolean {
  // Bank any outstanding progress on the old task first.
  processIdle(state, now)
  if (activityId === null) {
    state.currentActivity = null
    state.lastProcessed = now
    return true
  }
  const def = ACTIVITIES_BY_ID[activityId]
  if (!def || !canStartActivity(state, def)) return false
  state.currentActivity = activityId
  state.lastProcessed = now
  return true
}
