import type { RuntimeWorldObjectInteractionProvider } from "@gamedemo/engine-core";
import { BuildingDomain } from "./buildingDomain";

const structureActions: RuntimeWorldObjectInteractionProvider = {
  id: "building:structure-actions",
  collect(context) {
    if (context.object.kind !== "structure") {
      return [];
    }
    const model = BuildingDomain.createModel();
    const structure = model.getStructureById(context.session, context.object.id);
    if (!structure) {
      return [];
    }
    const structureDef = context.content.structures.find((entry) => entry.id === structure.structureId) ?? null;
    const interactions = [{
      id: `building:dismantle:${structure.id}`,
      label: `Dismantle ${structureDef?.label ?? "structure"}`,
      enabled: model.isAdjacentToPlayer(context.session, structure.x, structure.y),
      reasonDisabled: "Move next to the structure first.",
      binding: "KeyX",
      actionId: "building:dismantle-structure",
      sourceModId: "core:building",
      priority: 90,
      payload: { structureId: structure.id },
      affordance: "secondary",
      targetObjectId: context.object.id,
      targetObjectKind: context.object.kind,
      targetObjectTypeId: context.object.typeId,
      targetObjectLabel: context.object.label,
      presentation: {
        summary: `Dismantle ${structureDef?.label ?? "structure"}.`,
        detail: "Break the structure and reclaim its placeable item."
      }
    }];
    if (structureDef?.growableStages?.length) {
      interactions.unshift({
        id: `building:harvest:${structure.id}`,
        label: `Harvest ${structureDef.label}`,
        enabled: model.isAdjacentToPlayer(context.session, structure.x, structure.y) && (structure.growth ?? 0) >= 1,
        reasonDisabled:
          !model.isAdjacentToPlayer(context.session, structure.x, structure.y)
            ? "Move next to the crop first."
            : "The crop is not ready yet.",
        binding: "KeyG",
        actionId: "building:harvest-structure",
        sourceModId: "core:building",
        priority: 100,
        payload: { structureId: structure.id },
        affordance: "primary",
        targetObjectId: context.object.id,
        targetObjectKind: context.object.kind,
        targetObjectTypeId: context.object.typeId,
        targetObjectLabel: context.object.label,
        presentation: {
          summary: `Harvest ${structureDef.label}.`,
          detail: `Growth ${Math.floor((structure.growth ?? 0) * 100)}%.`,
          rewards: [{ itemId: "core:food", quantity: 6 }]
        }
      });
    }
    if (structureDef?.storageSlots) {
      interactions.unshift({
        id: `building:take:${structure.id}`,
        label: `Take from ${structureDef.label}`,
        enabled: model.isAdjacentToPlayer(context.session, structure.x, structure.y) &&
          model.canTakeFromStorage(context.content, context.session, structure),
        reasonDisabled:
          !model.isAdjacentToPlayer(context.session, structure.x, structure.y)
            ? "Move next to the chest first."
            : "Nothing usable to take.",
        binding: "KeyT",
        actionId: "building:take-from-storage",
        sourceModId: "core:building",
        priority: 101,
        payload: { structureId: structure.id },
        affordance: context.selectedSlot === null || context.selectedSlot === undefined ? "primary" : "context",
        targetObjectId: context.object.id,
        targetObjectKind: context.object.kind,
        targetObjectTypeId: context.object.typeId,
        targetObjectLabel: context.object.label,
        presentation: {
          summary: `Take an item from ${structureDef.label}.`,
          detail: "Withdraws one item from the first occupied storage slot."
        }
      });
      if (context.selectedSlot !== null && context.selectedSlot !== undefined) {
        interactions.unshift({
          id: `building:store:${structure.id}:${context.selectedSlot}`,
          label: `Store selected item`,
          enabled: model.isAdjacentToPlayer(context.session, structure.x, structure.y) &&
            model.canStoreSelectedItem(context.session, structure, context.selectedSlot),
          reasonDisabled:
            !model.isAdjacentToPlayer(context.session, structure.x, structure.y)
              ? "Move next to the chest first."
              : "Selected item cannot be stored.",
          binding: "KeyG",
          actionId: "building:store-selected-item",
          sourceModId: "core:building",
          priority: 102,
          payload: { structureId: structure.id, selectedSlot: context.selectedSlot },
          affordance: "primary",
          targetObjectId: context.object.id,
          targetObjectKind: context.object.kind,
          targetObjectTypeId: context.object.typeId,
          targetObjectLabel: context.object.label,
          presentation: {
            summary: `Store the selected stack inside ${structureDef.label}.`,
            detail: "Moves the selected stack into the chest."
          }
        });
      }
    }
    interactions.push({
      id: `building:break:${structure.id}`,
      label: `Break ${structureDef?.label ?? "structure"}`,
      enabled: model.isAdjacentToPlayer(context.session, structure.x, structure.y),
      reasonDisabled: "Move next to the structure first.",
      binding: "HoldLMB",
      actionId: "building:break-structure",
      sourceModId: "core:building",
      priority: 120,
      payload: { structureId: structure.id, selectedSlot: context.selectedSlot },
      affordance: "secondary",
      targetObjectId: context.object.id,
      targetObjectKind: context.object.kind,
      targetObjectTypeId: context.object.typeId,
      targetObjectLabel: context.object.label,
      presentation: {
        summary: `Hold to break ${structureDef?.label ?? "structure"}.`,
        detail: structureDef?.pickupItemId || structureDef?.placeableItemId
          ? `Drops ${structureDef.pickupItemId ?? structureDef.placeableItemId}.`
          : "Breaks the structure into nearby drops."
      }
    });
    return interactions;
  }
};

const buildSiteActions: RuntimeWorldObjectInteractionProvider = {
  id: "building:build-site-actions",
  collect(context) {
    if (context.object.kind !== "tile") {
      return [];
    }
    const model = BuildingDomain.createModel();
    const structure = model.selectedPlaceableStructure(
      context.content,
      context.session,
      context.selectedSlot
    );
    if (!structure) {
      return [];
    }
    const placement = model.canPlaceStructureAt(
      context.content,
      context.session,
      structure,
      context.object.x,
      context.object.y
    );
    return [{
      id: `building:place:${structure.id}:${context.object.x}:${context.object.y}`,
      label: `Place ${structure.label}`,
      enabled: placement.ok,
      reasonDisabled: placement.reason,
      binding: "KeyB",
      actionId: "building:place-selected-structure",
      sourceModId: "core:building",
      priority: 80,
      payload: { x: context.object.x, y: context.object.y, selectedSlot: context.selectedSlot },
      affordance: "context",
      targetObjectId: context.object.id,
      targetObjectKind: context.object.kind,
      targetObjectTypeId: context.object.typeId,
      targetObjectLabel: context.object.label,
      presentation: model.describeBuildSite(
        context.content,
        context.session,
        structure,
        context.object.x,
        context.object.y
      )
    }];
  }
};

export const BuildingInteractions = {
  structureActions,
  buildSiteActions
};
