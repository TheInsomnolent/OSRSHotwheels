import { INTRO_FINALE, INTRO_OPENING } from '../data/introScript'
import { fetchHiscores, validRsn } from '../engine/hiscores'
import type { GameCtx } from './context'
import { playCutscene } from './cutscene'
import { button, el } from './format'
import { applyHiscoreLevels, hiscoreErrorMessage } from './hiscoreSync'

/**
 * The opening sequence: an OSRS-style title screen that takes the player's RSN,
 * then the opening half of the "Hotwheels" miniquest cinematic, which breaks
 * off at the smith for the guided tutorial. The hiscores lookup runs in the
 * background while the cutscene plays, so the game is ready when it ends.
 *
 * Skipping the cinematic skips the tutorial too.
 */
export function runIntro(container: HTMLElement, ctx: GameCtx): Promise<void> {
  return new Promise<void>((resolve) => {
    const screen = el('div', 'title-screen')
    const card = el('div', 'title-card')

    const logo = el('div', 'title-logo')
    logo.append(el('span', 'logo-osrs', 'OSRS'), el('span', 'logo-hot', ' Hot Wheels'))
    card.append(logo)
    card.append(el('div', 'title-quest', 'Miniquest: Hotwheels'))
    card.append(
      el(
        'div',
        'title-blurb',
        'Enter your RuneScape name so the world knows who saved the dog. ' +
          'We\u2019ll fetch your real levels from the hiscores while the story plays.',
      ),
    )

    const form = el('form', 'title-form') as HTMLFormElement
    const input = el('input', 'osrs-input') as HTMLInputElement
    input.placeholder = 'Your RSN\u2026'
    input.maxLength = 12
    input.value = ctx.state.rsn ?? ''
    const start = button('Begin', 'osrs-button', () => {})
    start.type = 'submit'
    form.append(input, start)
    card.append(form)

    const error = el('div', 'title-error')
    card.append(error)

    const skipRow = el('div', 'title-skip-row')
    skipRow.append(
      button('Skip the cinematic', 'osrs-button small', () => begin(true)),
      el('div', 'title-hint', 'No RSN? Leave it blank and set your levels by hand later.'),
    )
    card.append(skipRow)

    screen.append(card)
    container.append(screen)
    window.setTimeout(() => input.focus(), 0)

    let started = false

    function begin(skipCutscene: boolean): void {
      if (started) return
      const rsn = input.value.trim()
      if (rsn.length > 0 && !validRsn(rsn)) {
        error.textContent = 'That RSN doesn\u2019t look right (1\u201312 letters, numbers, spaces).'
        return
      }
      started = true
      error.textContent = ''

      if (rsn.length > 0) {
        ctx.state.rsn = rsn
        ctx.save()
        // Fetch in the background; whenever it lands, the levels are applied.
        fetchHiscores(rsn)
          .then((levels) => {
            const found = applyHiscoreLevels(ctx, rsn, levels)
            ctx.log(
              `Welcome, ${rsn}! Hiscores loaded: ${found.join(', ') || 'no skills found'}.`,
              'system',
            )
            if (levels.sailing === undefined) {
              ctx.log(
                'Sailing isn\u2019t on the hiscores yet \u2014 set it by clicking it in the Skills tab.',
                'system',
              )
            }
            ctx.refresh()
          })
          .catch((err: unknown) => {
            ctx.log(hiscoreErrorMessage(err), 'error')
            ctx.refresh()
          })
      }

      screen.remove()
      const player = rsn.length > 0 ? rsn : 'Adventurer'
      if (skipCutscene) {
        ctx.state.introSeen = true
        ctx.state.tutorial = 'done'
        ctx.save()
        resolve()
        return
      }
      void playCutscene(container, INTRO_OPENING, { player, dog: ctx.state.dogName }).then(() => {
        ctx.state.tutorial = 'gather'
        ctx.save()
        resolve()
      })
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault()
      begin(false)
    })
  })
}

/**
 * The closing half of the cinematic, played over the game once the tutorial's
 * test drive is done. Resolves when the story is over and the intro is marked
 * as seen.
 */
export function runIntroFinale(container: HTMLElement, ctx: GameCtx): Promise<void> {
  if (ctx.state.introSeen) return Promise.resolve()
  const player = ctx.state.rsn ?? 'Adventurer'
  return playCutscene(container, INTRO_FINALE, { player, dog: ctx.state.dogName }).then(() => {
    ctx.state.introSeen = true
    ctx.state.tutorial = 'done'
    ctx.save()
  })
}
