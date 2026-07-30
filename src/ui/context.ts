import type { ChatMessage, GameState } from '../engine/types'

/** Shared context handed to every UI panel. */
export interface GameCtx {
  state: GameState
  messages: ChatMessage[]
  /** Append a line to the chatbox. */
  log(text: string, kind?: ChatMessage['kind']): void
  /** Persist the game state to localStorage. */
  save(): void
  /** Re-render the active panel and sidebar. */
  refresh(): void
  /** Wipe all saved progress and restart the game from the very beginning. */
  reset(): void
  /** While true (e.g. during race playback) the periodic tick skips re-rendering. */
  uiLocked: boolean
  /**
   * Play the closing half of the opening cinematic, once the guided tutorial's
   * test drive is done. A no-op if the intro has already been seen.
   */
  finishIntro(): void
}
