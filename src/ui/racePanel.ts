import type { GameCtx } from './context'
import type { OpponentDef, RaceDef } from '../engine/types'
import { RACES } from '../data/races'
import { ITEMS_BY_ID, itemName } from '../data/items'
import { computeStats } from '../engine/workshop'
import { addItem, itemCount, removeItem } from '../engine/state'
import { simulateRace, type RaceSimOutput } from '../engine/raceSim'
import { hashSeed } from '../engine/rng'
import { runRaceScene, type RaceSceneHandle } from '../three/raceScene'
import { button, el, formatRaceTime, ordinal } from './format'

/** Renders the race lobby, and runs races in the 3D viewport. Returns a cleanup. */
export function renderRacePanel(container: HTMLElement, ctx: GameCtx): () => void {
  let cleanup: () => void = () => {}
  renderLobby(container, ctx, (fn) => (cleanup = fn))
  return () => cleanup()
}

function renderLobby(
  container: HTMLElement,
  ctx: GameCtx,
  setCleanup: (fn: () => void) => void,
): void {
  setCleanup(() => {})
  container.replaceChildren()
  container.append(el('h2', 'panel-title', 'Race Day'))

  const stats = computeStats(ctx.state, ownedPotion(ctx))
  const dogBox = el('div', 'stats-box')
  const dogHead = el('div', 'dog-head')
  dogHead.append(el('h3', 'group-title', `🐕 ${ctx.state.dogName}`))
  dogHead.append(
    button('Rename', 'osrs-button small', () => {
      const name = window.prompt("Your dog's name:", ctx.state.dogName)
      if (!name?.trim()) return
      ctx.state.dogName = name.trim().slice(0, 20)
      ctx.save()
      ctx.refresh()
    }),
  )
  dogBox.append(dogHead)
  dogBox.append(
    el(
      'div',
      'card-desc',
      `Top speed ${stats.topSpeed.toFixed(2)} m/s · Acceleration ${stats.acceleration.toFixed(2)} m/s² · ` +
        `Handling ${Math.round(stats.handling * 100)}%` +
        (ownedPotion(ctx) ? ` (with ${itemName(ownedPotion(ctx)!)})` : ''),
    ),
  )
  dogBox.append(potionPicker(ctx))
  container.append(dogBox)

  for (const race of RACES) container.append(raceCard(race, ctx, container, setCleanup))

  container.append(
    el(
      'p',
      'panel-blurb',
      'More races and championship cups are coming: bears, unicorns, terrorbirds \u2014 ' +
        'even, whisper it, a penance queen. Beat the market dogs first.',
    ),
  )
}

function ownedPotion(ctx: GameCtx): string | null {
  const potion = ctx.state.selectedPotion
  if (potion && itemCount(ctx.state, potion) > 0 && ITEMS_BY_ID[potion]?.potion) return potion
  return null
}

function potionPicker(ctx: GameCtx): HTMLElement {
  const row = el('div', 'potion-row')
  row.append(el('span', 'stat-label', 'Pre-race potion: '))
  const select = el('select', 'osrs-select') as HTMLSelectElement
  const none = el('option', '', 'None') as HTMLOptionElement
  none.value = ''
  select.append(none)
  for (const item of Object.values(ITEMS_BY_ID)) {
    if (!item.potion) continue
    const count = itemCount(ctx.state, item.id)
    if (count <= 0) continue
    const option = el('option', '', `${item.name} × ${count}`) as HTMLOptionElement
    option.value = item.id
    select.append(option)
  }
  select.value = ownedPotion(ctx) ?? ''
  select.addEventListener('change', () => {
    ctx.state.selectedPotion = select.value || null
    ctx.save()
    ctx.refresh()
  })
  row.append(select)
  if (select.options.length === 1) {
    row.append(el('span', 'side-hint', ' Brew some with Herblore!'))
  }
  return row
}

function statDots(value: number, min: number, max: number): string {
  const filled = Math.max(1, Math.min(5, Math.round(((value - min) / (max - min)) * 5)))
  return '●'.repeat(filled) + '○'.repeat(5 - filled)
}

function opponentRow(opponent: OpponentDef): HTMLElement {
  const row = el('div', 'opponent-row')
  row.append(el('span', 'opponent-name', `${opponent.name} (${opponent.species})`))
  row.append(
    el(
      'span',
      'opponent-stats',
      `Spd ${statDots(opponent.stats.topSpeed, 6, 10)}  Acc ${statDots(opponent.stats.acceleration, 1, 2.5)}  ` +
        `Hnd ${statDots(opponent.stats.handling, 0.1, 0.8)}`,
    ),
  )
  return row
}

function raceCard(
  race: RaceDef,
  ctx: GameCtx,
  container: HTMLElement,
  setCleanup: (fn: () => void) => void,
): HTMLElement {
  const card = el('div', 'race-card')
  card.append(el('h3', 'group-title', `🏁 ${race.name}`))
  card.append(el('div', 'race-location', race.location))
  card.append(el('p', 'card-desc', race.desc))

  const wins = ctx.state.raceWins[race.id] ?? 0
  card.append(
    el('div', 'io-out', `${race.lengthM}m · ${race.laps} lap · Wins: ${wins}`),
  )

  const lineup = el('div', 'race-lineup')
  lineup.append(el('div', 'lineup-title', 'The competition:'))
  for (const opponent of race.opponents) lineup.append(opponentRow(opponent))
  card.append(lineup)

  const first = race.rewards[0]
  card.append(
    el(
      'div',
      'io-out',
      `1st prize: ${first.coins} coins` +
        (first.items?.length
          ? `, ${first.items.map((i) => `${i.qty}× ${itemName(i.item)}`).join(', ')}`
          : ''),
    ),
  )

  card.append(
    button('Start race!', 'osrs-button start-race', () =>
      startRace(race, ctx, container, setCleanup),
    ),
  )
  return card
}

