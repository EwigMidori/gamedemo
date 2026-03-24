import type { InventoryEntry, ItemDef } from "@gamedemo/engine-core";

export class VanillaInventory {
  constructor(
    private readonly inventory: InventoryEntry[],
    private readonly itemIndex: Map<string, ItemDef>
  ) {}

  count(itemId: string): number {
    return this.inventory
      .filter((entry) => entry.itemId === itemId)
      .reduce((total, entry) => total + entry.quantity, 0);
  }

  canAdd(itemId: string, quantity: number): boolean {
    return this.addTo(this.cloneEntries(), itemId, quantity) === quantity;
  }

  add(itemId: string, quantity: number): number {
    return this.addTo(this.inventory, itemId, quantity);
  }

  remove(itemId: string, quantity: number): boolean {
    if (this.count(itemId) < quantity) {
      return false;
    }
    const slotCount = this.inventory.length;
    let remaining = quantity;
    for (const entry of this.inventory) {
      if (entry.itemId !== itemId) {
        continue;
      }
      const taken = Math.min(entry.quantity, remaining);
      entry.quantity -= taken;
      remaining -= taken;
    }
    this.compact(slotCount);
    return remaining === 0;
  }

  firstSlot(itemId: string): number | null {
    const index = this.inventory.findIndex((entry) => entry.itemId === itemId && entry.quantity > 0);
    return index >= 0 ? index : null;
  }

  normalizeSize(size: number): void {
    while (this.inventory.length < size) {
      this.inventory.push({ itemId: "", quantity: 0 });
    }
    if (this.inventory.length > size) {
      this.inventory.length = size;
    }
    this.compact(size);
  }

  private addTo(entries: InventoryEntry[], itemId: string, quantity: number): number {
    const item = this.itemIndex.get(itemId);
    if (!item || quantity <= 0) {
      return 0;
    }
    let remaining = quantity;
    for (const entry of entries) {
      if (entry.itemId !== itemId || entry.quantity >= item.stackSize) {
        continue;
      }
      const moved = Math.min(item.stackSize - entry.quantity, remaining);
      entry.quantity += moved;
      remaining -= moved;
      if (remaining === 0) {
        return quantity;
      }
    }
    for (const entry of entries) {
      if (entry.itemId && entry.quantity > 0) {
        continue;
      }
      const moved = Math.min(item.stackSize, remaining);
      entry.itemId = itemId;
      entry.quantity = moved;
      remaining -= moved;
      if (remaining === 0) {
        return quantity;
      }
    }
    return quantity - remaining;
  }

  private compact(size = this.inventory.length): void {
    const filled = this.inventory.filter((entry) => entry.itemId && entry.quantity > 0);
    const emptySlots = Math.max(0, size - filled.length);
    const normalized = [
      ...filled,
      ...Array.from({ length: emptySlots }, () => ({ itemId: "", quantity: 0 }))
    ];
    this.inventory.splice(0, this.inventory.length, ...normalized);
  }

  private cloneEntries(): InventoryEntry[] {
    return this.inventory.map((entry) => ({ ...entry }));
  }
}
