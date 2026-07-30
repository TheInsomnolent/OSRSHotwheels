import type { GameCtx } from './context'
import type { OpponentDef, RaceDef } from '../engine/types'
import { completeTutorial, isTestDrive, visibleRaces } from '../engine/tutorial'
import { ITEMS_BY_ID, itemName } from '../data/items'
import { computeStats, missingRaceParts } from '../engine/workshop'
import { addItem, itemCount, removeItem } from '../engine/state'
import { simulateRace, type RaceSimOutput } from '../engine/raceSim'
import { computeOdds, cancelBet, placeBet, settleBet } from '../engine/betting'
import type { CompiledTrack } from '../engine/track'
import { hashSeed } from '../engine/rng'
import { runRaceScene, type RaceSceneHandle, type RaceStanding } from '../three/raceScene'
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

  const races = visibleRaces(ctx.state)
  for (const race of races) container.append(raceCard(race, ctx, container, setCleanup))

  container.append(
    el(
      'p',
      'panel-blurb',
      races.some(isTestDrive)
        ? 'The real race meetings open up once you have shaken the new chair down.'
        : 'Championship cups binding these races together are coming next. For ' +
          'now, work your way up from the market dogs to the Penance Queen ' +
          'herself.',
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
    el(
      'div',
      'io-out',
      `${Math.round(race.track.lengthM)}m lap · ${race.laps} lap${race.laps === 1 ? '' : 's'}` +
        (isTestDrive(race) ? '' : ` · Wins: ${wins}`),
    ),
  )

  const lineup = el('div', 'race-lineup')
  lineup.append(
    el(
      'div',
      'lineup-title',
      race.opponents.length > 0 ? 'The competition:' : 'No rivals — the track is all yours.',
    ),
  )
  for (const opponent of race.opponents) lineup.append(opponentRow(opponent))
  card.append(lineup)

  const first = race.rewards[0]
  card.append(
    el(
      'div',
      'io-out',
      first
        ? `1st prize: ${first.coins} coins` +
          (first.items?.length
            ? `, ${first.items.map((i) => `${i.qty}× ${itemName(i.item)}`).join(', ')}`
            : '')
        : 'No prize money — this one is purely for the practice.',
    ),
  )

  // No bookie on a shakedown lap: there is nobody to bet against.
  if (!isTestDrive(race)) card.append(bettingBox(race, ctx))

  const missing = missingRaceParts(ctx.state)
  const start = button(
    isTestDrive(race) ? 'Take it for a spin!' : 'Start race!',
    'osrs-button start-race',
    () => startRace(race, ctx, container, setCleanup),
  )
  if (missing.length > 0) {
    start.disabled = true
    card.append(start)
    card.append(
      el(
        'div',
        'race-gate-hint',
        `⚠ ${ctx.state.dogName} needs a frame, axles, wheels and a harness before racing. ` +
          `Still missing: ${missing.map((slot) => slot.name.toLowerCase()).join(', ')}.`,
      ),
    )
  } else {
    card.append(start)
  }
  return card
}

