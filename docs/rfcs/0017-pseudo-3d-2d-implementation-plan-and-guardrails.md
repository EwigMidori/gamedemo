# RFC-0017: Pseudo-3D 2D Implementation Plan And Guardrails

- Status: Proposed
- Authors: Codex
- Created: 2026-03-24

## Summary

RFC-0016 defines the target visual direction. This RFC defines how to implement it without
breaking the mod architecture, without drifting back into host-owned gameplay rendering, and
without regressing into oversized scene files or procedural sprawl.

The primary goal is disciplined delivery:

- package boundaries stay explicit
- rendering rules stay in `engine-phaser`
- data contracts stay in `engine-core`
- validation stays in `engine-content`
- gameplay mods remain declarative
- host stays thin
- code stays object-oriented or Rust-like per RFC-0007

## Implementation Principles

### 1. No Host-Owned Visual Semantics

The host may boot and mount the renderer. The host must not decide:

- how depth is computed
- when objects fade
- what counts as a canopy or roof
- how shadows are drawn
- what visual layer a world object belongs to

If a rule affects in-world presentation, it belongs in engine contracts or renderer classes.

### 2. No Mod-Owned Phaser Logic For Standard World Objects

Gameplay mods may declare visual metadata, but standard terrain/resource/structure rendering must
not require mods to imperatively manipulate Phaser objects.

Allowed:

- declarative content metadata
- visual pack content definitions
- optional future specialized extension points with strict contracts

Not allowed:

- gameplay mods importing scene internals
- mods directly mutating display lists for ordinary world objects
- host callbacks for specific visuals

### 3. One Responsibility Per Render Object

Every render-side class should own exactly one coherent concern.

Examples:

- `WorldTerrainLayer`
- `WorldEntityLayer`
- `OcclusionResolver`
- `DepthModel`
- `ShadowRenderer`
- `WeatherOverlayController`
- `VisualContentIndex`

Avoid:

- one giant `GameScene` that owns everything
- one `Viewport` class that mixes terrain, actors, weather, HUD, occlusion, and interaction hints

### 4. Render State Is Derived, Not Authoritative

Gameplay state remains the source of truth.

Render-specific state may cache:

- instantiated sprites
- current fade values
- visible chunks
- layer membership
- animation state

But render state must not become the source of gameplay truth.

## Target Package Boundaries

### `packages/engine-core`

Owns pure contracts only.

Must define:

- visual metadata types
- render layer enums or tags
- footprint and anchor types
- occluder metadata
- shadow metadata
- appearance variant metadata

Must not define:

- Phaser classes
- texture keys
- concrete sprite creation logic

Recommended file split:

- `visualTypes.ts`
- `contentTypes.ts`
- `runtimeTypes.ts`
- `interactionTypes.ts`

### `packages/engine-content`

Owns content validation and indexing.

Must define object-oriented services such as:

- `ContentVisualValidator`
- `VisualContentIndex`
- `ContentCollisionValidator`

Responsibilities:

- validate visual metadata shape
- expose efficient lookup by content id
- reject invalid layer/footprint definitions at assembly time

Must not:

- allocate Phaser objects
- decide runtime fade behavior

### `packages/engine-phaser`

Owns the pseudo-3D presentation algorithm.

Recommended object model:

- `RuntimeGameScene`
  - composition root for Phaser scene concerns only
- `WorldRenderGraph`
  - owns layer orchestration
- `TerrainRenderLayer`
  - owns terrain tiles and decals
- `ObjectRenderLayer`
  - owns world objects with shared sprite lifecycle logic
- `ActorRenderLayer`
  - owns player and later NPC rendering
- `OcclusionController`
  - decides fade targets from metadata and actor position
- `DepthModel`
  - computes stable display depth for tiles, actors, and tall objects
- `ShadowLayer`
  - owns shadow sprites and their placement rules
- `WeatherLayer`
  - owns rain, fog, pollen, lighting overlays
