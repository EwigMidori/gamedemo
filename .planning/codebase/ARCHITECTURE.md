# Architecture

**Analysis Date:** 2026-03-31

## Pattern Overview

**Overall:** Mod-First Monorepo with Dependency Graph Assembly

**Key Characteristics:**
- The game is a composition result of mods, not a single application with plugins
- Workspace-based package organization with `pnpm` workspaces
- Two-layer architecture: thin Host + Mod Layer
- Runtime container is instance-scoped (no global singletons)
- All content IDs are namespaced (`mod:id` format)
- Dependency-driven mod loading with topological ordering
- Command-based interaction pipeline separating input, intent, and execution
- Object-capability model for world interactions

## Architectural Decisions (from RFCs)

**RFC-0001 (Workspace and Host Architecture):**
- Host owns: boot sequence, rendering bridge, asset loading, persistence container, security boundaries, mod loading
- Host must NOT own: crafting logic, survival logic, building logic, content definitions, vanilla command behavior
- Gameplay rules live in mods, not host app

**RFC-0002 (Mod Contract):**
- Mods expose `manifest` + `install(ctx)` entrypoint
- Dependencies are explicit: `dependsOn`, `optionalDependsOn`, `loadBefore`, `loadAfter`
- All content IDs must be namespaced (`core:wood`, `player.cool_mod:crystal_axe`)
- No global mutable registries - container becomes immutable after boot

**RFC-0003 (Runtime Assembly):**
- Boot sequence: discover → validate manifests → build dependency graph → topologically order → create container → install mods → freeze registries
- Runtime container contains: content, systems, actionHandlers, commandResolvers, uiMounts, saveScopes
- Save data is partitioned: host owns envelope, mods own payloads

**RFC-0004 (Greenfield Rewrite):**
- Legacy codebase is reference-only, not a migration target
- Build workspace skeleton first, then contracts, then runtime, then gameplay mods
- Validate through playable slices in new runtime

**RFC-0006 (Command Pipeline):**
- Four-stage interaction: raw input → intent context → resolved commands → command execution
- Host owns: collecting input, building context, presenting commands
- Runtime/mods own: determining available commands, validation, mapping to actions

**RFC-0007 (Code Organization):**
- Object-oriented or Rust-like module design (no loose helper functions)
- No exported global functions (classes, const objects with methods, interfaces only)
- 500-line limit per source file
- Keep public API narrow, private machinery in sibling modules

**RFC-0008 (World Object Interactions):**
- Dedicated world object interaction layer: `RuntimeWorldObjectDescriptor`, `RuntimeWorldObjectProvider`, `RuntimeWorldObjectInteraction`
- Three-stage resolution: input → descriptor → interactions
- Generic commands for empty-space, object interactions for concrete objects

**RFC-0015 (Combined Interactions):**
- Dedicated combined interaction layer for `selected item + focused object` scenarios
- Combined interactions supersede simpler item-only or object-only affordances

**RFC-0016 (Pseudo-3D 2D Visual Architecture):**
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
  - `runtimeKernel.ts` - Public API: `RuntimeKernel.assembleProfile()`, `RuntimeKernel.createProfile()`
  - `runtimeAssembly.ts` - Internal registries and mod ordering logic
  - `runtimeSessionFactory.ts` - Session creation
  - `runtimeTypes.ts` - `AssembledRuntime`, `RuntimeSession` interfaces
  - `sessionPersistence.ts` - Save/load serialization
  - `worldBlueprints.ts` - World generation blueprints
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

Each mod follows the `GameModModule` contract:
- `manifest`: id, version, apiVersion, dependencies
- `install(context)`: registers content, systems, actions, commands, interactions

**Mod Dependency Graph:**
```
core:base
├── core:worldgen
├── core:player
├── core:inventory
├── core:survival
│   └── depends on core:inventory
├── core:gathering
├── core:building
├── core:crafting
│   └── depends on core:inventory
└── core:ui-hud

bundle:vanilla (composition mod)
└── depends on all core:* mods
```

## Data Flow

**Boot Sequence:**

1. Host reads selected profile and external mod URLs
2. `ModCatalogs.merge()` combines workspace and external catalogs
3. `ModCatalogs.resolveProfileModules()` builds dependency tree
4. `RuntimeKernel.assembleProfile()`:
   - Topologically orders mods via `resolveModuleOrder()`
   - Creates fresh registries (systems, commands, actions, content, etc.)
   - Creates `ModInstallContext` with registries
   - Calls `module.install(context)` for each mod in order
   - Freezes registries into immutable `AssembledRuntime`
5. Host creates session: `runtime.createSession()`
6. `RuntimePreview.mount()` initializes Phaser view

