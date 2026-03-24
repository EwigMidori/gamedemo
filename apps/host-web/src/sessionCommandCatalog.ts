import type {
  RuntimeCombinedInteraction,
  RuntimeCommandInput,
  RuntimeInventoryInteraction,
  RuntimeWorldObjectInteraction,
  ResolvedCommand
} from "@gamedemo/engine-core";
import type { RuntimeSession } from "@gamedemo/engine-runtime";

export interface CommandBuckets {
  combined: RuntimeCombinedInteraction[];
  item: RuntimeInventoryInteraction[];
  primary: RuntimeWorldObjectInteraction[];
  secondary: RuntimeWorldObjectInteraction[];
  context: RuntimeWorldObjectInteraction[];
  utility: ResolvedCommand[];
}

class SessionCommandCatalogModel {
  constructor(private readonly session: RuntimeSession) {}

  collectCommands(input: RuntimeCommandInput): ResolvedCommand[] {
    const combinedCommands = this.session.resolveCombinedInteractions(input);
    const itemCommands = this.session.resolveSelectedInventoryInteractions(input);
    const objectCommands = this.session.resolveWorldObjectInteractions(input);
    const generalCommands = this.session.resolveCommands(input);
    const scopedIds = new Set([
      ...combinedCommands.map((command) => command.id),
      ...itemCommands.map((command) => command.id),
      ...objectCommands.map((command) => command.id)
    ]);
    return [
      ...combinedCommands,
      ...itemCommands,
      ...objectCommands,
      ...generalCommands.filter((command) => !scopedIds.has(command.id))
    ];
  }

  bucketCommands(input: RuntimeCommandInput): CommandBuckets {
    const combinedCommands = this.session.resolveCombinedInteractions(input);
    const itemCommands = this.session.resolveSelectedInventoryInteractions(input);
    const objectCommands = this.session.resolveWorldObjectInteractions(input);
    const generalCommands = this.session.resolveCommands(input);
    const scopedIds = new Set([
      ...combinedCommands.map((command) => command.id),
      ...itemCommands.map((command) => command.id),
      ...objectCommands.map((command) => command.id)
    ]);

    return {
      combined: combinedCommands,
      item: itemCommands,
      primary: objectCommands.filter((command) => command.affordance === "primary"),
      secondary: objectCommands.filter((command) => command.affordance === "secondary"),
      context: objectCommands.filter((command) => command.affordance === "context"),
      utility: generalCommands.filter((command) => !scopedIds.has(command.id))
    };
  }

  findPointerPrimaryCommand(input: RuntimeCommandInput): ResolvedCommand | null {
    const combinedCommands = this.session.resolveCombinedInteractions(input);
    const objectCommands = this.session.resolveWorldObjectInteractions(input);
    return [
      ...combinedCommands.filter((command) => command.affordance === "primary"),
      ...combinedCommands.filter((command) => command.affordance !== "primary"),
      ...objectCommands.filter((command) => command.affordance === "primary"),
      ...objectCommands.filter((command) => command.affordance !== "primary"),
      ...this.session.resolveCommands(input)
    ].find((command) => command.enabled) ?? null;
  }

  findPointerBlockedCommand(input: RuntimeCommandInput): ResolvedCommand | null {
    const combinedCommands = this.session.resolveCombinedInteractions(input);
    const objectCommands = this.session.resolveWorldObjectInteractions(input);
    return [
      ...combinedCommands.filter((command) => command.affordance === "primary"),
      ...combinedCommands,
      ...objectCommands.filter((command) => command.affordance === "primary"),
      ...objectCommands,
      ...this.session.resolveCommands(input)
    ][0] ?? null;
  }

  findPointerHoldCommand(input: RuntimeCommandInput): ResolvedCommand | null {
    const combinedCommands = this.session.resolveCombinedInteractions(input);
    const objectCommands = this.session.resolveWorldObjectInteractions(input);
    return [
      ...objectCommands.filter((command) => command.binding === "HoldLMB"),
      ...combinedCommands.filter((command) => command.binding === "HoldLMB")
    ].find((command) => command.enabled) ?? null;
  }

  findPointerBlockedHoldCommand(input: RuntimeCommandInput): ResolvedCommand | null {
    const combinedCommands = this.session.resolveCombinedInteractions(input);
    const objectCommands = this.session.resolveWorldObjectInteractions(input);
    return [
      ...objectCommands.filter((command) => command.binding === "HoldLMB"),
      ...combinedCommands.filter((command) => command.binding === "HoldLMB")
    ][0] ?? null;
  }

  getSelectedTileMarker(input: RuntimeCommandInput): {
    strokeColor: number;
    fillColor: number;
    fillAlpha: number;
  } | null {
    const focusedObject = this.session.inspectWorldObject(input);
    if (!focusedObject) {
      return null;
    }
    const objectCommands = this.session.resolveWorldObjectInteractions(input);

    if (focusedObject.kind === "tile") {
      const buildCommand = objectCommands.find(
        (command) => command.actionId === "building:place-selected-structure"
      );
      const plantCommand = objectCommands.find(
        (command) => command.actionId === "gathering:plant-selected-item"
      );
      if (buildCommand?.enabled || plantCommand?.enabled) {
        return {
          strokeColor: buildCommand?.enabled ? 0x85d36b : 0xf3c96b,
          fillColor: buildCommand?.enabled ? 0x85d36b : 0xf3c96b,
          fillAlpha: 0.16
        };
      }
      return {
        strokeColor: 0xe18942,
        fillColor: 0xe18942,
        fillAlpha: 0.12
      };
    }

    if (focusedObject.kind === "resource") {
      return {
        strokeColor: 0xe39b63,
        fillColor: 0x2d1a12,
        fillAlpha: 0.12
      };
    }

    if (focusedObject.kind === "structure") {
      const hasStore = objectCommands.some((command) => command.actionId === "building:store-selected-item");
      const hasTake = objectCommands.some((command) => command.actionId === "building:take-from-storage");
      const hasCraft = objectCommands.some((command) => command.actionId === "crafting:craft-recipe");
      const hasRest = objectCommands.some((command) => command.actionId === "survival:rest-at-campfire");
      if (hasStore || hasTake) {
        return {
          strokeColor: 0x7cc9d8,
          fillColor: 0x14222a,
          fillAlpha: 0.1
        };
      }
      if (hasCraft || hasRest) {
        return {
          strokeColor: 0xf3c96b,
          fillColor: 0x2a2315,
          fillAlpha: 0.09
        };
      }
    }

    return {
      strokeColor: 0xf3ead8,
      fillColor: 0xffffff,
      fillAlpha: 0.08
    };
  }
}

export const SessionCommandCatalog = {
  create(session: RuntimeSession): SessionCommandCatalogModel {
    return new SessionCommandCatalogModel(session);
  }
};
