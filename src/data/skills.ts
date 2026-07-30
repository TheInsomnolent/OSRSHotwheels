import type { SkillId } from '../engine/types'

export interface SkillInfo {
  id: SkillId
  name: string
  /** What the skill is used for in the minigame. */
  use: string
  /** Small emoji glyph used as an icon in the OSRS-style stats tab. */
  icon: string
}

export const SKILLS: SkillInfo[] = [
  { id: 'woodcutting', name: 'Woodcutting', use: 'Chop logs for frames and wheels', icon: '🪓' },
  { id: 'mining', name: 'Mining', use: 'Mine ores for axles', icon: '⛏️' },
  { id: 'smithing', name: 'Smithing', use: 'Smelt bars and smith axles', icon: '🔨' },
  { id: 'fletching', name: 'Fletching', use: 'Carve perfectly round wheels', icon: '🏹' },
  { id: 'crafting', name: 'Crafting', use: 'Tan leather and craft harnesses', icon: '🧵' },
  { id: 'construction', name: 'Construction', use: 'Construct wheelchair frames', icon: '🏠' },
  { id: 'herblore', name: 'Herblore', use: 'Brew performance-enhancing potions', icon: '🧪' },
  { id: 'farming', name: 'Farming', use: 'Grow herbs and tend cattle', icon: '🌱' },
  { id: 'magic', name: 'Magic', use: 'Enchant the wheelchair', icon: '🪄' },
  { id: 'sailing', name: 'Sailing', use: 'Rig aerodynamic sailcloth', icon: '⛵' },
]

export const SKILL_NAMES: Record<SkillId, string> = Object.fromEntries(
  SKILLS.map((s) => [s.id, s.name]),
) as Record<SkillId, string>