/** The trackside bookie: stake coins on any dog in the field before the race. */
function bettingBox(race: RaceDef, ctx: GameCtx): HTMLElement {
  const box = el('div', 'betting-box')
  box.append(el('div', 'lineup-title', '💰 Trackside bookie'))

  const pending = ctx.state.pendingBet
  if (pending && pending.raceId === race.id) {
    box.append(
      el(
        'div',
        'bet-slip',
        `${pending.stake} coins riding on ${pending.racerName} at ${pending.odds.toFixed(1)}× — ` +
          `pays ${Math.floor(pending.stake * pending.odds)} if they win.`,
      ),
    )
    box.append(
      button('Cancel bet', 'osrs-button small', () => {
        cancelBet(ctx.state)
        ctx.log('The bookie returns your stake, shaking his head.', 'game')
        ctx.save()
        ctx.refresh()
      }),
    )
    return box
  }

  const coins = itemCount(ctx.state, 'coins')
  if (coins <= 0) {
    box.append(el('div', 'side-hint', 'Win some coins first — the bookie only takes cold coinage.'))
    return box
  }

  const offers = computeOdds(race, {
    name: ctx.state.dogName,
    stats: computeStats(ctx.state, ownedPotion(ctx)),
  })

  const row = el('div', 'bet-row')
  const select = el('select', 'osrs-select') as HTMLSelectElement
  for (const offer of offers) {
    const label = offer.isPlayer ? `${offer.name} (your dog)` : offer.name
    const option = el('option', '', `${label} — ${offer.odds.toFixed(1)}×`) as HTMLOptionElement
    option.value = offer.racerId
    select.append(option)
  }
  const stakeInput = el('input', 'osrs-input bet-stake') as HTMLInputElement
  stakeInput.type = 'number'
  stakeInput.min = '1'
  stakeInput.max = String(coins)
  stakeInput.placeholder = 'Stake'
  row.append(select, stakeInput)
  row.append(
    button('Place bet', 'osrs-button small', () => {
      const offer = offers.find((o) => o.racerId === select.value)
      if (!offer) return
      const stake = Number(stakeInput.value)
      const bet = placeBet(ctx.state, race, offer, stake)
      if (!bet) {
        ctx.log('The bookie squints at your stake and shakes his head.', 'error')
        return
      }
      ctx.log(
        `You stake ${bet.stake} coins on ${bet.racerName} at ${bet.odds.toFixed(1)}×.`,
        'game',
      )
      ctx.save()
      ctx.refresh()
    }),
  )
  box.append(row)
  box.append(el('div', 'side-hint', `You have ${coins} coins. Winnings pay stake × odds.`))
  return box
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
  const towerBox = el('div', 'hud-tower')
  const clockBox = el('div', 'hud-clock', '0.0s')
  const lapBox = el('div', 'hud-lap', `Lap 1/${race.laps}`)
  const countdownBox = el('div', 'hud-countdown')
  const minimap = createMinimap(race.track)
  hud.append(towerBox, clockBox, lapBox, countdownBox, minimap.canvas)

  const controls = el('div', 'hud-controls')
  const speedButtons: HTMLButtonElement[] = [1, 2, 5, 10].map((mult) => {
    const b = button(`${mult}×`, `osrs-button small hud-speed${mult === 1 ? ' active' : ''}`, () => {
      handle.setSpeed(mult)
      for (const other of speedButtons) other.classList.toggle('active', other === b)
    })
    return b
  })
  const skipButton = button('Skip ▸▸', 'osrs-button small hud-skip', () => handle.skip())
  controls.append(...speedButtons, skipButton)
  hud.append(controls)
  viewport.append(hud)
  container.append(viewport)

  let finalized = false
  const finalize = (showOverlay: boolean) => {
    if (finalized) return
    finalized = true

    const player = sim.placements.find((p) => p.isPlayer)!
    if (isTestDrive(race)) {
      // A shakedown lap: no placement, no prize money, no bookie. Finishing it
      // ends the tutorial and the opening cinematic picks back up.
      ctx.log(
        `${ctx.state.dogName} rattles around the empty market square in ` +
          `${formatRaceTime(player.timeS)} and skids to a stop, grinning.`,
        'game',
      )
      completeTutorial(ctx.state)
      ctx.save()
    } else {
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

      const settled = settleBet(ctx.state, race.id, sim.placements[0].racerId)
      if (settled) {
        if (settled.payout > 0) {
          ctx.log(
            `The bookie grudgingly counts out ${settled.payout} coins on ${settled.bet.racerName}.`,
            'reward',
          )
        } else {
          ctx.log(
            `Your ${settled.bet.stake} coin stake on ${settled.bet.racerName} vanishes into the bookie's coat.`,
            'game',
          )
        }
      }
      ctx.save()
    }

    if (showOverlay) {
      // Keep the UI locked so the periodic refresh can't wipe the results
      // overlay; leaveRace unlocks when the player continues or tabs away.
      controls.remove()
      countdownBox.textContent = ''
      viewport.append(resultsOverlay(race, sim, ctx, container, setCleanup, leaveRace))
    } else {
      ctx.uiLocked = false
    }
  }

  const handle: RaceSceneHandle = runRaceScene({
    container: viewport,
    sim,
    track: race.track,
    onCountdown(value) {
      countdownBox.textContent = value === 'go' ? 'Go!' : String(value)
      countdownBox.classList.toggle('go', value === 'go')
      if (value === 'go') setTimeout(() => (countdownBox.textContent = ''), 900)
    },
    onProgress(standings, raceTimeS) {
      clockBox.textContent = `${raceTimeS.toFixed(1)}s`
      const player = standings.find((s) => s.isPlayer)
      if (player) lapBox.textContent = `Lap ${player.lap}/${race.laps}`
      towerBox.replaceChildren(...standings.map((s, i) => towerRow(s, i)))
      minimap.draw(standings)
    },
    onFinished() {
      finalize(true)
    },
  })

  // Settle the race (rewards, unlock, GL teardown). Runs when the player
  // clicks Continue, or via cleanup if they switch tabs mid-race.
  let introResumed = false
  const leaveRace = () => {
    finalize(false)
    ctx.uiLocked = false
    handle.dispose()
    // The test drive is the last beat of the tutorial: resume the cinematic.
    if (isTestDrive(race) && !ctx.state.introSeen && !introResumed) {
      introResumed = true
      ctx.finishIntro()
    }
  }
  setCleanup(leaveRace)
}

