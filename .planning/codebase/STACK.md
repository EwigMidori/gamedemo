# Technology Stack

**Analysis Date:** 2026-03-31

## Languages

**Primary:**
- **TypeScript** (v5.9.3) - All application code, strict mode enabled

**Secondary:**
- **JavaScript (ES Modules)** - Build tooling and scripts in `/tools/`
- **CSS** - Styling at `src/style.css`
- **HTML** - Entry point at `index.html`

## Runtime

**Environment:**
- **Node.js** (v24.14.0) - Development environment and tooling
- **Browser (DOM)** - Target runtime for the game
- **ES2023** - Target JavaScript specification

**Package Manager:**
- **pnpm** - Workspace monorepo management
- Lockfile: `pnpm-lock.yaml` present

## Frameworks

**Core:**
- **Phaser** (v3.90.0) - 2D game framework for rendering, input, and scene management
- **phaser3-rex-plugins** (v1.80.19) - UI plugin library for Phaser (used for HUD components)

**Build/Dev:**
- **Vite** (v8.0.0) - Build tool and dev server
  - Config: `apps/host-web/vite.config.ts`
  - Module resolution: `bundler`
  - Path aliases for all workspace packages

**Testing:**
- **Playwright** (v1.58.2) - E2E testing and browser automation for visual comparison

## Key Dependencies

**Game Engine:**
- `phaser` (v3.90.0) - Core game framework
- `phaser3-rex-plugins` (v1.80.19) - Extended UI components

**Visual Testing:**
- `pixelmatch` (v7.1.0) - Pixel-level image comparison
- `pngjs` (v7.0.0) - PNG image processing
- `@playwright/test` (v1.58.2) - Browser automation

**Workspace Packages:**
- `@gamedemo/engine-core` - Core engine types and abstractions
- `@gamedemo/engine-phaser` - Phaser-specific rendering implementation
- `@gamedemo/engine-runtime` - Game runtime and session management
- `@gamedemo/engine-content` - Content registry and definitions
- `@gamedemo/mod-api` - Mod system API
- `@gamedemo/mod-loader` - Dynamic mod loading
- `@gamedemo/save-schema` - Save game data structures
- `@gamedemo/vanilla-domain` - Domain-specific game logic

## Configuration

**TypeScript:**
- Base config: `tsconfig.base.json`
- Per-package configs extend base
- Key settings:
  - `target`: ES2023
  - `module`: ESNext
  - `moduleResolution`: bundler
  - `strict`: true
  - `noEmit`: true
  - `verbatimModuleSyntax`: true

**Vite:**
- Config: `apps/host-web/vite.config.ts`
- Path aliases for all 18 workspace packages
- Dev server runs on default Vite ports

**Workspace:**
- Config: `pnpm-workspace.yaml`
- Includes: `apps/*`, `packages/*`, `mods/*`

## Platform Requirements

**Development:**
- Node.js v24+
- pnpm package manager
- Modern browser with Canvas 2D/WebGL support

**Production:**
- Static web server for built assets
- Browser with ES2023 support
- Recommended: Chrome, Firefox, Safari, Edge (latest versions)

## Build Pipeline

**Scripts:**
- `pnpm dev` - Start dev server (runs `@gamedemo/host-web dev`)
- `pnpm build` - Production build
- `pnpm preview` - Preview production build
- `pnpm compare:visual` - Run visual regression tests

**Output:**
- Vite builds to `dist/` (standard Vite output directory)

---

*Stack analysis: 2026-03-31*
