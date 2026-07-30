import type { RaceDef } from '../engine/types'
import { compileTrack, corner, straight } from '../engine/track'

/**
 * Race definitions. Six events, roughly doubling in difficulty from the
 * Fortis Market Dash up to the Fight Cave Gauntlet: faster, better-handling
 * opponents and progressively gnarlier tracks. Future updates may string
 * races together into cups.
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

/**
 * Falador park circuit: a gentle rounded rectangle around the park, laid
 * out for dogs who've outgrown the market but aren't ready for anything
 * exotic yet.
 */
const FALADOR_CIRCUIT = compileTrack([
  straight(35),
  corner(-90, 10), // turn 1
  straight(22),
  corner(-90, 10), // turn 2
  straight(35),
  corner(-90, 10), // turn 3
  straight(22),
  corner(-90, 10), // turn 4
])

/**
 * Varrock square circuit: a tighter rounded rectangle than Falador's park —
 * shorter straights, sharper corners, and a pack of wolves who don't slow
 * down for anyone.
 */
const VARROCK_CIRCUIT = compileTrack([
  straight(45),
  corner(-90, 9), // turn 1
  straight(30),
  corner(-90, 9), // turn 2
  straight(45),
  corner(-90, 9), // turn 3
  straight(30),
  corner(-90, 9), // turn 4
])

/**
 * Ardougne market weave: a hexagon of left-handers around the market
 * stalls, with a fountain-square-style hairpin spur poked into the middle
 * of the back straight to catch out the bears' big paws.
 */
const ARDOUGNE_CIRCUIT = compileTrack([
  straight(18),
  corner(90, 9), // turn 1
  straight(32),
  corner(90, 9), // turn 2
  straight(20),
  corner(180, 5), // turn 3 — stall hairpin (left)
  straight(10),
  corner(-180, 5), // turn 4 — stall hairpin (right)
  straight(8),
  corner(90, 9), // turn 5
  straight(12),
  corner(90, 9), // turn 6
])

/**
 * Kharidian desert dash: two huge, sweeping dunes joined by long straights.
 * Gentle enough on handling that it comes down to raw top speed — perfect
 * for terrorbirds who can barely turn but can really run.
 */
const DESERT_CIRCUIT = compileTrack([
  straight(80),
  corner(-180, 25), // dune 1
  straight(80),
  corner(-180, 25), // dune 2
])

/**
 * Isafdar unicorn trail: a rounded rectangle with a pair of mirrored
 * chicanes woven into the long straights, testing the nimble cornering
 * unicorns are famous for.
 */
const UNICORN_CIRCUIT = compileTrack([
  straight(14),
  corner(45, 8), // chicane 1 in
  straight(8),
  corner(-45, 8), // chicane 1 out
  straight(14),
  corner(-90, 9), // turn 1
  straight(28),
  corner(-90, 9), // turn 2
  straight(14),
  corner(45, 8), // chicane 2 in
  straight(8),
  corner(-45, 8), // chicane 2 out
  straight(14),
  corner(-90, 9), // turn 3
  straight(28),
  corner(-90, 9), // turn 4
])

/**
 * TzHaar Fight Cave gauntlet: the longest and gnarliest circuit, a hexagon
 * of tight right-handers with two lava-cavern hairpins — one final trial
 * against the Penance Queen and her guard.
 */
