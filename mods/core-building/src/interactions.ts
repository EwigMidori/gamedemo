import type { RuntimeWorldObjectInteractionProvider } from "@gamedemo/engine-core";
import { BuildingDomain } from "./buildingDomain";

const structureActions: RuntimeWorldObjectInteractionProvider = {
  id: "building:structure-actions",
  collect({ object, session }) {
    if (object.kind !== "structure" || object.typeId !== "core:campfire") {
      return [];
    }

    const structure = BuildingDomain.getStructureById(session, object.id);
    if (!structure) return [];
    const dismantleDescription = BuildingDomain.describeCampfireDismantle();

    return [{
      id: "building:dismantle-campfire",
      label: `Dismantle campfire ${structure.x},${structure.y}`,
      enabled: BuildingDomain.isAdjacentToPlayer(session, structure.x, structure.y),
      reasonDisabled: "Move next to the campfire first.",
      binding: "KeyX",
      actionId: "building:dismantle-campfire",
      sourceModId: "core:building",
      priority: 90,
      payload: { structureId: structure.id },
      affordance: "secondary",
      targetObjectId: object.id,
      targetObjectKind: object.kind,
      targetObjectTypeId: object.typeId,
      targetObjectLabel: object.label,
      presentation: dismantleDescription
    }];
  }
};

const buildSiteActions: RuntimeWorldObjectInteractionProvider = {
  id: "building:build-site-actions",
  collect({ object, session }) {
    if (object.kind !== "tile") {
      return [];
    }

    const placement = BuildingDomain.canPlaceCampfireAt(session, object.x, object.y);
    const hasWood = BuildingDomain.getItemCount(session, "core:wood") >= 2;
    const hasStone = BuildingDomain.getItemCount(session, "core:stone") >= 2;
    const enabled = placement.ok && hasWood && hasStone;
    const siteDescription = BuildingDomain.describeBuildSite(session, object.x, object.y);

    return [{
      id: "building:place-campfire",
      label: `Place campfire at ${object.x},${object.y}`,
      enabled,
      reasonDisabled: enabled
        ? undefined
        : !hasWood || !hasStone
          ? "Need 2 wood and 2 stone."
          : placement.reason ?? "Cannot place a campfire there.",
      binding: "KeyB",
      actionId: "building:place-campfire",
      sourceModId: "core:building",
      priority: 80,
      payload: { x: object.x, y: object.y },
      affordance: "context",
      targetObjectId: object.id,
      targetObjectKind: object.kind,
      targetObjectTypeId: object.typeId,
      targetObjectLabel: object.label,
      presentation: siteDescription
    }];
  }
};

export const BuildingInteractions = {
  structureActions,
  buildSiteActions
};
