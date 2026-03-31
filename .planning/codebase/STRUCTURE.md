# Codebase Structure

**Analysis Date:** 2026-03-31

## Directory Layout

```
gamedemo/
├── apps/                          # Application entrypoints
│   └── host-web/                  # Browser host application
│       ├── src/
│       │   ├── main.ts            # Host boot and game loop
│       │   ├── hostShell.ts       # UI shell rendering
│       │   ├── sessionController.ts  # Session lifecycle bridge
│       │   ├── sessionViewRenderer.ts # View rendering
│       │   ├── sessionCommandCatalog.ts # Command resolution
│       │   ├── workspaceCatalog.ts # Profile definitions
│       │   └── style.css          # Host styles
│       ├── index.html             # HTML entry
│       ├── vite.config.ts         # Vite configuration
│       ├── package.json           # App dependencies
│       └── tsconfig.json          # TypeScript config
├── packages/                      # Shared engine packages
│   ├── engine-core/               # Core types and contracts
│   │   └── src/index.ts           # All runtime type definitions
│   ├── mod-api/                   # Mod contract interfaces
│   │   └── src/index.ts           # GameModModule, ModInstallContext, registries
│   ├── engine-runtime/            # Runtime assembly and session
│   │   └── src/
│   │       ├── index.ts           # Public exports
│   │       ├── runtimeKernel.ts   # Assembly API
│   │       ├── runtimeAssembly.ts # Mod loading logic
│   │       ├── runtimeTypes.ts    # AssembledRuntime, RuntimeSession
│   │       ├── runtimeSessionFactory.ts # Session creation
│   │       ├── sessionPersistence.ts    # Save/load
│   │       └── worldBlueprints.ts       # Worldgen blueprints
│   ├── engine-content/            # Content indexing
│   │   └── src/index.ts           # ContentRegistryBuilder
│   ├── engine-phaser/             # Phaser rendering bridge
│   │   └── src/
│   │       ├── index.ts           # Public exports
│   │       ├── gameScene.ts       # Main Phaser scene
│   │       ├── gameHud.ts         # HUD rendering
│   │       ├── gameHudHoverCard.ts # Hover tooltips
│   │       ├── gameCraftPanel.ts  # Crafting UI
│   │       ├── gameViewport.ts    # Camera/viewport
│   │       ├── runtimeTheme.ts    # Visual theme
│   │       ├── runtimeContentIndex.ts # Content lookup
│   │       ├── runtimeAssets.ts   # Asset management
│   │       └── structureAutotileResolver.ts # Autotile logic
│   ├── mod-loader/                # Mod discovery and loading
│   │   └── src/index.ts           # ModCatalogs, RuntimeProfiles, ExternalMods
│   ├── save-schema/               # Save format contracts
│   │   └── src/index.ts           # GameSaveEnvelope, SaveSchema
│   └── vanilla-domain/            # Shared vanilla gameplay logic
│       └── src/
│           ├── index.ts           # Public exports
│           ├── breaking.ts        # Breaking rules
│           ├── inventory.ts       # Inventory operations
│           ├── catalog.ts         # Content catalog helpers
│           ├── worldLookup.ts     # World query helpers
│           └── worldSeed.ts       # World seeding
├── mods/                          # Gameplay mods
│   ├── core-base/                 # Foundation mod (items, bootstrap)
│   │   └── src/index.ts
│   ├── core-worldgen/             # World generation
│   │   └── src/index.ts
│   ├── core-player/               # Player movement, actions
│   │   └── src/
│   │       ├── index.ts           # Mod entry
│   │       ├── playerDomain.ts    # Player state
│   │       ├── actions.ts         # Player actions
│   │       ├── resolver.ts        # Command resolvers
│   │       └── system.ts          # Player systems
│   ├── core-inventory/            # Inventory management
│   │   └── src/
│   │       ├── index.ts           # Mod entry
│   │       ├── inventoryDomain.ts # Inventory logic
│   │       ├── actions.ts         # Inventory actions
│   │       ├── interactions.ts    # Item interactions
│   │       ├── provider.ts        # Selection provider
│   │       └── resolver.ts        # Command resolvers
│   ├── core-gathering/            # Resource gathering
│   │   └── src/
│   │       ├── index.ts           # Mod entry
│   │       ├── gatheringDomain.ts # Gathering logic
│   │       ├── breakingDomain.ts  # Breaking mechanics
│   │       ├── actions.ts         # Gather actions
│   │       ├── interactions.ts    # Resource interactions
│   │       ├── provider.ts        # Object provider
│   │       ├── tileProvider.ts    # Tile provider
│   │       ├── resolver.ts        # Command resolvers
│   │       └── system.ts          # Gathering systems
│   ├── core-survival/             # Hunger, health, consumption
│   │   └── src/
│   │       ├── index.ts           # Mod entry
│   │       ├── survivalDomain.ts  # Survival state
│   │       ├── actions.ts         # Survival actions
│   │       ├── interactions.ts    # Consumable interactions
│   │       ├── itemInteractions.ts # Item use interactions
│   │       ├── inventoryProvider.ts # Inventory integration
│   │       ├── resolver.ts        # Command resolvers
│   │       └── system.ts          # Hunger decay systems
│   ├── core-building/             # Structure placement/removal
│   │   └── src/
│   │       ├── index.ts           # Mod entry
│   │       ├── buildingDomain.ts  # Building logic
│   │       ├── breakingDomain.ts  # Structure breaking
│   │       ├── actions.ts         # Build actions
│   │       ├── interactions.ts    # Structure interactions
│   │       ├── provider.ts        # Object provider
│   │       ├── tileProvider.ts    # Tile provider
│   │       ├── resolver.ts        # Command resolvers
│   │       └── system.ts          # Building systems
│   ├── core-crafting/             # Recipe crafting
│   │   └── src/
│   │       ├── index.ts           # Mod entry
│   │       ├── craftingDomain.ts  # Crafting logic
│   │       ├── recipeBook.ts      # Recipe catalog
│   │       ├── actions.ts         # Craft actions
│   │       ├── interactions.ts    # Station interactions
│   │       ├── itemInteractions.ts # Item craft interactions
│   │       ├── combinedInteractions.ts # Combined interactions
│   │       └── resolver.ts        # Command resolvers
│   ├── core-ui-hud/               # HUD panels
│   │   └── src/index.ts
│   └── vanilla-bundle/            # Composition mod (depends on all core)
│       └── src/index.ts
├── docs/                          # Documentation
│   └── rfcs/                      # Architecture RFCs
│       ├── 0001-workspace-and-host-architecture.md
│       ├── 0002-mod-contract-and-dependency-graph.md
│       ├── 0003-runtime-assembly-dynamic-loading-and-save-boundaries.md
│       ├── 0004-greenfield-rewrite-plan.md
│       ├── 0005-playable-vertical-slice.md
│       ├── 0006-command-and-interaction-pipeline.md
│       ├── 0007-code-organization-and-api-surface.md
│       ├── 0008-world-object-interaction-capabilities.md
│       ├── 0009-station-scoped-crafting.md
│       ├── 0010-interaction-presentation-metadata.md
│       ├── 0011-tile-scoped-building-affordances.md
│       ├── 0012-inventory-slot-selection-context.md
│       ├── 0013-inventory-selection-descriptors.md
│       ├── 0014-selected-item-interactions.md
│       ├── 0015-combined-item-and-object-interactions.md
│       ├── 0016-stardew-like-pseudo-3d-2d-visual-architecture.md
│       └── 0017-pseudo-3d-2d-implementation-plan-and-guardrails.md
├── src/                           # Legacy codebase (reference only)
│   ├── game/
│   │   ├── content/
│   │   ├── scenes/
│   │   └── terrain/
│   ├── mods/
│   ├── assets/
│   └── types/
├── tools/                         # Build/dev tools
│   └── visual-compare/            # Visual regression testing
├── public/                        # Static assets
├── package.json                   # Root package (workspace root)
├── pnpm-workspace.yaml            # pnpm workspace config
├── tsconfig.base.json             # Shared TypeScript config
└── tsconfig.json                  # Root TypeScript config
```

