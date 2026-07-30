import * as THREE from 'three'
import { mulberry32 } from '../engine/rng'
import type { CompiledTrack } from '../engine/track'

/**
 * The Civitas illa Fortis market square: a sun-baked Varlamore plaza with a
 * dirt racing circuit, striped market stalls, a fountain and a colonnade.
 * Everything is chunky, flat-shaded and low-poly, just how Gielinor likes it.
 */

function lambert(color: number): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color, flatShading: true })
}

function box(w: number, h: number, d: number, color: number, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(color))
  mesh.position.set(x, y, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

/** Build a renderable closed curve from a compiled track's centreline. */
export function createTrackCurve(track: CompiledTrack): THREE.CatmullRomCurve3 {
  const step = 2 // metres between samples; arcs are gentle at this density
  const count = Math.max(24, Math.floor(track.lengthM / step))
  const points: THREE.Vector3[] = []
  for (let i = 0; i < count; i++) {
    const p = track.pointAt((i / count) * track.lengthM)
    points.push(new THREE.Vector3(p.x, 0, p.z))
  }
  const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal')
  curve.arcLengthDivisions = 1200
  return curve
}

const TRACK_WIDTH = 9

/** Build a flat ribbon mesh along the curve for the dirt track. */
function buildTrackRibbon(curve: THREE.CatmullRomCurve3): THREE.Mesh {
  const segments = 240
  const positions: number[] = []
  const indices: number[] = []
  const up = new THREE.Vector3(0, 1, 0)
  for (let i = 0; i <= segments; i++) {
    const u = i / segments
    const point = curve.getPointAt(u)
    const tangent = curve.getTangentAt(u)
    const side = new THREE.Vector3().crossVectors(up, tangent).normalize()
    const half = TRACK_WIDTH / 2
    positions.push(
      point.x + side.x * half, 0.03, point.z + side.z * half,
      point.x - side.x * half, 0.03, point.z - side.z * half,
    )
    if (i < segments) {
      const base = i * 2
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshLambertMaterial({ color: 0xc49a6c, side: THREE.DoubleSide }),
  )
  mesh.receiveShadow = true
  return mesh
}

function buildStall(rng: () => number): THREE.Group {
  const stall = new THREE.Group()
  const canopyPalettes: [number, number][] = [
    [0xb03a2e, 0xf2e8d5],
    [0x1e8449, 0xf2e8d5],
    [0x2874a6, 0xf2e8d5],
    [0xb9770e, 0xf2e8d5],
  ]
  const [c1, c2] = canopyPalettes[Math.floor(rng() * canopyPalettes.length)]
  stall.add(box(2.4, 1.0, 1.7, 0x8a5a2b, 0, 0.5, 0))
  stall.add(box(2.6, 0.12, 1.9, 0xa9743c, 0, 1.05, 0))
  // Canopy poles
  for (const sx of [-1.15, 1.15]) {
    for (const sz of [-0.8, 0.8]) {
      stall.add(box(0.09, 2.1, 0.09, 0x6b4420, sx, 1.05, sz))
    }
  }
  // Striped canopy slats
  for (let i = 0; i < 6; i++) {
    const slat = box(0.46, 0.07, 2.15, i % 2 === 0 ? c1 : c2, -1.15 + 0.46 * i + 0.23, 2.2, 0)
    slat.rotation.z = 0.06
    stall.add(slat)
  }
  // Wares
  for (let i = 0; i < 3; i++) {
    stall.add(
      box(0.32, 0.32, 0.32, [0xd35400, 0xf1c40f, 0x27ae60][i], -0.7 + i * 0.7, 1.27, rng() * 0.6 - 0.3),
    )
  }
  return stall
}

function buildFountain(): THREE.Group {
  const fountain = new THREE.Group()
  const stone = 0xd8cbb0
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.7, 0.9, 10), lambert(stone))
  basin.position.y = 0.45
  basin.castShadow = true
  fountain.add(basin)
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(3.0, 3.0, 0.12, 10),
    new THREE.MeshLambertMaterial({ color: 0x4a90d9 }),
  )
  water.position.y = 0.92
  fountain.add(water)
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 2.2, 8), lambert(stone))
  column.position.y = 1.9
  column.castShadow = true
  fountain.add(column)
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.75, 0.5, 8), lambert(stone))
  bowl.position.y = 3.1
  bowl.castShadow = true
  fountain.add(bowl)
  return fountain
}

