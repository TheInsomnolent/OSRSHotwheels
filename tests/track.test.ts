import { describe, expect, it } from 'vitest'
import { compileTrack, corner, cornerSeverity, straight } from '../src/engine/track'
import { RACES_BY_ID } from '../src/data/races'

describe('track compiler', () => {
  it('compiles a simple oval and measures its length', () => {
    const track = compileTrack([
      straight(40),
      corner(-180, 10),
      straight(40),
      corner(-180, 10),
    ])
    expect(track.lengthM).toBeCloseTo(80 + 2 * Math.PI * 10, 3)
    expect(track.corners).toHaveLength(2)
    expect(track.corners[0].at).toBeCloseTo(40, 3)
    expect(track.corners[0].lengthM).toBeCloseTo(Math.PI * 10, 3)
  })

  it('rejects a loop that does not close', () => {
    expect(() => compileTrack([straight(40), corner(-180, 10), straight(40)])).toThrow(
      /does not close/,
    )
    expect(() =>
      compileTrack([straight(40), corner(-180, 10), straight(50), corner(-180, 10)]),
    ).toThrow(/does not close/)
  })

  it('recentres the loop so its bounding box sits on the origin', () => {
    const track = compileTrack([
      straight(40),
      corner(-180, 10),
      straight(40),
      corner(-180, 10),
    ])
    let minX = Infinity
    let maxX = -Infinity
    let minZ = Infinity
    let maxZ = -Infinity
    for (let d = 0; d < track.lengthM; d += 0.5) {
      const p = track.pointAt(d)
      minX = Math.min(minX, p.x)
      maxX = Math.max(maxX, p.x)
      minZ = Math.min(minZ, p.z)
      maxZ = Math.max(maxZ, p.z)
    }
    expect(minX + maxX).toBeCloseTo(0, 1)
    expect(minZ + maxZ).toBeCloseTo(0, 1)
    expect(track.halfW).toBeCloseTo((maxX - minX) / 2, 1)
    expect(track.halfD).toBeCloseTo((maxZ - minZ) / 2, 1)
  })

  it('pointAt wraps around the lap and moves at unit speed', () => {
    const track = compileTrack([
      straight(40),
      corner(-180, 10),
      straight(40),
      corner(-180, 10),
    ])
    const start = track.pointAt(0)
    const wrapped = track.pointAt(track.lengthM)
    expect(wrapped.x).toBeCloseTo(start.x, 3)
    expect(wrapped.z).toBeCloseTo(start.z, 3)
    // Successive samples should be ~1m apart everywhere (straight or arc).
    for (let d = 0; d < track.lengthM; d += 7) {
      const a = track.pointAt(d)
      const b = track.pointAt(d + 1)
      expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeCloseTo(1, 1)
    }
  })

  it('tighter corners are more severe, within bounds', () => {
    expect(cornerSeverity(6)).toBeGreaterThan(cornerSeverity(11))
    expect(cornerSeverity(0.5)).toBeLessThanOrEqual(0.5)
    expect(cornerSeverity(1000)).toBeGreaterThanOrEqual(0.12)
  })

  it('left and right turns curve to opposite sides', () => {
    const right = compileTrack([corner(-360, 8)])
    const left = compileTrack([corner(360, 8)])
    // Mid-arc points should sit on opposite z sides after recentring.
    const rightMid = right.pointAt(Math.PI * 8)
    const leftMid = left.pointAt(Math.PI * 8)
    expect(rightMid.z).toBeCloseTo(-8, 3)
    expect(leftMid.z).toBeCloseTo(8, 3)
  })

  it('the market circuit closes, has hairpins and reasonable extents', () => {
    const track = RACES_BY_ID.market_dash.track
    expect(track.lengthM).toBeGreaterThan(200)
    const hairpins = track.corners.filter((c) => Math.abs(c.angleDeg) === 180)
    expect(hairpins.length).toBe(2)
    // Hairpins are the most severe corners on the circuit.
    const maxSeverity = Math.max(...track.corners.map((c) => c.severity))
    for (const hairpin of hairpins) expect(hairpin.severity).toBeCloseTo(maxSeverity, 5)
  })
})
