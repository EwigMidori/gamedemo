import type { RuntimeWorldObjectInteractionProvider } from "@gamedemo/engine-core";
import { GatheringDomain } from "./gatheringDomain";

const resourceActions: RuntimeWorldObjectInteractionProvider = {
  id: "gathering:resource-actions",
  collect({ object, selectedSlot, session }) {
    if (object.kind !== "resource") return [];

    const target = GatheringDomain.getResourceById(session, object.id);
    if (!target || target.depleted) return [];

    const enabled = GatheringDomain.canGatherTarget(session, target);
    const yieldDescription = GatheringDomain.describeGatherYield(target.resourceId);
    return [{
      id: `gathering:gather:${target.id}`,
      label: `Gather ${target.resourceId} at ${target.x},${target.y}`,
      enabled,
      reasonDisabled: enabled ? undefined : "Move closer to the selected resource.",
      binding: "KeyG",
      actionId: "gathering:gather-nearest",
      sourceModId: "core:gathering",
      priority: 100,
      payload: { resourceNodeId: target.id },
      affordance: "context",
      targetObjectId: object.id,
      targetObjectKind: object.kind,
      targetObjectTypeId: object.typeId,
      targetObjectLabel: object.label,
      presentation: yieldDescription
    }, {
      id: `gathering:break:${target.id}`,
      label: `Break ${object.label}`,
      enabled,
      reasonDisabled: enabled ? undefined : "Move closer to break the selected resource.",
      binding: "HoldLMB",
      actionId: "gathering:break-resource",
      sourceModId: "core:gathering",
      priority: 120,
      payload: { resourceNodeId: target.id, selectedSlot },
      affordance: "secondary",
      targetObjectId: object.id,
      targetObjectKind: object.kind,
      targetObjectTypeId: object.typeId,
      targetObjectLabel: object.label,
      presentation: {
        summary: `Hold to break ${object.label.toLowerCase()}.`,
        detail: yieldDescription.detail,
        rewards: yieldDescription.rewards
      }
    }];
  }
};

const plantTileActions: RuntimeWorldObjectInteractionProvider = {
  id: "gathering:plant-tile-actions",
  collect(context) {
    if (context.object.kind !== "tile") {
      return [];
    }
    const check = GatheringDomain.canPlantSelectedItem(
      context.content,
      context.session,
      context.selectedSlot,
      context.object.x,
      context.object.y
    );
    if (context.selectedSlot === null || context.selectedSlot === undefined) {
      return [];
    }
    const entry = context.session.inventory[context.selectedSlot] ?? null;
    if (!entry?.itemId) {
      return [];
    }
    const item = context.content.items.find((candidate) => candidate.id === entry.itemId) ?? null;
    if (!item?.plantable) {
      return [];
    }
    return [{
      id: `gathering:plant:${context.object.x}:${context.object.y}:${context.selectedSlot}`,
      label: `Plant ${item.label}`,
      enabled: check.ok,
      reasonDisabled: check.reason,
      binding: "KeyB",
      actionId: "gathering:plant-selected-item",
      sourceModId: "core:gathering",
      priority: 70,
      payload: { x: context.object.x, y: context.object.y, selectedSlot: context.selectedSlot },
      affordance: "context",
      targetObjectId: context.object.id,
      targetObjectKind: context.object.kind,
      targetObjectTypeId: context.object.typeId,
      targetObjectLabel: context.object.label,
      presentation: {
        summary: `Plant ${item.label}.`,
        detail: check.ok
          ? `Will grow into ${item.plantable.growsIntoResourceId}.`
          : check.reason
      }
    }];
  }
};

export const GatheringInteractions = {
  resourceActions,
  plantTileActions
};
