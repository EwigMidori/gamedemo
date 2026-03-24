# RFC-0016: Stardew-Like Pseudo-3D 2D Visual Architecture

- Status: Proposed
- Authors: Codex
- Created: 2026-03-24

## Summary

This RFC defines how the game should evolve from a flat prototype-style top-down 2D presentation
into a richer "Stardew-like" pseudo-3D 2D presentation while staying inside the current Phaser +
mod workspace architecture.

The target is not true 3D. The target is a layered 2D world with stronger depth cues, occlusion,
height illusion, environment feedback, and content-driven render metadata.

Phaser is sufficient as the rendering engine. We do not need to build a custom renderer. We do
need to build a game-specific visual rules layer on top of Phaser.

## Problem

The current runtime presentation is still close to a prototype:

- terrain is mostly one sprite per tile
- resources and structures are treated as flat objects
- object depth is simple and local
- HUD and gameplay rendering are not yet driven by a formal visual capability model
- mods can add gameplay behavior, but they cannot yet declare rich visual behavior

That is enough for rebuilding gameplay, but it is not enough for the intended long-term visual
direction.

If the game is meant to feel closer to Stardew Valley, the runtime must support:

- front and back visual layers
- object footprints that differ from visual height
- roof and canopy occlusion
- character-behind-object fading rules
- shadows and time-of-day lighting
- staged crops, buildings, fences, and tall props
- visual packs that can be swapped independently from gameplay packs

## Non-Goals

This RFC does not propose:

- switching the game to a real 3D engine
- adding physics-based height simulation
- using isometric projection
- replacing Phaser
- blocking current gameplay reconstruction until all visual work is complete

## Decision

Adopt a pseudo-3D 2D presentation model built from four layers:

1. Phaser rendering primitives
2. Engine-level visual scene graph and sort rules
3. Content-defined visual metadata for terrain, resources, structures, crops, and characters
4. Visual mods or visual packs that supply art and metadata without owning gameplay logic

Phaser remains the low-level renderer. The game owns the visual semantics.

## What Phaser Already Provides

Phaser is already capable of the underlying technical features we need:

- sprite and tile rendering
- camera follow, zoom, and bounds
- display depth ordering
- render textures
- lights and post-processing pipelines
- animation playback
- particles and weather effects
- layered scenes and containers
- shader and tint pipelines when needed

This means we should not build:

- a custom WebGL renderer
- a custom scene graph from scratch
- a custom input/render loop outside Phaser

## What We Must Build Ourselves

Phaser does not define farming-game visual semantics. The project must provide its own rules for:

- which part of an object belongs to ground, body, canopy, roof, or front overlay
- how tall sprites sort against the player and against each other
- when occluding layers fade while the player stands behind them
- how an object footprint differs from its rendered height
- how shadows are derived from height class and time of day
- how seasonal or weather variants swap art or tint
- how mods declare these properties without patching host code

This layer is game-specific and belongs in the workspace architecture, not in the host shell.

## Visual Model

### 1. Footprint vs Render Height

Every tall world object must distinguish between:

- collision footprint
- interaction footprint
- render footprint
- visual height class

Example:

- a tree may occupy one interaction tile
- its trunk sorts at foot level
- its canopy draws above the player
- the canopy may fade when the player stands behind it

### 2. Render Layers

The runtime should move toward these conceptual layers:

- terrain base
- terrain decals and edges
- dropped items and ground effects
- low props
- actor feet and shadows
- actors and low entities
- tall object body
- front occluders
- weather and lighting overlays
- Phaser-only HUD

This does not require ten separate Phaser scenes. It does require a formal depth model inside
`engine-phaser`.

### 3. Occlusion Rules

Objects such as trees, houses, cliffs, and tall crops may define occluder regions.

When the player enters the occlusion region behind such an object:

- the front layer may fade
- only the occluding sublayer should fade, not the whole object
- interaction and collision remain unchanged

### 4. Shadow Rules

Shadows are part of the pseudo-3D illusion and should be data-driven.

Each renderable object may define:

- `shadowStyle`
- `heightClass`
- optional `shadowOffset`
- optional night-light interaction rules

Shadows should remain a presentation concern and must not affect gameplay simulation.

## New Data Shape

Current content definitions rely mostly on simple frame and tint fields. That is too small a
surface for the target presentation model.

The engine should evolve toward dedicated visual metadata types such as:

