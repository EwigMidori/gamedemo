import type { RuntimeAction, RuntimeActionResult } from "@gamedemo/engine-core";
import { BuildingDomain } from "./buildingDomain";

const placeCampfire: RuntimeAction = {
  id: "building:place-campfire",
  label: "Place campfire",
  execute({ state, command }): RuntimeActionResult {
    if (
      BuildingDomain.getItemCount(state, "core:wood") < 2 ||
      BuildingDomain.getItemCount(state, "core:stone") < 2
    ) {
      return { ok: false, message: "Need 2 wood and 2 stone to place a campfire." };
    }

    const index = state.placedStructures.length;
    const targetX = typeof command?.payload?.x === "number"
      ? Math.floor(command.payload.x)
      : 4 + (index % 4) * 3;
    const targetY = typeof command?.payload?.y === "number"
      ? Math.floor(command.payload.y)
      : 4 + Math.floor(index / 4) * 2;
    const placement = BuildingDomain.canPlaceCampfireAt(state, targetX, targetY);

    if (!placement.ok) {
      return { ok: false, message: placement.reason ?? "Cannot place a campfire there." };
    }

    BuildingDomain.consumeItem(state, "core:wood", 2);
    BuildingDomain.consumeItem(state, "core:stone", 2);
    state.placedStructures.push({
      id: `campfire-${index + 1}`,
      structureId: "core:campfire",
      x: targetX,
      y: targetY
    });
    return { ok: true, message: `Placed a campfire at (${targetX}, ${targetY}).` };
  }
};

const dismantleCampfire: RuntimeAction = {
  id: "building:dismantle-campfire",
  label: "Dismantle campfire",
  execute({ state, command }): RuntimeActionResult {
    const target = typeof command?.payload?.structureId === "string"
      ? BuildingDomain.getStructureById(state, command.payload.structureId)
      : null;

    if (!target || target.structureId !== "core:campfire") {
      return { ok: false, message: "No campfire selected to dismantle." };
    }
    if (!BuildingDomain.isAdjacentToPlayer(state, target.x, target.y)) {
      return { ok: false, message: "Move next to the campfire first." };
    }

    state.placedStructures = state.placedStructures.filter((entry) => entry.id !== target.id);
    BuildingDomain.addItem(state, "core:wood", 1);
    BuildingDomain.addItem(state, "core:stone", 1);
    return { ok: true, message: `Dismantled campfire at (${target.x}, ${target.y}).` };
  }
};

export const BuildingActions = {
  placeCampfire,
  dismantleCampfire
};
