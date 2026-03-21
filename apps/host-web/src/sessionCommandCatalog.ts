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

  getSelectedTileMarker(input: RuntimeCommandInput): {
    strokeColor: number;
    fillColor: number;
    fillAlpha: number;
  } | null {
    const focusedObject = this.session.inspectWorldObject(input);
    if (!focusedObject) {
      return null;
    }

    if (focusedObject.kind === "tile") {
      const buildCommand = this.session
        .resolveWorldObjectInteractions(input)
        .find((command) => command.id === "building:place-campfire");
      if (buildCommand?.enabled) {
        return {
          strokeColor: 0x85d36b,
          fillColor: 0x85d36b,
          fillAlpha: 0.16
        };
      }
      return {
        strokeColor: 0xe18942,
        fillColor: 0xe18942,
        fillAlpha: 0.12
      };
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
