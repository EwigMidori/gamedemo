# RFC-0010 Interaction Presentation Metadata

## Status

Accepted

## Context

After object interaction providers were introduced, the host could render groups of actions without
knowing gameplay rules. However, richer UX still had a gap:

- recipe costs were hidden behind button labels or disabled reasons
- rewards were not exposed as structured data
- hosts would eventually be tempted to reverse-engineer gameplay semantics from command ids

That would recreate host-owned interpretation logic and make external mods harder to support.

## Decision

World object interactions may now carry structured presentation metadata.

The runtime contract includes:

- `summary`
- `detail`
- `costs`
- `rewards`

This data is descriptive, not authoritative. The authoritative checks still live in runtime action
logic and domain methods.

## Rules

- hosts may render interaction presentation metadata
- hosts must not infer gameplay legality from presentation data alone
- mods should provide presentation metadata when an interaction has material costs or outputs
- disabled reason text remains the first-class explanation of current unavailability

## Consequences

Benefits:

- recipe and station UX can improve without leaking gameplay logic into the host
- external mods can ship richer interaction cards immediately
- interaction surfaces become more inspectable and testable

Tradeoffs:

- mod authors must maintain presentation data alongside action logic
- some duplication between validation and display is unavoidable

## Initial Use

The first consumer is station-scoped ration crafting on campfires.
