# 🏹 HOODCITY

**A first-person, Roblox-style Robin Hood minigame that runs in your browser.**

Explore a medieval walled town (Nottingham/Sherwood themed), roam the cobbled
streets in first person as a hooded outlaw with a longbow, visit realistic
timber-framed shops, and **trade with other players** in a live marketplace.

Built with vanilla JavaScript + [Three.js](https://threejs.org) — no build step,
no framework. Just open it and play.

---

## ▶ Play

Because the game loads ES modules, it must be served over HTTP (not opened as a
`file://` path).

```bash
# from the project root
python3 -m http.server 8099
# then open http://localhost:8099 in a modern browser
```

Any static server works (e.g. `npx serve`, VS Code Live Server, etc.).

## 🎮 Controls

| Key | Action |
| --- | --- |
| `W A S D` | Move |
| `Mouse` | Look around |
| `Shift` | Sprint |
| `Space` | Jump |
| `E` | Interact / open a shop / close a shop |
| `Left Click` | Fire an arrow |
| `M` | Toggle minimap |
| `Esc` | Release mouse / close shop |

Click **Enter the City**, then click the screen to lock the mouse and start playing.

## 🏰 Features

- **True first-person** movement with pointer-lock mouse look, head-bob,
  gravity, jumping, sprinting and AABB building collisions.
- **A Robin Hood main character** — you hold a longbow in first person
  (Lincoln-green sleeves + gloved hands) and can loose arrows across the town.
- **Realistic medieval buildings** — procedurally textured **Tudor timber-framed
  houses** with brick/plaster walls, jettied upper floors, mullioned windows,
  gabled tiled/thatched roofs and chimneys, a fortified **town wall with
  battlements and corner towers**, cobbled streets, a central fountain plaza,
  market stalls, lamp posts, trees, and Nottingham **Castle**.
- **Four themed shops**, each with its own keeper:
  - 🏹 *The Fletcher's Bowyer* — bows, arrows, blades (Little John)
  - 🛡️ *Sherwood Armory* — hoods, cloaks, shields, boots (Will Scarlet)
  - 🍺 *The Blue Boar Inn* — ale, food, a lute (Friar Tuck)
  - 🪙 *Nottingham Market* — pelts, gems, rings, scrolls (Maid Marian)
- **Trade with other players** — a **Live Player Market** where simulated online
  traders continuously post buy/sell offers. Purchase their goods, or list your
  own items for sale. The "traders online" counter fluctuates as players come and
  go.
- **Economy & inventory** — gold, arrows and HP, a Buy/Sell system, and a small
  quest line that guides you into trading.
- **HUD** — crosshair, gold/arrow counters, health bar, quest tracker,
  interaction prompts, toasts, and a live minimap.

## 🗂 Project structure

```
index.html      # page shell: loading, menu, HUD, shop panel
styles.css      # all UI styling (medieval theme)
src/
  main.js       # renderer, scene, lighting, viewmodel, arrows, game loop, input
  player.js     # first-person controller (movement + collisions)
  city.js       # procedural city: buildings, walls, castle, shops, decor
  textures.js   # procedural canvas textures (brick, plaster, wood, cobble, roof…)
  data.js       # item catalog, shop definitions, trader names
  trade.js      # economy state, shop UI, buy/sell, live player market
```

> Tip: append `?debug` to the URL to expose `window.HOOD` with references to the
> player, city and trade systems for testing.

## 🛠 Tech

- [Three.js](https://threejs.org) r161 (loaded from CDN via an import map)
- Pointer Lock API for first-person mouse look
- Procedurally generated textures (HTML canvas) — no external image assets

## 📜 License

Made for fun. Rob from the rich, trade with the people. 🎯
