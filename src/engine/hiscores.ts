import type { SkillId } from './types'
import { clampLevel } from './xp'

/**
 * Old School RuneScape hiscores lookup.
 *
 * Uses the JSON "lite" endpoint and matches skills by name, so new skills
 * (hello, Sailing) slot in automatically if Jagex adds them to the hiscores.
 * The hiscores API does not send CORS headers, so from a browser we fall
 * back to public CORS proxies. Skills absent from the response default to
 * "unknown" and are left at their current in-game value.
 */

export const HISCORE_ENDPOINT =
  'https://secure.runescape.com/m=hiscore_oldschool/index_lite.json?player='

const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
]

/** Skill names as they appear on the hiscores, mapped to our skill ids. */
const HISCORE_NAME_TO_SKILL: Record<string, SkillId> = {
  woodcutting: 'woodcutting',
  mining: 'mining',
  smithing: 'smithing',
  fletching: 'fletching',
  crafting: 'crafting',
  construction: 'construction',
  herblore: 'herblore',
  farming: 'farming',
  magic: 'magic',
  sailing: 'sailing',
}

export type HiscoreLevels = Partial<Record<SkillId, number>>

/** Parse the JSON body of index_lite.json. Throws on malformed payloads. */
export function parseHiscores(payload: unknown): HiscoreLevels {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Malformed hiscores response')
  }
  const skills = (payload as { skills?: unknown }).skills
  if (!Array.isArray(skills)) throw new Error('Malformed hiscores response: no skills array')

  const levels: HiscoreLevels = {}
  for (const entry of skills) {
    if (typeof entry !== 'object' || entry === null) continue
    const { name, level } = entry as { name?: unknown; level?: unknown }
    if (typeof name !== 'string' || typeof level !== 'number') continue
    const skill = HISCORE_NAME_TO_SKILL[name.toLowerCase()]
    if (skill) levels[skill] = clampLevel(level)
  }
  return levels
}

export function validRsn(rsn: string): boolean {
  return /^[a-zA-Z0-9 _-]{1,12}$/.test(rsn.trim())
}

/**
 * Fetch a player's levels from the OSRS hiscores, trying the API directly
 * and then via CORS proxies. Throws if every route fails or the player is
 * not ranked.
 */
export async function fetchHiscores(
  rsn: string,
  fetchFn: typeof fetch = fetch,
): Promise<HiscoreLevels> {
  const target = HISCORE_ENDPOINT + encodeURIComponent(rsn.trim())
  const urls = [target, ...CORS_PROXIES.map((wrap) => wrap(target))]

  let lastError: unknown = new Error('Hiscores lookup failed')
  for (const url of urls) {
    try {
      const res = await fetchFn(url, { headers: { accept: 'application/json' } })
      if (res.status === 404) throw new PlayerNotRankedError(rsn)
      if (!res.ok) throw new Error(`Hiscores responded with ${res.status}`)
      return parseHiscores(await res.json())
    } catch (err) {
      if (err instanceof PlayerNotRankedError) throw err
      lastError = err
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

export class PlayerNotRankedError extends Error {
  constructor(rsn: string) {
    super(`"${rsn}" isn't ranked on the OSRS hiscores`)
    this.name = 'PlayerNotRankedError'
  }
}
