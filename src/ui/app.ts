import type { GameCtx } from './context'
import { fetchHiscores, validRsn } from '../engine/hiscores'
import { applyHiscoreLevels, hiscoreErrorMessage } from './hiscoreSync'
import { renderSidebar } from './sidebar'
import { renderActivitiesPanel } from './activitiesPanel'
import { renderWorkshopPanel } from './workshopPanel'
import { renderRacePanel } from './racePanel'
import { createChatbox } from './chatbox'
import { button, el } from './format'
import type { MainTab } from '../engine/tutorial'
import { advanceTutorial, isTabUnlocked, tutorialHint } from '../engine/tutorial'

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
  header.append(resetButton(ctx))
  root.append(header)

  // ── Main area: tabbed panel + sidebar ──────────────────────────
  const main = el('main', 'app-main')
  const panelWrap = el('div', 'panel-wrap')
  const tabBar = el('nav', 'tab-bar')
  const hint = el('div', 'tutorial-hint')
  const panel = el('section', 'main-panel')
  panelWrap.append(tabBar, hint, panel)
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
    // The tutorial reveals the workshop and race tabs one stage at a time.
    const unlocked = tabs.filter((tab) => isTabUnlocked(ctx.state, tab.id))
    if (!unlocked.some((tab) => tab.id === activeTab)) {
      panelCleanup()
      panelCleanup = () => {}
      activeTab = unlocked[0].id
    }
    tabBar.replaceChildren(
      ...unlocked.map((tab) => {
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

  function renderHint(): void {
    const text = tutorialHint(ctx.state)
    hint.textContent = text ?? ''
    hint.classList.toggle('active', text !== null)
  }

  function renderPanel(): void {
    if (activeTab === 'gather') renderActivitiesPanel(panel, ctx)
    else if (activeTab === 'workshop') renderWorkshopPanel(panel, ctx)
    else panelCleanup = renderRacePanel(panel, ctx)
  }

  // A save that already meets the current goal (or an old one) starts further on.
  advanceTutorial(ctx.state)

  renderTabBar()
  renderHint()
  renderPanel()
  renderSidebar(sidebar, ctx)

  return {
    refresh() {
      if (ctx.uiLocked) return
      // Reaching a tutorial goal can unlock a tab, so check before rendering.
      const stage = advanceTutorial(ctx.state)
      if (stage) {
        ctx.save()
        if (stage === 'workshop') {
          ctx.log(
            'You have everything the smith asked for \u2014 the Workshop is open to you now.',
            'system',
          )
        } else if (stage === 'test_drive') {
          ctx.log(
            'The wheelchair is finished! Take it out on the Test Drive in the Race tab.',
            'system',
          )
        }
        renderTabBar()
      }
      renderHint()
      renderPanel()
      renderSidebar(sidebar, ctx)
    },
    chat,
  }
}

function resetButton(ctx: GameCtx): HTMLElement {
  return button('↺ Reset progress', 'osrs-button small danger', () => {
    const confirmed = window.confirm(
      'Reset all progress? This will erase your skills, inventory, upgrades and race wins, and cannot be undone.',
    )
    if (!confirmed) return
    ctx.reset()
  })
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
        const found = applyHiscoreLevels(ctx, rsn, levels)
        ctx.log(`Welcome, ${rsn}! Hiscores loaded: ${found.join(', ') || 'no skills found'}.`, 'system')
        if (levels.sailing === undefined) {
          ctx.log('Sailing isn\u2019t on the hiscores yet \u2014 set it by clicking it in the Skills tab.', 'system')
        }
        ctx.refresh()
      })
      .catch((error: unknown) => {
        ctx.log(hiscoreErrorMessage(error), 'error')
      })
      .finally(() => {
        submit.disabled = false
        submit.textContent = 'Look up stats'
      })
  })
  return form
}
