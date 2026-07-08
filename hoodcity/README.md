# HOODCITY

A browser-based, first-person Robin Hood minigame built with [Three.js](https://threejs.org/) — think "Roblox tycoon meets Sherwood Forest." Explore a hand-built medieval town, trade with shopkeepers, rob the Sheriff's tax wagon, hand out charity to the poor, and test your aim at the archery range.

Everything (terrain, buildings, characters, textures) is generated procedurally in code — there are no external image/model assets to download, so the game loads instantly.

## Features

- **First-person controller** — WASD movement, mouse look (pointer lock), sprinting with a stamina bar, jumping, and wall/building collision.
- **Robin Hood character** — a low-poly hooded archer with a cape, quiver and longbow, shown rotating on the start screen and worn by the in-game viewmodel.
- **Bow & arrow combat** — click and hold to draw the bow, release to fire a physically-simulated arrow (gravity + travel time). Hit the archery targets near the Fletcher's shop to earn gold.
- **Six distinct shops** built from procedurally-textured Tudor/stone/brick buildings (timber framing, glass windows, thatched/tiled roofs, chimneys, hanging signs):
  - Sherwood Armory (weapons)
  - Fletcher & Sons Bowyer (bows & arrows)
  - Marian's Bread House (food)
  - Green Cloth Tailor (clothing)
  - The Boar's Head Inn (potions/rest)
  - Nottingham Trading Post (fence stolen loot for gold)
- **Trading economy** — buy and sell items with persistent gold/inventory (saved to `localStorage`), each shop has its own price list.
- **Robin Hood mechanics** — rob the Sheriff's tax wagon (60s cooldown) for stolen loot to fence at the Trading Post, or donate gold to poor villagers to raise your Outlaw Reputation.
- **HUD** — health/stamina/reputation bars, gold counter, compass, inventory bar, interaction prompts, and toast notifications.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL in your browser. Click **Enter Sherwood** to start (pointer lock requires a user gesture, so the button click also locks the mouse).

To create a production build:

```bash
npm run build
npm run preview
```

## Controls

| Input | Action |
| --- | --- |
| `W A S D` | Move |
| Mouse | Look around |
| `Space` | Jump |
| `Shift` | Sprint |
| Left click (hold + release) | Draw & shoot the bow |
| `E` | Trade with a shopkeeper / give gold to a villager / rob the tax wagon |
| `Esc` | Release the mouse / pause |

## Project structure

```
src/
  scene/        Procedural textures, building/character/world builders
  systems/      First-person controller, bow & arrow combat, gold/inventory economy
  ui/           HUD, shop trading modal, start-screen character preview
  data/         Shop catalogs, NPC & prop placement data
  main.js       App bootstrap & game loop
```

## Notes on multiplayer

"Trade with others" is currently implemented as trading with NPC shopkeepers (a single-player experience) rather than real player-to-player trading, since real multiplayer requires a backend (WebSocket/authoritative server, matchmaking, etc.) which is outside the scope of a static front-end. The economy, inventory and shop systems are already structured so that a future multiplayer layer could plug in relatively cleanly.