function buildColonnadeSegment(): THREE.Group {
  const segment = new THREE.Group()
  const cream = 0xe8dcc0
  for (const sx of [-2.1, 2.1]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 3.4, 7), lambert(cream))
    pillar.position.set(sx, 1.7, 0)
    pillar.castShadow = true
    segment.add(pillar)
    segment.add(box(0.95, 0.22, 0.95, cream, sx, 3.5, 0))
  }
  segment.add(box(5.4, 0.34, 1.15, 0xdccfae, 0, 3.75, 0))
  const roof = box(5.6, 0.5, 1.5, 0xb5651d, 0, 4.15, 0)
  segment.add(roof)
  return segment
}

function buildSpectator(rng: () => number): THREE.Group {
  const person = new THREE.Group()
  const outfits = [0x9b59b6, 0xc0392b, 0x2980b9, 0x27ae60, 0xd4ac0d, 0x7f8c8d, 0xaf601a]
  const skinTones = [0xd9a066, 0x8d5524, 0xeac086, 0x5c3a21]
  const outfit = outfits[Math.floor(rng() * outfits.length)]
  const skin = skinTones[Math.floor(rng() * skinTones.length)]
  const bodyMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.95, 6), lambert(outfit))
  bodyMesh.position.y = 0.65
  bodyMesh.castShadow = true
  person.add(bodyMesh)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 6, 5), lambert(skin))
  head.position.y = 1.32
  head.castShadow = true
  person.add(head)
  person.scale.setScalar(0.9 + rng() * 0.35)
  return person
}

function buildStartArch(curve: THREE.CatmullRomCurve3): THREE.Group {
  const arch = new THREE.Group()
  const start = curve.getPointAt(0)
  const tangent = curve.getTangentAt(0)
  const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tangent).normalize()

  for (const dir of [-1, 1]) {
    const post = box(0.35, 4.4, 0.35, 0x6b4420)
    post.position.copy(start).addScaledVector(side, dir * (TRACK_WIDTH / 2 + 0.6))
    post.position.y = 2.2
    arch.add(post)
  }
  const bannerGeo = new THREE.BoxGeometry(TRACK_WIDTH + 1.6, 1.0, 0.14)
  const banner = new THREE.Mesh(bannerGeo, lambert(0xb03a2e))
  banner.position.copy(start)
  banner.position.y = 4.0
  banner.setRotationFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(tangent.x, tangent.z))
  banner.castShadow = true
  arch.add(banner)

  // Chequered start line painted across the track
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 2; j++) {
      if ((i + j) % 2 === 0) continue
      const square = new THREE.Mesh(
        new THREE.BoxGeometry(TRACK_WIDTH / 8, 0.02, 0.55),
        new THREE.MeshLambertMaterial({ color: 0xf5f0e6 }),
      )
      square.position
        .copy(start)
        .addScaledVector(side, -TRACK_WIDTH / 2 + (i + 0.5) * (TRACK_WIDTH / 8))
        .addScaledVector(tangent, j * 0.55)
      square.position.y = 0.045
      square.setRotationFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(tangent.x, tangent.z))
      arch.add(square)
    }
  }
  return arch
}

/** Nearest-point probe against the track centreline, for safe decoration placement. */
function buildTrackProbe(curve: THREE.CatmullRomCurve3): {
  samples: THREE.Vector3[]
  nearest(x: number, z: number): { point: THREE.Vector3; dist: number }
} {
  const samples: THREE.Vector3[] = []
  const count = 280
  for (let i = 0; i < count; i++) samples.push(curve.getPointAt(i / count))
  return {
    samples,
    nearest(x, z) {
      let best = samples[0]
      let bestDist = Infinity
      for (const sample of samples) {
        const dist = Math.hypot(sample.x - x, sample.z - z)
        if (dist < bestDist) {
          bestDist = dist
          best = sample
        }
      }
      return { point: best, dist: bestDist }
    },
  }
}

