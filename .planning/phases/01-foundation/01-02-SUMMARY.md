---
phase: 01-foundation
plan: 02
name: Height & Footprint Registry
subsystem: mod-api, engine-content, engine-runtime
status: complete
completed_date: 2026-03-31
duration: 15min
tags: [visual-pack, height, footprint, validation, registry]
requires: []
provides: [HEIGHT-01, HEIGHT-02, FOOTPRINT-01]
affects: [packages/mod-api, packages/engine-content, packages/engine-runtime, mods/core-base]
tech-stack:
  added: []
  patterns: [VisualPackRegistry, HeightValidator, validation-at-registration]
key-files:
  created:
    - packages/mod-api/src/visualPack.ts
    - packages/engine-runtime/src/heightValidator.ts
  modified:
    - packages/mod-api/src/index.ts
    - packages/engine-content/src/index.ts
    - packages/engine-runtime/src/index.ts
    - mods/core-base/src/index.ts
decisions:
  - Height classification: flat(0px), low(1-16px), medium(17-32px), tall(33px+)
  - Footprint stored in tiles (not pixels) for gameplay logic compatibility
  - Validation runs at mod load time via ContentRegistryBuilder.registerVisualPack()
  - Fallback defaults (height=0, flat classification) for legacy mod compatibility
---

# Phase 1 Plan 2: Height & Footprint Registry Summary

Visual pack registry system with height metadata and footprint definitions, enabling pseudo-3D depth sorting and occlusion in subsequent phases.

## One-Liner

Extended mod API with VisualPackRegistry storing renderHeight, heightClassification, and footprint bounds with load-time validation and backward-compatible fallback defaults.

## What Was Built

### Visual Pack Type System (`packages/mod-api/src/visualPack.ts`)
- **HeightClassification**: Type-safe enum with pixel ranges (flat/low/medium/tall)
- **HeightRange & HEIGHT_RANGES**: Validation ranges for each classification
- **FootprintBounds**: Collision footprint stored in tiles (widthTiles, depthTiles, offsets)
- **VisualPackMetadata**: Complete visual configuration per content type
- **VisualPackRegistry**: Interface for registration and lookup
- **DEFAULT_VISUAL_PACK**: Fallback defaults for legacy mods

### Content Registry Extension (`packages/engine-content/src/index.ts`)
- **registerVisualPack()**: Registers visual pack with validation
- **getVisualPack()**: Lookup by content ID
- **hasVisualPack()**: Existence check
- **getAllVisualPacks()**: Retrieve all registered packs
- **getVisualPacksByClassification()**: Filter by height classification
- **Validation integration**: HeightValidator runs on every registration

### Height Validator (`packages/engine-runtime/src/heightValidator.ts`)
- **HeightValidationRules**: Four validation rules
  - `validateHeightNonNegative`: renderHeight >= 0
  - `validateHeightConsistency`: renderHeight matches classification range
  - `validateFootprintDimensions`: widthTiles/depthTiles > 0
  - `validateOcclusionAlpha`: alpha value 0-1
- **HeightValidator class**: Validate single or multiple packs
- **Clear error messages**: Field-specific error reporting for debugging

### Core Mod Integration (`mods/core-base/src/index.ts`)
- Registered visual packs for 4 core content types:
  - `core:tree`: tall (48px), can occlude player
  - `core:rock`: low (12px)
  - `core:berry_bush`: medium (20px), can occlude player
  - `core:player`: low (16px), doesn't occlude self

## Key Design Decisions

1. **Height in pixels**: Matches Phaser coordinate space, intuitive for mod authors
2. **Footprint in tiles**: Aligns with gameplay logic (collision, placement)
3. **Validation at registration**: Catches errors at mod load time, not render time
4. **Classification ranges**: flat(0), low(1-16), medium(17-32), tall(33+) drives occlusion behavior
5. **Backward compatibility**: DEFAULT_VISUAL_PACK provides sensible defaults for legacy mods

## Test Coverage

- TypeScript compilation passes with strict mode
- Visual pack types exported from `@gamedemo/mod-api`
- HeightValidator exported from `@gamedemo/engine-runtime`
- Validation catches: negative height, height/classification mismatch, invalid footprint, bad alpha

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Commit | Description |
|--------|-------------|
| 2cb45aa | feat(01-foundation-02): create VisualPack type definitions |
| 033e5ba | feat(01-foundation-02): extend ContentRegistryBuilder with visual pack support |
| 4e233b5 | feat(01-foundation-02): create HeightValidator for visual pack validation |
| a250b05 | feat(01-foundation-02): export VisualPack types and wire validation |
| e14ff15 | feat(01-foundation-02): register visual packs in core-base mod |

## Migration Notes

Mods can now register visual packs via `context.content.registerVisualPack()`:

```typescript
context.content.registerVisualPack({
  contentId: "my_mod:custom_tree",
  renderHeight: 48,
  heightClassification: "tall",
  footprint: { widthTiles: 1, depthTiles: 1 },
  canOccludePlayer: true,
  occlusionAlpha: 0.4
});
```

Legacy mods without visual packs will use `DEFAULT_VISUAL_PACK` defaults when accessed.

## Next Steps

This plan provides the foundation for:
- Phase 2: Depth sorting using `renderHeight` for Y+height algorithm
- Phase 3: Occlusion using `canOccludePlayer` and `occlusionAlpha`
- Phase 4: Visual Pack versioning for feature gating
