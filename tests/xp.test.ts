import { describe, expect, it } from 'vitest'
import { clampLevel, levelForXp, xpForLevel } from '../src/engine/xp'

describe('xp table', () => {
  it('matches known OSRS level boundaries', () => {
    expect(xpForLevel(1)).toBe(0)
    expect(xpForLevel(2)).toBe(83)
    expect(xpForLevel(10)).toBe(1154)
    expect(xpForLevel(50)).toBe(101333)
    expect(xpForLevel(92)).toBe(6517253)
    expect(xpForLevel(99)).toBe(13034431)
  })

  it('computes levels from xp', () => {
    expect(levelForXp(0)).toBe(1)
    expect(levelForXp(82)).toBe(1)
    expect(levelForXp(83)).toBe(2)
    expect(levelForXp(13034430)).toBe(98)
    expect(levelForXp(13034431)).toBe(99)
    expect(levelForXp(200_000_000)).toBe(99)
  })

  it('handles junk input', () => {
    expect(levelForXp(-5)).toBe(1)
    expect(levelForXp(Number.NaN)).toBe(1)
    expect(clampLevel(0)).toBe(1)
    expect(clampLevel(120)).toBe(99)
    expect(clampLevel(Number.NaN)).toBe(1)
    expect(clampLevel(56.7)).toBe(57)
  })
})
