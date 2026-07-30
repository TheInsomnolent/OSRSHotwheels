# 🛞 OSRS Hot Wheels

An Old School RuneScape–flavoured minigame simulator where you build a **racing
wheelchair for your pet dog** using your OSRS skills, then race it against other
wheelchair-bound creatures of Gielinor.

Play it here: **<https://theinsomnolent.github.io/OSRSHotwheels/>**

## The game

- **Look up your RSN** – enter your Old School RuneScape name and the game
  fetches your real skill levels from the official hiscores. (No account? Click
  any skill in the sidebar to set its level manually.)
- **Idle resource gathering** – pick what your character gathers or processes
  (mining, smithing, woodcutting, fletching, farming, herblore, crafting,
  construction, magic, sailing). Activities are gated by skill level and keep
  running while you're away — come back later and collect the goods (offline
  progress caps at 12 hours).
- **The workshop** – spend your resources on wheelchair parts:
  - 🏠 **Construction** → wheelchair frames
  - ⚒️ **Smithing** → axles
  - 🏹 **Fletching** → wheels
  - 🧵 **Crafting** → harnesses
  - ⛵ **Sailing** → aerodynamic fairings
  - ✨ **Magic** → enchantments
  - 🧪 **Herblore** → single-use "performance enhancing" potions
- **Race!** – take your dog to the **Civitas illa Fortis market dash** and race
  three other very good dogs around the fountain in a cute low-poly 3D scene
  rendered with three.js. Win races to earn bonus resources.

More races (bigger, faster, more exotic creatures — and cups to bind them
together) are planned. This bootstrap ships the engine, the idle gathering
game mode, the workshop, and the first dog race.

## Development

```bash
npm install
npm run dev       # dev server at http://localhost:5173/OSRSHotwheels/
npm test          # run the vitest suite
npm run build     # typecheck + production build into dist/
npm run preview   # serve the production build locally
```

### Stack

- [Vite](https://vite.dev/) + TypeScript, no framework — a single-page app
- [three.js](https://threejs.org/) for the low-poly 3D race scenes
- [Vitest](https://vitest.dev/) for the engine test suite
- Plain CSS themed after the OSRS interface (stone borders, parchment panels)

### Project layout

```
src/
  engine/    game logic: xp curves, idle processing, workshop, race sim, hiscores
  data/      content: skills, items, activities, upgrade tiers, race definitions
  ui/        DOM components: chatbox, sidebar, panels for gather/workshop/race
  three/     3D: dog + wheelchair rig, market scene, race playback
tests/       vitest suites for the engine
```

### Deployment

Pushes to `main` trigger the **Deploy to GitHub Pages** workflow
(`.github/workflows/deploy.yml`): it tests, builds and publishes `dist/` to
GitHub Pages. For this to work the repository's *Settings → Pages → Source*
must be set to **GitHub Actions**.

### Save data

Game state (skills, inventory, upgrades, dog name, wins) is stored in
`localStorage` under `osrshotwheels.save.v1`. Clearing site data resets the
game.

## Notes

- Hiscores lookups call the official OSRS hiscores JSON endpoint. It has no
  CORS headers, so the game falls back to public CORS proxies; if a lookup
  fails you can always set skill levels manually via the sidebar.
- This is a fan project. Old School RuneScape is a trademark of Jagex Ltd; this
  project is not affiliated with or endorsed by Jagex.
