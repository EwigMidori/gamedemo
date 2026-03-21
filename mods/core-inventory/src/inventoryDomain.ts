import type { ContentSnapshot, InventoryEntry, RuntimeInteractionPresentation } from "@gamedemo/engine-core";

class InventoryDomainModel {
  findItem(content: ContentSnapshot, itemId: string) {
    return content.items.find((entry) => entry.id === itemId) ?? null;
  }

  describeEntry(content: ContentSnapshot, entry: InventoryEntry): {
    label: string;
    summary: string;
    detail: string;
    presentation: RuntimeInteractionPresentation;
  } {
    const item = this.findItem(content, entry.itemId);
    const label = item?.label ?? entry.itemId;
    const tags = item?.tags.length ? item.tags.join(", ") : "untagged";
    return {
      label,
      summary: `${label} x${entry.quantity}`,
      detail: `Inventory item ${entry.itemId}. Tags: ${tags}.`,
      presentation: {
        summary: `Selected stack: ${label}.`,
        detail: `Quantity ${entry.quantity}. Item id: ${entry.itemId}.`,
        rewards: [{
          itemId: entry.itemId,
          quantity: entry.quantity
        }]
      }
    };
  }
}

export const InventoryDomain = {
  createModel(): InventoryDomainModel {
    return new InventoryDomainModel();
  }
};