- `HudSceneAdapter` or equivalent
  - bridges session data to Phaser HUD drawing

Must not:

- import gameplay mods
- hardcode `"resource:tree"` style special cases when metadata can express the same rule

### `mods/*`

Mods should remain data and gameplay contributors.

Recommended internal split:

- `catalog` or content registration
- `actions`
- `systems`
- `interactions`
- `domain`

Visual additions should be made through content metadata, not renderer patches.

### `apps/host-web`

Must remain limited to:

- boot
- runtime/profile selection
- save/load entrypoints
- trusted mod loading
- mount target creation

Must not own:

- in-world layer logic
- input-to-visual semantics
- gameplay-specific HUD decisions

## New Engine Contracts

The following contracts should be introduced in `engine-core` before major renderer rewrites begin.

### Visual Identity

```ts
interface SpriteFrameRef {
  atlas: string;
  frame: number | string;
}
```

### Footprint And Anchor

```ts
interface TileFootprint {
  widthTiles: number;
  heightTiles: number;
  originTileX: number;
  originTileY: number;
}

interface RenderAnchor {
  x: number;
  y: number;
}
```

### Visual Layers

```ts
type VisualLayerKind =
  | "terrain"
  | "decal"
  | "ground-object"
  | "actor-shadow"
  | "actor"
  | "object-body"
  | "object-front"
  | "weather"
  | "hud";
```

### Occlusion Metadata

```ts
interface VisualOcclusionDef {
  enabled: boolean;
  fadeAlpha: number;
  region: "full" | "upper-half" | "custom";
}
```

### Shadow Metadata

```ts
interface VisualShadowDef {
  style: "none" | "blob" | "soft" | "tall";
  offsetX?: number;
  offsetY?: number;
  scale?: number;
  alpha?: number;
}
```

### Composite Visual Definition

```ts
interface ObjectVisualDef {
  footprint: TileFootprint;
  anchor: RenderAnchor;
  heightClass: "flat" | "low" | "medium" | "tall";
  body?: SpriteFrameRef;
  frontOverlay?: SpriteFrameRef;
  shadow?: VisualShadowDef;
  occlusion?: VisualOcclusionDef;
}
```

These names are illustrative, but the implementation should not begin before the contract surface is
stabilized enough to prevent renderer churn.

## Renderer Architecture

### Composition Root

`RuntimeGameScene` should be reduced to orchestration only.

Its responsibilities should be:

- create scene-local services
- wire session snapshot flow
- call `render()` or `sync()` on owned layer objects
- host camera setup
- forward input to runtime adapters

It should not contain object-specific rendering decisions.

### World Render Graph

Introduce a central object such as `WorldRenderGraph`.

Responsibilities:

- create owned layer objects
- define render order
- distribute snapshot data to layers
- expose teardown lifecycle for future runtime hot-reload support

This object becomes the stable seam between scene orchestration and per-layer logic.

### Depth Model

Introduce a dedicated depth service, not ad hoc `setDepth(...)` rules scattered through files.

Responsibilities:

- compute actor depth from foot position
- compute object body depth
- compute front-overlay depth
- keep sort rules deterministic

All render layers should depend on this service rather than reimplementing local depth math.

### Occlusion Controller

Introduce a dedicated controller for fade behavior.

Responsibilities:

- inspect actor position and object metadata
- decide whether front overlays are visible, hidden, or faded
- smooth alpha transitions where appropriate

This must be a first-class object because occlusion rules are where pseudo-3D projects usually
start leaking special cases.

## Content Authoring Model

### Base Rule

Standard world content should be describable through metadata alone.

Examples:

- a tree uses `body + frontOverlay + occlusion + shadow`
- a bush uses `body + optional shadow`
- a house uses `body + roof/front overlay + tall shadow`
- a crop uses `body + growth variants`

### Visual Packs

Visual packs should be implemented as mods that:

