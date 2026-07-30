import type { GameCtx } from './context'
import type { SkillId } from '../engine/types'
import { SKILLS } from '../data/skills'
import { fetchHiscores, PlayerNotRankedError, validRsn } from '../engine/hiscores'
import { renderSidebar } from './sidebar'
import { renderActivitiesPanel } from './activitiesPanel'
import { renderWorkshopPanel } from './workshopPanel'
import { renderRacePanel } from './racePanel'
import { createChatbox } from './chatbox'
import { button, el } from './format'

type MainTab = 'gather' | 'workshop' | 'race'

export interface AppHandle {
  refresh(): void
  chat: ReturnType<typeof createChatbox>
}

export function createApp(root: HTMLElement, ctx: GameCtx): AppHandle {
  root.replaceChildren()
  let activeTab: MainTab = 'gather'
  let panelCleanup: () => void = () => {}

  // ── Header ─────────────────────────────────────────────────────
  const header = el('header', 'app-header')
  const logo = el('div', 'logo')
  logo.append(el('span', 'logo-osrs', 'OSRS'), el('span', 'logo-hot', ' Hot Wheels'))
  header.append(logo)
  header.append(
    el('div', 'tagline', 'Build a racing wheelchair for your best friend'),
  )
  header.append(rsnForm(ctx))
  root.append(header)

  // ── Main area: tabbed panel + sidebar ──────────────────────────
  const main = el('main', 'app-main')
  const panelWrap = el('div', 'panel-wrap')
  const tabBar = el('nav', 'tab-bar')
  const panel = el('section', 'main-panel')
  panelWrap.append(tabBar, panel)
  const sidebar = el('aside', 'app-sidebar')
  main.append(panelWrap, sidebar)
  root.append(main)

  // ── Chatbox ────────────────────────────────────────────────────
  const chatContainer = el('footer', '')
  root.append(chatContainer)
  const chat = createChatbox(chatContainer)
  chat.render(ctx.messages)

  const tabs: { id: MainTab; label: string }[] = [
    { id: 'gather', label: '⚒ Gather' },
    { id: 'workshop', label: '🔧 Workshop' },
    { id: 'race', label: '🏁 Race' },
  ]

  function renderTabBar(): void {
    tabBar.replaceChildren(
      ...tabs.map((tab) => {
        const b = button(tab.label, `main-tab${tab.id === activeTab ? ' active' : ''}`, () => {
          if (tab.id === activeTab) return
          panelCleanup()
          panelCleanup = () => {}
          activeTab = tab.id
          renderTabBar()
          renderPanel()
        })
        return b
      }),
    )
  }

  function renderPanel(): void {
    if (activeTab === 'gather') renderActivitiesPanel(panel, ctx)
    else if (activeTab === 'workshop') renderWorkshopPanel(panel, ctx)
    else panelCleanup = renderRacePanel(panel, ctx)
  }

  renderTabBar()
  renderPanel()
  renderSidebar(sidebar, ctx)

  return {
    refresh() {
      if (ctx.uiLocked) return
      renderPanel()
      renderSidebar(sidebar, ctx)
    },
    chat,
  }
}

function rsnForm(ctx: GameCtx): HTMLElement {
  const form = el('form', 'rsn-form') as HTMLFormElement
  const input = el('input', 'osrs-input') as HTMLInputElement
  input.placeholder = 'Your RSN…'
  input.maxLength = 12
  input.value = ctx.state.rsn ?? ''
  const submit = button('Look up stats', 'osrs-button', () => {})
  submit.type = 'submit'
  form.append(input, submit)

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const rsn = input.value.trim()
    if (!validRsn(rsn)) {
      ctx.log('That RSN doesn\u2019t look right (1\u201312 letters, numbers, spaces).', 'error')
      return
    }
    submit.disabled = true
    submit.textContent = 'Looking up…'
    fetchHiscores(rsn)
      .then((levels) => {
        ctx.state.rsn = rsn
        const found: string[] = []
        for (const skill of SKILLS) {
          const level = levels[skill.id as SkillId]
          if (level !== undefined) {
            ctx.state.skills[skill.id] = level
            found.push(`${skill.name} ${level}`)
          }
        }
        ctx.log(`Welcome, ${rsn}! Hiscores loaded: ${found.join(', ') || 'no skills found'}.`, 'system')
        if (levels.sailing === undefined) {
          ctx.log('Sailing isn\u2019t on the hiscores yet \u2014 set it by clicking it in the Skills tab.', 'system')
        }
        ctx.save()
        ctx.refresh()
      })
      .catch((error: unknown) => {
        if (error instanceof PlayerNotRankedError) {
          ctx.log(`${error.message}. You can set levels by hand in the Skills tab.`, 'error')
        } else {
          ctx.log(
            'Couldn\u2019t reach the hiscores (the API blocks browsers sometimes). ' +
              'Set your levels by clicking skills in the Skills tab.',
            'error',
          )
        }
      })
      .finally(() => {
        submit.disabled = false
        submit.textContent = 'Look up stats'
      })
  })
  return form
}
