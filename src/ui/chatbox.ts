import type { ChatMessage } from '../engine/types'
import { el } from './format'

const MAX_MESSAGES = 100

export function createChatbox(container: HTMLElement): {
  push(msg: ChatMessage): void
  render(messages: ChatMessage[]): void
} {
  container.classList.add('chatbox')
  const scroller = el('div', 'chatbox-scroll')
  container.append(scroller)

  function line(msg: ChatMessage): HTMLElement {
    return el('div', `chat-line chat-${msg.kind}`, msg.text)
  }

  return {
    push(msg) {
      scroller.append(line(msg))
      while (scroller.childElementCount > MAX_MESSAGES) scroller.firstElementChild?.remove()
      scroller.scrollTop = scroller.scrollHeight
    },
    render(messages) {
      scroller.replaceChildren(...messages.slice(-MAX_MESSAGES).map(line))
      scroller.scrollTop = scroller.scrollHeight
    },
  }
}
