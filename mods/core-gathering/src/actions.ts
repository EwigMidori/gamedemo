import type { RuntimeAction } from "@gamedemo/engine-core";
import { GatheringBreakDomain } from "./breakingDomain";
import { GatheringDomain } from "./gatheringDomain";

const gatherNearest: RuntimeAction = {
  id: "gathering:gather-nearest",
  label: "Gather nearest",
  execute({ state, content, command }) {
    const target =
      typeof command?.payload?.resourceNodeId === "string"
        ? GatheringDomain.getResourceById(state, command.payload.resourceNodeId)
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
    const selectedSlot = typeof command?.payload?.selectedSlot === "number"
      ? Math.floor(command.payload.selectedSlot)
      : null;
    const x = typeof command?.payload?.x === "number"
      ? Math.floor(command.payload.x)
      : state.player.x;
    const y = typeof command?.payload?.y === "number"
      ? Math.floor(command.payload.y)
      : state.player.y;
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
    const resourceNodeId = typeof command?.payload?.resourceNodeId === "string"
      ? command.payload.resourceNodeId
      : "";
    const selectedSlot = typeof command?.payload?.selectedSlot === "number"
      ? Math.floor(command.payload.selectedSlot)
      : null;
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
