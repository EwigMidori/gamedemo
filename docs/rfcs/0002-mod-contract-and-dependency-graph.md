# RFC-0002: Mod Contract And Dependency Graph

- Status: Proposed
- Authors: Codex
- Created: 2026-03-20

## Summary

This RFC defines the canonical mod contract. Mods are first-class runtime units. They may depend on each other, contribute content and systems, and jointly define the game world.

## Goals

- let multiple mods cooperatively define one runtime world
- support first-party and player-authored mods through one contract
- keep dependencies explicit and ordered
- prevent module-global registry sprawl

## Non-Goals

- untrusted code execution security model for arbitrary hostile mods
- hot reloading of gameplay code during an active simulation tick
- binary compatibility across unrelated major API versions

## Mod Manifest

Every mod must expose a manifest plus an install entrypoint.

```ts
interface GameModManifest {
  id: string;
  version: string;
  apiVersion: string;
  dependsOn?: ModDependency[];
  optionalDependsOn?: ModDependency[];
  loadBefore?: string[];
  loadAfter?: string[];
  capabilities?: ModCapabilityDecl[];
}

interface GameModModule {
  manifest: GameModManifest;
  install(ctx: ModInstallContext): void | Promise<void>;
}
```

## Dependency Semantics

### Required dependency

If mod `A` depends on mod `B`, `B` must load first or assembly fails.

### Optional dependency

If `B` is present, `A` may integrate with it. If absent, `A` must still install cleanly.

### Ordering hints

`loadBefore` and `loadAfter` are tie-breakers, not substitutes for real dependencies.

## Mod Contribution Types

Mods may contribute one or more of the following:

- content packs
- world systems
- action handlers
- command resolvers
- HUD panels
- input bindings
- save migrations
- world generation stages

Example:

```ts
interface ModInstallContext {
  content: ContentRegistryBuilder;
  systems: SystemRegistry;
  actions: ActionRegistry;
  commands: CommandRegistry;
  ui: UiRegistry;
  saves: SaveRegistry;
  worldgen: WorldgenRegistry;
  services: HostServiceRegistry;
}
```

## Ownership Rules

The important rule is not "a mod can register anything". The important rule is "a mod must know what it owns".

### Content mods

Own static definitions:

- items
- recipes
- resources
- structures
- tags

### System mods

Own simulation behaviors:

- hunger decay
- crop growth
- drop magnetism
- station proximity effects

### Action mods

Own world mutations in response to intents:

- break target
- place structure
- craft recipe
- use item

### UI mods

Own view-model contributions and mounted UI panels.

## No Global Mutable Registries

Global singleton registries must not be used as the runtime composition model.

Instead:

- the host creates a fresh runtime container
- selected mods install into that container
- the container becomes immutable once boot completes

This avoids leaked state across restarts, tests, and multiple game sessions.

## Namespacing

All content IDs must be namespaced:

```text
core:wood
core:workbench
survival:ration
building:campfire
player.cool_mod:crystal_axe
```

Unnamespaced IDs are forbidden in the new architecture.

## Cross-Mod Integration

Cross-mod integration must happen through declared contracts, not by reaching into another mod's internals.

Examples:

- `core-crafting` exposes recipe stations and craft action slots
- `core-ui-hud` exposes HUD mount points
- `core-worldgen` exposes biome and spawn-stage extension hooks

## Failure Modes

Assembly must fail fast for:

- missing required dependency
- duplicate mod ID
- duplicate content ID
- incompatible API version
- circular dependency

## Success Criteria

- the runtime can compute a stable mod dependency graph before boot
- mod install order is deterministic
- disabling a mod removes only its declared contributions
- no gameplay rule requires host-side hardcoding to exist

## Example Core Graph

```text
core-base
├─ core-worldgen
├─ core-survival
├─ core-building
├─ core-crafting
├─ core-ui-hud
└─ vanilla-bundle
   ├─ depends on core-worldgen
   ├─ depends on core-survival
   ├─ depends on core-building
   ├─ depends on core-crafting
   └─ depends on core-ui-hud
```