/** Assemble the whole market. Deterministic layout via seeded RNG. */
export function buildMarket(scene: THREE.Scene, curve: THREE.CatmullRomCurve3): void {
  const rng = mulberry32(20240325) // Varlamore launch day, of course
  const probe = buildTrackProbe(curve)
  const bounds = new THREE.Box3().setFromPoints(probe.samples)

  // Sun-baked ground, sized to the circuit plus a generous apron
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(bounds.max.x - bounds.min.x + 130, bounds.max.z - bounds.min.z + 100),
    new THREE.MeshLambertMaterial({ color: 0xd9b380 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  // The market plaza fills the open southern infield, well clear of the
  // hairpin complex that dips into the northern half of the circuit.
  const plazaX = 0
  const plazaZ = 13
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(11.5, 18), lambert(0xe2cf9f))
  plaza.rotation.x = -Math.PI / 2
  plaza.position.set(plazaX, 0.015, plazaZ)
  plaza.receiveShadow = true
  scene.add(plaza)

  scene.add(buildTrackRibbon(curve))
  scene.add(buildStartArch(curve))

  const fountain = buildFountain()
  fountain.position.set(plazaX, 0, plazaZ)
  scene.add(fountain)

  // Market stalls arranged around the fountain
  const stallRadius = 7.5
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + 0.35
    const stall = buildStall(rng)
    stall.position.set(
      plazaX + Math.cos(angle) * stallRadius,
      0,
      plazaZ + Math.sin(angle) * stallRadius,
    )
    stall.rotation.y = -angle + Math.PI / 2
    scene.add(stall)
  }

  // Crates and barrels dotted around the plaza rim, kept off the racing line
  for (let placed = 0, attempt = 0; placed < 8 && attempt < 80; attempt++) {
    const angle = rng() * Math.PI * 2
    const radius = 10 + rng() * 3.5
    const x = plazaX + Math.cos(angle) * radius
    const z = plazaZ + Math.sin(angle) * radius
    if (probe.nearest(x, z).dist < 6.5) continue
    placed++
    if (rng() > 0.5) {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.95, 8), lambert(0x8a5a2b))
      barrel.position.set(x, 0.48, z)
      barrel.castShadow = true
      scene.add(barrel)
    } else {
      scene.add(box(0.8, 0.8, 0.8, 0xa9743c, x, 0.4, z))
    }
  }

  // Colonnade around the whole square, framing the circuit
  const margin = 8
  const spacing = 7.2
  const west = bounds.min.x - margin
  const east = bounds.max.x + margin
  const north = bounds.min.z - margin
  const south = bounds.max.z + margin
  const colonnade = (x: number, z: number, ry: number) => {
    const segment = buildColonnadeSegment()
    segment.position.set(x, 0, z)
    segment.rotation.y = ry
    scene.add(segment)
  }
  for (let x = west + spacing / 2; x <= east - spacing / 2; x += spacing) {
    colonnade(x, north, 0)
    colonnade(x, south, 0)
  }
  for (let z = north + spacing; z <= south - spacing; z += spacing) {
    colonnade(west, z, Math.PI / 2)
    colonnade(east, z, Math.PI / 2)
  }

  // An adoring crowd scattered alongside the track, facing the racing
  for (let placed = 0, attempt = 0; placed < 46 && attempt < 500; attempt++) {
    const x = bounds.min.x - 5 + rng() * (bounds.max.x - bounds.min.x + 10)
    const z = bounds.min.z - 5 + rng() * (bounds.max.z - bounds.min.z + 10)
    const { point, dist } = probe.nearest(x, z)
    if (dist < 6 || dist > 11) continue
    if (Math.hypot(x - plazaX, z - plazaZ) < 13) continue
    placed++
    const person = buildSpectator(rng)
    person.position.set(x, 0, z)
    person.lookAt(point.x, 1, point.z)
    scene.add(person)
  }
}
