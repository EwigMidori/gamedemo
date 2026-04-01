import { RuntimePayload, type RuntimeAction } from "@gamedemo/engine-core";
import typia from "typia";
import { VanillaInventory } from "@gamedemo/vanilla-domain";
import { SurvivalDomain } from "./survivalDomain";

const validateOptionalSlotPayload = typia.createValidate<{
  slotIndex?: number;
}>();
const validateRestPayload = typia.createValidate<{
  structureId?: string;
}>();

const eatRation: RuntimeAction = {
  id: "survival:eat-ration",
  label: "Eat ration",
  execute({ state, content, command }) {
    const parsed = RuntimePayload.parse(command?.payload ?? {}, validateOptionalSlotPayload);
    if (!parsed.ok) {
      return { ok: false, message: RuntimePayload.failureMessage("survival:eat-ration") };
    }
    const slotIndex = parsed.data.slotIndex === undefined ? undefined : Math.floor(parsed.data.slotIndex);
    const selectedEntry = SurvivalDomain.getInventoryEntryAtSlot(state.inventory, slotIndex);
    const consumed = selectedEntry
      ? selectedEntry.itemId === "survival:ration" &&
        SurvivalDomain.consumeInventorySlot(state.inventory, slotIndex, 1)
      : SurvivalDomain.consumeItem(state.inventory, "survival:ration", 1);

    if (!consumed) {
      return {
        ok: false,
        message: selectedEntry && selectedEntry.itemId !== "survival:ration"
          ? "Selected slot does not contain a ration."
          : "No ration available."
      };
    }

    const inventory = new VanillaInventory(
      state.inventory,
      new Map(content.items.map((entry) => [entry.id, entry]))
    );
    inventory.normalizeSize(12);
    state.needs.hunger = Math.min(100, state.needs.hunger + 28);
    state.needs.health = Math.min(100, state.needs.health + 6);
    return {
      ok: true,
      message: "A ration restores hunger and steadies your health."
    };
  }
};

const eatFood: RuntimeAction = {
  id: "survival:eat-food",
  label: "Eat food",
  execute({ state, content, command }) {
    const parsed = RuntimePayload.parse(command?.payload ?? {}, validateOptionalSlotPayload);
    if (!parsed.ok) {
      return { ok: false, message: RuntimePayload.failureMessage("survival:eat-food") };
    }
    const slotIndex = parsed.data.slotIndex === undefined ? undefined : Math.floor(parsed.data.slotIndex);
    const selectedEntry = SurvivalDomain.getInventoryEntryAtSlot(state.inventory, slotIndex);
    const consumed = selectedEntry
      ? selectedEntry.itemId === "core:food" &&
        SurvivalDomain.consumeInventorySlot(state.inventory, slotIndex, 1)
      : SurvivalDomain.consumeItem(state.inventory, "core:food", 1);
    if (!consumed) {
      return {
        ok: false,
        message: selectedEntry && selectedEntry.itemId !== "core:food"
          ? "Selected slot does not contain food."
          : "No food available."
        };
    }
    const inventory = new VanillaInventory(
      state.inventory,
      new Map(content.items.map((entry) => [entry.id, entry]))
    );
    inventory.normalizeSize(12);
    state.needs.hunger = Math.min(100, state.needs.hunger + 12);
    return {
      ok: true,
      message: "Ate raw food (+hunger)."
    };
  }
};

const restAtCampfire: RuntimeAction = {
  id: "survival:rest-at-campfire",
  label: "Rest at campfire",
  execute({ state, command }) {
    const parsed = RuntimePayload.parse(command?.payload ?? {}, validateRestPayload);
    if (!parsed.ok) {
      return { ok: false, message: RuntimePayload.failureMessage("survival:rest-at-campfire") };
    }
    const structureId = parsed.data.structureId;
    const target = structureId
      ? SurvivalDomain.getStructureById(state, structureId)
      : SurvivalDomain.findNearestAdjacentCampfire(state);

    if (!target || target.structureId !== "core:campfire") {
      return {
        ok: false,
        message: "No reachable campfire to rest at."
      };
    }

    if (!SurvivalDomain.isAdjacentToPlayer(state, target.x, target.y)) {
      return {
        ok: false,
        message: "Move next to the campfire first."
      };
    }

    if (state.needs.hunger < 10) {
      return {
        ok: false,
        message: "Too hungry to rest safely. Eat first."
      };
    }

    if (state.needs.health >= 100 && state.needs.hunger >= 95) {
      return {
        ok: false,
        message: "You do not need to rest right now."
      };
    }

    state.needs.health = Math.min(100, state.needs.health + 14);
    state.needs.hunger = Math.max(0, state.needs.hunger - 6);
    state.timeSeconds += 8;
    SurvivalDomain.updateDay(state);
    return {
      ok: true,
      message: `Rested by the campfire at (${target.x}, ${target.y}).`
    };
  }
};

export const SurvivalActions = {
  eatFood,
  eatRation,
  restAtCampfire
};
