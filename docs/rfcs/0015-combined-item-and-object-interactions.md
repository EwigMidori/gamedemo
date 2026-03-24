# RFC-0015 Combined Item And Object Interactions

## Status

Accepted

## Context

The rewrite now has two strong capability lines:

- world object interactions
- selected item interactions

That is enough for many actions, but some gameplay semantics only emerge from their combination.
Examples:

- selected wood + focused campfire
- selected fuel + focused furnace
- selected seed + focused soil tile

If the runtime exposes only separate item and object capabilities, the host would eventually need
to infer or visually merge them, which would violate the architectural direction.

## Decision

Introduce a dedicated combined interaction layer.

New runtime shape:

- `RuntimeCombinedInteraction`
- `RuntimeCombinedInteractionProvider`
- `session.resolveCombinedInteractions(input)`

Combined interactions are resolved only when both are available:

- a selected inventory slot descriptor
- a focused world object descriptor

## Rules

- combined interactions may supersede simpler item-only or object-only affordances
- hosts may render combined interactions as their own section without encoding gameplay rules
- combined interactions must still validate slot contents and focused object state during action execution
- mods should use combined interactions when behavior fundamentally depends on both inputs together

## Initial Use

`core:crafting` now exposes:

- selected wood + focused campfire -> craft ration

## Consequences

Benefits:

- station and item cooperation becomes explicit in runtime contracts
- future composite systems can scale without host branching
- item and object capability models remain clean while still supporting richer gameplay

Tradeoffs:

- runtime assembly gains another registry
- mods must decide carefully whether behavior is item-only, object-only, or combined
