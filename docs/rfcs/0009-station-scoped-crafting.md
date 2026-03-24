# RFC-0009 Station-Scoped Crafting

## Status

Accepted

## Context

The first playable rewrite included crafting as a generic runtime command. That was enough to
prove action execution, but it left crafting detached from the world model.

In a mod-composed game, recipes should usually come from stations, structures, devices, or other
world-facing capabilities. If recipes remain global buttons, the architecture drifts back toward a
monolithic menu-driven game loop even if the codebase is split into packages.

## Decision

The starter crafting loop is now station-scoped.

For the first vertical slice:

- `core:building` owns the campfire structure
- `core:crafting` attaches recipe interactions to campfires
- the ration recipe is exposed as a campfire context action

Crafting actions may still be surfaced through generic commands when useful for keyboard access,
but those commands must derive from the same station availability checks and payload model as the
object interaction.

## Rules

- recipes must not be implicitly available everywhere unless a design explicitly requires it
- crafting requirements must be validated inside the crafting mod, not in the host
- station identity should flow through command payloads when a recipe targets a concrete object
- mods may contribute additional station recipes without changing host code

## Consequences

Benefits:

- recipes become part of the world simulation instead of detached HUD buttons
- multiple mods can extend the same station with new recipes
- station progression can later evolve through capabilities instead of host conditionals

Tradeoffs:

- crafting mods now depend on object descriptors and structure identity conventions
- recipe UX requires better host grouping and labeling, which is handled through context actions

## Follow-Up

Future work should generalize this pattern for:

- workbenches
- furnaces
- shrines
- biome-specific field interactions

At that point, recipe discovery should be treated as a world capability graph rather than a flat
action list.
