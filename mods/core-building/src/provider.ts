import type { RuntimeWorldObjectProvider } from "@gamedemo/engine-core";
import { BuildingDomain } from "./buildingDomain";

const structureObjects: RuntimeWorldObjectProvider = {
  id: "building:structure-objects",
  inspect(context) {
    const target = context.focusedStructureId
      ? BuildingDomain.getStructureById(context.session, context.focusedStructureId)
      : null;
    if (!target) return null;

    if (target.structureId === "core:campfire") {
      return {
        id: target.id,
        kind: "structure",
        typeId: target.structureId,
        label: "Campfire",
        summary: "A basic field structure for resting and recovery.",
        x: target.x,
        y: target.y,
        sourceModId: "core:building"
      };
    }

    return {
      id: target.id,
      kind: "structure",
      typeId: target.structureId,
      label: target.structureId,
      summary: "A placed structure.",
      x: target.x,
      y: target.y,
      sourceModId: "core:building"
    };
  }
};

export const BuildingProviders = {
  structureObjects
};
