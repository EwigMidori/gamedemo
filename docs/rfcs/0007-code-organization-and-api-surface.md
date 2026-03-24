# RFC-0007: Code Organization And API Surface

- Status: Proposed
- Authors: Codex
- Created: 2026-03-20

## Summary

This RFC adds hard implementation constraints for the greenfield rewrite.

The goal is to stop the rewrite from drifting back into utility-heavy procedural TypeScript and oversized module files.

## New Constraints

### 1. Object-Oriented Or Rust-Like Module Design

New code should prefer one of these shapes:

- stateful object with methods
- class with explicit ownership of data and behavior
- module-level exported object that groups a coherent capability
- Rust-like composition where data structures and behavior live in the same bounded module

Avoid:

- loose bags of exported helper functions
- large index files that act as utility dumps
- behavior spread across unrelated files with weak ownership

### 2. No Exported Global Functions

Package public APIs must not export top-level functions such as:

- `export function foo() {}`
- `export async function bar() {}`

Instead, export:

- classes
- interfaces and types
- `const` objects with methods

Internal non-exported helper functions are allowed when they support a strongly owned module.

### 3. Source File Limit

No single source file may exceed 500 lines.

If a module approaches the limit:

- split by owned responsibility
- keep public API in a narrow entry file
- move private machinery into sibling modules

This is a hard constraint for all new code and for refactors of existing rewrite code.

## Required Package Style

### Runtime Packages

Packages such as `engine-runtime`, `mod-loader`, `engine-phaser`, `engine-content`, and `save-schema` should expose object-style APIs, for example:

```ts
export const RuntimeKernel = {
  assembleProfile() {},
  createProfile() {}
};
```

### Mods

Each mod should keep gameplay rules near the state it owns.

If a mod grows beyond a single small file, split it into:

- actions
- systems
- resolvers
- local domain helpers

Do not create generic cross-mod utility folders unless the abstraction is proven.

## Motivation

These constraints are intended to produce:

- clearer ownership boundaries
- easier code review
- easier future extraction into independent workspace packages
- lower risk of recreating monolithic service layers under new names

## Acceptance Criteria

This RFC is considered applied when:

- new public package APIs stop exporting top-level functions
- oversized rewrite files are split below 500 lines
- new modules follow bounded object-oriented or Rust-like ownership

