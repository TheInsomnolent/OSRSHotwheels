import * as THREE from 'three'
import type { RaceSimOutput } from '../engine/raceSim'
import type { CompiledTrack } from '../engine/track'
import { buildMarket, createTrackCurve } from './marketScene'
import { createDog, type DogRig } from './dogRig'

export interface RaceStanding {
  name: string
  isPlayer: boolean
  colour: number
  /** Metres into the current lap — drives the minimap. */
  lapDist: number
  /** Current lap, 1-based and clamped to the race distance. */
  lap: number
  /** Gap to the leader in seconds (0 for the leader). */
  gapS: number
  /** Official finish time, present once this racer has crossed the line. */
  timeS: number | null
}

export interface RaceSceneOptions {
  container: HTMLElement
  sim: RaceSimOutput
  /** The compiled circuit driving both the 3D track and racer placement. */
  track: CompiledTrack
  /** Called during the pre-race countdown with 3, 2, 1 then 'go'. */
  onCountdown(value: number | 'go'): void
  /** Called every animation frame with live standings and the race clock. */
  onProgress(standings: RaceStanding[], raceTimeS: number): void
  /** Called exactly once when the playback ends (or is skipped). */
  onFinished(): void
}

export interface RaceSceneHandle {
  skip(): void
  /** Playback speed multiplier: 1, 2, 5 or 10. Applies once the race is underway. */
  setSpeed(multiplier: number): void
  dispose(): void
}

const COUNTDOWN_S = 3.5
const LANES = [-2.7, -0.9, 0.9, 2.7]