## Directory Purposes

### `apps/host-web/`

- **Purpose:** Browser application entrypoint
- **Contains:** Vite-based web app, HTML shell, session management
- **Key files:** `main.ts` (boot), `hostShell.ts` (UI), `sessionController.ts` (runtime bridge)

### `packages/*`

- **Purpose:** Engine infrastructure shared across all mods
- **Pattern:** Each package is a logical capability: types, API, runtime, content, rendering, loading, saves, domain logic

### `mods/*`

- **Purpose:** Gameplay features as installable mods
- **Pattern:** Each mod exports `GameModModule` with `manifest` and `install()`
- **Naming:** `core-*` for first-party gameplay, `vanilla-bundle` for composition

### `docs/rfcs/`

- **Purpose:** Architecture decision records
- **Pattern:** Sequential numbering (0001-0017), status markers (Proposed/Accepted), cross-references

### `src/`

- **Purpose:** Legacy codebase from pre-rewrite
- **Status:** Reference-only; not imported by new architecture
- **Contents:** Old Phaser scenes, content definitions, terrain generation

### `tools/`

- **Purpose:** Development and build utilities
- **Current:** Visual regression testing tools

### `public/`

- **Purpose:** Static assets served directly
- **Contents:** Images, audio, fonts, etc.

## Key File Locations

