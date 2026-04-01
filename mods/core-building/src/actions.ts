import { RuntimePayload, type RuntimeAction, type RuntimeActionResult } from "@gamedemo/engine-core";
import typia from "typia";
import { PlayerDomain } from "@gamedemo/mod-core-player";
import { BuildingBreakDomain } from "./breakingDomain";
import { BuildingDomain } from "./buildingDomain";

const validatePlaceSelectedStructurePayload = typia.createValidate<{
  selectedSlot?: number | null;
  x?: number;
  y?: number;
}>();
const validateStructureIdPayload = typia.createValidate<{
  structureId: string;
}>();
const validateStoreSelectedItemPayload = typia.createValidate<{
  structureId: string;
  selectedSlot?: number | null;
}>();
const validateBreakStructurePayload = typia.createValidate<{
  structureId: string;
  selectedSlot?: number | null;
}>();

const placeSelectedStructure: RuntimeAction = {
  id: "building:place-selected-structure",
  label: "Place selected structure",
  execute({ state, content, command }): RuntimeActionResult {
    const model = BuildingDomain.createModel();
    const parsed = RuntimePayload.parse(command?.payload ?? {}, validatePlaceSelectedStructurePayload);
    if (!parsed.ok) {
      return { ok: false, message: RuntimePayload.failureMessage("building:place-selected-structure") };
    }
    const selectedSlot = parsed.data.selectedSlot === undefined || parsed.data.selectedSlot === null
      ? null
      : Math.floor(parsed.data.selectedSlot);
    const structure = model.selectedPlaceableStructure(content, state, selectedSlot);
    if (!structure) {
      return { ok: false, message: "Select a placeable item first." };
    }
    const playerTile = PlayerDomain.currentTile(state.player);
    const targetX = parsed.data.x === undefined ? playerTile.x + 1 : Math.floor(parsed.data.x);
    const targetY = parsed.data.y === undefined ? playerTile.y : Math.floor(parsed.data.y);
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
    const parsed = RuntimePayload.parse(command?.payload, validateStructureIdPayload);
    if (!parsed.ok) {
      return { ok: false, message: RuntimePayload.failureMessage("building:dismantle-structure") };
    }
    const target = model.getStructureById(state, parsed.data.structureId);
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
    const parsed = RuntimePayload.parse(command?.payload, validateStructureIdPayload);
    if (!parsed.ok) {
      return { ok: false, message: RuntimePayload.failureMessage("building:harvest-structure") };
    }
    const target = model.getStructureById(state, parsed.data.structureId);
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
    const parsed = RuntimePayload.parse(command?.payload, validateStoreSelectedItemPayload);
    if (!parsed.ok) {
      return { ok: false, message: RuntimePayload.failureMessage("building:store-selected-item") };
    }
    const structure = model.getStructureById(state, parsed.data.structureId);
    const selectedSlot = parsed.data.selectedSlot === undefined || parsed.data.selectedSlot === null
      ? null
      : Math.floor(parsed.data.selectedSlot);
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
    const parsed = RuntimePayload.parse(command?.payload, validateStructureIdPayload);
    if (!parsed.ok) {
      return { ok: false, message: RuntimePayload.failureMessage("building:take-from-storage") };
    }
    const structure = model.getStructureById(state, parsed.data.structureId);
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
    const parsed = RuntimePayload.parse(command?.payload, validateBreakStructurePayload);
    if (!parsed.ok) {
      return { ok: false, message: RuntimePayload.failureMessage("building:break-structure") };
    }
    const selectedSlot = parsed.data.selectedSlot === undefined || parsed.data.selectedSlot === null
      ? null
      : Math.floor(parsed.data.selectedSlot);
    return BuildingBreakDomain.createModel().breakStructure(
      content,
      state,
      parsed.data.structureId,
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