function startRace(
  race: RaceDef,
  ctx: GameCtx,
  container: HTMLElement,
  setCleanup: (fn: () => void) => void,
): void {
  const potion = ownedPotion(ctx)
  const stats = computeStats(ctx.state, potion)
  if (potion) {
    removeItem(ctx.state, potion, 1)
    ctx.log(`${ctx.state.dogName} laps up the ${itemName(potion)}. Tail wags intensify.`, 'game')
    if (itemCount(ctx.state, potion) === 0) ctx.state.selectedPotion = null
  }

  const seed = (Date.now() ^ hashSeed(ctx.state.rsn ?? ctx.state.dogName)) >>> 0
  const sim = simulateRace(race, { name: ctx.state.dogName, stats }, seed)

  ctx.uiLocked = true
  ctx.log(`The ${race.name} is underway!`, 'game')

  container.replaceChildren()
  const viewport = el('div', 'race-viewport')
  const hud = el('div', 'race-hud')
  const standingsBox = el('div', 'hud-standings')
  const clockBox = el('div', 'hud-clock', '0.0s')
  const countdownBox = el('div', 'hud-countdown')
  hud.append(standingsBox, clockBox, countdownBox)
  const skipButton = button('Skip ▸▸', 'osrs-button hud-skip', () => handle.skip())
  hud.append(skipButton)
  viewport.append(hud)
  container.append(viewport)

  let finalized = false
  const finalize = (showOverlay: boolean) => {
    if (finalized) return
    finalized = true
    ctx.uiLocked = false

    const player = sim.placements.find((p) => p.isPlayer)!
    const reward = race.rewards[Math.min(player.position - 1, race.rewards.length - 1)]
    addItem(ctx.state, 'coins', reward.coins)
    for (const item of reward.items ?? []) addItem(ctx.state, item.item, item.qty)
    if (player.position === 1) {
      ctx.state.raceWins[race.id] = (ctx.state.raceWins[race.id] ?? 0) + 1
      ctx.log(`${ctx.state.dogName} wins the ${race.name}! What a good dog!`, 'reward')
    } else {
      ctx.log(`${ctx.state.dogName} finishes ${ordinal(player.position)} in the ${race.name}.`, 'game')
    }
    const rewardText =
      `You receive ${reward.coins} coins` +
      (reward.items?.length
        ? ` and ${reward.items.map((i) => `${i.qty}× ${itemName(i.item)}`).join(', ')}`
        : '')
    ctx.log(`${rewardText}.`, 'reward')
    ctx.save()

    if (showOverlay) {
      skipButton.remove()
      countdownBox.textContent = ''
      viewport.append(resultsOverlay(sim, ctx, container, setCleanup))
    }
  }

  const handle: RaceSceneHandle = runRaceScene({
    container: viewport,
    sim,
    onCountdown(value) {
      countdownBox.textContent = value === 'go' ? 'Go!' : String(value)
      countdownBox.classList.toggle('go', value === 'go')
      if (value === 'go') setTimeout(() => (countdownBox.textContent = ''), 900)
    },
    onProgress(standings, raceTimeS) {
      clockBox.textContent = `${raceTimeS.toFixed(1)}s`
      standingsBox.replaceChildren(
        ...standings.map((s, i) =>
          el('div', `standing${s.isPlayer ? ' player' : ''}`, `${i + 1}. ${s.name}`),
        ),
      )
    },
    onFinished() {
      finalize(true)
    },
  })

  // If the player abandons the viewport (tab switch), settle the race quietly.
  setCleanup(() => {
    finalize(false)
    handle.dispose()
  })
}

function resultsOverlay(
  sim: RaceSimOutput,
  ctx: GameCtx,
  container: HTMLElement,
  setCleanup: (fn: () => void) => void,
): HTMLElement {
  const overlay = el('div', 'race-results')
  const panel = el('div', 'results-panel')
  const player = sim.placements.find((p) => p.isPlayer)!
  panel.append(
    el(
      'h3',
      'panel-title',
      player.position === 1 ? '🏆 Victory!' : `${ordinal(player.position)} place`,
    ),
  )
  const table = el('div', 'results-table')
  for (const placement of sim.placements) {
    const row = el('div', `results-row${placement.isPlayer ? ' player' : ''}`)
    row.append(
      el('span', 'results-pos', ordinal(placement.position)),
      el('span', 'results-name', placement.name),
      el('span', 'results-time', formatRaceTime(placement.timeS)),
    )
    table.append(row)
  }
  panel.append(table)
  panel.append(
    button('Continue', 'osrs-button', () => {
      renderLobby(container, ctx, setCleanup)
      ctx.refresh()
    }),
  )
  overlay.append(panel)
  return overlay
}
