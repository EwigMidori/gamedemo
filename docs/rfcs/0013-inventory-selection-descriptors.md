# RFC-0013 Inventory Selection Descriptors

## Status

Accepted

## Context

`selectedSlot` became a real runtime input context, but the host still lacked a formal way to ask
the runtime what a selected item means.

Without a descriptor layer, item semantics would drift back into host code or remain duplicated
across command labels and logs.

## Decision

Introduce inventory selection descriptors as a runtime extension point.

New runtime shape:

- `RuntimeInventorySlotDescriptor`
- `RuntimeInventorySelectionProvider`
- `session.inspectSelectedInventorySlot(input)`

New mod install surface:

- `context.inventorySelections.register(...)`

## Rules

- the host may render selected item details from descriptors
- the host must not infer item behavior beyond what runtime commands and actions expose
- mods may override generic item descriptors with more specific semantics by registering earlier in
  dependency order
- descriptor data is descriptive; action execution remains authoritative

## Initial Use

- `core:inventory` provides generic item stack descriptions
- `core:survival` specializes ration slot descriptions

## Consequences

Benefits:

- item semantics become modular and extensible
- future tools, equipment, fuel, seeds, and crafting inputs can share the same inspection surface
- host code remains item-agnostic

Tradeoffs:

- runtime assembly owns one more registry
- mods must keep descriptor text aligned with real behavior
