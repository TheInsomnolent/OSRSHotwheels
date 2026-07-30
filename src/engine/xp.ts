/** OSRS experience table helpers. */

const MAX_LEVEL = 99

/** Total XP required to reach each level, index 1..99 (index 0 unused). */
const XP_TABLE: number[] = (() => {
  const table = [0, 0]
  let points = 0
  for (let level = 1; level < MAX_LEVEL; level++) {
    points += Math.floor(level + 300 * Math.pow(2, level / 7))
    table.push(Math.floor(points / 4))
  }
  return table
})()

/** Total XP required for a given level (1..99). */
export function xpForLevel(level: number): number {
  const clamped = Math.min(Math.max(Math.floor(level), 1), MAX_LEVEL)
  return XP_TABLE[clamped]
}

/** The level corresponding to a total XP amount (1..99). */
export function levelForXp(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return 1
  for (let level = MAX_LEVEL; level >= 1; level--) {
    if (xp >= XP_TABLE[level]) return level
  }
  return 1
}

/** Clamp an arbitrary number to a valid skill level. */
export function clampLevel(level: number): number {
  if (!Number.isFinite(level)) return 1
  return Math.min(Math.max(Math.round(level), 1), MAX_LEVEL)
}
