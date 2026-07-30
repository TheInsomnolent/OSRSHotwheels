import type { GameCtx } from './context'
import type { UpgradeSlotDef, UpgradeTier } from '../engine/types'
import { UPGRADE_SLOTS } from '../data/upgrades'
import { SKILL_NAMES } from '../data/skills'
import { itemName } from '../data/items'
import { buildUpgrade, canAfford, computeStats, meetsLevel } from '../engine/workshop'
import { itemCount } from '../engine/state'
import { button, el, itemChip } from './format'

/** The garage: turn hard-earned resources into wheelchair go-faster parts. */
export function renderWorkshopPanel(container: HTMLElement, ctx: GameCtx): void {
  container.replaceChildren()
  container.append(el('h2', 'panel-title', 'Wheelchair Workshop'))
  container.append(
    el(
      'p',
      'panel-blurb',
      `Every part makes ${ctx.state.dogName}'s racing wheelchair a little faster. ` +
        'Parts must be built in order \u2014 no strapping rune axles to a rotten frame.',
    ),
  )

  const stats = computeStats(ctx.state)
  const statsBox = el('div', 'stats-box')
  statsBox.append(
    el('h3', 'group-title', `${ctx.state.dogName}'s racing stats`),
    statRow('Top speed', `${stats.topSpeed.toFixed(2)} m/s`),
    statRow('Acceleration', `${stats.acceleration.toFixed(2)} m/s²`),
    statRow('Handling', `${Math.round(stats.handling * 100)}%`),
  )
  container.append(statsBox)

  for (const slotDef of UPGRADE_SLOTS) container.append(slotSection(slotDef, ctx))
}

function statRow(label: string, value: string): HTMLElement {
  const row = el('div', 'stat-row')
  row.append(el('span', 'stat-label', label), el('span', 'stat-value', value))
  return row
}

function slotSection(slotDef: UpgradeSlotDef, ctx: GameCtx): HTMLElement {
  const owned = ctx.state.upgrades[slotDef.slot] ?? 0
  const section = el('section', 'workshop-slot')
  const ownedTier = slotDef.tiers.find((t) => t.tier === owned)
  section.append(
    el('h3', 'group-title', `${slotDef.name} — ${ownedTier ? ownedTier.name : 'None fitted'}`),
  )
  section.append(el('p', 'card-desc', slotDef.flavour))

  // Progressive disclosure: superseded tiers are history and future tiers
  // stay under wraps — only the fitted part and the next project show.
  const visible = slotDef.tiers.filter((t) => t.tier === owned || t.tier === owned + 1)
  const list = el('div', 'tier-list')
  for (const tier of visible) list.append(tierCard(slotDef, tier, owned, ctx))
  section.append(list)

  const hiddenAhead = slotDef.tiers.filter((t) => t.tier > owned + 1).length
  if (hiddenAhead > 0) {
    section.append(
      el(
        'p',
        'panel-footnote',
        `${hiddenAhead} more tier${hiddenAhead === 1 ? '' : 's'} to uncover beyond this one.`,
      ),
    )
  }
  return section
}

function tierCard(
  slotDef: UpgradeSlotDef,
  tier: UpgradeTier,
  owned: number,
  ctx: GameCtx,
): HTMLElement {
  const isOwned = owned >= tier.tier
  const isNext = owned === tier.tier - 1
  const levelOk = meetsLevel(ctx.state, tier)
  const affordable = canAfford(ctx.state, tier)

  const card = el(
    'div',
    `tier-card${isOwned ? ' owned' : ''}${isNext ? ' next' : ''}${!levelOk ? ' locked' : ''}`,
  )
  const head = el('div', 'card-head')
  head.append(el('span', 'card-name', tier.name))
  head.append(
    el('span', `card-req${levelOk ? '' : ' unmet'}`, `${SKILL_NAMES[tier.skill]} ${tier.levelReq}`),
  )
  card.append(head)
  card.append(el('p', 'card-desc', tier.desc))

  const statBits: string[] = []
  if (tier.stats.topSpeed) statBits.push(`+${tier.stats.topSpeed} speed`)
  if (tier.stats.acceleration) statBits.push(`+${tier.stats.acceleration} accel`)
  if (tier.stats.handling) statBits.push(`+${Math.round(tier.stats.handling * 100)}% handling`)
  if (tier.mult) statBits.push(`×${tier.mult.toFixed(2)} speed & accel`)
  card.append(el('div', 'io-out', statBits.join(', ')))

  const costLine = el('div', 'cost-line')
  for (const cost of tier.cost) {
    const have = itemCount(ctx.state, cost.item)
    const chip = itemChip(cost.item, `${itemName(cost.item)} ${Math.min(have, cost.qty)}/${cost.qty}`)
    chip.classList.add('cost-item', have >= cost.qty ? 'met' : 'unmet')
    costLine.append(chip)
  }
  card.append(costLine)

  if (isOwned) {
    card.append(el('div', 'card-active-tag', '✓ Fitted'))
  } else if (isNext) {
    const b = button('Build', 'osrs-button', () => {
      const result = buildUpgrade(ctx.state, slotDef.slot, tier.tier)
      if (result.ok) {
        ctx.log(`You fit the ${tier.name} to the wheelchair. Lovely work.`, 'reward')
        ctx.save()
        ctx.refresh()
      } else if (result.reason === 'level') {
        ctx.log(`You need ${SKILL_NAMES[tier.skill]} level ${tier.levelReq} for that.`, 'error')
      } else if (result.reason === 'resources') {
        ctx.log('You lack the resources. Back to gathering!', 'error')
      }
    })
    if (!levelOk || !affordable) b.disabled = true
    card.append(b)
  } else {
    card.append(el('div', 'card-locked-tag', `Build the previous ${slotDef.name.toLowerCase()} first`))
  }
  return card
}
