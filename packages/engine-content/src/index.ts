import type {
  ItemDef,
  RecipeDef,
  ResourceDef,
  StructureDef,
  TerrainDef,
  ContentSnapshot
} from "@gamedemo/engine-core";
import type { VisualPackMetadata, HeightClassification } from "@gamedemo/mod-api";
import { HeightValidator } from "@gamedemo/engine-runtime";

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
  private readonly recipes = new Map<string, RecipeDef>();
  private readonly resources = new Map<string, ResourceDef>();
  private readonly structures = new Map<string, StructureDef>();
  private readonly terrains = new Map<string, TerrainDef>();
  private readonly visualPacks = new Map<string, VisualPackMetadata>();

  registerItem(definition: ItemDef): void {
    assertUnique(this.items, definition.id, "item");
    this.items.set(definition.id, definition);
  }

  registerStructure(definition: StructureDef): void {
    assertUnique(this.structures, definition.id, "structure");
    this.structures.set(definition.id, definition);
  }

  registerRecipe(definition: RecipeDef): void {
    assertUnique(this.recipes, definition.id, "recipe");
    this.recipes.set(definition.id, definition);
  }

  registerResource(definition: ResourceDef): void {
    assertUnique(this.resources, definition.id, "resource");
    this.resources.set(definition.id, definition);
  }

  registerTerrain(definition: TerrainDef): void {
    assertUnique(this.terrains, definition.id, "terrain");
    this.terrains.set(definition.id, definition);
  }

  // ---------------------------------------------------------------------------
  // Visual Pack Registry
  // ---------------------------------------------------------------------------

  registerVisualPack(metadata: VisualPackMetadata): void {
    if (this.visualPacks.has(metadata.contentId)) {
      throw new Error(`Duplicate visual pack for content id: ${metadata.contentId}`);
    }
    // Validate at registration time
    const validator = new HeightValidator();
    validator.validate(metadata);
    const result = validator.getResult();
    if (!result.valid) {
      const errorMessages = result.errors.map((e: { field: string; message: string }) => `${e.field}: ${e.message}`).join("; ");
      throw new Error(`Visual pack validation failed for ${metadata.contentId}: ${errorMessages}`);
    }
    this.visualPacks.set(metadata.contentId, metadata);
  }

  getVisualPack(contentId: string): VisualPackMetadata | undefined {
    return this.visualPacks.get(contentId);
  }

  hasVisualPack(contentId: string): boolean {
    return this.visualPacks.has(contentId);
  }

  getAllVisualPacks(): ReadonlyArray<VisualPackMetadata> {
    return [...this.visualPacks.values()];
  }

  getVisualPacksByClassification(classification: HeightClassification): ReadonlyArray<VisualPackMetadata> {
    return [...this.visualPacks.values()].filter(
      vp => vp.heightClassification === classification
    );
  }

  snapshot(): ContentSnapshot {
    return {
      items: [...this.items.values()],
      recipes: [...this.recipes.values()],
      resources: [...this.resources.values()],
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
