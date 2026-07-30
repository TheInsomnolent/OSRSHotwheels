import type { RaceDef } from '../engine/types'

/**
 * Race definitions. The bootstrap ships the starter event: the Market Dash
 * against other good dogs in the Civitas illa Fortis market square.
 * Future updates will add faster, larger and more exotic creatures, and
 * string races together into cups.
 */
export const RACES: RaceDef[] = [
  {
    id: 'market_dash',
    name: 'Fortis Market Dash',
    location: 'Civitas illa Fortis \u2014 Market Square',
    desc:
      'One lap around the bustling market of Civitas illa Fortis. ' +
      'The local strays have been racing here for years \u2014 show them what ' +
      'a well-engineered wheelchair can do.',
    lengthM: 280,
    laps: 1,
    corners: [
      { at: 40, severity: 0.32 },
      { at: 95, severity: 0.36 },
      { at: 180, severity: 0.32 },
      { at: 235, severity: 0.36 },
    ],
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
