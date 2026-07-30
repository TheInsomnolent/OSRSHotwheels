import { describe, expect, it } from 'vitest'
import { cancelBet, computeOdds, placeBet, settleBet } from '../src/engine/betting'
import { defaultState } from '../src/engine/state'
import { RACES_BY_ID } from '../src/data/races'
import type { RacerStats } from '../src/engine/types'

const T0 = 1_000_000
const race = RACES_BY_ID.market_dash
const midStats: RacerStats = { topSpeed: 7.4, acceleration: 1.4, handling: 0.4 }

describe('trackside bookie', () => {
  it('offers odds on every dog in the field', () => {
    const offers = computeOdds(race, { name: 'Buster', stats: midStats })
    expect(offers).toHaveLength(1 + race.opponents.length)
    expect(offers.filter((o) => o.isPlayer)).toHaveLength(1)
    for (const offer of offers) {
      expect(offer.winChance).toBeGreaterThanOrEqual(0.05)
      expect(offer.winChance).toBeLessThanOrEqual(0.9)
      expect(offer.odds).toBeGreaterThanOrEqual(1.1)
    }
  })

  it('gives shorter odds to a faster dog', () => {
    const slow = computeOdds(race, {
      name: 'Buster',
      stats: { topSpeed: 6.5, acceleration: 1.2, handling: 0.3 },
    })
    const fast = computeOdds(race, {
      name: 'Buster',
      stats: { topSpeed: 9.0, acceleration: 2.0, handling: 0.6 },
    })
    const playerOdds = (offers: typeof slow) => offers.find((o) => o.isPlayer)!.odds
    expect(playerOdds(fast)).toBeLessThan(playerOdds(slow))
  })

  it('takes the stake up front and refuses bad bets', () => {
    const state = defaultState(T0)
    const offers = computeOdds(race, { name: 'Buster', stats: midStats })
    const offer = offers[0]

    // No coins: refused.
    expect(placeBet(state, race, offer, 10)).toBeNull()

    state.inventory.coins = 100
    expect(placeBet(state, race, offer, 0)).toBeNull()
    expect(placeBet(state, race, offer, -5)).toBeNull()
    expect(placeBet(state, race, offer, Number.NaN)).toBeNull()
    expect(placeBet(state, race, offer, 101)).toBeNull()
    expect(state.inventory.coins).toBe(100)

    const bet = placeBet(state, race, offer, 40)
    expect(bet).not.toBeNull()
    expect(state.inventory.coins).toBe(60)
    expect(state.pendingBet?.stake).toBe(40)

    // Only one bet at a time.
    expect(placeBet(state, race, offer, 10)).toBeNull()
  })

  it('cancelling refunds the stake', () => {
    const state = defaultState(T0)
    state.inventory.coins = 50
    const offer = computeOdds(race, { name: 'Buster', stats: midStats })[0]
    placeBet(state, race, offer, 50)
    expect(state.inventory.coins ?? 0).toBe(0)
    cancelBet(state)
    expect(state.inventory.coins).toBe(50)
    expect(state.pendingBet).toBeNull()
  })

  it('pays floor(stake × odds) on a win and nothing on a loss', () => {
    const state = defaultState(T0)
    state.inventory.coins = 100
    const offer = computeOdds(race, { name: 'Buster', stats: midStats }).find(
      (o) => !o.isPlayer,
    )!
    placeBet(state, race, offer, 100)

    const win = settleBet(state, race.id, offer.racerId)
    expect(win?.payout).toBe(Math.floor(100 * offer.odds))
    expect(state.inventory.coins).toBe(Math.floor(100 * offer.odds))
    expect(state.pendingBet).toBeNull()

    // Losing bet: stake already gone, nothing comes back.
    placeBet(state, race, offer, 20)
    const before = state.inventory.coins ?? 0
    const loss = settleBet(state, race.id, 'player')
    expect(loss?.payout).toBe(0)
    expect(state.inventory.coins ?? 0).toBe(before)
    expect(state.pendingBet).toBeNull()
  })

  it('leaves bets for other races untouched', () => {
    const state = defaultState(T0)
    state.inventory.coins = 30
    const offer = computeOdds(race, { name: 'Buster', stats: midStats })[0]
    placeBet(state, race, offer, 30)
    expect(settleBet(state, 'some_other_race', offer.racerId)).toBeNull()
    expect(state.pendingBet).not.toBeNull()
  })
})
