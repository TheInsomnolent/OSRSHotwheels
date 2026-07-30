import * as THREE from 'three'

/** A cute low-poly dog in a racing wheelchair, OSRS style. Faces +Z. */
export interface DogRig {
  group: THREE.Group
  /** Animate wheels, legs and tail. */
  update(speed: number, dt: number, elapsed: number): void
}

function lambert(color: number): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color, flatShading: true })
}

function box(
  w: number,
  h: number,
  d: number,
  color: number,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(color))
  mesh.position.set(x, y, z)
  mesh.castShadow = true
  return mesh
}

export function createDog(coat: number, isPlayer: boolean): DogRig {
  const group = new THREE.Group()
  const darkCoat = new THREE.Color(coat).multiplyScalar(0.72).getHex()
  const wood = 0x8a5a2b
  const woodDark = 0x6b4420
  const leather = 0x7a4a21

  // Torso and rump
  const torso = new THREE.Group()
  torso.add(box(0.46, 0.4, 0.95, coat, 0, 0.62, 0))
  torso.add(box(0.4, 0.32, 0.3, darkCoat, 0, 0.58, -0.55))
  group.add(torso)

  // Head
  const head = new THREE.Group()
  head.position.set(0, 0.95, 0.55)
  head.add(box(0.34, 0.32, 0.34, coat))
  head.add(box(0.16, 0.14, 0.24, darkCoat, 0, -0.05, 0.27))
  head.add(box(0.08, 0.08, 0.06, 0x1c1c1c, 0, -0.02, 0.4)) // nose
  const earL = box(0.09, 0.18, 0.06, darkCoat, -0.11, 0.22, -0.02)
  const earR = box(0.09, 0.18, 0.06, darkCoat, 0.11, 0.22, -0.02)
  head.add(earL, earR)
  group.add(head)

  // Tail, wagging with excitement
  const tail = new THREE.Group()
  tail.position.set(0, 0.78, -0.68)
  const tailMesh = box(0.07, 0.07, 0.32, darkCoat, 0, 0.08, -0.1)
  tailMesh.rotation.x = -0.9
  tail.add(tailMesh)
  group.add(tail)

  // Front legs (the engine of this whole operation)
  const legL = new THREE.Group()
  legL.position.set(-0.15, 0.5, 0.32)
  legL.add(box(0.1, 0.48, 0.1, coat, 0, -0.22, 0))
  const legR = new THREE.Group()
  legR.position.set(0.15, 0.5, 0.32)
  legR.add(box(0.1, 0.48, 0.1, coat, 0, -0.22, 0))
  group.add(legL, legR)

  // Tucked-up rear legs, supported by the chair
  const rearL = box(0.09, 0.22, 0.09, coat, -0.15, 0.42, -0.42)
  rearL.rotation.x = 1.35
  const rearR = box(0.09, 0.22, 0.09, coat, 0.15, 0.42, -0.42)
  rearR.rotation.x = 1.35
  group.add(rearL, rearR)

  // ── The wheelchair ─────────────────────────────────────────────
  // Harness strap around the chest
  group.add(box(0.5, 0.1, 0.2, leather, 0, 0.66, 0.18))
  group.add(box(0.52, 0.34, 0.08, leather, 0, 0.6, -0.08))
  // Saddle supporting the hips
  group.add(box(0.42, 0.08, 0.34, wood, 0, 0.46, -0.5))
  // Frame rails from harness back to the axle
  const railL = box(0.05, 0.05, 0.62, woodDark, -0.2, 0.5, -0.24)
  railL.rotation.x = 0.12
  const railR = box(0.05, 0.05, 0.62, woodDark, 0.2, 0.5, -0.24)
  railR.rotation.x = 0.12
  group.add(railL, railR)
  // Axle
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.68, 6), lambert(0x4d4d4d))
  axle.rotation.z = Math.PI / 2
  axle.position.set(0, 0.32, -0.52)
  group.add(axle)

  // Wheels: chunky, low-poly, unmistakably fletched
  const wheels: THREE.Group[] = []
  for (const side of [-1, 1]) {
    const wheel = new THREE.Group()
    wheel.position.set(side * 0.37, 0.32, -0.52)
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.07, 9), lambert(wood))
    rim.rotation.z = Math.PI / 2
    rim.castShadow = true
    wheel.add(rim)
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.09, 6), lambert(woodDark))
    hub.rotation.z = Math.PI / 2
    wheel.add(hub)
    for (let s = 0; s < 3; s++) {
      const spoke = box(0.05, 0.56, 0.04, woodDark)
      spoke.rotation.x = (s * Math.PI) / 3
      wheel.add(spoke)
    }
    group.add(wheel)
    wheels.push(wheel)
  }

  // The player's dog flies a little pennant so you can spot them
  if (isPlayer) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 5), lambert(0x555555))
    pole.position.set(-0.24, 1.0, -0.62)
    group.add(pole)
    const pennant = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 4), lambert(0xffb83f))
    pennant.rotation.z = Math.PI / 2
    pennant.position.set(-0.1, 1.34, -0.62)
    group.add(pennant)
  }

  group.scale.setScalar(1.35)

  let phase = 0
  return {
    group,
    update(speed, dt, elapsed) {
      phase += speed * dt * 2.4
      const stride = Math.min(1, speed / 4)
      legL.rotation.x = Math.sin(phase) * 0.8 * stride
      legR.rotation.x = -Math.sin(phase) * 0.8 * stride
      for (const wheel of wheels) wheel.rotation.x += (speed * dt) / 0.42
      torso.position.y = Math.abs(Math.sin(phase)) * 0.03 * stride
      head.position.y = 0.95 + Math.abs(Math.sin(phase + 0.4)) * 0.02 * stride
      tail.rotation.y = Math.sin(elapsed * 9) * 0.45
      earL.rotation.z = 0.12 + Math.sin(elapsed * 7) * 0.06
      earR.rotation.z = -0.12 - Math.sin(elapsed * 7 + 1) * 0.06
    },
  }
}
