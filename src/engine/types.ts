/** Core shared types for the OSRS Hot Wheels engine. */

/** Skills used by the simulator. A subset of OSRS skills relevant to wheelchair racing. */
export type SkillId =
  | 'woodcutting'
  | 'mining'
  | 'smithing'
  | 'fletching'
  | 'crafting'
  | 'construction'
  | 'herblore'
  | 'farming'
  | 'magic'
  | 'sailing'

export interface ItemStack {
  item: string
  qty: number
}

/** A gathering or processing activity in the idle game. */
export interface ActivityDef {
  id: string
  name: string
  desc: string
  skill: SkillId
  levelReq: number
  /** Milliseconds per action at the required level. Higher levels act faster. */
  baseMs: number
  /** Items consumed per action. Omitted for pure gathering activities. */
  inputs?: ItemStack[]
  /** Items produced per action. */
  outputs: ItemStack[]
}

/** Racing stats for a wheelchair-bound racer. */
export interface RacerStats {
  /** Top speed in metres per second. */
  topSpeed: number
  /** Acceleration in metres per second squared. */
  acceleration: number
  /** Cornering ability, 0..1. Higher keeps more speed through corners. */
  handling: number
}

export type UpgradeSlot = 'frame' | 'axles' | 'wheels' | 'harness' | 'aero' | 'enchant'

export interface UpgradeTier {
  id: string
  name: string
  desc: string
  tier: number
  skill: SkillId
  levelReq: number
  cost: ItemStack[]
  /** Additive stat contribution (the enchant slot is applied multiplicatively). */
  stats: Partial<RacerStats>
  /** Multiplier applied to top speed and acceleration after additive stats. */
  mult?: number
}

export interface UpgradeSlotDef {
  slot: UpgradeSlot
  name: string
  flavour: string
  tiers: UpgradeTier[]
}

export interface OpponentDef {
  id: string
  name: string
  species: string
  /** Hex colour used by the 3D renderer for this racer's coat. */
  colour: number
  stats: RacerStats
}

export interface RaceReward {
  coins: number
  items?: ItemStack[]
}

export interface RaceDef {
  id: string
  name: string
  location: string
  desc: string
  /** Track length in metres. */
  lengthM: number
  laps: number
  /** Corners along a lap; `at` is metres from the start line, severity 0..0.6. */
  corners: { at: number; severity: number }[]
  opponents: OpponentDef[]
  rewards: RaceReward[]
}

export interface ChatMessage {
  text: string
  kind: 'game' | 'reward' | 'system' | 'error'
  time: number
}

/** Persistent game state. Stored in localStorage. */
export interface GameState {
  version: 1
  rsn: string | null
  /** Skill levels, from the hiscores or manual entry. Defaults to 1. */
  skills: Record<SkillId, number>
  /** Item id -> quantity. */
  inventory: Record<string, number>
  /** Currently running idle activity, if any. */
  currentActivity: string | null
  /** Timestamp (ms) up to which idle production has been processed. */
  lastProcessed: number
  /** Owned upgrade tier per slot (0 = none). */
  upgrades: Record<UpgradeSlot, number>
  /** Potion item id selected to drink at the start of the next race. */
  selectedPotion: string | null
  /** Race id -> number of wins. */
  raceWins: Record<string, number>
  /** Player's dog's name. */
  dogName: string
}
