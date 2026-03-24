# RFC-0014 Selected Item Interactions

## Status

Accepted

## Context

Inventory slot selection descriptors made selected items inspectable, but they were still passive.
As more tools, fuels, ingredients, and consumables are introduced, item behavior must not remain
split between generic commands and ad hoc mod logic.

## Decision

Introduce selected item interactions as a dedicated runtime capability layer.

New runtime shape:

- `RuntimeInventoryInteraction`
- `RuntimeInventoryInteractionProvider`
- `session.resolveSelectedInventoryInteractions(input)`

This layer is the selected-item counterpart to world object interactions.

## Rules

- selected item interactions are derived from the current slot context
- hosts may render selected item actions without understanding item-specific rules
- action execution must still validate slot contents and any world prerequisites
- generic command resolvers may keep fallback commands when no item is selected

## Initial Use

- `core:survival` exposes `Consume Ration` for selected ration stacks
- `core:crafting` exposes `Craft ration from selected wood` when a nearby campfire is available

## Consequences

Benefits:

- item behaviors become modular and discoverable
- selected items can coordinate with stations and world state without host logic
- future tools, fuels, seeds, and equipment can use the same extension surface

Tradeoffs:

- runtime assembly gains one more registry
- mods must avoid conflicting item interaction ids and overlapping semantics
