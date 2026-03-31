# Feature Landscape: Pseudo-3D (2.5D) Visual Architecture

**Domain:** 2.5D Survival/Crafting Games (Stardew Valley-style)
**Researched:** 2026-03-31
**Confidence:** HIGH

## Executive Summary

Pseudo-3D (2.5D) games create the illusion of three-dimensional space using 2D sprites and layered rendering. Unlike true isometric games (e.g., SimCity 2000, Diablo), pseudo-3D uses an oblique perspective with freeform sprite positioning and depth-based sorting. The core value is spatial clarity—players must instantly understand where objects are, what's in front, and how to navigate.

This research focuses on features typical of Stardew Valley-style farming/life simulation games, which share the target project's survival/crafting genre.

---

## Table Stakes

Features players expect. Missing = product feels broken or amateur.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Oblique/Angled Perspective** | Creates immediate depth perception. Pure top-down feels like a board game. | Medium | 45° view typical. Requires sprite artwork aligned to angle. |
| **Multi-Layer Rendering** | Objects must draw in correct order (terrain → ground items → actors → tall objects). | Medium | Stardew uses: Back → Buildings → Paths → Front → AlwaysFront. |
| **Depth Sorting** | Actors walking "behind" trees must appear behind them. | High | Must sort by Y-position + height class. Critical for believability. |
| **Object Height Properties** | Trees/buildings taller than their collision footprint. | Medium | Visual height ≠ interaction footprint. Core to 2.5D illusion. |
| **Basic Shadows** | Ground shadows anchor objects to the world. | Low | Simple blob shadows work. Height-class driven shadow shapes. |
| **Footprint Definition** | Clear hitbox separate from visual bounds. | Medium | 1×1 collision vs 2×3 visual for a tree. |
| **Consistent Anchor Points** | Sprites align predictably to grid. | Low | All art must share same registration point convention. |

### Table Stakes Dependencies

```
Oblique Perspective
    ↓
Multi-Layer Rendering
    ↓
Depth Sorting ← Object Height Properties
    ↓
Footprint Definition ← Consistent Anchor Points
```

---

## Differentiators

Features that set products apart in this space. Not expected, but create delight.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Dynamic Occlusion Fade** | When player walks behind tall objects, they fade to reveal the player. | Medium | Stardew signature feature. Creates "see-through" effect. |
| **Split-Layer Objects** | Tall objects render as body + front overlay separately. | Medium | Tree trunk draws at base Y, canopy draws above actors. |
| **Visual Pack System** | Swappable art styles without gameplay changes. | High | Enables mod ecosystem. Same game, different looks. |
| **Height Classification** | "flat" / "low" / "medium" / "tall" system for consistent rules. | Low | Drives shadow, occlusion, and sort behavior. |
| **Seasonal Art Variants** | Trees/crops change appearance by season. | Medium | Requires content pipeline support. High player value. |
| **Weather Overlays** | Rain, snow, lighting effects on top of world. | Medium | Particle systems + screen-space overlays. |
| **Staged Growth Visuals** | Crops show distinct growth stages (seedling → mature). | Medium | Each stage needs unique sprite. |
| **Time-of-Day Lighting** | Ambient color shifts (dawn → noon → dusk → night). | Medium | Screen tint + light sources. |
| **Animated Elements** | Water, trees, fires have subtle idle animations. | Low | High polish factor. Low implementation cost. |
| **Terrain Edge Blending** | Smooth transitions between terrain types (grass → dirt). | Medium | Requires decal/tileset edge art. |

### Differentiator Dependencies

```
Height Classification
    ├──→ Dynamic Occlusion Fade
    ├──→ Split-Layer Objects
    └──→ Basic Shadows (enhanced)

Visual Pack System
    └──→ All visual features become data-driven

Split-Layer Objects
    └──→ Dynamic Occlusion Fade (occlusion targets front layer)

Seasonal Art Variants
    └──→ Visual Pack System (packs define seasonal variants)
```

