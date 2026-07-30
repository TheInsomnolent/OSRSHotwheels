/** Item definitions for the idle economy. */

export interface ItemInfo {
  id: string
  name: string
  icon: string
  /** Potions have race effects; everything else is a resource. */
  potion?: { stat: 'topSpeed' | 'acceleration' | 'handling'; bonus: number }
}

export const ITEMS: ItemInfo[] = [
  { id: 'coins', name: 'Coins', icon: '🪙' },
  // Woodcutting
  { id: 'logs', name: 'Logs', icon: '🪵' },
  { id: 'oak_logs', name: 'Oak logs', icon: '🪵' },
  { id: 'teak_logs', name: 'Teak logs', icon: '🪵' },
  { id: 'mahogany_logs', name: 'Mahogany logs', icon: '🪵' },
  // Mining
  { id: 'copper_ore', name: 'Copper ore', icon: '🪨' },
  { id: 'tin_ore', name: 'Tin ore', icon: '🪨' },
  { id: 'iron_ore', name: 'Iron ore', icon: '🪨' },
  { id: 'coal', name: 'Coal', icon: '🪨' },
  { id: 'mithril_ore', name: 'Mithril ore', icon: '🪨' },
  { id: 'adamantite_ore', name: 'Adamantite ore', icon: '🪨' },
  { id: 'runite_ore', name: 'Runite ore', icon: '🪨' },
  // Smithing
  { id: 'bronze_bar', name: 'Bronze bar', icon: '🧱' },
  { id: 'iron_bar', name: 'Iron bar', icon: '🧱' },
  { id: 'mithril_bar', name: 'Mithril bar', icon: '🧱' },
  { id: 'adamant_bar', name: 'Adamant bar', icon: '🧱' },
  { id: 'rune_bar', name: 'Rune bar', icon: '🧱' },
  // Farming
  { id: 'grimy_guam', name: 'Grimy guam leaf', icon: '🌿' },
  { id: 'grimy_harralander', name: 'Grimy harralander', icon: '🌿' },
  { id: 'grimy_irit', name: 'Grimy irit leaf', icon: '🌿' },
  { id: 'cowhide', name: 'Cowhide', icon: '🐄' },
  // Crafting
  { id: 'leather', name: 'Leather', icon: '🟫' },
  { id: 'vial_of_water', name: 'Vial of water', icon: '🧴' },
  // Sailing
  { id: 'sailcloth', name: 'Sailcloth', icon: '⛵' },
  { id: 'rope', name: 'Rope', icon: '🪢' },
  // Magic
  { id: 'rune_essence', name: 'Rune essence', icon: '💠' },
  // Herblore potions (race consumables)
  {
    id: 'guam_vigour_potion',
    name: 'Guam vigour potion',
    icon: '🧪',
    potion: { stat: 'acceleration', bonus: 0.5 },
  },
  {
    id: 'harralander_haste_potion',
    name: 'Harralander haste potion',
    icon: '🧪',
    potion: { stat: 'topSpeed', bonus: 1.0 },
  },
  {
    id: 'irit_surefoot_potion',
    name: 'Irit surefoot potion',
    icon: '🧪',
    potion: { stat: 'handling', bonus: 0.15 },
  },
]

export const ITEMS_BY_ID: Record<string, ItemInfo> = Object.fromEntries(
  ITEMS.map((i) => [i.id, i]),
)

export function itemName(id: string): string {
  return ITEMS_BY_ID[id]?.name ?? id
}
