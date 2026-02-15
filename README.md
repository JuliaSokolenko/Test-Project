# Game Developer Assignment

A Pixi.js (v8) demo with three mini-experiences: **Ace of Shadows**, **Magic Words**, and **Phoenix Flame**. Built with TypeScript and Webpack.

## Getting started

**Requirements:** Node.js 18+ and npm.

```bash
# Install dependencies
npm install

# Development (with hot reload)
npm run dev
```

Then open the URL shown in the terminal (e.g. `http://localhost:8080`).

```bash
# Production build (output in dist/)
npm run build

# Preview production build locally
npm run preview
```

Other scripts: `npm run lint` (ESLint), `npm run format` (Prettier).

## Features

- **In-game menu** — Choose any of the three tasks from the main menu; each scene has a “← Menu” button to return.
- **FPS** — Shown in the top-left corner.
- **Full screen** — Canvas fills the viewport; first click/tap requests browser fullscreen when supported.
- **Responsive** — Layout adapts to mobile and desktop (touch and mouse).

## Tasks

### 1. Ace of Shadows

- **144 sprites** (cards) drawn as Pixi sprites (not raw Graphics).
- Cards are arranged in **2 stacks** (left and right); each card is slightly offset so the top card only partially covers the one below.
- **Every 1 second** the top card of one stack moves to the other stack.
- **Movement animation** lasts 2 seconds (ease-in-out cubic).

### 2. Magic Words

- **Text + images** combined like custom emojis: dialogue lines can contain `{emojiName}` placeholders, which are replaced by images from the API.
- **Dialogue** is loaded from:
  `https://private-624120-softgamesassignment.apiary-mock.com/v2/magicwords`
- Renders **avatars** (left/right) and **speech bubbles** with inline emoji images.
- **Scroll** — Use the mouse wheel (or trackpad) to scroll long dialogue.

### 3. Phoenix Flame

- **Particle-style fire** effect.
- **At most 10 sprites** on screen at once (spawn rate and lifetime tuned to keep the cap).
- Sprites move upward with slight drift and fade out over their lifetime.

## Tech stack

- **TypeScript**
- **Pixi.js v8** (rendering)
- **Webpack 5** (build and dev server)

## Project structure

```
src/
  main.ts              # Entry: Pixi app, canvas, FPS, resize
  types.ts             # Shared types (Scene, Magic Words API)
  constants.ts         # Config (API URL, counts, timings)
  core/
    GameEngine.ts      # Canvas, Pixi app, header, resize, lifecycle
    SceneManager.ts    # Scene loading, transitions, menu/scene switching
  components/
    BackButton.ts      # Shared "← Menu" button for scenes
  loaders/
    cards.ts           # Card textures (1.webp–6.webp)
    magicWords.ts      # Magic Words API + emoji/avatar images
  effects/
    FireEmitter.ts     # Fire particle emitter (Phoenix Flame)
  utils/
    fps.ts             # FPS display (top-left)
    easing.ts          # Easing functions (easeInOutCubic)
  scenes/
    MenuScene.ts           # Main menu (3 buttons)
    AceOfShadowsScene.ts   # 144 cards, 2 stacks, move animation
    MagicWordsScene.ts    # API fetch, emojis, dialogue + scroll
    PhoenixFlameScene.ts  # Fire particles (max 10 sprites)
```

## Hosting and repository

- **Public git repo** — Push this project to GitHub (or another host) and add the link here.
- **Hosted build** — Deploy the `dist/` folder to any static host (Vercel, Netlify, GitHub Pages, etc.) and add the live URL here.

Example:

- Repo: `https://github.com/JuliaSokolenko/Test-Assignment.git`
- Live: `https://your-username.github.io/game-developer-assignment/` (or your chosen host)
