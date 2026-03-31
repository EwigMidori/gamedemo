<!-- GSD:project-start source:PROJECT.md -->
## Project

**Gamedemo 伪3D视觉改进项目**

一个基于 mod 的 2D 生存建造游戏引擎项目，当前使用 Phaser 3 渲染系统。本项目目标是在现有引擎基础上增量改进视觉架构，实现类似星露谷物语的伪3D效果——斜视角、高度层次和动态遮挡处理。

**Core Value:** 视觉呈现必须让玩家清晰感知空间层次和物体遮挡关系，营造沉浸式的2.5D游戏体验。

### Constraints

- **Tech Stack**: Phaser 3 渲染层，保持与现有 `@gamedemo/engine-phaser` 兼容
- **Mod Compatibility**: 不能破坏现有 mod API，改进应通过扩展 registry 实现
- **File Size**: 遵循 RFC-0007，单文件不超过500行，需拆分复杂逻辑
- **Naming Convention**: 使用 PascalCase 类文件（如 `Pseudo3DRenderer.ts`）
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- **TypeScript** (v5.9.3) - All application code, strict mode enabled
- **JavaScript (ES Modules)** - Build tooling and scripts in `/tools/`
- **CSS** - Styling at `src/style.css`
- **HTML** - Entry point at `index.html`
## Runtime
- **Node.js** (v24.14.0) - Development environment and tooling
- **Browser (DOM)** - Target runtime for the game
- **ES2023** - Target JavaScript specification
- **pnpm** - Workspace monorepo management
- Lockfile: `pnpm-lock.yaml` present
## Frameworks
- **Phaser** (v3.90.0) - 2D game framework for rendering, input, and scene management
- **phaser3-rex-plugins** (v1.80.19) - UI plugin library for Phaser (used for HUD components)
- **Vite** (v8.0.0) - Build tool and dev server
- **Playwright** (v1.58.2) - E2E testing and browser automation for visual comparison
## Key Dependencies
- `phaser` (v3.90.0) - Core game framework
- `phaser3-rex-plugins` (v1.80.19) - Extended UI components
- `pixelmatch` (v7.1.0) - Pixel-level image comparison
- `pngjs` (v7.0.0) - PNG image processing
- `@playwright/test` (v1.58.2) - Browser automation
- `@gamedemo/engine-core` - Core engine types and abstractions
- `@gamedemo/engine-phaser` - Phaser-specific rendering implementation
- `@gamedemo/engine-runtime` - Game runtime and session management
- `@gamedemo/engine-content` - Content registry and definitions
- `@gamedemo/mod-api` - Mod system API
- `@gamedemo/mod-loader` - Dynamic mod loading
- `@gamedemo/save-schema` - Save game data structures
- `@gamedemo/vanilla-domain` - Domain-specific game logic
## Configuration
- Base config: `tsconfig.base.json`
- Per-package configs extend base
- Key settings:
- Config: `apps/host-web/vite.config.ts`
- Path aliases for all 18 workspace packages
- Dev server runs on default Vite ports
- Config: `pnpm-workspace.yaml`
- Includes: `apps/*`, `packages/*`, `mods/*`
## Platform Requirements
- Node.js v24+
- pnpm package manager
- Modern browser with Canvas 2D/WebGL support
- Static web server for built assets
- Browser with ES2023 support
- Recommended: Chrome, Firefox, Safari, Edge (latest versions)
## Build Pipeline
- `pnpm dev` - Start dev server (runs `@gamedemo/host-web dev`)
- `pnpm build` - Production build
- `pnpm preview` - Preview production build
- `pnpm compare:visual` - Run visual regression tests
- Vite builds to `dist/` (standard Vite output directory)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Language & TypeScript Configuration
- Target: ES2023
- Module: ESNext with bundler resolution
- Strict mode: Enabled with additional strict flags
- Key flags:
## Naming Conventions
- PascalCase for class files: `HudManager.ts`, `MainScene.ts`, `TileRenderer.ts`
- camelCase for module files: `commandTypes.ts`, `inputManager.ts`, `vanillaCommands.ts`
- Barrel files: `index.ts` for public API exports
- PascalCase for all type definitions: `GameCommand`, `CommandContext`, `RuntimeSystem`
- Use descriptive names that indicate purpose: `RuntimeCommandTrigger`, `InventorySlotDescriptor`
- camelCase for variables and functions: `playerX`, `worldTime`, `getHeldItemId()`
- Boolean variables use descriptive prefixes: `breakHoldActive`, `handcraftOpen`
- UPPER_SNAKE_CASE for primitive constants: `TILE_SIZE`, `DAY_LENGTH`, `SAVE_KEY`
- PascalCase for constant objects that group functionality: `GatheringActions`, `CraftingResolvers`
- Format: `{namespace}:{feature}` - e.g., `core:player`, `core:gathering`, `core:crafting`
- Package names: `@gamedemo/mod-{namespace}-{feature}`
## Code Style
- No ESLint, Prettier, or Biome configuration detected
- Code style relies on TypeScript strict mode and developer discipline
- Use explicit `type` keyword for type-only imports: `import type { GameModModule }`
- Required by `verbatimModuleSyntax: true`
- Prefer `export const` objects with methods over standalone functions
- Example from `actions.ts`:
- Use barrel files (`index.ts`) for public API
## Architecture Patterns
- Prefer classes for stateful objects: `HudManager`, `TileRenderer`
- Use explicit property declarations with `!` for late initialization:
- Group related functions in exported constant objects
- Keep data structures and behavior in same bounded module
- Example: `GatheringDomain`, `CraftingDomain`
- ❌ Avoid: `export function foo() {}`
- ✅ Use: `export const FooModule = { foo() {} }`
- ✅ Use: `export class FooService { foo() {} }`
- Hard limit: 500 lines per source file
- Split by responsibility when approaching limit
- Keep public API narrow in entry file
## Type Patterns
- Use suffixes for clarity: `Context`, `State`, `Def`, `Descriptor`
- Examples: `CommandContext`, `RuntimeSessionState`, `ItemDef`, `RuntimeInventorySlotDescriptor`
## Error Handling
## Comments & Documentation
- Code is generally self-documenting through naming
- Use section dividers for organization:
- Not extensively used
- Prefer descriptive naming over comments
## Module Structure
- Workspace packages use `@gamedemo/` prefix
- Mapped in `apps/host-web/vite.config.ts`
## Strictness Rules
- All variables must be used
- All function parameters must be used
- Exhaustive switch statements
- No unchecked side-effect imports
- No loose utility functions
- No oversized files (>500 lines)
- Explicit ownership of data and behavior
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- The game is a composition result of mods, not a single application with plugins
- Workspace-based package organization with `pnpm` workspaces
- Two-layer architecture: thin Host + Mod Layer
- Runtime container is instance-scoped (no global singletons)
- All content IDs are namespaced (`mod:id` format)
- Dependency-driven mod loading with topological ordering
- Command-based interaction pipeline separating input, intent, and execution
- Object-capability model for world interactions
## Architectural Decisions (from RFCs)
- Host owns: boot sequence, rendering bridge, asset loading, persistence container, security boundaries, mod loading
- Host must NOT own: crafting logic, survival logic, building logic, content definitions, vanilla command behavior
- Gameplay rules live in mods, not host app
- Mods expose `manifest` + `install(ctx)` entrypoint
- Dependencies are explicit: `dependsOn`, `optionalDependsOn`, `loadBefore`, `loadAfter`
- All content IDs must be namespaced (`core:wood`, `player.cool_mod:crystal_axe`)
- No global mutable registries - container becomes immutable after boot
- Boot sequence: discover → validate manifests → build dependency graph → topologically order → create container → install mods → freeze registries
- Runtime container contains: content, systems, actionHandlers, commandResolvers, uiMounts, saveScopes
- Save data is partitioned: host owns envelope, mods own payloads
- Legacy codebase is reference-only, not a migration target
- Build workspace skeleton first, then contracts, then runtime, then gameplay mods
- Validate through playable slices in new runtime
- Four-stage interaction: raw input → intent context → resolved commands → command execution
- Host owns: collecting input, building context, presenting commands
- Runtime/mods own: determining available commands, validation, mapping to actions
- Object-oriented or Rust-like module design (no loose helper functions)
- No exported global functions (classes, const objects with methods, interfaces only)
- 500-line limit per source file
- Keep public API narrow, private machinery in sibling modules
- Dedicated world object interaction layer: `RuntimeWorldObjectDescriptor`, `RuntimeWorldObjectProvider`, `RuntimeWorldObjectInteraction`
- Three-stage resolution: input → descriptor → interactions
- Generic commands for empty-space, object interactions for concrete objects
- Dedicated combined interaction layer for `selected item + focused object` scenarios
- Combined interactions supersede simpler item-only or object-only affordances
- Target: Stardew-like presentation, not true 3D
- Four layers: Phaser primitives → engine scene graph → content metadata → visual packs
- Footprint vs render height distinction
- Occlusion rules for player-behind-object fading
- Support visual pack modularity (gameplay + visual packs swappable independently)
## Layers
### Host Layer (`apps/host-web/`)
- **Purpose:** Browser entrypoint, Vite app shell, boot configuration, player-facing mod UX
- **Location:** `apps/host-web/src/`
- **Contains:** Main entry (`main.ts`), shell UI (`hostShell.ts`), session controller (`sessionController.ts`)
- **Depends on:** `engine-runtime`, `mod-loader`, `engine-phaser`
- **Used by:** End users in browser
### Engine Core (`packages/engine-core/`)
- **Purpose:** Shared types, domain events, runtime contracts, identifiers
- **Location:** `packages/engine-core/src/index.ts`
- **Contains:** TypeScript interfaces: `ItemDef`, `StructureDef`, `RecipeDef`, `ResourceDef`, `TerrainDef`, `RuntimeSessionState`, `RuntimeAction`, `RuntimeSystem`, `RuntimeCommand`, `RuntimeWorldObjectDescriptor`, `RuntimeWorldObjectInteraction`, `RuntimeCombinedInteraction`, `RuntimeInventorySlotDescriptor`, etc.
- **Depends on:** None (foundation layer)
- **Used by:** All packages and mods
### Mod API (`packages/mod-api/`)
- **Purpose:** Host-to-mod interfaces, registration contracts, lifecycle hooks
- **Location:** `packages/mod-api/src/index.ts`
- **Contains:** `GameModManifest`, `GameModModule`, `ModInstallContext` with registries: `SystemRegistry`, `CommandRegistry`, `ActionRegistry`, `WorldObjectRegistry`, `WorldObjectInteractionRegistry`, `InventorySelectionRegistry`, `InventoryInteractionRegistry`, `CombinedInteractionRegistry`, `WorldgenRegistry`, `UiRegistry`, `SessionRegistry`
- **Depends on:** `engine-core`, `engine-content`
- **Used by:** All mods
### Engine Runtime (`packages/engine-runtime/`)
- **Purpose:** World container, system scheduler, action dispatch, dependency graph assembly, lifecycle orchestration
- **Location:** `packages/engine-runtime/src/`
- **Contains:**
- **Depends on:** `engine-core`, `mod-api`, `engine-content`, `save-schema`
- **Used by:** Host, mods (indirectly through context)
### Engine Content (`packages/engine-content/`)
- **Purpose:** Content indexing, namespace-aware lookup, merge validation
- **Location:** `packages/engine-content/src/index.ts`
- **Contains:** `ContentRegistryBuilder` class with `registerItem()`, `registerStructure()`, `registerRecipe()`, `registerResource()`, `registerTerrain()`, `snapshot()`
- **Depends on:** `engine-core`
- **Used by:** `engine-runtime`, mods via `ModInstallContext.content`
### Engine Phaser (`packages/engine-phaser/`)
- **Purpose:** Phaser integration, scene shell, input adapter, render adapters, HUD mount points
- **Location:** `packages/engine-phaser/src/`
- **Contains:** `gameScene.ts`, `gameHud.ts`, `gameHudHoverCard.ts`, `gameCraftPanel.ts`, `gameViewport.ts`, `runtimeTheme.ts`, `runtimeContentIndex.ts`, `runtimeAssets.ts`, `structureAutotileResolver.ts`
- **Depends on:** `engine-core`, `vanilla-domain`
- **Used by:** Host for rendering
### Mod Loader (`packages/mod-loader/`)
- **Purpose:** Workspace mod discovery, manifest resolution, dependency ordering, external mod fetching
- **Location:** `packages/mod-loader/src/index.ts`
- **Contains:** `ModCatalogs`, `RuntimeProfiles`, `ExternalMods`
- **Depends on:** `mod-api`
- **Used by:** Host during boot
### Save Schema (`packages/save-schema/`)
- **Purpose:** Versioned save container, mod-scoped data persistence
- **Location:** `packages/save-schema/src/index.ts`
- **Contains:** `GameSaveEnvelope`, `SaveSchema.createEnvelope()`, `SAVE_SCHEMA_VERSION`
- **Depends on:** `engine-core`
- **Used by:** `engine-runtime`
### Vanilla Domain (`packages/vanilla-domain/`)
- **Purpose:** Shared domain logic for vanilla gameplay (breaking rules, inventory, catalog, world lookup, world seed)
- **Location:** `packages/vanilla-domain/src/`
- **Contains:** `breaking.ts`, `inventory.ts`, `catalog.ts`, `worldLookup.ts`, `worldSeed.ts`
- **Depends on:** `engine-core`
- **Used by:** Core mods, `engine-phaser`
### Gameplay Mods (`mods/*`)
- `manifest`: id, version, apiVersion, dependencies
- `install(context)`: registers content, systems, actions, commands, interactions
```
```
## Data Flow
## Key Abstractions
- Immutable snapshot of all mods' contributions
- Contains: `profile`, `manifests`, `content`, `systems`, `actions`, `commands`, `worldgen`, `uiPanels`
- Factory method: `createSession(initialState?)` → `RuntimeSession`
- Mutable game state container
- Methods: `tick()`, `dispatchAction()`, `executeCommand()`, `resolveCommands()`, `inspectWorldObject()`, `resolveWorldObjectInteractions()`, `snapshot()`
- State shape: `RuntimeSessionState` with `timeSeconds`, `day`, `world`, `player`, `needs`, `inventory`, `resources`, `placedStructures`, `droppedItems`, `logs`
- Passed to each mod's `install()` method
- Provides registries for contributions: `content`, `systems`, `actions`, `commands`, `worldObjects`, `worldObjectInteractions`, `inventorySelections`, `inventoryInteractions`, `combinedInteractions`, `worldgen`, `ui`, `session`
- Accumulates content from all mods
- Methods: `registerItem()`, `registerStructure()`, `registerRecipe()`, `registerResource()`, `registerTerrain()`
- `snapshot()` produces immutable `ContentSnapshot`
- `RuntimeWorldObjectProvider` → resolves descriptor from input context
- `RuntimeWorldObjectInteractionProvider` → contributes interactions for a resolved object
- `RuntimeCombinedInteractionProvider` → contributes interactions requiring both selected item AND focused object
## Entry Points
- Location: `apps/host-web/src/main.ts`
- Triggers: Browser page load
- Responsibilities: Read profile/external mods, assemble runtime, create session controller, start RAF loop, bind input handlers
- Location: `apps/host-web/src/hostShell.ts`
- Exports: `HostShell.render()`, `HostShell.renderBootFailure()`
- Responsibilities: Render HTML shell, provide `HostShellRefs` for controllers
- Location: `apps/host-web/src/sessionController.ts`
- Exports: `HostSessionController.create()`
- Responsibilities: Bridge between host UI and runtime session, manage command input state, execute commands, tick session, render view
- `mods/core-base/src/index.ts` → `coreBaseMod`
- `mods/core-worldgen/src/index.ts` → `coreWorldgenMod`
- `mods/core-player/src/index.ts` → `corePlayerMod`
- `mods/core-inventory/src/index.ts` → `coreInventoryMod`
- `mods/core-gathering/src/index.ts` → `coreGatheringMod`
- `mods/core-survival/src/index.ts` → `coreSurvivalMod`
- `mods/core-building/src/index.ts` → `coreBuildingMod`
- `mods/core-crafting/src/index.ts` → `coreCraftingMod`
- `mods/core-ui-hud/src/index.ts` → `coreUiHudMod`
- `mods/vanilla-bundle/src/index.ts` → `vanillaBundleMod`
## Error Handling
- Duplicate ID detection: All registries throw on duplicate registration
- Missing dependency: `resolveModuleOrder()` throws with mod ID and missing dependency
- Circular dependency: Detected during topological sort
- API version mismatch: Checked during `module.install()`, throws if `manifest.apiVersion !== MOD_API_VERSION`
- Content collision: `ContentRegistryBuilder` throws on duplicate content IDs
## Cross-Cutting Concerns
- Content registry validates uniqueness
- Runtime assembly validates dependency graph
- API version validates mod compatibility
- Save format: `GameSaveEnvelope` { version, profile, session }
- `RuntimeSaves.serialize()` / `RuntimeSaves.restore()`
- Stored in `localStorage` by host
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
