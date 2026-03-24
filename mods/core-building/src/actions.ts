import type { RuntimeAction, RuntimeActionResult } from "@gamedemo/engine-core";
import { PlayerDomain } from "@gamedemo/mod-core-player";
import { BuildingBreakDomain } from "./breakingDomain";
import { BuildingDomain } from "./buildingDomain";

const placeSelectedStructure: RuntimeAction = {
  id: "building:place-selected-structure",
  label: "Place selected structure",
  execute({ state, content, command }): RuntimeActionResult {
    const model = BuildingDomain.createModel();
    const selectedSlot = typeof command?.payload?.selectedSlot === "number"
      ? Math.floor(command.payload.selectedSlot)
      : null;
    const structure = model.selectedPlaceableStructure(content, state, selectedSlot);
    if (!structure) {
      return { ok: false, message: "Select a placeable item first." };
    }
    const playerTile = PlayerDomain.currentTile(state.player);
    const targetX = typeof command?.payload?.x === "number"
      ? Math.floor(command.payload.x)
      : playerTile.x + 1;
    const targetY = typeof command?.payload?.y === "number"
      ? Math.floor(command.payload.y)
      : playerTile.y;
    const placement = model.canPlaceStructureAt(content, state, structure, targetX, targetY);
    if (!placement.ok) {
      return { ok: false, message: placement.reason ?? "Cannot place the structure there." };
    }
    model.placeStructure(content, state, structure, targetX, targetY);
    return { ok: true, message: `Placed ${structure.label} at (${targetX}, ${targetY}).` };
  }
};

const dismantleStructure: RuntimeAction = {
  id: "building:dismantle-structure",
  label: "Dismantle structure",
  execute({ state, content, command }): RuntimeActionResult {
    const model = BuildingDomain.createModel();
    const target = typeof command?.payload?.structureId === "string"
      ? model.getStructureById(state, command.payload.structureId)
      : null;
    if (!target) {
      return { ok: false, message: "No structure selected to dismantle." };
    }
    if (!model.isAdjacentToPlayer(state, target.x, target.y)) {
      return { ok: false, message: "Move next to the structure first." };
    }
    model.dismantleStructure(content, state, target);
    return { ok: true, message: `Dismantled structure at (${target.x}, ${target.y}).` };
  }
};

const harvestStructure: RuntimeAction = {
  id: "building:harvest-structure",
  label: "Harvest structure",
  execute({ state, content, command }): RuntimeActionResult {
    const model = BuildingDomain.createModel();
    const target = typeof command?.payload?.structureId === "string"
      ? model.getStructureById(state, command.payload.structureId)
      : null;
    if (!target) {
      return { ok: false, message: "No harvestable structure selected." };
    }
    if (!model.isAdjacentToPlayer(state, target.x, target.y)) {
      return { ok: false, message: "Move next to the crop first." };
    }
    return { ok: true, message: model.harvestStructure(content, state, target) };
  }
};

const storeSelectedItem: RuntimeAction = {
  id: "building:store-selected-item",
  label: "Store selected item",
  execute({ state, command }): RuntimeActionResult {
    const model = BuildingDomain.createModel();
    const structure = typeof command?.payload?.structureId === "string"
      ? model.getStructureById(state, command.payload.structureId)
      : null;
    const selectedSlot = typeof command?.payload?.selectedSlot === "number"
      ? Math.floor(command.payload.selectedSlot)
      : null;
    if (!structure) {
      return { ok: false, message: "No chest selected." };
    }
    if (!model.isAdjacentToPlayer(state, structure.x, structure.y)) {
      return { ok: false, message: "Move next to the chest first." };
    }
    return { ok: true, message: model.storeSelectedItem(state, structure, selectedSlot) };
  }
};

const takeFromStorage: RuntimeAction = {
  id: "building:take-from-storage",
  label: "Take from storage",
  execute({ state, content, command }): RuntimeActionResult {
    const model = BuildingDomain.createModel();
    const structure = typeof command?.payload?.structureId === "string"
      ? model.getStructureById(state, command.payload.structureId)
      : null;
    if (!structure) {
      return { ok: false, message: "No chest selected." };
    }
    if (!model.isAdjacentToPlayer(state, structure.x, structure.y)) {
      return { ok: false, message: "Move next to the chest first." };
    }
    return { ok: true, message: model.takeFromStorage(content, state, structure) };
  }
};

const breakStructure: RuntimeAction = {
  id: "building:break-structure",
  label: "Break structure",
  execute({ state, content, command }): RuntimeActionResult {
    const structureId = typeof command?.payload?.structureId === "string"
      ? command.payload.structureId
      : "";
    const selectedSlot = typeof command?.payload?.selectedSlot === "number"
      ? Math.floor(command.payload.selectedSlot)
      : null;
    return BuildingBreakDomain.createModel().breakStructure(
      content,
      state,
      structureId,
      selectedSlot
    );
  }
};

export const BuildingActions = {
  placeSelectedStructure,
  dismantleStructure,
  harvestStructure,
  storeSelectedItem,
  takeFromStorage,
  breakStructure
};
