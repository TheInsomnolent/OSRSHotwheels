import {
  adamantiteBar,
  adamantiteOre,
  agilityPotion1,
  boltOfCanvas,
  boltOfCotton,
  boltOfLinen,
  bronzeBar,
  coal,
  coins1000,
  constructionIcon,
  copperOre,
  cowhide,
  craftingIcon,
  daeyaltEssence,
  energyPotion1,
  fletchingIcon,
  grimyGuamLeaf,
  grimyHarralander,
  grimyIritLeaf,
  herbloreIcon,
  ironBar,
  ironOre,
  leather,
  logs,
  magicIcon,
  mahoganyLogs,
  farmingIcon,
  mithrilBar,
  mithrilOre,
  miningIcon,
  oakLogs,
  pureEssence,
  rope,
  runeEssence,
  runiteBar,
  runiteOre,
  sailing,
  smithingIcon,
  superEnergy1,
  teakLogs,
  tinOre,
  toDataUrl,
  vialOfWater,
  woodcuttingIcon,
} from '@dava96/osrs-icons'

/**
 * Authentic OSRS inventory sprites for each item id, as `data:` URLs ready
 * for an `<img src>`. Items without a sprite fall back to their emoji icon.
 */
export const ITEM_ICON_URLS: Record<string, string> = toDataUrl({
  coins: coins1000,
  logs,
  oak_logs: oakLogs,
  teak_logs: teakLogs,
  mahogany_logs: mahoganyLogs,
  copper_ore: copperOre,
  tin_ore: tinOre,
  iron_ore: ironOre,
  coal,
  mithril_ore: mithrilOre,
  adamantite_ore: adamantiteOre,
  runite_ore: runiteOre,
  bronze_bar: bronzeBar,
  iron_bar: ironBar,
  mithril_bar: mithrilBar,
  adamant_bar: adamantiteBar,
  rune_bar: runiteBar,
  grimy_guam: grimyGuamLeaf,
  grimy_harralander: grimyHarralander,
  grimy_irit: grimyIritLeaf,
  cowhide,
  leather,
  vial_of_water: vialOfWater,
  linen: boltOfLinen,
  canvas: boltOfCanvas,
  cotton: boltOfCotton,
  rope,
  rune_essence: runeEssence,
  pure_essence: pureEssence,
  daeyalt_essence: daeyaltEssence,
  guam_vigour_potion: energyPotion1,
  harralander_haste_potion: superEnergy1,
  irit_surefoot_potion: agilityPotion1,
})

export function itemIconUrl(id: string): string | undefined {
  return ITEM_ICON_URLS[id]
}

/**
 * Authentic OSRS stats-tab skill icons, as `data:` URLs ready for an
 * `<img src>`. Sailing has no dedicated stats icon in the source pack, so it
 * falls back to the larger skill-guide icon.
 */
export const SKILL_ICON_URLS: Record<string, string> = toDataUrl({
  woodcutting: woodcuttingIcon,
  mining: miningIcon,
  smithing: smithingIcon,
  fletching: fletchingIcon,
  crafting: craftingIcon,
  construction: constructionIcon,
  herblore: herbloreIcon,
  farming: farmingIcon,
  magic: magicIcon,
  sailing,
})

export function skillIconUrl(id: string): string | undefined {
  return SKILL_ICON_URLS[id]
}