---

## Anti-Features

Features to explicitly NOT build. They add complexity without matching project goals.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **True 3D Rendering** | WebGL 3D/Three.js adds massive complexity, breaks mod compatibility. | Stay in 2D Phaser with pseudo-3D layering. |
| **Physics-Based Height** | Simulating real height/elevation physics is overkill for this genre. | Use height classes (flat/low/medium/tall) as categories. |
| **Camera Rotation** | Players expect fixed perspective in farming/life sims. | Fixed oblique angle. Saves 4× art assets. |
| **Vertical Terrain (Cliffs)** | Multi-level terrain complicates pathfinding and interaction. | Single-layer maps with "cliff" tiles as decorative objects. |
| **Dynamic Shadow Casting** | Real-time shadow computation from light sources. | Pre-baked shadow sprites tied to height class. |
| **Isometric Projection** | True isometric (26.565° angle) limits art flexibility. | Oblique perspective allows freeform sprites. |
| **Normal Map Lighting** | 2.5D normal maps for dynamic lighting effects. | Simple tint-based day/night cycles. |
| **Z-Axis Movement** | Jumping, flying, or multi-floor navigation. | Single-plane movement with height illusion only. |
| **Procedural Sprite Generation** | Runtime sprite composition or distortion. | Pre-authored sprites for all variants. |
| **Destructible Terrain** | Real-time terrain modification. | Tile replacement (planted → tilled → watered). |

---

## Feature Dependencies Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                     CORE RENDERING PIPELINE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Oblique Perspective                                              │
│       ↓                                                          │
│  Multi-Layer Rendering                                            │
│       ↓                                                          │
│  Depth Sorting ◄────┬── Object Height Properties                  │
│       ↓             │                                            │
│  Footprint System ◄─┘                                            │
│       ↓                                                          │
│  ┌──────────────────────────────────────┐                        │
│  │       VISUAL ENHANCEMENT LAYER        │                        │
│  ├──────────────────────────────────────┤                        │
│  │  • Split-Layer Objects                │                        │
│  │  • Dynamic Occlusion Fade             │                        │
│  │  • Height Classification              │                        │
│  │  • Basic Shadows                      │                        │
│  └──────────────────────────────────────┘                        │
│       ↓                                                          │
│  ┌──────────────────────────────────────┐                        │
│  │       CONTENT VARIETY LAYER           │                        │
│  ├──────────────────────────────────────┤                        │
│  │  • Seasonal Variants                  │                        │
│  │  • Staged Growth                      │                        │
│  │  • Animated Elements                  │                        │
│  └──────────────────────────────────────┘                        │
│       ↓                                                          │
│  ┌──────────────────────────────────────┐                        │
│  │       ATMOSPHERE LAYER                │                        │
│  ├──────────────────────────────────────┤                        │
│  │  • Weather Overlays                   │                        │
│  │  • Time-of-Day Lighting               │                        │
│  │  • Terrain Edge Blending              │                        │
│  └──────────────────────────────────────┘                        │
│       ↓                                                          │
│  ┌──────────────────────────────────────┐                        │
│  │       MODULARITY LAYER                │                        │
│  ├──────────────────────────────────────┤                        │
│  │  • Visual Pack System                 │                        │
│  │  • Data-Driven Rendering              │                        │
│  └──────────────────────────────────────┘                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## MVP Recommendation

### Phase 1: Foundation (Critical Path)

Prioritize in this order:

1. **Oblique Perspective** — Establish the visual baseline
2. **Multi-Layer Rendering** — Separate terrain/actors/objects into layers
3. **Depth Sorting** — Y-position based sorting with stable ordering
4. **Object Height Properties** — Basic height attribute on objects
5. **Footprint Definition** — Collision separate from visual bounds

### Phase 2: Core Polish

6. **Dynamic Occlusion Fade** — Player visibility behind tall objects
7. **Split-Layer Objects** — Body + front overlay for trees/buildings
8. **Height Classification** — Systematic flat/low/medium/tall system
9. **Basic Shadows** — Height-class driven shadow sprites

