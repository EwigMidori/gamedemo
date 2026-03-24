# RFC-0005: Playable Vertical Slice

- Status: Proposed
- Authors: Codex
- Created: 2026-03-20

## Summary

This RFC defines the minimum feature set required for the first genuinely playable version of the rewritten game.

The goal is not feature completeness. The goal is a coherent loop that proves the host-plus-mod architecture can support real gameplay without collapsing back into host-owned monolith logic.

## Scope

The first playable slice must include:

- player presence in the world
- movement on a generated map
- visible resources in the world
- at least one gather action
- at least one build action
- at least one craft action
- survival pressure over time
- save and load of the active session
- a default first-party runtime profile

## Non-Goals

The first playable slice does not need:

- combat
- NPCs
- procedural biome richness
- full inventory UX parity with the legacy prototype
- advanced station networks
- polished external mod authoring workflow

## Required Runtime Shape

The slice must still obey the new architecture:

- the host may render and forward intents, but may not implement gameplay rules
- gameplay rules must live in core mods
- save/load must operate through runtime/session APIs
- the default game must boot from a declared profile or bundle

## Minimum Mod Set

The first playable slice requires these mods:

- `core:base`
- `core:worldgen`
- `core:ui-hud`
- `core:survival`
- `core:building`
- `core:crafting`

The slice may add:

- `core:gathering`
- `core:player`
- `core:resources`

If new behavior is needed for playability, prefer adding a new focused core mod instead of inflating an existing one without reason.

## Feature Breakdown

### 1. Player

Required:

- a player position in session state
- movement intent handled by runtime
- player rendered in Phaser

### 2. World

Required:

- generated terrain blueprint
- visible resource nodes or gatherable objects
- structure placement reflected in runtime and render state

### 3. Gathering

Required:

- at least one world resource that can be gathered
- gathering must mutate runtime state, not host state
- gathered output must enter inventory

### 4. Building

Required:

- at least one placeable structure
- placement costs must come from inventory
- placed structures must be visible in the world

### 5. Crafting

Required:

- at least one recipe producing a useful item
- crafting must consume inventory inputs
- crafting must run as runtime action logic

### 6. Survival

Required:

- hunger decay
- health consequence or feedback when hunger fails
- visible HUD feedback

### 7. Persistence

Required:

- save current session
- restore session for matching runtime profile

## Acceptance Criteria

The slice is considered playable when a player can:

1. load the default profile
2. move around the map
3. gather resources
4. craft at least one useful item
5. place at least one structure
6. observe survival stats changing over time
7. save and reload without losing progress

## Implementation Order

Recommended order:

1. player session state and render bridge
2. movement intent pipeline
3. gatherable world resources
4. crafting loop
5. building loop
6. HUD improvements
7. save/load hardening

## Architectural Guardrails

- no gameplay rule may be added directly in `apps/host-web`
- no Phaser scene may mutate session state directly
- no new global registry may be introduced outside runtime/container assembly
- every gameplay addition should either be a focused mod or a justified extension to an existing mod

## Exit Condition

Once this slice is complete, the rewrite can stop being called a prototype and start being treated as the base playable game.
