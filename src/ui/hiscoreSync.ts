import type { SkillId } from '../engine/types'
import { SKILLS } from '../data/skills'
import { PlayerNotRankedError } from '../engine/hiscores'
import type { HiscoreLevels } from '../engine/hiscores'
import type { GameCtx } from './context'

/** Copy fetched hiscore levels into the game state. Returns "Mining 70"-style labels. */
export function applyHiscoreLevels(ctx: GameCtx, rsn: string, levels: HiscoreLevels): string[] {
  ctx.state.rsn = rsn
  const found: string[] = []
  for (const skill of SKILLS) {
    const level = levels[skill.id as SkillId]
    if (level !== undefined) {
      ctx.state.skills[skill.id] = level
      found.push(`${skill.name} ${level}`)
    }
  }
  ctx.save()
  return found
}

/** A player-facing explanation for a failed hiscores lookup. */
export function hiscoreErrorMessage(error: unknown): string {
  if (error instanceof PlayerNotRankedError) {
    return `${error.message}. You can set levels by hand in the Skills tab.`
  }
  return (
    'Couldn\u2019t reach the hiscores (the API blocks browsers sometimes). ' +
    'Set your levels by clicking skills in the Skills tab.'
  )
}
