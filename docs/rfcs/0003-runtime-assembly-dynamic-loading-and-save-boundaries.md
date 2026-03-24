# RFC-0003: Runtime Assembly, Dynamic Loading, And Save Boundaries

- Status: Proposed
- Authors: Codex
- Created: 2026-03-20

## Summary

This RFC defines how selected mods become one running game, how player mods are loaded, and how saves are partitioned across cooperating mods.

## Runtime Assembly

The host boot sequence should be:

1. discover enabled workspace mods
2. discover enabled external mods
3. validate manifests and API version
4. build dependency graph
5. topologically order mods
6. create fresh runtime container
7. install mods into container
8. freeze registries
9. create game session from assembled runtime

## Runtime Container

The runtime container is instance-scoped.

```ts
interface RuntimeContainer {
  content: ContentRuntime;
  systems: RuntimeSystem[];
  actionHandlers: RuntimeActionHandler[];
  commandResolvers: RuntimeCommandResolver[];
  uiMounts: RuntimeUiMount[];
  saveScopes: RuntimeSaveScope[];
}
```

This container must not be a module-global singleton.

## Dynamic Loading Model

Player-loaded mods are supported, but only through the same manifest and install contract used by workspace mods.

Supported sources:

- workspace packages
- local file or URL bundles approved by host policy
- saved mod profiles

## Security And Trust Model

Dynamic loading is a product feature, but it is also a trust boundary.

Short-term policy:

- external mods are trusted code from the player's perspective
- the host validates manifest shape and API compatibility, not malicious behavior
- external mods are boot-time additions, not mid-tick injections

That is deliberately narrower than a true sandbox.

## Mod Packaging

External mods should build to an ESM package exposing:

- `manifest`
- `install`

Optional assets should be declared in manifest metadata so the host can preload them.

## Content Runtime

Content becomes a runtime service assembled from all installed mods.

Rules:

- one live content runtime per session
- no `constants.ts` snapshots generated from content data
- all lookups go through namespaced runtime APIs
- content collision is a boot error

## Command Resolution

Command resolution becomes a runtime pipeline, not a global array of providers.

```ts
interface RuntimeCommandResolver {
  id: string;
  resolve(ctx: CommandContext): ResolvedCommand[];
}
```

The pipeline should:

- gather command candidates from installed mods
- sort by deterministic priority rules
- expose machine-readable input bindings
- return structured disabled reasons when relevant

Execution should dispatch a domain action, not directly mutate scene-owned state.

## System Scheduling

Simulation systems contributed by mods run in ordered phases:

```text
preUpdate
intent
simulation
postSimulation
renderPrepare
```

This avoids hidden frame-order coupling between mods.

## Save Model

Saves must be host-owned containers with mod-scoped payloads.

```ts
interface GameSave {
  version: number;
  runtimeProfile: RuntimeProfile;
  world: CoreWorldSave;
  modData: Record<string, unknown>;
}
```

### Rules

- the host owns save envelope metadata
- each mod owns its own payload shape
- each mod may register migrations for its payload
- removing a mod should not corrupt the rest of the save envelope

## Runtime Profiles

A save should record the active mod set:

```ts
interface RuntimeProfile {
  mods: Array<{ id: string; version: string }>;
}
```

Loading a save with a mismatched mod set should surface a compatibility decision:

- exact match
- compatible with migrations
- missing required mod
- incompatible version

## Failure Policy

The host must fail boot or load loudly for:

- unresolved required dependency
- incompatible API version
- incompatible required save migration
- duplicate contribution identity

## Success Criteria

- workspace and external mods install through one assembly path
- runtime state is fresh per session
- save data is partitioned by mod scope
- command and system pipelines are deterministic
