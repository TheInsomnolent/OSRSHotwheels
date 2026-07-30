import type { GameState, RacerStats, UpgradeSlot, UpgradeSlotDef, UpgradeTier } from './types'
import { BASE_DOG_STATS, UPGRADE_SLOTS_BY_ID, tierDef } from '../data/upgrades'
import { ITEMS_BY_ID } from '../data/items'
import { itemCount, removeItem } from './state'

export type BuildFailure = 'unknown' | 'already-owned' | 'level' | 'resources'

export interface BuildResult {
  ok: boolean
  reason?: BuildFailure
  tier?: UpgradeTier
}

/** The next tier the player can work towards in a slot (undefined when maxed). */
export function nextTier(state: GameState, slot: UpgradeSlot): UpgradeTier | undefined {
  return tierDef(slot, (state.upgrades[slot] ?? 0) + 1)
}

/** Parts a dog cannot safely race without: no chassis, no start. */
export const REQUIRED_RACE_SLOTS: UpgradeSlot[] = ['frame', 'axles', 'wheels', 'harness']

/** Required part slots (frame, axles, wheels, harness) still missing tier 1. */
export function missingRaceParts(state: GameState): UpgradeSlotDef[] {
  return REQUIRED_RACE_SLOTS.filter((slot) => (state.upgrades[slot] ?? 0) < 1).map(
    (slot) => UPGRADE_SLOTS_BY_ID[slot],
  )
}

export function canAfford(state: GameState, tier: UpgradeTier): boolean {
  return tier.cost.every((c) => itemCount(state, c.item) >= c.qty)
}

export function meetsLevel(state: GameState, tier: UpgradeTier): boolean {
  return (state.skills[tier.skill] ?? 1) >= tier.levelReq
}

/**
 * Build the next tier of a slot, consuming resources.
 * Upgrades are strictly sequential: wooden frame before oak frame, and so on.
 */
export function buildUpgrade(state: GameState, slot: UpgradeSlot, tier: number): BuildResult {
  const def = tierDef(slot, tier)
  if (!def) return { ok: false, reason: 'unknown' }
  if ((state.upgrades[slot] ?? 0) >= tier) return { ok: false, reason: 'already-owned', tier: def }
  if ((state.upgrades[slot] ?? 0) !== tier - 1) return { ok: false, reason: 'unknown', tier: def }
  if (!meetsLevel(state, def)) return { ok: false, reason: 'level', tier: def }
  if (!canAfford(state, def)) return { ok: false, reason: 'resources', tier: def }
  for (const c of def.cost) removeItem(state, c.item, c.qty)
  state.upgrades[slot] = tier
  return { ok: true, tier: def }
}

/**
 * Compute the dog's effective race stats from owned upgrades and an optional
 * potion. Enchantments multiply speed and acceleration after additive parts.
 */
export function computeStats(state: GameState, potionItemId?: string | null): RacerStats {
  let topSpeed = BASE_DOG_STATS.topSpeed
  let acceleration = BASE_DOG_STATS.acceleration
  let handling = BASE_DOG_STATS.handling
  let mult = 1

  for (const slotDef of Object.values(UPGRADE_SLOTS_BY_ID)) {
    const owned = state.upgrades[slotDef.slot] ?? 0
    // Tiers are cumulative in cost but only the owned tier's stats apply.
    const def = tierDef(slotDef.slot, owned)
    if (!def) continue
    topSpeed += def.stats.topSpeed ?? 0
    acceleration += def.stats.acceleration ?? 0
    handling += def.stats.handling ?? 0
    if (def.mult) mult *= def.mult
  }

  if (potionItemId) {
    const potion = ITEMS_BY_ID[potionItemId]?.potion
    if (potion) {
      if (potion.stat === 'topSpeed') topSpeed += potion.bonus
      if (potion.stat === 'acceleration') acceleration += potion.bonus
      if (potion.stat === 'handling') handling += potion.bonus
    }
  }

  return {
    topSpeed: topSpeed * mult,
    acceleration: acceleration * mult,
    handling: Math.min(0.95, handling),
  }
}