```ts
interface VisualFootprint {
  widthTiles: number;
  heightTiles: number;
  anchorX: number;
  anchorY: number;
}

interface VisualOccluder {
  fadeWhenPlayerBehind: boolean;
  region: "full" | "upper-half" | "custom";
}

interface VisualLayerSet {
  baseFrame?: number;
  bodyFrame?: number;
  frontOverlayFrame?: number;
  shadowFrame?: number;
}

interface RenderableVisualDef {
  footprint: VisualFootprint;
  layers: VisualLayerSet;
  heightClass: "flat" | "low" | "medium" | "tall";
  occluder?: VisualOccluder;
}
```

The exact type names may change, but the architectural requirement is fixed:

- gameplay definitions must no longer be limited to one flat frame
- visual metadata must be declarative
- mods must contribute metadata, not imperative draw code, for standard world objects

## Package Impact

### `packages/engine-core`

Add stable visual metadata contracts:

- render layer metadata
- object footprint metadata
- occluder metadata
- shadow metadata
- seasonal and weather variant hooks

These must remain engine-level contracts, not Phaser-specific types.

### `packages/engine-content`

Support validation and indexing for richer visual definitions:

- reject malformed visual metadata
- index by visual capability where useful
- keep content collision checks strict

### `packages/engine-phaser`

This package becomes the main owner of the pseudo-3D presentation algorithm.

Responsibilities:

- layered world rendering
- actor/object depth sort rules
- occluder fade behavior
- shadow rendering
- weather overlays
- camera-space effects that do not alter gameplay state

`engine-phaser` should consume visual metadata, not hardcode per-object gameplay assumptions.

### `mods/*`

Gameplay mods should contribute visual metadata along with their content definitions.

Mods must not:

- patch host UI directly
- depend on scene internals
- hardcode draw order from outside engine contracts

### `apps/host-web`

The host remains responsible for boot, profile selection, and external mod loading.

The host must not become the owner of:

- pseudo-3D render rules
- occlusion decisions
- weather effect semantics
- object-specific presentation code

## Visual Packs

The project should support visual packs as first-class mod compositions.

This means a future profile may swap:

- gameplay mod set
- visual pack mod set
- or both

Examples:

- `bundle:vanilla-gameplay` + `pack:classic-visuals`
- `bundle:vanilla-gameplay` + `pack:stardew-like-visuals`

The same gameplay simulation should remain playable across multiple visual packs when content IDs
and capability contracts match.

## Phased Rollout

### Phase 1: Render Layer Foundation

- formalize render layers in `engine-core`
- refactor `engine-phaser` world drawing around explicit layer ownership
- separate actor feet/body/shadow drawing from flat object drawing

### Phase 2: Occlusion And Height Illusion

- add occluder metadata
- split tall objects into body and front overlay layers
- implement player-behind-object fade logic

### Phase 3: Environment Presentation

- improve shadows
- improve day/night lighting
- add weather overlays
- add crop and prop stage visuals

### Phase 4: Pack-Level Modularity

- move visual defaults into dedicated visual content modules or packs
- prove that a visual pack can be swapped without rewriting host code

## Constraints

This RFC inherits RFC-0007.

Additional constraints:

- visual logic must remain data-driven where possible
- no single render module may exceed 500 lines
- no host-owned object-specific render rules
- no mod should need to call Phaser directly for standard world object rendering

Custom Phaser scene code from mods may be allowed later for exceptional cases, but it must not be
the default extension model.

## Success Criteria

This RFC is considered successful when:

- the game visually reads as layered and spatial rather than flat
- trees, buildings, and other tall props can occlude the player correctly
- gameplay mods can add tall objects without patching render code in the host
- at least one visual pack can be swapped with no gameplay logic changes
- Phaser remains the renderer, but visual rules live in engine contracts

## Related

- [RFC-0001 Workspace And Host Architecture](./0001-workspace-and-host-architecture.md)
- [RFC-0003 Runtime Assembly, Dynamic Loading, And Save Boundaries](./0003-runtime-assembly-dynamic-loading-and-save-boundaries.md)
- [RFC-0004 Greenfield Rewrite Plan](./0004-greenfield-rewrite-plan.md)
- [RFC-0007 Code Organization And API Surface](./0007-code-organization-and-api-surface.md)
- [RFC-0008 World Object Interaction Capabilities](./0008-world-object-interaction-capabilities.md)