const TZHAAR_CIRCUIT = compileTrack([
  straight(30),
  corner(-90, 7), // turn 1
  straight(39),
  corner(-180, 5), // hairpin 1 (out)
  straight(9),
  corner(180, 5), // hairpin 1 (back)
  straight(14),
  corner(-90, 7), // turn 2
  straight(14),
  corner(-180, 5), // hairpin 2 (out)
  straight(9),
  corner(180, 5), // hairpin 2 (back)
  straight(5),
  corner(-90, 7), // turn 3
  straight(24),
  corner(-90, 7), // turn 4
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
  {
    id: 'falador_park_dash',
    name: 'Falador Park Dash',
    location: 'Falador \u2014 Park',
    desc:
      'A gentle rounded circuit through the park, against dogs who have ' +
      'graduated from the market square. A little faster, a little ' +
      'sharper \u2014 nothing your rig cannot handle.',
    track: FALADOR_CIRCUIT,
    laps: 3,
    opponents: [
      {
        id: 'duke',
        name: 'Duke',
        species: 'Guard dog',
        colour: 0x4a4a4a,
        stats: { topSpeed: 7.6, acceleration: 1.4, handling: 0.4 },
      },
      {
        id: 'nimble',
        name: 'Nimble',
        species: 'Whippet',
        colour: 0xd8c9a3,
        stats: { topSpeed: 7.9, acceleration: 1.45, handling: 0.44 },
      },
      {
        id: 'shep',
        name: 'Shep',
        species: 'Sheepdog',
        colour: 0xf1efe6,
        stats: { topSpeed: 8.2, acceleration: 1.5, handling: 0.48 },
      },
    ],
    rewards: [
      {
        coins: 400,
        items: [
          { item: 'oak_logs', qty: 6 },
          { item: 'iron_ore', qty: 6 },
        ],
      },
      { coins: 150, items: [{ item: 'oak_logs', qty: 3 }] },
      { coins: 70 },
      { coins: 15 },
    ],
  },
  {
    id: 'varrock_square_circuit',
    name: 'Varrock Square Circuit',
    location: 'Varrock \u2014 Square',
    desc:
      'A tighter, faster loop of the square against a pack of wolves down ' +
      'from the wilderness border. They do not slow down for corners \u2014 ' +
      'make sure your dog does not have to either.',
    track: VARROCK_CIRCUIT,
    laps: 3,
    opponents: [
      {
        id: 'snarl',
        name: 'Snarl',
        species: 'Grey wolf',
        colour: 0x6b6b6b,
        stats: { topSpeed: 8.3, acceleration: 1.5, handling: 0.45 },
      },
      {
        id: 'ashpelt',
        name: 'Ashpelt',
        species: 'Grey wolf',
        colour: 0x8a8a8a,
        stats: { topSpeed: 8.6, acceleration: 1.58, handling: 0.49 },
      },
      {
        id: 'greyfang',
        name: 'Greyfang',
        species: 'Timber wolf',
        colour: 0x4f4f4f,
        stats: { topSpeed: 9.0, acceleration: 1.65, handling: 0.53 },
      },
    ],
    rewards: [
      {
        coins: 600,
        items: [
          { item: 'mithril_ore', qty: 6 },
          { item: 'coal', qty: 8 },
        ],
      },
      { coins: 220, items: [{ item: 'iron_ore', qty: 6 }] },
      { coins: 100 },
      { coins: 20 },
    ],
  },
  {
    id: 'ardougne_market_weave',
    name: 'Ardougne Market Weave',
    location: 'East Ardougne \u2014 Market',
    desc:
      'A hexagon of tight lefts around the market stalls, with a hairpin ' +
      'spur that has flattened more than a few fruit crates. The bears ' +
      'from McGrubor\u2019s Wood have muscled their way into the field \u2014 ' +
      'they hit like a wall but corner surprisingly well.',
    track: ARDOUGNE_CIRCUIT,
    laps: 3,
    opponents: [
      {
        id: 'honeypaw',
        name: 'Honeypaw',
        species: 'Black bear',
        colour: 0x3b2a1a,
        stats: { topSpeed: 9.0, acceleration: 1.6, handling: 0.5 },
      },
      {
        id: 'bramblefur',
        name: 'Bramblefur',
        species: 'Black bear',
        colour: 0x2e2117,
        stats: { topSpeed: 9.4, acceleration: 1.7, handling: 0.55 },
      },
      {
        id: 'grizzletooth',
        name: 'Grizzletooth',
        species: 'Grizzly bear',
        colour: 0x6b4a2b,
        stats: { topSpeed: 9.8, acceleration: 1.8, handling: 0.6 },
      },
    ],
    rewards: [
      {
        coins: 900,
        items: [
          { item: 'adamantite_ore', qty: 6 },
          { item: 'cowhide', qty: 6 },
        ],
      },
      { coins: 320, items: [{ item: 'mithril_bar', qty: 4 }] },
      { coins: 140 },
      { coins: 25 },
    ],
  },
  {
    id: 'kharidian_desert_dash',
    name: 'Kharidian Desert Dash',
    location: 'Kharidian Desert \u2014 Dunes',
    desc:
      'Two vast dunes joined by punishing straights. There is barely a ' +
      'corner worth the name, which suits the terrorbirds just fine \u2014 ' +
      'they can barely turn, but nothing outruns them in a straight line.',
    track: DESERT_CIRCUIT,
    laps: 3,
    opponents: [
      {
        id: 'sandrunner',
        name: 'Sandrunner',
        species: 'Terrorbird',
        colour: 0xc8a24a,
        stats: { topSpeed: 9.8, acceleration: 1.75, handling: 0.45 },
      },
      {
        id: 'duststrider',
        name: 'Duststrider',
        species: 'Terrorbird',
        colour: 0xb8925f,
        stats: { topSpeed: 10.2, acceleration: 1.85, handling: 0.5 },
      },
      {
        id: 'beakstrike',
        name: 'Beakstrike',
        species: 'Terrorbird',
        colour: 0x9c7a44,
        stats: { topSpeed: 10.6, acceleration: 1.95, handling: 0.55 },
      },
    ],
    rewards: [
      {
        coins: 1300,
        items: [
          { item: 'runite_ore', qty: 4 },
          { item: 'canvas', qty: 6 },
        ],
      },
      { coins: 450, items: [{ item: 'cotton', qty: 6 }] },
      { coins: 180 },
      { coins: 30 },
    ],
  },
  {
    id: 'isafdar_unicorn_trail',
    name: 'Isafdar Unicorn Trail',
    location: 'Isafdar \u2014 Forest Trail',
    desc:
      'A rounded loop through the elven forest, with mirrored chicanes ' +
      'weaving between the trees. Unicorns are no faster than a good ' +
      'terrorbird, but their cornering borders on magical.',
    track: UNICORN_CIRCUIT,
    laps: 3,
    opponents: [
      {
        id: 'moonmane',
        name: 'Moonmane',
        species: 'Unicorn',
        colour: 0xe8e2f0,
        stats: { topSpeed: 10.2, acceleration: 1.9, handling: 0.65 },
      },
      {
        id: 'glimmer',
        name: 'Glimmer',
        species: 'Unicorn',
        colour: 0xf5f0ff,
        stats: { topSpeed: 10.6, acceleration: 2.0, handling: 0.7 },
      },
      {
        id: 'silverhorn',
        name: 'Silverhorn',
        species: 'Unicorn',
        colour: 0xffffff,
        stats: { topSpeed: 11.0, acceleration: 2.1, handling: 0.75 },
      },
    ],
    rewards: [
      {
        coins: 1800,
        items: [
          { item: 'rune_essence', qty: 30 },
          { item: 'pure_essence', qty: 20 },
        ],
      },
      { coins: 600, items: [{ item: 'rune_essence', qty: 15 }] },
      { coins: 220 },
      { coins: 35 },
    ],
  },
  {
    id: 'tzhaar_fight_cave_gauntlet',
    name: 'TzHaar Fight Cave Gauntlet',
    location: 'Mor Ul Rek \u2014 Fight Cave',
    desc:
      'The longest, gnarliest circuit yet: a hexagon of tight right-handers ' +
      'punctuated by two lava-cavern hairpins. Whisper it \u2014 the ' +
      'Penance Queen herself has entered the field, flanked by her fastest ' +
      'guard. Beat them and there is nothing left to race but yourself.',
    track: TZHAAR_CIRCUIT,
    laps: 3,
    opponents: [
      {
        id: 'penance_fighter',
        name: 'Penance Fighter',
        species: 'Penance',
        colour: 0x7a2f2f,
        stats: { topSpeed: 11.2, acceleration: 2.1, handling: 0.6 },
      },
      {
        id: 'penance_ranger',
        name: 'Penance Ranger',
        species: 'Penance',
        colour: 0x5f7a2f,
        stats: { topSpeed: 11.7, acceleration: 2.2, handling: 0.65 },
      },
      {
        id: 'penance_queen',
        name: 'Penance Queen',
        species: 'Penance',
        colour: 0xffd54a,
        stats: { topSpeed: 12.2, acceleration: 2.35, handling: 0.7 },
      },
    ],
    rewards: [
      {
        coins: 2500,
        items: [
          { item: 'daeyalt_essence', qty: 40 },
          { item: 'rune_bar', qty: 6 },
        ],
      },
      { coins: 850, items: [{ item: 'daeyalt_essence', qty: 15 }] },
      { coins: 300 },
      { coins: 50 },
    ],
  },
]

export const RACES_BY_ID: Record<string, RaceDef> = Object.fromEntries(
  RACES.map((r) => [r.id, r]),
)
