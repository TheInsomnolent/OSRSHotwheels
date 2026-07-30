import type { CutsceneScript } from '../engine/cutscene'

/**
 * "Hotwheels" — the opening miniquest cinematic, played once before the game
 * starts. `{player}` and `{dog}` are substituted at runtime.
 */

const KID = { speaker: 'Crying Child', chathead: '😭', colour: '#8c5a2b' }
const VET = { speaker: 'Fortis Vet', chathead: '🧑‍⚕️', colour: '#3d6b57' }
const PLAYER = { speaker: '{player}', chathead: '🧙', colour: '#6b5f4d' }
const GUARD = { speaker: 'Fortis Guard', chathead: '💂', colour: '#5c4a7a' }
const MERCHANT = { speaker: 'Jim the Merchant', chathead: '🧑‍🌾', colour: '#8a6d2f' }
const SMITH = { speaker: 'Fortis Smith', chathead: '🧔', colour: '#7a3b23' }

export const INTRO_SCRIPT: CutsceneScript = [
  {
    kind: 'narration',
    text:
      'West of Civitas illa Fortis, out by the buffalo pens, a child kneels in the dust, ' +
      'sobbing. A dog lies beside them, very still. A vet stands nearby, shaking his head.',
  },
  {
    kind: 'dialogue',
    ...VET,
    text:
      "I'm sorry, kid. The buffalo stampede broke your dog's spine \u2014 there's nothing I can do. " +
      'Without the use of his back legs, he may have to be put down.',
  },
  {
    kind: 'dialogue',
    ...KID,
    text: "No! Not {dog}! He can't be put down. If you won't help him, maybe someone else will.",
  },
  { kind: 'dialogue', ...KID, text: 'Hey, adventurer! Do you know any healing magic?' },
  {
    kind: 'dialogue',
    ...PLAYER,
    text: "Sorry, I don't have anything like that in my spellbook...",
  },
  { kind: 'dialogue', ...VET, text: 'As I said. There is nothing that can be done.' },
  {
    kind: 'dialogue',
    ...KID,
    text: 'NOOOOO! Please, adventurer, help us. I wanna play with my friend again!',
  },
  { kind: 'dialogue', ...PLAYER, text: "Oh... ok. I'll think of something." },
  {
    kind: 'narration',
    text: 'A merchant trundles past, hauling a heavily laden cart down the Fortis road.',
  },
  { kind: 'dialogue', ...GUARD, text: 'New wheels on your cart, Jim?' },
  { kind: 'dialogue', ...MERCHANT, text: 'Yeah, do you like them?' },
  { kind: 'dialogue', ...PLAYER, text: 'Come on, {player}, think... think...' },
  {
    kind: 'dialogue',
    ...MERCHANT,
    text: 'Nothing like a freshly carved set of wheels. The smith helped me with the axles.',
  },
  { kind: 'dialogue', ...PLAYER, text: "Why can't I think of anything? Think harder..." },
  {
    kind: 'narration',
    text: 'A nearby guard fumbles his shield. It slips from his arm and rolls off down the road.',
  },
  { kind: 'dialogue', ...GUARD, text: 'Whoops.' },
  { kind: 'dialogue', ...PLAYER, text: "Oh! I've got it!" },
  { kind: 'dialogue', speaker: 'Vet and Child', chathead: '😐', colour: '#5a5142', text: '...' },
  {
    kind: 'narration',
    text: 'You gather two wooden shields of the same quality and carry them to the smith.',
  },
  {
    kind: 'dialogue',
    ...SMITH,
    text:
      'Two shields, eh? Aye, I see it. Two iron spits for the axles, a pair of crossbow stocks ' +
      'for struts, leather vambraces for the straps \u2014 and a fistful of nails to hold it all together.',
  },
  {
    kind: 'narration',
    text: 'You build a doggy wheelchair and fit it to {dog}. He wobbles once... then bolts.',
  },
  {
    kind: 'dialogue',
    speaker: 'Delighted Child',
    chathead: '😄',
    colour: '#8c5a2b',
    text: 'Wow, thanks, mister\u2014 er, miss\u2014 er... adventurer! Now {dog} and I can play forever!',
  },
  {
    kind: 'narration',
    text: 'The child and {dog} tear off around the buffalo pen, wheels rattling, tail wagging.',
  },
  { kind: 'dialogue', ...VET, text: 'Well. I suppose every dog has his day...' },
  { kind: 'dialogue', ...VET, text: "...I'll see myself out." },
  {
    kind: 'quest',
    speaker: 'Miniquest complete!',
    text:
      "{dog} has wheels now \u2014 and he's fast. Faster than one small child can keep up with, in fact. " +
      'Time to build him a proper racing chair, {player}.',
  },
]
