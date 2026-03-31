# External Integrations

**Analysis Date:** 2026-03-31

## Third-Party Libraries

**Game Framework:**
- **Phaser v3.90.0** - 2D game engine
  - Used in: `packages/engine-phaser/src/*.ts`, `src/game/createGame.ts`
  - Purpose: Rendering, input handling, scene management, game loop
  - Import pattern: `import Phaser from "phaser"`

**UI Extensions:**
- **phaser3-rex-plugins v1.80.19** - Phaser UI plugin library
  - Used in: `src/game/createGame.ts`
  - Purpose: Advanced UI components (buttons, dialogs, scrollable panels)
  - Import pattern: `import UIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'`
  - Type declarations: `src/types/rexui.d.ts`

## Browser APIs

**Canvas API:**
- HTML5 Canvas for game rendering via Phaser
- WebGL or Canvas 2D context (auto-detected by Phaser)

**Web Storage:**
- `localStorage` - Cleared during visual testing boot sequence
- `sessionStorage` - Cleared during visual testing boot sequence

**URL API:**
- `URLSearchParams` - Used for debug flag detection (`?debug`)

## Development Tooling

**Build Tool:**
- **Vite v8.0.0** - Module bundler and dev server
  - Entry: `index.html` → `src/main.ts`
  - Path aliasing for workspace packages
  - Hot Module Replacement (HMR) in dev mode

**Visual Testing:**
- **Playwright/Chromium** - Automated browser for visual regression
  - Script: `tools/visual-compare/runComparison.mjs`
  - Launches two Vite dev servers on ports 4173 and 4174
  - Captures canvas screenshots for comparison
  - Uses `pixelmatch` (v7.1.0) for diff analysis

**Image Processing:**
- **pixelmatch v7.1.0** - Pixel-level image comparison
  - Threshold: 0.18 (configurable)
  - Used in visual regression testing

- **pngjs v7.0.0** - PNG encoding/decoding
  - Sync read/write operations
  - Used for cropping and diff generation

## Workspace Dependencies

**Internal Package Graph:**
```
@gamedemo/host-web (apps/host-web)
  ├── @gamedemo/engine-phaser
  │   ├── @gamedemo/engine-core
  │   ├── @gamedemo/engine-runtime
  │   └── phaser (external)
  ├── @gamedemo/engine-runtime
  │   ├── @gamedemo/engine-content
  │   ├── @gamedemo/engine-core
  │   ├── @gamedemo/mod-api
  │   └── @gamedemo/save-schema
  ├── @gamedemo/mod-loader
  │   └── @gamedemo/mod-api
  ├── @gamedemo/mod-api
  │   ├── @gamedemo/engine-content
  │   └── @gamedemo/engine-core
  └── [10 mod packages]
```

**All workspace packages use:**
- `workspace:*` protocol for cross-package dependencies
- Unified versioning at v0.1.0

## CI/CD Considerations

**Testing Pipeline:**
- Visual comparison tool runs in CI environment
- Sets `CI=1`, `BROWSER=none`, `NO_COLOR=1` environment variables
- Spawns Vite dev servers programmatically
- Generates reports in `artifacts/visual-comparison/initial/`

**No External Services:**
- No database connections detected
- No cloud service SDKs
- No analytics or monitoring integrations
- No authentication providers
- No CDN assets referenced in code

## Browser Compatibility

**Required Features:**
- ES2023 JavaScript support
- ES Modules (`type="module"`)
- Canvas 2D or WebGL context
- `URL` and `URLSearchParams` API
- `localStorage` / `sessionStorage`

**Target:** Modern evergreen browsers (Chrome, Firefox, Safari, Edge)

## Data Persistence

**Save System:**
- Custom save schema in `@gamedemo/save-schema`
- Likely uses browser storage (IndexedDB or localStorage)
- No external database or backend API detected

---

*Integration audit: 2026-03-31*
