import type {
  ItemDef,
  StructureDef,
  TerrainDef,
  ContentSnapshot
} from "@gamedemo/engine-core";

function assertUnique<T>(
  registry: Map<string, T>,
  id: string,
  kind: string
): void {
  if (registry.has(id)) {
    throw new Error(`Duplicate ${kind} id registered: ${id}`);
  }
}

export class ContentRegistryBuilder {
  private readonly items = new Map<string, ItemDef>();
  private readonly structures = new Map<string, StructureDef>();
  private readonly terrains = new Map<string, TerrainDef>();

  registerItem(definition: ItemDef): void {
    assertUnique(this.items, definition.id, "item");
    this.items.set(definition.id, definition);
  }

  registerStructure(definition: StructureDef): void {
    assertUnique(this.structures, definition.id, "structure");
    this.structures.set(definition.id, definition);
  }

  registerTerrain(definition: TerrainDef): void {
    assertUnique(this.terrains, definition.id, "terrain");
    this.terrains.set(definition.id, definition);
  }

  snapshot(): ContentSnapshot {
    return {
      items: [...this.items.values()],
      structures: [...this.structures.values()],
      terrains: [...this.terrains.values()]
    };
  }
}

export const ContentRegistry = {
  createBuilder(): ContentRegistryBuilder {
    return new ContentRegistryBuilder();
  }
};
