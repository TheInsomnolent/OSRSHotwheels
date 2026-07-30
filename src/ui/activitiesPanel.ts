import type { GameCtx } from './context'
import type { ActivityDef, SkillId } from '../engine/types'
import { ACTIVITIES } from '../data/activities'
import { SKILL_NAMES } from '../data/skills'
import { itemName } from '../data/items'
import { actionMs, canStartActivity, setActivity } from '../engine/idle'
import { relevantActivities } from '../engine/relevance'
import { itemCount } from '../engine/state'
import { button, el, formatDuration, itemChip } from './format'

/** The idle heart of the game: pick what your character gathers or processes. */
export function renderActivitiesPanel(container: HTMLElement, ctx: GameCtx): void {
  container.replaceChildren()
  container.append(el('h2', 'panel-title', 'Resource Gathering'))
  container.append(
    el(
      'p',
      'panel-blurb',
      'Set a task and your character works away at it \u2014 even while the page is closed ' +
        '(up to 12 hours). Higher OSRS levels unlock better resources and work faster.',
    ),
  )

  const current = ACTIVITIES.find((a) => a.id === ctx.state.currentActivity)
  const banner = el('div', 'current-activity')
  if (current) {
    banner.append(
      el('span', 'current-label', 'Currently: '),
      el('span', 'current-name', current.name),
      button('Stop', 'osrs-button small', () => {
        setActivity(ctx.state, null, Date.now())
        ctx.log('You stop working and have a well-earned sit down.', 'game')
        ctx.save()
        ctx.refresh()
      }),
    )
  } else {
    banner.append(el('span', 'current-label', 'Currently: '), el('span', 'current-name idle', 'Idle'))
  }
  container.append(banner)

  const visible = relevantActivities(ctx.state)
  const hidden = ACTIVITIES.length - visible.length

  const groups = new Map<SkillId, ActivityDef[]>()
  for (const activity of visible) {
    const list = groups.get(activity.skill) ?? []
    list.push(activity)
    groups.set(activity.skill, list)
  }

  for (const [skill, activities] of groups) {
    const section = el('section', 'activity-group')
    section.append(
      el('h3', 'group-title', `${SKILL_NAMES[skill]} (level ${ctx.state.skills[skill]})`),
    )
    const list = el('div', 'activity-list')
    for (const activity of activities) list.append(activityCard(activity, ctx))
    section.append(list)
    container.append(section)
  }

  if (hidden > 0) {
    container.append(
      el(
        'p',
        'panel-footnote',
        `${hidden} ${hidden === 1 ? 'activity is' : 'activities are'} hidden \u2014 ` +
          'their materials aren\u2019t needed for any current project.',
      ),
    )
  }
}

function activityCard(activity: ActivityDef, ctx: GameCtx): HTMLElement {
  const unlocked = canStartActivity(ctx.state, activity)
  const active = ctx.state.currentActivity === activity.id
  const card = el('div', `activity-card${unlocked ? '' : ' locked'}${active ? ' active' : ''}`)

  const head = el('div', 'card-head')
  head.append(el('span', 'card-name', activity.name))
  head.append(
    el(
      'span',
      `card-req${unlocked ? '' : ' unmet'}`,
      `${SKILL_NAMES[activity.skill]} ${activity.levelReq}`,
    ),
  )
  card.append(head)
  card.append(el('p', 'card-desc', activity.desc))

  const io = el('div', 'card-io')
  const ms = actionMs(activity, ctx.state.skills[activity.skill])
  if (activity.inputs?.length) {
    const missing = activity.inputs.some((i) => itemCount(ctx.state, i.item) < i.qty)
    const line = el('span', `io-in${missing && active ? ' missing' : ''}`)
    line.append(el('span', undefined, 'Uses: '))
    for (const i of activity.inputs) line.append(itemChip(i.item, `${i.qty}× ${itemName(i.item)}`))
    io.append(line)
  }
  const out = el('span', 'io-out')
  out.append(el('span', undefined, 'Makes: '))
  for (const o of activity.outputs) out.append(itemChip(o.item, `${o.qty}× ${itemName(o.item)}`))
  out.append(el('span', undefined, ` every ${formatDuration(ms)}`))
  io.append(out)
  card.append(io)

  if (active) {
    card.append(el('div', 'card-active-tag', '⚒ Working…'))
  } else if (unlocked) {
    card.append(
      button('Start', 'osrs-button', () => {
        if (setActivity(ctx.state, activity.id, Date.now())) {
          ctx.log(`You set to work: ${activity.name.toLowerCase()}.`, 'game')
          ctx.save()
          ctx.refresh()
        }
      }),
    )
  } else {
    card.append(
      el(
        'div',
        'card-locked-tag',
        `Requires ${SKILL_NAMES[activity.skill]} level ${activity.levelReq}`,
      ),
    )
  }
  return card
}
