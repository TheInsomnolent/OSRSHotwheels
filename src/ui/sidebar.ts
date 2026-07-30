import type { GameCtx } from './context'
import type { SkillId } from '../engine/types'
import { SKILLS } from '../data/skills'
import { ITEMS_BY_ID, itemName } from '../data/items'
import { clampLevel } from '../engine/xp'
import { el, formatQty } from './format'

type SideTab = 'skills' | 'inventory'
let activeTab: SideTab = 'skills'

/** OSRS-style right-hand interface: stats tab and a 4-wide inventory grid. */
export function renderSidebar(container: HTMLElement, ctx: GameCtx): void {
  container.replaceChildren()

  const tabs = el('div', 'side-tabs')
  const tabDefs: { id: SideTab; icon: string; title: string }[] = [
    { id: 'skills', icon: '📊', title: 'Skills' },
    { id: 'inventory', icon: '🎒', title: 'Inventory' },
  ]
  for (const tab of tabDefs) {
    const b = el('button', `side-tab${activeTab === tab.id ? ' active' : ''}`, tab.icon)
    b.type = 'button'
    b.title = tab.title
    b.addEventListener('click', () => {
      activeTab = tab.id
      renderSidebar(container, ctx)
    })
    tabs.append(b)
  }
  container.append(tabs)

  const body = el('div', 'side-body')
  if (activeTab === 'skills') renderSkills(body, ctx)
  else renderInventory(body, ctx)
  container.append(body)
}

function renderSkills(body: HTMLElement, ctx: GameCtx): void {
  const hint = el('div', 'side-hint', 'Click a skill to set its level manually.')
  const grid = el('div', 'skills-grid')
  for (const skill of SKILLS) {
    const level = ctx.state.skills[skill.id]
    const cell = el('button', 'skill-cell')
    cell.type = 'button'
    cell.title = `${skill.name} — ${skill.use}`
    cell.append(
      el('span', 'skill-icon', skill.icon),
      el('span', 'skill-name', skill.name),
      el('span', 'skill-level', `${level}/99`),
    )
    cell.addEventListener('click', () => editSkill(ctx, skill.id, skill.name))
    grid.append(cell)
  }
  const total = SKILLS.reduce((sum, s) => sum + ctx.state.skills[s.id], 0)
  body.append(grid, el('div', 'skills-total', `Total level: ${total}`), hint)
}

function editSkill(ctx: GameCtx, id: SkillId, name: string): void {
  const current = ctx.state.skills[id]
  const raw = window.prompt(`Set your ${name} level (1\u201399):`, String(current))
  if (raw === null) return
  const parsed = Number.parseInt(raw, 10)
  if (Number.isNaN(parsed)) {
    ctx.log(`That doesn't look like a level.`, 'error')
    return
  }
  ctx.state.skills[id] = clampLevel(parsed)
  ctx.log(`${name} level set to ${ctx.state.skills[id]}.`, 'system')
  ctx.save()
  ctx.refresh()
}

function renderInventory(body: HTMLElement, ctx: GameCtx): void {
  const grid = el('div', 'inv-grid')
  const entries = Object.entries(ctx.state.inventory).filter(([, qty]) => qty > 0)
  entries.sort(([a], [b]) => itemName(a).localeCompare(itemName(b)))

  for (const [item, qty] of entries) {
    const slot = el('div', 'inv-slot')
    const info = ITEMS_BY_ID[item]
    slot.title = `${itemName(item)} × ${qty.toLocaleString()}`
    const { text, cls } = formatQty(qty)
    slot.append(el('span', 'inv-icon', info?.icon ?? '❔'), el('span', `inv-qty ${cls}`, text))
    grid.append(slot)
  }
  const minSlots = 28
  for (let i = entries.length; i < minSlots; i++) grid.append(el('div', 'inv-slot empty'))

  body.append(grid)
  if (entries.length === 0) {
    body.append(el('div', 'side-hint', 'Your pack is empty. Set an activity and let it fill up!'))
  }
}
