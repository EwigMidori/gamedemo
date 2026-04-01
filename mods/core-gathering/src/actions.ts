import { RuntimePayload, type RuntimeAction } from "@gamedemo/engine-core";
import typia from "typia";
import { GatheringBreakDomain } from "./breakingDomain";
import { GatheringDomain } from "./gatheringDomain";

const validateGatherNearestPayload = typia.createValidate<{
  resourceNodeId?: string;
}>();
const validatePlantSelectedItemPayload = typia.createValidate<{
  selectedSlot?: number | null;
  x?: number;
  y?: number;
}>();
const validateBreakResourcePayload = typia.createValidate<{
  resourceNodeId: string;
  selectedSlot?: number | null;
}>();

const gatherNearest: RuntimeAction = {
  id: "gathering:gather-nearest",
  label: "Gather nearest",
  execute({ state, content, command }) {
    const parsed = RuntimePayload.parse(command?.payload ?? {}, validateGatherNearestPayload);
    if (!parsed.ok) {
      return { ok: false, message: RuntimePayload.failureMessage("gathering:gather-nearest") };
    }
    const { resourceNodeId } = parsed.data;
    const target = resourceNodeId
      ? GatheringDomain.getResourceById(state, resourceNodeId)
      : GatheringDomain.nearestAvailableResource(state);
    if (!target) {
      return {
        ok: false,
        message: "No gatherable resource adjacent to the player."
      };
    }
    if (!GatheringDomain.canGatherTarget(state, target)) {
      return {
        ok: false,
        message: "Target resource is out of reach."
      };
    }
    const definition = GatheringDomain.getResourceDef(content, target.resourceId);
    if (!definition) {
      return {
        ok: false,
        message: `Unknown resource ${target.resourceId}.`
      };
    }
    if (target.resourceId === "resource:tree") {
      GatheringDomain.spawnDrops(state, target.x, target.y, [{ itemId: "core:wood", quantity: 3 }]);
      if (definition.bonusDrop && Math.random() < definition.bonusDrop.chance) {
        GatheringDomain.spawnDrops(state, target.x, target.y, [{
          itemId: definition.bonusDrop.itemId,
          quantity: definition.bonusDrop.quantity
        }]);
      }
      target.depleted = true;
      target.respawnAt = state.timeSeconds + (definition.respawnSeconds ?? 120);
      return { ok: true, message: "Chopped wood." };
    }

    if (target.resourceId === "resource:berry") {
      GatheringDomain.spawnDrops(state, target.x, target.y, [{ itemId: "core:food", quantity: 2 }]);
      target.depleted = true;
      target.respawnAt = state.timeSeconds + (definition.respawnSeconds ?? 45);
      return { ok: true, message: "Picked berries (+food)." };
    }

    target.hitsLeft = (target.hitsLeft ?? definition.maxHits ?? 3) - 1;
    if ((target.hitsLeft ?? 0) <= 0) {
      target.depleted = true;
    }
    GatheringDomain.spawnDrops(state, target.x, target.y, [{ itemId: "core:stone", quantity: 2 }]);
    return { ok: true, message: "Mined stone." };
  }
};

const plantSelectedItem: RuntimeAction = {
  id: "gathering:plant-selected-item",
  label: "Plant selected item",
  execute({ state, content, command }) {
    const parsed = RuntimePayload.parse(command?.payload ?? {}, validatePlantSelectedItemPayload);
    if (!parsed.ok) {
      return { ok: false, message: RuntimePayload.failureMessage("gathering:plant-selected-item") };
    }
    const selectedSlot = parsed.data.selectedSlot === undefined || parsed.data.selectedSlot === null
      ? null
      : Math.floor(parsed.data.selectedSlot);
    const x = parsed.data.x === undefined ? state.player.x : Math.floor(parsed.data.x);
    const y = parsed.data.y === undefined ? state.player.y : Math.floor(parsed.data.y);
    const message = GatheringDomain.plantSelectedItem(content, state, selectedSlot, x, y);
    return {
      ok: !message.toLowerCase().startsWith("cannot") &&
        !message.includes("Select") &&
        !message.includes("not plantable") &&
        !message.includes("occupied") &&
        !message.includes("Clear"),
      message
    };
  }
};

const breakResource: RuntimeAction = {
  id: "gathering:break-resource",
  label: "Break resource",
  execute({ state, content, command }) {
    const parsed = RuntimePayload.parse(command?.payload, validateBreakResourcePayload);
    if (!parsed.ok) {
      return { ok: false, message: RuntimePayload.failureMessage("gathering:break-resource") };
    }
    const resourceNodeId = parsed.data.resourceNodeId;
    const selectedSlot = parsed.data.selectedSlot === undefined || parsed.data.selectedSlot === null
      ? null
      : Math.floor(parsed.data.selectedSlot);
    return GatheringBreakDomain.createModel().breakResource(
      content,
      state,
      resourceNodeId,
      selectedSlot
    );
  }
};

export const GatheringActions = {
  gatherNearest,
  plantSelectedItem,
  breakResource
};
