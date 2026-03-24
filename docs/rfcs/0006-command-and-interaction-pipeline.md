# RFC-0006: Command And Interaction Pipeline

- Status: Proposed
- Authors: Codex
- Created: 2026-03-20

## Summary

This RFC defines how player input becomes runtime behavior.

The current rewrite has a temporary shortcut where host UI triggers actions by action id. That shortcut is acceptable only as a bootstrap mechanism. It is not the target architecture.

## Problem

Without a formal command pipeline, the project will drift into:

- host-owned gameplay wiring
- duplicated input logic between UI and scene code
- direct action calls with no discoverability or enable/disable reasoning
- weak separation between input, affordance, and execution

## Decision

The runtime will use a four-stage interaction model:

1. raw input
2. intent context
3. resolved commands
4. command execution into actions

## Stage Definitions

### Raw Input

Examples:

- pointer moved to tile
- left mouse pressed
- right mouse pressed
- key pressed
- UI button clicked

Raw input is host/platform data only.

### Intent Context

The host converts raw input into a context payload:

- player position
- pointer tile
- selected inventory slot
- focused structure or resource
- active UI state

This context may reference runtime state, but it does not mutate it.

### Resolved Commands

Mods contribute command resolvers that examine the context and return available commands.

Each resolved command must include:

- `id`
- `label`
- `source mod`
- `input binding` or UI trigger
- `enabled`
- optional disabled reason
- optional action payload

### Command Execution

A selected resolved command is turned into a runtime action or action sequence.

Host code must not implement command effects directly.

## Required Runtime Interfaces

The runtime will need explicit command contracts, for example:

```ts
interface CommandContext {
  session: RuntimeSessionState;
  pointerTile?: { x: number; y: number } | null;
  selectedSlot?: number | null;
  trigger: "pointer" | "keyboard" | "ui";
}

interface ResolvedCommand {
  id: string;
  label: string;
  enabled: boolean;
  reasonDisabled?: string;
  binding?: string;
  actionId: string;
}
```

The exact naming may change, but the structure must exist.

## Ownership Rules

### Host owns

- collecting raw input
- building the command context
- presenting resolved commands
- sending selected commands to runtime

### Runtime/mods own

- determining what commands are available
- validating whether commands are allowed
- mapping commands to action execution
- returning execution results

## UI Rules

UI buttons should not directly call gameplay action ids once the command pipeline exists.

Instead:

- UI asks runtime for available commands in the current context
- UI renders those commands
- UI dispatches selected resolved commands

This ensures UI and world input stay on the same gameplay path.

## Phaser Rules

Phaser scene code must not contain gameplay rules like:

- whether a tile can be gathered
- whether a structure can be placed
- which command should be primary

It may collect pointer state and submit a context to runtime.

## Initial Command Categories

The first playable slice should support at least:

- move
- gather
- craft
- place structure
- save/load UI commands where relevant

## Transitional Exception

The current direct action buttons may remain temporarily while this pipeline is being introduced, but they must be removed once command resolvers exist for the same interactions.

## Acceptance Criteria

This RFC is implemented when:

- runtime exposes command resolution APIs
- at least movement, gather, build, and craft flow through resolved commands
- host UI no longer hardcodes direct gameplay action ids for those interactions
- disabled reasons can be displayed to the player

## Follow-Up

After this RFC lands, external mods will have a stable extension point for contributing gameplay interactions without patching host code.