### Phase 3: Content Variety

10. **Staged Growth Visuals** — Crop growth stages
11. **Seasonal Art Variants** — Season-based sprite swapping
12. **Animated Elements** — Subtle idle animations

### Phase 4: Atmosphere

13. **Weather Overlays** — Rain/snow effects
14. **Time-of-Day Lighting** — Ambient color shifts
15. **Terrain Edge Blending** — Smooth terrain transitions

### Phase 5: Modularity

16. **Visual Pack System** — Swappable visual packs

### Deferred Features (Post-MVP)

| Feature | Defer Reason |
|---------|--------------|
| Complex particle systems | Can use simple sprite-based effects initially |
| Advanced shader effects | Phaser pipelines sufficient for base experience |
| Procedural decoration | Manual tile placement works for MVP |
| Multi-tile structures | Single-tile buildings sufficient initially |
| Interior transitions | Exterior focus for initial survival/crafting loop |

---

## Comparison: Pseudo-3D vs True Isometric vs Top-Down

| Aspect | Top-Down 2D | True Isometric | Pseudo-3D (2.5D) |
|--------|-------------|----------------|------------------|
| **Perspective** | 90° overhead | 26.565° angle | ~45° oblique, flexible |
| **Sprite Alignment** | Grid-locked | Grid-locked | Freeform positioning |
| **Art Requirements** | Low (1 view) | Medium (4 views for actors) | Low-Medium (1-2 views) |
| **Depth Handling** | Z-index only | Z-index + height | Full depth sorting |
| **Occlusion** | Simple | Moderate | Complex (fade effects) |
| **Examples** | Zelda (classic) | Diablo, SimCity | Stardew Valley, Graveyard Keeper |
| **Best For** | Action/Roguelike | Strategy/Puzzle | Farming/Life Sim |

**Recommendation:** Pseudo-3D is correct choice for this project. It balances visual richness with modding flexibility.

---

## Complexity Assessment

| Feature Category | Implementation Complexity | Art Complexity | Design Complexity |
|------------------|---------------------------|----------------|-------------------|
| Core Rendering | Medium | Medium | Low |
| Visual Enhancement | Medium | High | Medium |
| Content Variety | Low | High | Medium |
| Atmosphere | Medium | Low | Medium |
| Modularity | High | Low | High |

**Risk Areas:**
- Depth sorting performance with many objects
- Art pipeline for split-layer objects
- Visual pack compatibility validation

---

## Key Insights from Stardew Valley Analysis

From Stardew's modding documentation:

1. **Layer System**: Stardew uses 5 standard layers (Back, Buildings, Paths, Front, AlwaysFront) plus numbered variants (Back-1, Back2, etc.)

2. **Tile Properties**: Objects are configured via tile properties, not hardcoded behavior

3. **Occlusion**: Front layer tiles naturally occlude; no special fade system in base game (fade implemented via mods)

4. **Height Illusion**: Achieved through careful sprite positioning and layer assignment, not true height simulation

5. **Content-Driven**: All visual behavior is data-driven via Tiled map editor and JSON content files

---

## Sources

- [Stardew Valley Wiki - Modding:Maps](https://stardewvalleywiki.com/Modding:Maps) — Layer system, tile properties, occlusion patterns (HIGH confidence)
- RFC-0016: Stardew-Like Pseudo-3D 2D Visual Architecture — Project architecture decisions (HIGH confidence)
- RFC-0017: Pseudo-3D 2D Implementation Plan And Guardrails — Implementation constraints (HIGH confidence)
- PROJECT.md — Project goals and out-of-scope items (HIGH confidence)
- [Game Developer - Aesthetics of Game Art](https://www.gamedeveloper.com/design/the-aesthetics-of-game-art-and-game-design) — Visual composition principles (MEDIUM confidence)

---

*Last updated: 2026-03-31*
