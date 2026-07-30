import type { GameCtx } from './context'
import type { SkillId } from '../engine/types'
import { SKILLS } from '../data/skills'
import { itemName } from '../data/items'
import { clampLevel } from '../engine/xp'
import { el, formatQty, itemIcon, skillIcon } from './format'

/** OSRS-style right-hand interface: skills and inventory shown stacked, split evenly. */
export function renderSidebar(container: HTMLElement, ctx: GameCtx): void {
  container.replaceChildren()

  const skillsPane = el('div', 'side-pane')
  const skillsHeader = el('div', 'side-pane-header', '📊 Skills')
  const skillsBody = el('div', 'side-body')
  renderSkills(skillsBody, ctx)
  skillsPane.append(skillsHeader, skillsBody)

  const inventoryPane = el('div', 'side-pane')
  const inventoryHeader = el('div', 'side-pane-header', '🎒 Inventory')
  const inventoryBody = el('div', 'side-body')
  renderInventory(inventoryBody, ctx)
  inventoryPane.append(inventoryHeader, inventoryBody)

  container.append(skillsPane, el('div', 'side-divider'), inventoryPane)
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
      skillIcon(skill.id),
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
    slot.title = `${itemName(item)} × ${qty.toLocaleString()}`
    const { text, cls } = formatQty(qty)
    slot.append(itemIcon(item), el('span', `inv-qty ${cls}`, text))
    grid.append(slot)
  }
  const minSlots = 28
  for (let i = entries.length; i < minSlots; i++) grid.append(el('div', 'inv-slot empty'))

  body.append(grid)
  if (entries.length === 0) {
    body.append(el('div', 'side-hint', 'Your pack is empty. Set an activity and let it fill up!'))
  }
}
