/**
 * Closed racing circuits built from straights and corners. Corners are
 * defined by a turn angle and a turn radius, so a 180° turn renders as a
 * proper hairpin instead of a mushy double-back. The same definition drives
 * the race simulation (corner speed zones), the 3D track mesh and the
 * minimap, so they can never drift out of sync.
 */

export type TrackSegment =
  | { kind: 'straight'; lengthM: number }
  /** angleDeg > 0 turns left, < 0 turns right (seen from above). */
  | { kind: 'corner'; angleDeg: number; radiusM: number }

export const straight = (lengthM: number): TrackSegment => ({ kind: 'straight', lengthM })
export const corner = (angleDeg: number, radiusM: number): TrackSegment => ({
  kind: 'corner',
  angleDeg,
  radiusM,
})

export interface TrackXZ {
  x: number
  z: number
}

export interface TrackCornerZone {
  /** Metres from the start line to the corner entry. */
  at: number
  /** Arc length of the corner in metres. */
  lengthM: number
  /** Signed turn angle in degrees (+ve left, -ve right). */
  angleDeg: number
  radiusM: number
  /** How hard the corner punishes poor handling, 0..0.6. Tighter radius = higher. */
  severity: number
}

export interface CompiledTrack {
  segments: TrackSegment[]
  /** Total centreline length of one lap in metres. */
  lengthM: number
  /** Corner speed zones, sorted by distance from the start line. */
  corners: TrackCornerZone[]
  /** Centreline position `d` metres past the start line (recentred on the origin). */
  pointAt(d: number): TrackXZ
  /** Half extents of the recentred centreline bounding box. */
  halfW: number
  halfD: number
}

/** Speed-limit severity for a corner radius. Hairpins (~6m) ≈ 0.43, sweepers (~12m) ≈ 0.30. */
export function cornerSeverity(radiusM: number): number {
  return Math.min(0.5, Math.max(0.12, 1.05 / Math.sqrt(radiusM)))
}

interface SegmentState {
  seg: TrackSegment
  /** Distance from the start line to this segment's entry. */
  startDist: number
  startX: number
  startZ: number
  /** Heading in radians; direction of travel is (cos h, sin h) in the XZ plane. */
  startHeading: number
  lengthM: number
}

function segmentLength(seg: TrackSegment): number {
  return seg.kind === 'straight'
    ? seg.lengthM
    : Math.abs((seg.angleDeg * Math.PI) / 180) * seg.radiusM
}

/** Position along one segment, `local` metres past its entry (before recentring). */
function segmentPoint(state: SegmentState, local: number): TrackXZ {
  const { seg, startX, startZ, startHeading } = state
  if (seg.kind === 'straight') {
    return {
      x: startX + Math.cos(startHeading) * local,
      z: startZ + Math.sin(startHeading) * local,
    }
  }
  const sign = Math.sign(seg.angleDeg)
  // Turn centre sits perpendicular to the heading, on the side we turn towards.
  const cx = startX - Math.sin(startHeading) * seg.radiusM * sign
  const cz = startZ + Math.cos(startHeading) * seg.radiusM * sign
  const swept = (local / seg.radiusM) * sign
  const startAngle = Math.atan2(startZ - cz, startX - cx)
  const angle = startAngle + swept
  return { x: cx + Math.cos(angle) * seg.radiusM, z: cz + Math.sin(angle) * seg.radiusM }
}

/**
 * Integrate the segment list into a closed loop starting at the origin
 * heading +x. Throws if the loop doesn't close back on itself.
 */
export function compileTrack(segments: TrackSegment[]): CompiledTrack {
  const states: SegmentState[] = []
  let x = 0
  let z = 0
  let heading = 0
  let dist = 0

  for (const seg of segments) {
    const lengthM = segmentLength(seg)
    const state: SegmentState = { seg, startDist: dist, startX: x, startZ: z, startHeading: heading, lengthM }
    states.push(state)
    const end = segmentPoint(state, lengthM)
    x = end.x
    z = end.z
    if (seg.kind === 'corner') heading += (seg.angleDeg * Math.PI) / 180
    dist += lengthM
  }

  const totalLength = dist
  const gap = Math.hypot(x, z)
  const headingGap = Math.abs(((heading * 180) / Math.PI) % 360)
  const headingOff = Math.min(headingGap, 360 - headingGap)
  if (gap > 0.05 || headingOff > 0.1) {
    throw new Error(
      `Track does not close: ends ${gap.toFixed(2)}m from the start, heading off by ${headingOff.toFixed(2)}°`,
    )
  }

  const rawPointAt = (d: number): TrackXZ => {
    let local = ((d % totalLength) + totalLength) % totalLength
    for (const state of states) {
      if (local <= state.lengthM || state === states[states.length - 1]) {
        return segmentPoint(state, Math.min(local, state.lengthM))
      }
      local -= state.lengthM
    }
    return { x: 0, z: 0 }
  }

  // Recentre the loop's bounding box on the origin so scenes can build around it.
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  const samples = Math.max(64, Math.ceil(totalLength))
  for (let i = 0; i < samples; i++) {
    const p = rawPointAt((i / samples) * totalLength)
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minZ = Math.min(minZ, p.z)
    maxZ = Math.max(maxZ, p.z)
  }
  const cx = (minX + maxX) / 2
  const cz = (minZ + maxZ) / 2

  const corners: TrackCornerZone[] = states
    .filter((s) => s.seg.kind === 'corner')
    .map((s) => {
      const seg = s.seg as Extract<TrackSegment, { kind: 'corner' }>
      return {
        at: s.startDist,
        lengthM: s.lengthM,
        angleDeg: seg.angleDeg,
        radiusM: seg.radiusM,
        severity: cornerSeverity(seg.radiusM),
      }
    })

  return {
    segments,
    lengthM: totalLength,
    corners,
    pointAt(d: number): TrackXZ {
      const p = rawPointAt(d)
      return { x: p.x - cx, z: p.z - cz }
    },
    halfW: (maxX - minX) / 2,
    halfD: (maxZ - minZ) / 2,
  }
}