### Entry Points

| File | Purpose |
|------|---------|
| `apps/host-web/src/main.ts` | Host boot sequence, game loop |
| `apps/host-web/index.html` | Browser entry HTML |
| `packages/*/src/index.ts` | Package public API exports |
| `mods/*/src/index.ts` | Mod entry point (GameModModule) |

### Configuration

| File | Purpose |
|------|---------|
| `package.json` | Root workspace scripts and dev dependencies |
| `pnpm-workspace.yaml` | Workspace package globs |
| `tsconfig.base.json` | Shared TypeScript compiler options |
| `apps/host-web/vite.config.ts` | Vite bundler configuration |
| `apps/host-web/package.json` | Host app dependencies |
| `packages/*/package.json` | Package metadata |
| `mods/*/package.json` | Mod metadata |

### Core Runtime

| File | Purpose |
|------|---------|
| `packages/engine-core/src/index.ts` | All type definitions (~480 lines) |
| `packages/mod-api/src/index.ts` | Mod contract interfaces (~100 lines) |
| `packages/engine-runtime/src/runtimeKernel.ts` | Public assembly API |
| `packages/engine-runtime/src/runtimeAssembly.ts` | Mod loading logic (~390 lines) |
| `packages/mod-loader/src/index.ts` | Catalog and profile management (~130 lines) |

### Sample Mod Implementations

| File | Purpose |
|------|---------|
| `mods/core-base/src/index.ts` | Foundation: items, bootstrap, basic commands |
| `mods/core-player/src/index.ts` | Player: movement, actions, systems |
| `mods/core-gathering/src/index.ts` | Gathering: resource breaking, interactions |
| `mods/vanilla-bundle/src/index.ts` | Composition: depends on all core mods |

## Naming Conventions

### Files

| Pattern | Example | Purpose |
|---------|---------|---------|
| `index.ts` | `src/index.ts` | Package/mod public API |
| `*.ts` | `runtimeKernel.ts` | Implementation modules |
| `*.Domain.ts` | `playerDomain.ts` | Domain logic grouping |
| `*.test.ts` | Not present | Test files (pattern established) |

### Directories

| Pattern | Example | Purpose |
|---------|---------|---------|
| `apps/*` | `apps/host-web` | Executable applications |
| `packages/*` | `packages/engine-core` | Shared libraries |
| `mods/*` | `mods/core-player` | Gameplay mods |
| `src/*` | `src/game` | Legacy code (reference) |
| `docs/*` | `docs/rfcs` | Documentation |
| `tools/*` | `tools/visual-compare` | Utilities |