- contribute alternative visual metadata
- contribute alternative sprite references
- do not own gameplay actions

This keeps the architecture open for later pack swapping.

## Delivery Phases

### Phase 0: Preconditions

Before visual work begins:

- close critical gameplay correctness regressions
- finish ongoing renderer cleanup below 500 LOC per file
- reduce host hardcoding where it directly conflicts with mod contracts

Exit criteria:

- current game loop remains playable
- renderer can be refactored without fighting basic gameplay bugs on every step

### Phase 1: Contract Expansion

Tasks:

- add visual contracts to `engine-core`
- add validation/indexing support to `engine-content`
- keep old flat frame fields temporarily for compatibility

Exit criteria:

- content can express both old and new visual forms
- assembly validates malformed visual metadata

### Phase 2: Render Graph Skeleton

Tasks:

- split current viewport responsibilities into layer objects
- add `WorldRenderGraph`
- add `DepthModel`
- route all current in-world rendering through the graph

Exit criteria:

- no behavior change required yet
- renderer becomes structurally ready for richer visuals

### Phase 3: Tall Object Support

Tasks:

- support body/front overlay split for resources and structures
- add shadow rendering per object metadata
- add occluder fade for player-behind-object

Exit criteria:

- at least trees and one building type support pseudo-3D presentation correctly

### Phase 4: Terrain And Environment Enrichment

Tasks:

- terrain decals and edge treatment
- better day/night lighting layers
- weather overlay architecture
- crop and plant stage visual support

Exit criteria:

- scene reads as spatial and alive rather than flat

### Phase 5: Visual Pack Proof

Tasks:

- create one dedicated visual pack mod or pack bundle
- demonstrate same gameplay runtime under alternate presentation metadata

Exit criteria:

- at least one profile swap changes visuals substantially without host changes

## Anti-Drift Rules

These rules are mandatory during implementation.

### Rule 1

Do not add new gameplay-specific render conditionals in host code.

Bad:

- `if (object.typeId === "resource:tree")` inside host shell
- `if (selectedProfile.id === "vanilla")` to choose render behavior

### Rule 2

Do not let `RuntimeGameScene` exceed 500 lines.

If a new feature needs significant logic:

- add a dedicated owned class
- wire it in from the scene

### Rule 3

Do not export global helper functions as new public package API.

Public surfaces should remain:

- classes
- typed interfaces
- `const` objects with methods

### Rule 4

Do not couple visual metadata directly to gameplay ids when a capability can express the same rule.

Prefer:

- `heightClass: "tall"`
- `occlusion.enabled: true`

Over:

- tree-only special cases in renderer

### Rule 5

Do not rewrite all content definitions in one shot.

Use compatibility shims during Phase 1 and Phase 2 so the renderer can evolve incrementally.

## Testing Plan

### Structural Tests

- content validation tests for visual metadata
- renderer layer construction tests where practical
- depth ordering tests for representative objects

### Play Tests

- player walking behind tree
- player walking behind house edge
- dropped items remain on ground layer
- zoom changes do not distort HUD
- long travel does not reintroduce severe frame collapse

### Visual Comparison

Continue using Playwright-based screenshot comparison for:

- baseline scene
- tall object occlusion scene
- weather overlay scene
- alternate visual pack scene

## Acceptance Checklist

Implementation should not be considered complete until all items below are true:

- visual metadata is defined in engine contracts
- content validation exists for new metadata
- renderer is split into owned layer/controller objects
- tall-object occlusion works without host special cases
- shadows and depth are data-driven
- files remain below 500 lines
- no new exported global functions are introduced
- at least one visual pack swap is demonstrated

## Related

- [RFC-0007 Code Organization And API Surface](./0007-code-organization-and-api-surface.md)
- [RFC-0016 Stardew-Like Pseudo-3D 2D Visual Architecture](./0016-stardew-like-pseudo-3d-2d-visual-architecture.md)
