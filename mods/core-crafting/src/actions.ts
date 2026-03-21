import type { RuntimeAction, RuntimeActionResult } from "@gamedemo/engine-core";
import { CraftingDomain } from "./craftingDomain";

const craftRation: RuntimeAction = {
  id: "crafting:craft-ration",
  label: "Craft ration at campfire",
  execute({ state, command }): RuntimeActionResult {
    const structureId = typeof command?.payload?.structureId === "string"
      ? command.payload.structureId
      : undefined;
    const slotIndex = typeof command?.payload?.slotIndex === "number"
      ? Math.floor(command.payload.slotIndex)
      : undefined;
    const craftingCheck = CraftingDomain.canCraftRationAtCampfire(state, structureId);
    if (!craftingCheck.ok) {
      return {
        ok: false,
        message: craftingCheck.reason ?? "Cannot craft a ration here."
      };
    }

    const selectedEntry = CraftingDomain.getInventoryEntryAtSlot(state, slotIndex);
    const consumed = selectedEntry
      ? selectedEntry.itemId === "core:wood" &&
        CraftingDomain.consumeInventorySlot(state, slotIndex, 1)
      : CraftingDomain.consumeItem(state, "core:wood", 1);
    if (!consumed) {
      return {
        ok: false,
        message: selectedEntry && selectedEntry.itemId !== "core:wood"
          ? "Selected slot does not contain wood."
          : "Need 1 wood to craft a ration pack."
      };
    }

    CraftingDomain.addItem(state, "survival:ration", 1);
    return {
      ok: true,
      message: `Crafted 1 survival ration at ${craftingCheck.station?.x},${craftingCheck.station?.y}.`
    };
  }
};

export const CraftingActions = {
  craftRation
};