/** Render and play back a simulated race in cute low-poly 3D. */
export function runRaceScene(options: RaceSceneOptions): RaceSceneHandle {
  const { container, sim } = options

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(container.clientWidth || 640, container.clientHeight || 400)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  container.append(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x9ec8e8)
  scene.fog = new THREE.Fog(0xd9c49a, 90, 220)

  const camera = new THREE.PerspectiveCamera(
    52,
    (container.clientWidth || 640) / (container.clientHeight || 400),
    0.1,
    400,
  )

  scene.add(new THREE.HemisphereLight(0xfff6e0, 0xb08d5f, 0.95))
  const sun = new THREE.DirectionalLight(0xfff2d0, 1.6)
  sun.position.set(60, 80, 30)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = -80
  sun.shadow.camera.right = 80
  sun.shadow.camera.top = 80
  sun.shadow.camera.bottom = -80
  sun.shadow.camera.far = 250
  scene.add(sun)

  const curve = createTrackCurve(options.track)
  buildMarket(scene, curve)

  const up = new THREE.Vector3(0, 1, 0)
  const scratch = {
    point: new THREE.Vector3(),
    tangent: new THREE.Vector3(),
    side: new THREE.Vector3(),
    camTarget: new THREE.Vector3(),
    camIdeal: new THREE.Vector3(),
  }

  // Racers
  const dogs: DogRig[] = sim.racers.map((racer, index) => {
    const dog = createDog(racer.colour, racer.isPlayer)
    scene.add(dog.group)
    placeDog(dog, 0, LANES[index % LANES.length])
    return dog
  })
  const playerIndex = sim.racers.findIndex((r) => r.isPlayer)

  function placeDog(dog: DogRig, dist: number, lane: number): void {
    const u = THREE.MathUtils.euclideanModulo(dist / sim.lapLengthM, 1)
    curve.getPointAt(u, scratch.point)
    curve.getTangentAt(u, scratch.tangent)
    scratch.side.crossVectors(up, scratch.tangent).normalize()
    dog.group.position.copy(scratch.point).addScaledVector(scratch.side, lane)
    dog.group.rotation.y = Math.atan2(scratch.tangent.x, scratch.tangent.z)
  }

  function distAt(index: number, timeS: number): number {
    const track = sim.distances[index]
    const exact = timeS / sim.dt
    const lower = Math.floor(exact)
    if (lower >= track.length - 1) return track[track.length - 1]
    const frac = exact - lower
    return track[lower] + (track[lower + 1] - track[lower]) * frac
  }

  const lastTick = Math.max(...sim.distances.map((d) => d.length)) - 1
  const playbackEndS = lastTick * sim.dt
  const finishTimes = new Map(sim.placements.map((p) => [p.racerId, p.timeS]))

  // ── Playback state ─────────────────────────────────────────────
  let elapsed = 0 // wall-clock seconds since scene start (ambient animation)
  let raceClock = -COUNTDOWN_S // race seconds; negative during the countdown
  let speedMultiplier = 1
  let lastCountdown = -1
  let finished = false
  let disposed = false
  let rafId = 0
  let lastFrameMs = performance.now()

  const resize = () => {
    const w = container.clientWidth
    const h = container.clientHeight
    if (w === 0 || h === 0) return
    renderer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(container)

  // Start with an establishing view of the start line.
  curve.getPointAt(0, scratch.point)
  camera.position.set(scratch.point.x - 14, 9, scratch.point.z + 16)
  camera.lookAt(scratch.point)

  function finish(): void {
    if (finished) return
    finished = true
    options.onFinished()
  }

  function frame(): void {
    if (disposed) return
    rafId = requestAnimationFrame(frame)
    const nowMs = performance.now()
    const dt = Math.min((nowMs - lastFrameMs) / 1000, 0.1)
    lastFrameMs = nowMs
    elapsed += dt
    // The countdown always runs in real time; the race itself can fast-forward.
    raceClock += dt * (raceClock < 0 ? 1 : speedMultiplier)

    const raceTime = raceClock

    if (raceTime < 0) {
      const remaining = Math.ceil(-raceTime)
      if (remaining !== lastCountdown && remaining <= 3) {
        lastCountdown = remaining
        options.onCountdown(remaining)
      }
      // Slow pan around the start line while dogs paw the ground.
      const angle = elapsed * 0.35
      curve.getPointAt(0, scratch.point)
      camera.position.set(
        scratch.point.x + Math.sin(angle) * 15,
        7 + Math.sin(elapsed * 0.7) * 1.2,
        scratch.point.z + Math.cos(angle) * 15,
      )
      camera.lookAt(scratch.point.x, 1, scratch.point.z)
      for (const dog of dogs) dog.update(0.4, dt, elapsed)
    } else {
      if (lastCountdown !== 0) {
        lastCountdown = 0
        options.onCountdown('go')
      }
      const t = Math.min(raceTime, playbackEndS)
      const playbackDt = dt * speedMultiplier
      for (let i = 0; i < dogs.length; i++) {
        const dist = distAt(i, t)
        const speed = (distAt(i, Math.min(t + 0.2, playbackEndS)) - dist) / 0.2
        placeDog(dogs[i], dist, LANES[i % LANES.length])
        dogs[i].update(speed, playbackDt, elapsed)
      }

      // Follow the player's dog.
      const playerDog = dogs[playerIndex]
      const u = THREE.MathUtils.euclideanModulo(
        distAt(playerIndex, t) / sim.lapLengthM,
        1,
      )
      curve.getTangentAt(u, scratch.tangent)
      scratch.camIdeal
        .copy(playerDog.group.position)
        .addScaledVector(scratch.tangent, -8)
        .add(up.clone().multiplyScalar(3.6))
      camera.position.lerp(scratch.camIdeal, 1 - Math.exp(-4 * dt * speedMultiplier))
      scratch.camTarget.copy(playerDog.group.position).addScaledVector(scratch.tangent, 5)
      scratch.camTarget.y += 0.9
      camera.lookAt(scratch.camTarget)

      // Live standings: finished racers rank by official time, the rest by
      // distance covered. Gaps to the leader are estimated in seconds.
      const live = sim.racers.map((racer, i) => {
        const dist = distAt(i, t)
        const speed = (distAt(i, Math.min(t + 0.2, playbackEndS)) - dist) / 0.2
        const finishTime = finishTimes.get(racer.id) ?? null
        const timeS = finishTime !== null && finishTime <= t ? finishTime : null
        return { racer, dist, speed, timeS }
      })
      live.sort((a, b) => {
        if (a.timeS !== null && b.timeS !== null) return a.timeS - b.timeS
        if (a.timeS !== null) return -1
        if (b.timeS !== null) return 1
        return b.dist - a.dist
      })
      const leader = live[0]
      const standings: RaceStanding[] = live.map((entry) => ({
        name: entry.racer.name,
        isPlayer: entry.racer.isPlayer,
        colour: entry.racer.colour,
        lapDist: THREE.MathUtils.euclideanModulo(entry.dist, sim.lapLengthM),
        lap: Math.min(Math.floor(entry.dist / sim.lapLengthM) + 1, sim.laps),
        gapS:
          entry.timeS !== null && leader.timeS !== null
            ? entry.timeS - leader.timeS
            : (leader.dist - entry.dist) / Math.max(entry.speed, 0.5),
        timeS: entry.timeS,
      }))
      options.onProgress(standings, Math.min(t, playbackEndS))

      if (raceTime >= playbackEndS + 1.2) {
        renderer.render(scene, camera)
        finish()
        return
      }
    }
    renderer.render(scene, camera)
  }
  rafId = requestAnimationFrame(frame)

  function dispose(): void {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(rafId)
    resizeObserver.disconnect()
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(material)) material.forEach((m) => m.dispose())
      else material?.dispose()
    })
    renderer.dispose()
    renderer.domElement.remove()
  }

  return {
    skip() {
      finish()
    },
    setSpeed(multiplier: number) {
      speedMultiplier = Math.max(1, Math.min(10, multiplier))
    },
    dispose,
  }
}
