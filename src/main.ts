import './style.css'
import type { ChatMessage } from './engine/types'
import { loadState, saveState } from './engine/state'
import { processIdle, type IdleReport } from './engine/idle'
import { itemName } from './data/items'
import { createApp } from './ui/app'
import { runIntro, runIntroFinale } from './ui/intro'
import type { GameCtx } from './ui/context'
import { formatDuration } from './ui/format'

const state = loadState(localStorage)
const messages: ChatMessage[] = []

const ctx: GameCtx = {
  state,
  messages,
  uiLocked: false,
  log(text, kind = 'game') {
    const msg: ChatMessage = { text, kind, time: Date.now() }
    messages.push(msg)
    if (messages.length > 200) messages.shift()
    app?.chat.push(msg)
  },
  save() {
    saveState(localStorage, state)
  },
  refresh() {
    app?.refresh()
  },
  finishIntro() {
    if (state.introSeen || finishingIntro) return
    finishingIntro = true
    void runIntroFinale(root, ctx).then(() => {
      finishingIntro = false
      ctx.log(
        `Miniquest complete! ${state.dogName} is race-ready \u2014 the full card of races is open.`,
        'reward',
      )
      ctx.refresh()
    })
  },
}

let finishingIntro = false

let app: ReturnType<typeof createApp> | null = null

function describeGains(report: IdleReport): string {
  return report.gained.map((g) => `${g.qty}× ${itemName(g.item)}`).join(', ')
}

// Process time that passed while the tab was closed.
const startedAt = Date.now()
const awayMs = startedAt - state.lastProcessed
const offlineReport = processIdle(state, startedAt)

const root = document.querySelector<HTMLDivElement>('#app')!

function logWelcome(): void {
  ctx.log('Welcome to OSRS Hot Wheels!', 'system')
  if (state.rsn) ctx.log(`Good to see you again, ${state.rsn}.`, 'system')
  else {
    ctx.log('Enter your RSN up top to load your real OSRS stats, or click skills to set them by hand.', 'system')
  }
  if (offlineReport.actions > 0 && offlineReport.activity) {
    ctx.log(
      `While you were away (${formatDuration(awayMs)}), ${offlineReport.activity.name.toLowerCase()} ` +
        `earned you: ${describeGains(offlineReport)}.`,
      'reward',
    )
  }
  if (offlineReport.starved && offlineReport.activity) {
    ctx.log(`You ran out of materials for ${offlineReport.activity.name.toLowerCase()} and stopped.`, 'game')
  }
}

async function boot(): Promise<void> {
  // First visit: title screen (RSN entry) then the opening half of the
  // miniquest cinematic. A reload part-way through the tutorial goes straight
  // back to the game rather than replaying the story.
  if (!state.introSeen && state.tutorial === 'intro') {
    root.classList.add('intro-mode')
    await runIntro(root, ctx)
    root.classList.remove('intro-mode')
  }
  logWelcome()
  app = createApp(root, ctx)
  app.chat.render(messages)
  saveState(localStorage, state)
  // Reloaded after the test drive but before the finale played: pick it up.
  if (!state.introSeen && state.tutorial === 'done') ctx.finishIntro()
}

void boot()

// ── Game loop ────────────────────────────────────────────────────
let lastLoggedAction = 0
window.setInterval(() => {
  const report = processIdle(state, Date.now())
  if (report.actions > 0) {
    lastLoggedAction++
    // Log a gentle progress note every ~5 completed batches, not every tick.
    if (lastLoggedAction % 5 === 0 && report.activity) {
      ctx.log(`You get: ${describeGains(report)}.`, 'game')
    }
    ctx.refresh()
  }
  if (report.starved && report.activity) {
    ctx.log(`You have run out of materials for ${report.activity.name.toLowerCase()}.`, 'error')
    ctx.refresh()
  }
}, 1000)

window.setInterval(() => saveState(localStorage, state), 15_000)
window.addEventListener('beforeunload', () => {
  processIdle(state, Date.now())
  saveState(localStorage, state)
})
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    processIdle(state, Date.now())
    saveState(localStorage, state)
  }
})
