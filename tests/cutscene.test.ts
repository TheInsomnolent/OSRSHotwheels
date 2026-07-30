import { describe, expect, it } from 'vitest'
import { createCutscene, resolveScript, resolveText } from '../src/engine/cutscene'
import type { CutsceneScript } from '../src/engine/cutscene'
import { INTRO_SCRIPT } from '../src/data/introScript'

const VARS = { player: 'Zezima', dog: 'Scruffius' }

const SCRIPT: CutsceneScript = [
  { kind: 'narration', text: 'A dog named {dog} lies in the dust.' },
  { kind: 'dialogue', speaker: '{player}', chathead: '🧙', text: 'Come on, {player}, think...' },
  { kind: 'quest', speaker: 'Miniquest complete!', text: '{dog} has wheels now.' },
]

describe('cutscene text resolution', () => {
  it('substitutes the player and dog placeholders', () => {
    expect(resolveText('{player} builds {dog} a chair', VARS)).toBe(
      'Zezima builds Scruffius a chair',
    )
  })

  it('substitutes every occurrence and leaves other braces alone', () => {
    expect(resolveText('{player}, {player}! {mystery}', VARS)).toBe('Zezima, Zezima! {mystery}')
  })

  it('resolves speakers as well as text', () => {
    const lines = resolveScript(SCRIPT, VARS)
    expect(lines[1]?.speaker).toBe('Zezima')
    expect(lines[1]?.text).toBe('Come on, Zezima, think...')
    expect(lines[0]?.text).toBe('A dog named Scruffius lies in the dust.')
  })

  it('does not mutate the source script', () => {
    resolveScript(SCRIPT, VARS)
    expect(SCRIPT[1]?.text).toBe('Come on, {player}, think...')
  })
})

describe('cutscene playback', () => {
  it('steps through every line then finishes', () => {
    const scene = createCutscene(SCRIPT, VARS)
    expect(scene.done).toBe(false)
    expect(scene.current?.kind).toBe('narration')
    expect(scene.next()?.speaker).toBe('Zezima')
    expect(scene.next()?.kind).toBe('quest')
    expect(scene.next()).toBeNull()
    expect(scene.done).toBe(true)
    expect(scene.index).toBe(SCRIPT.length)
  })

  it('stays finished when advanced past the end', () => {
    const scene = createCutscene(SCRIPT, VARS)
    scene.skip()
    expect(scene.next()).toBeNull()
    expect(scene.index).toBe(SCRIPT.length)
  })

  it('skips to the end', () => {
    const scene = createCutscene(SCRIPT, VARS)
    scene.skip()
    expect(scene.done).toBe(true)
    expect(scene.current).toBeNull()
  })

  it('handles an empty script', () => {
    const scene = createCutscene([], VARS)
    expect(scene.done).toBe(true)
    expect(scene.current).toBeNull()
  })
})

describe('the intro script', () => {
  it('tells the whole miniquest and leaves no placeholders unresolved', () => {
    const lines = resolveScript(INTRO_SCRIPT, VARS)
    expect(lines.length).toBeGreaterThan(10)
    for (const line of lines) {
      expect(line.text.length).toBeGreaterThan(0)
      expect(line.text).not.toMatch(/\{(player|dog)\}/)
      expect(line.speaker ?? '').not.toMatch(/\{(player|dog)\}/)
      if (line.kind === 'dialogue') expect(line.speaker).toBeTruthy()
    }
    expect(lines.at(-1)?.kind).toBe('quest')
  })

  it('mentions the player and their dog by name', () => {
    const all = resolveScript(INTRO_SCRIPT, VARS)
      .map((line) => `${line.speaker ?? ''}|${line.text}`)
      .join('\n')
    expect(all).toContain('Zezima')
    expect(all).toContain('Scruffius')
  })
})
