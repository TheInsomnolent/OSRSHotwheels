/** A tiny state machine for OSRS-style quest cutscenes. */

/** How a line is presented: a chathead dialogue box, plain narration, or a quest scroll. */
export type CutsceneLineKind = 'dialogue' | 'narration' | 'quest'

export interface CutsceneLine {
  kind: CutsceneLineKind
  /** Displayed above the text for dialogue lines. */
  speaker?: string
  /** Emoji used as a stand-in chathead. */
  chathead?: string
  /** Chathead background colour (CSS). */
  colour?: string
  /**
   * Line text. `{player}` and `{dog}` placeholders are substituted with the
   * player's RSN and their dog's name.
   */
  text: string
}

export type CutsceneScript = readonly CutsceneLine[]

export interface CutsceneVars {
  player: string
  dog: string
}

/** Replace `{player}` / `{dog}` placeholders. Unknown placeholders are left alone. */
export function resolveText(text: string, vars: CutsceneVars): string {
  return text.replace(/\{(player|dog)\}/g, (_match, key: string) =>
    key === 'player' ? vars.player : vars.dog,
  )
}

export function resolveScript(script: CutsceneScript, vars: CutsceneVars): CutsceneLine[] {
  return script.map((line) => ({
    ...line,
    text: resolveText(line.text, vars),
    ...(line.speaker === undefined ? {} : { speaker: resolveText(line.speaker, vars) }),
  }))
}

export interface Cutscene {
  /** Resolved lines, placeholders already substituted. */
  readonly lines: readonly CutsceneLine[]
  /** Index of the line being shown, or `lines.length` once finished. */
  readonly index: number
  /** The line being shown, or null once finished. */
  readonly current: CutsceneLine | null
  readonly done: boolean
  /** Advance to the next line. Returns the new current line (null when finished). */
  next(): CutsceneLine | null
  /** Jump straight to the end. */
  skip(): void
}

export function createCutscene(script: CutsceneScript, vars: CutsceneVars): Cutscene {
  const lines = resolveScript(script, vars)
  let index = 0
  return {
    lines,
    get index() {
      return index
    },
    get current() {
      return lines[index] ?? null
    },
    get done() {
      return index >= lines.length
    },
    next() {
      if (index < lines.length) index++
      return lines[index] ?? null
    },
    skip() {
      index = lines.length
    },
  }
}
