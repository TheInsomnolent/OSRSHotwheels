import type { ActivityDef, GameState } from './types'
import { ACTIVITIES } from '../data/activities'
import { UPGRADE_SLOTS } from '../data/upgrades'
import { ITEMS } from '../data/items'
import { nextTier } from './workshop'

/**
 * Items the player still has a use for: everything costed by the next
 * buildable tier of each upgrade slot (upgrades are strictly sequential, so
 * later tiers are not yet valid projects), plus race potions, expanded
 * transitively through processing recipes (bars need ores, potions need
 * herbs and vials, and so on).
 */
export function neededItems(state: GameState): Set<string> {
  const needed = new Set<string>()
  for (const slotDef of UPGRADE_SLOTS) {
    const next = nextTier(state, slotDef.slot)
    if (!next) continue
    for (const c of next.cost) needed.add(c.item)
  }
  // Potions are consumed every race, so brewing supplies always matter.
  for (const item of ITEMS) {
    if (item.potion) needed.add(item.id)
  }
  // Close the set over recipes: if an output is needed, its inputs are too.
  let changed = true
  while (changed) {
    changed = false
    for (const activity of ACTIVITIES) {
      if (!activity.inputs?.length) continue
      if (!activity.outputs.some((o) => needed.has(o.item))) continue
      for (const input of activity.inputs) {
        if (!needed.has(input.item)) {
          needed.add(input.item)
          changed = true
        }
      }
    }
  }
  return needed
}

/** An activity earns a spot on the board while any of its outputs is needed. */
export function isActivityRelevant(activity: ActivityDef, needed: Set<string>): boolean {
  return activity.outputs.some((o) => needed.has(o.item))
}

/** Activities worth showing right now (the current activity always shows). */
export function relevantActivities(state: GameState): ActivityDef[] {
  const needed = neededItems(state)
  return ACTIVITIES.filter(
    (a) => a.id === state.currentActivity || isActivityRelevant(a, needed),
  )
}
