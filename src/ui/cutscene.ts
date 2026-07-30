import type { CutsceneLine, CutsceneScript, CutsceneVars } from '../engine/cutscene'
import { createCutscene } from '../engine/cutscene'
import { button, el } from './format'

/** Milliseconds per revealed character of dialogue. */
const TYPE_MS = 22

/**
 * Play an OSRS-style quest cutscene over a scenic backdrop. Clicking (or
 * pressing space/enter) finishes the current line then advances; "Skip" jumps
 * to the end. Resolves once the scene is over.
 */
export function playCutscene(
  container: HTMLElement,
  script: CutsceneScript,
  vars: CutsceneVars,
): Promise<void> {
  const scene = createCutscene(script, vars)

  const overlay = el('div', 'cutscene')
  const backdrop = el('div', 'cutscene-backdrop')
  backdrop.append(
    el('div', 'cutscene-sun'),
    el('div', 'cutscene-hills'),
    el('div', 'cutscene-city'),
    el('div', 'cutscene-fence'),
    el('div', 'cutscene-ground'),
  )
  const caption = el('div', 'cutscene-caption', 'Miniquest: Hotwheels')
  const box = el('div', 'cutscene-box')
  overlay.append(backdrop, caption, box)

  const skip = button('Skip cutscene', 'osrs-button small cutscene-skip', () => finish())
  overlay.append(skip)
  container.append(overlay)

  let typing: number | null = null
  let fullText = ''
  let textNode: HTMLElement | null = null
  let settled = false
  let resolveScene: () => void = () => {}
  const promise = new Promise<void>((resolve) => {
    resolveScene = resolve
  })

  function stopTyping(): void {
    if (typing !== null) {
      window.clearInterval(typing)
      typing = null
    }
  }

  function renderLine(line: CutsceneLine): void {
    stopTyping()
    box.replaceChildren()
    box.className = `cutscene-box cutscene-${line.kind}`

    if (line.kind === 'dialogue' && line.chathead) {
      const head = el('div', 'cutscene-chathead', line.chathead)
      head.style.background = line.colour ?? '#4a4033'
      box.append(head)
    }
    const body = el('div', 'cutscene-body')
    if (line.speaker) body.append(el('div', 'cutscene-speaker', line.speaker))
    textNode = el('div', 'cutscene-text')
    body.append(textNode)
    body.append(el('div', 'cutscene-continue', 'Click here to continue'))
    box.append(body)

    fullText = line.text
    let shown = 0
    textNode.textContent = ''
    typing = window.setInterval(() => {
      shown += 1
      if (textNode) textNode.textContent = fullText.slice(0, shown)
      if (shown >= fullText.length) stopTyping()
    }, TYPE_MS)
  }

  function advance(): void {
    if (settled) return
    // First click finishes the typewriter, the next one moves on.
    if (typing !== null) {
      stopTyping()
      if (textNode) textNode.textContent = fullText
      return
    }
    scene.next()
    const line = scene.current
    if (line) renderLine(line)
    else finish()
  }

  function finish(): void {
    if (settled) return
    settled = true
    stopTyping()
    scene.skip()
    overlay.removeEventListener('click', onClick)
    window.removeEventListener('keydown', onKey)
    overlay.classList.add('cutscene-fading')
    window.setTimeout(() => {
      overlay.remove()
      resolveScene()
    }, 320)
  }

  function onClick(event: MouseEvent): void {
    if (event.target === skip) return
    advance()
  }

  function onKey(event: KeyboardEvent): void {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      advance()
    } else if (event.key === 'Escape') {
      finish()
    }
  }

  overlay.addEventListener('click', onClick)
  window.addEventListener('keydown', onKey)

  const first = scene.current
  if (first) renderLine(first)
  else finish()

  return promise
}
