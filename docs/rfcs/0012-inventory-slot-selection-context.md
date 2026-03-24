# RFC-0012 Inventory Slot Selection Context

## Status

Accepted

## Context

The runtime command input already carried `selectedSlot`, but the vertical slice did not actually
use it. Inventory consumption still behaved like a global implicit search.

That would become brittle as more items, tools, and equipment are introduced:

- the host could end up owning item selection logic
- commands like "use item" would be ambiguous
- mod interactions would not be able to rely on a shared inventory focus concept

## Decision

Inventory slot selection is now a first-class runtime input context.

For the current slice:

- the host may let players select an inventory slot
- slot selection is forwarded through `RuntimeCommandInput.selectedSlot`
- gameplay resolvers may tailor command labels, payloads, and availability from the selected slot
- action execution remains authoritative and must revalidate slot contents

## Rules

- the host may render and update slot selection, but may not implement item-use rules
- mods should treat slot selection as contextual input, not trusted authority
- actions that consume a selected slot must re-check item identity and quantity
- when no slot is selected, commands may fall back to generic inventory search if the design allows it

## Initial Use

The first consumer is `core:survival`:

- `Eat ration` can target the currently selected inventory slot
- the command presentation explains whether the selected slot is compatible

## Follow-Up

This context should later support:

- tools
- equipment
- quickbar bindings
- station input/output slot targeting