/** One line of the timing tower: position, colour chip, name, gap/time. */
function towerRow(standing: RaceStanding, index: number): HTMLElement {
  const row = el('div', `tower-row${standing.isPlayer ? ' player' : ''}`)
  const chip = el('span', 'tower-chip')
  chip.style.background = `#${standing.colour.toString(16).padStart(6, '0')}`
  const gap =
    standing.timeS !== null
      ? formatRaceTime(standing.timeS)
      : index === 0
        ? 'Leader'
        : `+${standing.gapS.toFixed(1)}s`
  row.append(
    el('span', 'tower-pos', String(index + 1)),
    chip,
    el('span', 'tower-name', standing.name),
    el('span', 'tower-gap', gap),
  )
  return row
}

/** A little top-down course map with live racer blips. */
function createMinimap(track: CompiledTrack): {
  canvas: HTMLCanvasElement
  draw(standings: RaceStanding[]): void
} {
  const size = 150
  const canvas = el('canvas', 'hud-minimap') as HTMLCanvasElement
  canvas.width = size
  canvas.height = size
  const g = canvas.getContext('2d')!
  const pad = 16
  const scale = Math.min(
    (size - pad * 2) / (track.halfW * 2),
    (size - pad * 2) / (track.halfD * 2),
  )
  const toX = (x: number) => size / 2 + x * scale
  const toY = (z: number) => size / 2 + z * scale

  const steps = Math.max(64, Math.round(track.lengthM / 2))
  const outline = Array.from({ length: steps }, (_, i) =>
    track.pointAt((i / steps) * track.lengthM),
  )
  // Perpendicular of the start line, for the chequered tick.
  const p0 = track.pointAt(0)
  const p1 = track.pointAt(1)
  const dir = Math.hypot(p1.x - p0.x, p1.z - p0.z) || 1
  const nx = -(p1.z - p0.z) / dir
  const nz = (p1.x - p0.x) / dir

  return {
    canvas,
    draw(standings) {
      g.clearRect(0, 0, size, size)
      g.beginPath()
      outline.forEach((p, i) => (i === 0 ? g.moveTo(toX(p.x), toY(p.z)) : g.lineTo(toX(p.x), toY(p.z))))
      g.closePath()
      g.lineJoin = 'round'
      g.lineWidth = Math.max(4, 9 * scale)
      g.strokeStyle = 'rgb(240 226 198 / 80%)'
      g.stroke()
      // Start/finish line
      g.beginPath()
      g.moveTo(toX(p0.x - nx * 5), toY(p0.z - nz * 5))
      g.lineTo(toX(p0.x + nx * 5), toY(p0.z + nz * 5))
      g.lineWidth = 2
      g.strokeStyle = '#3a2f22'
      g.stroke()
      // Racer blips, player drawn last so they sit on top
      for (const s of [...standings].reverse()) {
        const p = track.pointAt(s.lapDist)
        g.beginPath()
        g.arc(toX(p.x), toY(p.z), s.isPlayer ? 4.5 : 3.5, 0, Math.PI * 2)
        g.fillStyle = `#${s.colour.toString(16).padStart(6, '0')}`
        g.fill()
        g.lineWidth = s.isPlayer ? 2 : 1
        g.strokeStyle = s.isPlayer ? '#ffe97d' : 'rgb(0 0 0 / 55%)'
        g.stroke()
      }
    },
  }
}

function resultsOverlay(
  race: RaceDef,
  sim: RaceSimOutput,
  ctx: GameCtx,
  container: HTMLElement,
  setCleanup: (fn: () => void) => void,
  leaveRace: () => void,
): HTMLElement {
  const overlay = el('div', 'race-results')
  const panel = el('div', 'results-panel')
  const player = sim.placements.find((p) => p.isPlayer)!
  panel.append(
    el(
      'h3',
      'panel-title',
      isTestDrive(race)
        ? '🐕 Shakedown complete'
        : player.position === 1
          ? '🏆 Victory!'
          : `${ordinal(player.position)} place`,
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
      leaveRace()
      renderLobby(container, ctx, setCleanup)
      ctx.refresh()
    }),
  )
  overlay.append(panel)
  return overlay
}
