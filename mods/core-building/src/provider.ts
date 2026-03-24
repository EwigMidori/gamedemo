import type { RuntimeWorldObjectProvider } from "@gamedemo/engine-core";
import { BuildingDomain } from "./buildingDomain";

const structureObjects: RuntimeWorldObjectProvider = {
  id: "building:structure-objects",
  inspect(context) {
    const model = BuildingDomain.createModel();
    const target = context.focusedStructureId
      ? model.getStructureById(context.session, context.focusedStructureId)
      : null;
    if (!target) {
      return null;
    }
    const structure = context.content.structures.find((entry) => entry.id === target.structureId) ?? null;
    return {
      id: target.id,
      kind: "structure",
      typeId: target.structureId,
      label: structure?.label ?? target.structureId,
      summary: structure?.craftStationId
        ? `A ${structure.craftStationId} craft station.`
        : structure?.storageSlots
          ? `Storage ${target.inventory?.filter((entry) => entry.itemId && entry.quantity > 0).length ?? 0}/${structure.storageSlots}.`
          : structure?.growableStages?.length
            ? `Growth ${Math.floor((target.growth ?? 0) * 100)}%.`
          : "A placed structure.",
      x: target.x,
      y: target.y,
      sourceModId: "core:building"
    };
  }
};

export const BuildingProviders = {
  structureObjects
};
