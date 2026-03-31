# STATE: Gamedemo 伪3D视觉改进

**Project:** Gamedemo Pseudo-3D Visual Enhancement  
**Core Value:** 视觉呈现必须让玩家清晰感知空间层次和物体遮挡关系，营造沉浸式的2.5D游戏体验  
**Initialized:** 2026-03-31

---

## Current Position

**Phase:** None (roadmap created, awaiting planning)  
**Plan:** None  
**Status:** Roadmap complete, ready for Phase 1 planning  
**Overall Progress:**

```
[░░░░░░░░░░░░░░░░░░] 0% (0/4 phases)
```

---

## Project Reference

**What we're building:** Incremental visual architecture improvement for existing Phaser 3 engine to achieve Stardew Valley-style pseudo-3D (2.5D) presentation

**What success looks like:**
- Objects render with correct depth ordering based on Y-position + height
- Player remains visible when walking behind tall objects (dynamic occlusion)
- 60fps maintained with 500+ visible objects
- All existing mods work without modification (backward compatibility)

**Current Constraint Context:**
- Tech: Phaser 3.90.0, TypeScript, monorepo with pnpm workspaces
- Existing: Fixed layer rendering (0, 2, 3, 4, 7) that cannot support pseudo-3D
- Mod System: Visual Pack system allows gameplay + visual packs to be swapped independently
- File Limit: 500 lines per source file (RFC-0007)

---

## Performance Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Frame Rate | 60fps | Unknown | Baseline needed |
| Max Visible Objects | 500+ | Unknown | Baseline needed |
| Render Time | <16ms/frame | Unknown | Baseline needed |

**Next Measurement:** After Phase 1 completion, profile current O(n) rendering in gameViewport.ts

---

## Accumulated Context

### Key Decisions

| Decision | Rationale | Status |
|----------|-----------|--------|
| Custom Y-sorting via Phaser depth | Avoid isometric plugins (deprecated/incomplete), don't need true 3D | Pending validation |
| Height-based sorting vs Z-index | More intuitive for mod authors | Pending implementation |
| Single-container pipeline | Replace fixed layers for proper occlusion | Pending Phase 2 |
| Alpha 0.3-0.5 for occlusion | Not full transparency, maintains depth cue | Pending Phase 3 |

### Known Technical Debt

From PROJECT.md:
- `gameViewport.ts` has Chinese comments and production console logs
- Render loop is O(n) per frame with no spatial index
- No view frustum culling

### Critical Pitfalls to Avoid

1. **Incorrect Depth Sorting** — Wrong algorithm requires HIGH effort (rewrite render pipeline)
2. **Dynamic Occlusion Performance Death** — Alpha on too many objects kills frame rate
3. **Mod Compatibility Breakage** — Must maintain legacy rendering path
4. **Coordinate System Bugs** — Mixing spaces causes subtle visual glitches

### Open Questions

1. Exact projection angle: 45° vs Stardew's ~30° (decision needed before Phase 1)
2. Existing sprite assets: Do they need rework for bottom-center origin?
3. Current performance baseline: Need profiling data from gameViewport.ts
4. Visual Pack migration: How many existing packs need updates?

---

## Phase History

No phases completed yet.

---

## Session Continuity

**Last Action:** Roadmap creation (2026-03-31)  
**Next Action:** `/gsd-plan-phase 1` to plan Foundation phase  
**Blockers:** None  
**Context Valid Until:** Milestone completion or major requirement change

### Quick Resume

If returning to this project:
1. Review ROADMAP.md for current phase status
2. Check phase success criteria to verify completion
3. Run `/gsd-plan-phase {N}` for current phase
4. If Phase 1 complete, verify coordinate types and height registry exist

---

*State tracking for: Gamedemo 伪3D视觉改进*  
*Last updated: 2026-03-31*
