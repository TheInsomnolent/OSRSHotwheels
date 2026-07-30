import * as THREE from 'three'
import { mulberry32 } from '../engine/rng'

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

/** Closed racing loop around the market: a rounded rectangle on the XZ plane. */
export function createTrackCurve(): THREE.CatmullRomCurve3 {
  const a = 46 // half-width (x)
  const b = 24 // half-depth (z)
  const r = 13 // corner radius
  const points: THREE.Vector3[] = []
  const corner = (cx: number, cz: number, from: number, segments = 5) => {
    for (let i = 0; i <= segments; i++) {
      const angle = from + (i / segments) * (Math.PI / 2)
      points.push(new THREE.Vector3(cx + r * Math.cos(angle), 0, cz + r * Math.sin(angle)))
    }
  }
  // Start at bottom-centre heading +x (counter-clockwise seen from above).
  points.push(new THREE.Vector3(0, 0, b))
  points.push(new THREE.Vector3((a - r) * 0.55, 0, b))
  corner(a - r, b - r, Math.PI / 2, 5)
  points.push(new THREE.Vector3(a, 0, 0))
  corner(a - r, -(b - r), 0, 5)
  points.push(new THREE.Vector3(0, 0, -b))
  corner(-(a - r), -(b - r), -Math.PI / 2, 5)
  points.push(new THREE.Vector3(-a, 0, 0))
  corner(-(a - r), b - r, Math.PI, 5)
  points.push(new THREE.Vector3(-(a - r) * 0.55, 0, b))

  const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.2)
  curve.arcLengthDivisions = 600
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
  banner.setRotationFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(side.x, side.z))
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

/** Assemble the whole market. Deterministic layout via seeded RNG. */
export function buildMarket(scene: THREE.Scene, curve: THREE.CatmullRomCurve3): void {
  const rng = mulberry32(20240325) // Varlamore launch day, of course

  // Sun-baked ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 170),
    new THREE.MeshLambertMaterial({ color: 0xd9b380 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  // Plaza paving inside the circuit
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(19, 18), lambert(0xe2cf9f))
  plaza.rotation.x = -Math.PI / 2
  plaza.position.y = 0.015
  plaza.receiveShadow = true
  scene.add(plaza)

  scene.add(buildTrackRibbon(curve))
  scene.add(buildStartArch(curve))

  const fountain = buildFountain()
  scene.add(fountain)

  // Market stalls arranged around the fountain
  const stallRadius = 11
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + 0.35
    const stall = buildStall(rng)
    stall.position.set(Math.cos(angle) * stallRadius, 0, Math.sin(angle) * stallRadius * 0.8)
    stall.rotation.y = -angle + Math.PI / 2
    scene.add(stall)
  }

  // Crates and barrels dotted about the infield
  for (let i = 0; i < 8; i++) {
    const angle = rng() * Math.PI * 2
    const radius = 15 + rng() * 4
    if (rng() > 0.5) {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.95, 8), lambert(0x8a5a2b))
      barrel.position.set(Math.cos(angle) * radius, 0.48, Math.sin(angle) * radius * 0.55)
      barrel.castShadow = true
      scene.add(barrel)
    } else {
      scene.add(box(0.8, 0.8, 0.8, 0xa9743c, Math.cos(angle) * radius, 0.4, Math.sin(angle) * radius * 0.55))
    }
  }

  // Colonnade ringing the outside of the circuit
  const colonnadeCurve = createTrackCurve()
  const segments = 26
  for (let i = 0; i < segments; i++) {
    const u = i / segments
    const point = colonnadeCurve.getPointAt(u)
    const tangent = colonnadeCurve.getTangentAt(u)
    const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tangent).normalize()
    const segment = buildColonnadeSegment()
    segment.position.copy(point).addScaledVector(side, TRACK_WIDTH / 2 + 6.5)
    segment.rotation.y = Math.atan2(tangent.x, tangent.z) + Math.PI / 2
    scene.add(segment)
  }

  // An adoring crowd between the track and the colonnade
  for (let i = 0; i < 46; i++) {
    const u = rng()
    const point = curve.getPointAt(u)
    const tangent = curve.getTangentAt(u)
    const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tangent).normalize()
    const person = buildSpectator(rng)
    person.position.copy(point).addScaledVector(side, TRACK_WIDTH / 2 + 1.6 + rng() * 3.4)
    person.position.y = 0
    person.lookAt(point.x, 1, point.z)
    scene.add(person)
  }
}
