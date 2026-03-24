# RFC-0011 Tile-Scoped Building Affordances

## Status

Accepted

## Context

After world object interactions were introduced, gathering, dismantling, resting, and station
crafting could all be expressed as object-scoped capabilities. Building still lagged behind:

- placement mostly appeared as a generic command
- empty ground had no first-class descriptor in the runtime
- host UI could not describe a build site except through button text

That shape keeps construction too close to a menu action instead of a world interaction.

## Decision

Empty buildable ground is now modeled as a focused runtime world object with kind `tile`.

For the current vertical slice:

- `core:building` may provide synthetic tile descriptors for empty pointed tiles
- build placement is exposed as a tile-scoped context interaction
- the host may render tile summaries, costs, and viability feedback without hardcoding building rules

## Rules

- tile descriptors are allowed when no concrete resource or structure occupies the tile
- placement validation remains authoritative in the building domain and action execution
- hosts may use interaction metadata to color or annotate tile focus state
- movement remains a generic command; tile-scoped construction must not require host-side branching

## Consequences

Benefits:

- building joins the same capability model as other world interactions
- empty space becomes queryable and inspectable
- future mods can attach terrain- or biome-specific tile actions without patching the host

Tradeoffs:

- runtime world objects now include both concrete entities and synthetic focus targets
- mod authors must avoid claiming tiles too broadly and obscuring higher-priority concrete objects

## Initial Use

The first tile-scoped affordance is campfire placement on an empty selected tile.
