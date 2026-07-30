/**
 * The trackside bookie. Before a race the player can stake coins (previous
 * winnings, ideally) on any dog in the field — including their own. Odds are
 * estimated by simming the field over a spread of practice seeds, then a
 * house margin is shaved off, because the bookie also has mouths to feed.
 */

import type { GameState, PendingBet, RaceDef, RacerStats } from './types'
import { simulateRace } from './raceSim'
import { addItem, itemCount, removeItem } from './state'

export interface BetOffer {
  /** 'player' or an opponent id. */
  racerId: string
  name: string
  isPlayer: boolean
  colour: number
  /** Estimated win probability, 0.05..0.9. */
  winChance: number
  /** Decimal odds: a winning stake pays floor(stake × odds), stake included. */
  odds: number
}

const SAMPLE_RACES = 20
const HOUSE_MARGIN = 0.9
const MIN_CHANCE = 0.05
const MAX_CHANCE = 0.9

/** The bookie's book for a race, given the player dog's current stats. */
export function computeOdds(
  race: RaceDef,
  player: { name: string; stats: RacerStats },
): BetOffer[] {
  const wins = new Map<string, number>()
  const field = new Map<string, { name: string; isPlayer: boolean; colour: number }>()
  for (let i = 0; i < SAMPLE_RACES; i++) {
    // Fixed, well-spread seeds so the book is stable for a given dog.
    const sim = simulateRace(race, player, (i * 7919 + 17) >>> 0)
    for (const racer of sim.racers) {
      field.set(racer.id, { name: racer.name, isPlayer: racer.isPlayer, colour: racer.colour })
    }
    const winner = sim.placements[0]
    wins.set(winner.racerId, (wins.get(winner.racerId) ?? 0) + 1)
  }
  return [...field.entries()].map(([racerId, meta]) => {
    const winChance = Math.min(
      MAX_CHANCE,
      Math.max(MIN_CHANCE, (wins.get(racerId) ?? 0) / SAMPLE_RACES),
    )
    return {
      racerId,
      ...meta,
      winChance,
      odds: Math.max(1.1, Math.round((HOUSE_MARGIN / winChance) * 10) / 10),
    }
  })
}

/**
 * Stake coins on a racer. Deducts the stake immediately and records the bet
 * on the save. Returns the bet, or null if the stake is invalid/unaffordable
 * or another bet is already down.
 */
export function placeBet(
  state: GameState,
  race: RaceDef,
  offer: BetOffer,
  stake: number,
): PendingBet | null {
  if (state.pendingBet) return null
  if (!Number.isFinite(stake)) return null
  const amount = Math.floor(stake)
  if (amount <= 0 || itemCount(state, 'coins') < amount) return null
  removeItem(state, 'coins', amount)
  state.pendingBet = {
    raceId: race.id,
    racerId: offer.racerId,
    racerName: offer.name,
    stake: amount,
    odds: offer.odds,
  }
  return state.pendingBet
}

/** Cancel the outstanding bet and refund the stake (the bookie is merciful). */
export function cancelBet(state: GameState): void {
  if (!state.pendingBet) return
  addItem(state, 'coins', state.pendingBet.stake)
  state.pendingBet = null
}

/**
 * Settle the outstanding bet for a race against the winner. Pays out into
 * the inventory and clears the bet. Returns the payout (0 for a loss), or
 * null when no bet was riding on this race.
 */
export function settleBet(
  state: GameState,
  raceId: string,
  winnerRacerId: string,
): { bet: PendingBet; payout: number } | null {
  const bet = state.pendingBet
  if (!bet || bet.raceId !== raceId) return null
  state.pendingBet = null
  const payout = bet.racerId === winnerRacerId ? Math.floor(bet.stake * bet.odds) : 0
  if (payout > 0) addItem(state, 'coins', payout)
  return { bet, payout }
}
