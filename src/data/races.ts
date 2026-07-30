import type { RaceDef } from '../engine/types'
import { compileTrack, corner, straight } from '../engine/track'

/**
 * Race definitions. The bootstrap ships the starter event: the Market Dash
 * against other good dogs in the Civitas illa Fortis market square.
 * Future updates will add faster, larger and more exotic creatures, and
 * string races together into cups.
 */

/**
 * The Fortis market circuit: a rounded rectangle around the market square
 * with a double-hairpin complex jutting into the infield on the north side.
 * Corners are defined by turn angle and radius, so the two 180° turns become
 * proper hairpins rather than abrupt double-backs.
 */
const MARKET_CIRCUIT = compileTrack([
  straight(20),
  corner(-90, 11), // turn 1 — south-east sweep
  straight(38),
  corner(-90, 11), // turn 2 — north-east sweep
  straight(30),
  corner(-180, 6), // turn 3 — fountain hairpin (right)
  straight(12),
  corner(180, 6), // turn 4 — stall hairpin (left)
  straight(22),
  corner(-90, 11), // turn 5 — north-west sweep
  straight(14),
  corner(-90, 11), // turn 6 — south-west sweep
  straight(20),
])

export const RACES: RaceDef[] = [
  {
    id: 'market_dash',
    name: 'Fortis Market Dash',
    location: 'Civitas illa Fortis \u2014 Market Square',
    desc:
      'Three laps around the bustling market of Civitas illa Fortis, ' +
      'including the infamous fountain hairpins. The local strays have been ' +
      'racing here for years \u2014 show them what a well-engineered ' +
      'wheelchair can do.',
    track: MARKET_CIRCUIT,
    laps: 3,
    opponents: [
      {
        id: 'scruffy',
        name: 'Scruffy',
        species: 'Stray dog',
        colour: 0x8a6d4b,
        stats: { topSpeed: 7.0, acceleration: 1.3, handling: 0.35 },
      },
      {
        id: 'bones',
        name: 'Bones',
        species: 'Wild dog',
        colour: 0x5d5d5d,
        stats: { topSpeed: 7.3, acceleration: 1.25, handling: 0.4 },
      },
      {
        id: 'rex',
        name: 'Rex the Terrier',
        species: 'Terrier',
        colour: 0xc9a35a,
        stats: { topSpeed: 7.6, acceleration: 1.4, handling: 0.45 },
      },
    ],
    rewards: [
      {
        coins: 250,
        items: [
          { item: 'oak_logs', qty: 4 },
          { item: 'iron_ore', qty: 4 },
        ],
      },
      { coins: 100, items: [{ item: 'logs', qty: 4 }] },
      { coins: 50 },
      { coins: 10 },
    ],
  },
]

export const RACES_BY_ID: Record<string, RaceDef> = Object.fromEntries(
  RACES.map((r) => [r.id, r]),
)