**Game Loop (per frame):**

1. Host `requestAnimationFrame` → `sessionController.tick(deltaSeconds)`
2. `RuntimeSession.tick()`:
   - Run systems in phase order: `preUpdate` → `simulation` → `postSimulation` → `renderPrepare`
   - Each system receives `RuntimeSystemContext` { deltaSeconds, state, content }
3. Input events update `commandInput` state
4. Render triggered → Phaser scene renders from `session.snapshot()`

**Command Execution:**

1. Input event → `sessionController` builds `RuntimeCommandInput`
2. `SessionCommandCatalog.collectCommands(input)` queries:
   - `session.resolveCommands(input)` - generic commands
   - `session.inspectWorldObject(input)` - focused object
   - `session.resolveWorldObjectInteractions(input)` - object-scoped actions
   - `session.inspectSelectedInventorySlot(input)` - selected item
   - `session.resolveSelectedInventoryInteractions(input)` - item actions
   - `session.resolveCombinedInteractions(input)` - combined actions
3. Commands bucketed by `affordance`: `primary`, `secondary`, `context`
4. UI renders buckets; player selects command
5. `session.executeCommand(commandId, input)` → finds action → `session.dispatchAction(actionId, command)`
6. Action mutates state, returns `RuntimeActionResult`

## Key Abstractions

**AssembledRuntime:**
- Immutable snapshot of all mods' contributions
- Contains: `profile`, `manifests`, `content`, `systems`, `actions`, `commands`, `worldgen`, `uiPanels`
- Factory method: `createSession(initialState?)` → `RuntimeSession`

**RuntimeSession:**
- Mutable game state container
- Methods: `tick()`, `dispatchAction()`, `executeCommand()`, `resolveCommands()`, `inspectWorldObject()`, `resolveWorldObjectInteractions()`, `snapshot()`
- State shape: `RuntimeSessionState` with `timeSeconds`, `day`, `world`, `player`, `needs`, `inventory`, `resources`, `placedStructures`, `droppedItems`, `logs`

**ModInstallContext:**
- Passed to each mod's `install()` method
- Provides registries for contributions: `content`, `systems`, `actions`, `commands`, `worldObjects`, `worldObjectInteractions`, `inventorySelections`, `inventoryInteractions`, `combinedInteractions`, `worldgen`, `ui`, `session`

**ContentRegistryBuilder:**
- Accumulates content from all mods
- Methods: `registerItem()`, `registerStructure()`, `registerRecipe()`, `registerResource()`, `registerTerrain()`
- `snapshot()` produces immutable `ContentSnapshot`

**World Object Interaction Model:**
- `RuntimeWorldObjectProvider` → resolves descriptor from input context
- `RuntimeWorldObjectInteractionProvider` → contributes interactions for a resolved object
- `RuntimeCombinedInteractionProvider` → contributes interactions requiring both selected item AND focused object

## Entry Points

**Host Entry:**
- Location: `apps/host-web/src/main.ts`
- Triggers: Browser page load
- Responsibilities: Read profile/external mods, assemble runtime, create session controller, start RAF loop, bind input handlers

**Host Shell (UI):**
- Location: `apps/host-web/src/hostShell.ts`
- Exports: `HostShell.render()`, `HostShell.renderBootFailure()`
- Responsibilities: Render HTML shell, provide `HostShellRefs` for controllers

**Session Controller:**
- Location: `apps/host-web/src/sessionController.ts`
- Exports: `HostSessionController.create()`
- Responsibilities: Bridge between host UI and runtime session, manage command input state, execute commands, tick session, render view

**Mod Entry Points:**
Each mod exports a `GameModModule`:
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

**Strategy:** Fail fast at boot time

**Patterns:**
- Duplicate ID detection: All registries throw on duplicate registration
- Missing dependency: `resolveModuleOrder()` throws with mod ID and missing dependency
- Circular dependency: Detected during topological sort
- API version mismatch: Checked during `module.install()`, throws if `manifest.apiVersion !== MOD_API_VERSION`
- Content collision: `ContentRegistryBuilder` throws on duplicate content IDs

## Cross-Cutting Concerns

**Logging:** Console-based via `state.logs` array in session state; UI renders latest log entry

**Validation:**
- Content registry validates uniqueness
- Runtime assembly validates dependency graph
- API version validates mod compatibility

**Authentication:** Not applicable (single-player browser game)

**Persistence:**
- Save format: `GameSaveEnvelope` { version, profile, session }
- `RuntimeSaves.serialize()` / `RuntimeSaves.restore()`
- Stored in `localStorage` by host

---

*Architecture analysis: 2026-03-31*