### Package Names (npm)

| Pattern | Example | Purpose |
|---------|---------|---------|
| `@gamedemo/*` | `@gamedemo/engine-core` | Scoped workspace packages |
| `core:*` | `core:base` | Mod IDs (namespaced) |
| `bundle:*` | `bundle:vanilla` | Composition mod IDs |

### TypeScript Exports

| Pattern | Example | Purpose |
|---------|---------|---------|
| `PascalCase` | `RuntimeKernel` | Classes, const objects with methods |
| `SCREAMING_SNAKE` | `MOD_API_VERSION` | Constants |
| `PascalCase` | `RuntimeSessionState` | Interfaces, types |
| `camelCase` | `createProfile` | Local/internal functions (not exported) |

## Where to Add New Code

### New Engine Package

1. Create `packages/new-package/package.json`
2. Create `packages/new-package/src/index.ts`
3. Add to `pnpm-workspace.yaml` (if needed, already covered by `packages/*`)
4. Add dependency in consuming packages

### New Gameplay Mod

1. Create `mods/my-mod/package.json` with `@gamedemo/mod-api` dependency
2. Create `mods/my-mod/src/index.ts`:
   ```typescript
   import { MOD_API_VERSION } from "@gamedemo/engine-core";
   import type { GameModModule } from "@gamedemo/mod-api";
   
   export const myMod: GameModModule = {
     manifest: {
       id: "my:mod",
       version: "0.1.0",
       apiVersion: MOD_API_VERSION,
       dependsOn: [{ id: "core:base" }]
     },
     install(context) {
       // Register content, systems, actions, etc.
     }
   };
   ```
3. Add to `vanilla-bundle` dependencies or create new profile

### New Content Type

1. Add type definition to `packages/engine-core/src/index.ts`
2. Add registration method to `packages/engine-content/src/index.ts`
3. Add to `ContentSnapshot` if needed
4. Use in mods via `context.content.register*(definition)`

### New System

1. Create in appropriate mod: `mods/*/src/system.ts`
2. Register in mod's `install()`: `context.systems.register({ id, phase, run })`
3. Phases: `preUpdate`, `simulation`, `postSimulation`, `renderPrepare`

### New Action

1. Create in appropriate mod: `mods/*/src/actions.ts`
2. Register: `context.actions.register({ id, label, execute })`
3. Execute receives `RuntimeActionContext`, returns `RuntimeActionResult`

### New Interaction

1. Create provider in mod: `mods/*/src/provider.ts` or `interactions.ts`
2. Register in mod's `install()`:
   - World objects: `context.worldObjects.register({ id, inspect })`
   - Object interactions: `context.worldObjectInteractions.register({ id, collect })`
   - Item interactions: `context.inventoryInteractions.register({ id, collect })`
   - Combined: `context.combinedInteractions.register({ id, collect })`

### New Command Resolver

1. Create in mod: `mods/*/src/resolver.ts`
2. Register: `context.commandResolvers.register({ id, resolve })`
3. Return `ResolvedCommand[]` from `resolve(context)`

## Special Directories

### `src/` (Legacy)

- **Purpose:** Pre-rewrite codebase preserved for reference
- **Status:** Not imported by new architecture
- **Use:** Extract gameplay requirements, asset references, UI patterns
- **Migration:** Do not add new code here

### `.planning/`

- **Purpose:** GSD planning artifacts
- **Contents:** `codebase/*.md` (architecture docs), `*.md` (phase plans)
- **Generated:** Yes (by GSD agents)
- **Committed:** Yes

### `node_modules/`

- **Purpose:** Package dependencies
- **Generated:** Yes (by pnpm)
- **Committed:** No (in `.gitignore`)

### `tools/visual-compare/`

- **Purpose:** Visual regression testing
- **Generated:** No
- **Committed:** Yes
- **Use:** Run via `pnpm run compare:visual`

---

*Structure analysis: 2026-03-31*
