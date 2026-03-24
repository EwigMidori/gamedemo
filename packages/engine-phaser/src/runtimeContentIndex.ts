import type {
  ContentSnapshot,
  ResourceDef,
  StructureDef,
  TerrainDef
} from "@gamedemo/engine-core";

export class RuntimeContentIndex {
  private readonly terrainIndex = new Map<string, TerrainDef>();
  private readonly structureIndex = new Map<string, StructureDef>();
  private readonly resourceIndex = new Map<string, ResourceDef>();

  constructor(content: ContentSnapshot) {
    for (const terrain of content.terrains) {
      this.terrainIndex.set(terrain.id, terrain);
    }
    for (const structure of content.structures) {
      this.structureIndex.set(structure.id, structure);
    }
    for (const resource of content.resources) {
      this.resourceIndex.set(resource.id, resource);
    }
  }

  terrain(id: string): TerrainDef | null {
    return this.terrainIndex.get(id) ?? null;
  }

  structure(id: string): StructureDef | null {
    return this.structureIndex.get(id) ?? null;
  }

  resource(id: string): ResourceDef | null {
    return this.resourceIndex.get(id) ?? null;
  }
}
