# RFC-0008 World Object Interaction Capabilities

## Status

Accepted

## Context

RFC-0006 established a command pipeline, but the first implementation still let multiple mods
compete directly over raw pointer input through `RuntimeCommandResolver`.

That shape is not sufficient for a mod-first game architecture:

- world objects can be inspected, but their interactions are not first-class capabilities
- host code must guess which pointer command is the "primary" one
- mods that attach behavior to the same object category become tightly coupled through resolver order
- generic commands and object-scoped commands are mixed together without explicit ownership boundaries

If the game is assembled from interoperable core mods and future external mods, the runtime must
treat "what this object affords" as a formal capability surface.

## Decision

Introduce a dedicated world object interaction layer.

New runtime contracts:

- `RuntimeWorldObjectDescriptor`
  - describes a focused object
- `RuntimeWorldObjectProvider`
  - resolves descriptors from session and input context
- `RuntimeWorldObjectInteraction`
  - a command-shaped interaction bound to a specific object
- `RuntimeWorldObjectInteractionProvider`
  - contributes interactions for an already resolved object

Object interactions may also expose structured presentation metadata so hosts can render costs,
rewards, and explanatory details without embedding gameplay logic.

New mod install surface:

- `context.worldObjectInteractions.register(...)`

New session surface:

- `session.resolveWorldObjectInteractions(input)`

## Interaction Model

The runtime now resolves interactions in three stages:

1. Normalize input into runtime command context.
2. Resolve a focused world object through registered `RuntimeWorldObjectProvider`s.
3. Ask registered `RuntimeWorldObjectInteractionProvider`s to contribute object-scoped interactions.

Generic command resolution still exists, but it no longer owns object-specific affordances by default.

Expected usage:

- `RuntimeCommandResolver`
  - generic, profile-wide, non-object commands
  - keyboard movement
  - inventory commands
  - build mode commands targeting empty tiles or abstract state
- `RuntimeWorldObjectInteractionProvider`
  - actions attached to a concrete focused object
  - gather tree
  - rest at campfire
  - dismantle campfire

## Host Rules

The host must not hardcode gameplay semantics.

The host may:

- ask the session for the focused object descriptor
- ask the session for object interactions
- prefer `affordance: "primary"` for pointer primary actions
- render interaction buttons without knowing their gameplay meaning

The host must not:

- decide that certain structure types imply certain actions
- encode mod-specific action priority rules outside runtime contracts

## Consequences

Benefits:

- object behavior becomes composable and discoverable
- external mods can add object interactions without patching the host
- gameplay logic shifts further out of the host and into mods
- command resolvers regain a narrower, more maintainable responsibility

Tradeoffs:

- runtime assembly now owns one more registry
- interaction providers depend on descriptor shape stability
- some existing resolvers must be migrated into object interaction providers over time

## Implementation Notes

The initial migration target is the vertical slice that already depends on world objects:

- `core:gathering`
- `core:building`
- `core:survival`

Further work should continue moving object-bound pointer behaviors off raw command resolvers until
resolver usage is mostly limited to generic commands and empty-space interactions.
