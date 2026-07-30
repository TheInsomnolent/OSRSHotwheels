import './style.css'
import type { ChatMessage } from './engine/types'
import { loadState, saveState } from './engine/state'
import { processIdle, type IdleReport } from './engine/idle'
import { itemName } from './data/items'
import { createApp } from './ui/app'
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
}

let app: ReturnType<typeof createApp> | null = null

function describeGains(report: IdleReport): string {
  return report.gained.map((g) => `${g.qty}× ${itemName(g.item)}`).join(', ')
}

// Process time that passed while the tab was closed.
const startedAt = Date.now()
const awayMs = startedAt - state.lastProcessed
const offlineReport = processIdle(state, startedAt)

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

app = createApp(document.querySelector<HTMLDivElement>('#app')!, ctx)
app.chat.render(messages)
saveState(localStorage, state)

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
