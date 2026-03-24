import type { ContentRegistryBuilder } from "@gamedemo/engine-content";

export class VanillaCatalog {
  register(builder: ContentRegistryBuilder): void {
    this.registerTerrains(builder);
    this.registerItems(builder);
    this.registerResources(builder);
    this.registerRecipes(builder);
    this.registerStructures(builder);
  }

  private registerTerrains(builder: ContentRegistryBuilder): void {
    builder.registerTerrain({
      id: "core:grass",
      label: "Grass",
      walkable: true,
      tags: ["ground", "outdoor"],
      frame: 0,
      tint: 0xb8d8a3
    });
    builder.registerTerrain({
      id: "core:dirt",
      label: "Dirt",
      walkable: true,
      tags: ["ground", "outdoor"],
      frame: 1,
      tint: 0xc8b08a
    });
    builder.registerTerrain({
      id: "core:sand",
      label: "Sand",
      walkable: true,
      tags: ["ground", "shore"],
      frame: 2,
      tint: 0xf0d277
    });
    builder.registerTerrain({
      id: "core:water",
      label: "Water",
      walkable: false,
      tags: ["ground", "liquid"],
      frame: 3,
      tint: 0x7fd6ff
    });
  }

  private registerItems(builder: ContentRegistryBuilder): void {
    builder.registerItem({
      id: "core:wood",
      label: "Wood",
      stackSize: 99,
      tags: ["resource", "material"],
      iconFrame: 8,
      category: "material",
      uiGroup: "materials",
      uiPriority: 10
    });
    builder.registerItem({
      id: "core:stone",
      label: "Stone",
      stackSize: 99,
      tags: ["resource", "material"],
      iconFrame: 9,
      category: "material",
      uiGroup: "materials",
      uiPriority: 20
    });
    builder.registerItem({
      id: "core:food",
      label: "Food",
      stackSize: 30,
      tags: ["food", "raw-food"],
      iconFrame: 6,
      category: "food",
      uiGroup: "survival",
      uiPriority: 10,
      consumable: {
        hunger: 12,
        consumeMessage: "Ate raw food (+hunger).",
        emptyMessage: "No food to eat.",
        blockedMessage: "Not hungry."
      },
      processable: {
        stationId: "campfire",
        cost: { "core:food": 3, "core:wood": 1 },
        output: { itemId: "survival:ration", quantity: 1 },
        successMessage: "Cooked 1 ration.",
        missingMessage: "Need 3 food + 1 wood to cook.",
        noSpaceMessage: "No inventory space for ration."
      }
    });
    builder.registerItem({
      id: "survival:ration",
      label: "Ration",
      stackSize: 20,
      tags: ["food", "cooked-food"],
      iconFrame: 7,
      category: "cooked-food",
      uiGroup: "survival",
      uiPriority: 20,
      consumable: {
        hunger: 32,
        health: 8,
        consumeMessage: "Ate ration (+hunger/+hp).",
        emptyMessage: "No rations.",
        blockedMessage: "Already full and healthy."
      }
    });
    builder.registerItem({
      id: "core:plank",
      label: "Plank",
      stackSize: 99,
      tags: ["material", "crafted"],
      iconFrame: 10,
      category: "material",
      uiGroup: "crafted",
      uiPriority: 10
    });
    builder.registerItem({
      id: "core:brick",
      label: "Brick",
      stackSize: 99,
      tags: ["material", "crafted"],
      iconFrame: 11,
      category: "material",
      uiGroup: "crafted",
      uiPriority: 20
    });
    builder.registerItem({
      id: "core:sapling",
      label: "Sapling",
      stackSize: 99,
      tags: ["material", "plantable"],
      iconFrame: 12,
      category: "material",
      uiGroup: "utility",
      uiPriority: 10,
      plantable: {
        validTerrainIds: ["core:grass", "core:dirt"],
        growSeconds: 90,
        growsIntoResourceId: "resource:tree",
        needMessage: "Need a sapling.",
        invalidTerrainMessage: "Plant saplings on grass or dirt.",
        occupiedMessage: "Tile already occupied.",
        successMessage: "Planted sapling."
      }
    });
    builder.registerItem({
      id: "core:workbench",
      label: "Workbench",
      stackSize: 20,
      tags: ["material", "placeable"],
      iconFrame: 13,
      category: "material",
      uiGroup: "utility",
      uiPriority: 15
    });
    builder.registerItem({
      id: "core:chest",
      label: "Chest",
      stackSize: 20,
      tags: ["material", "placeable"],
      iconFrame: 13,
      category: "material",
      uiGroup: "utility",
      uiPriority: 20
    });
    builder.registerItem({
      id: "core:wood-axe",
      label: "Wood Axe",
      stackSize: 1,
      tags: ["tool", "axe"],
      iconFrame: 14,
      category: "tool",
      uiGroup: "utility",
      uiPriority: 30,
      tool: {
        tags: ["axe"],
        power: 1.65,
        speed: 1.2
      }
    });
    builder.registerItem({
      id: "core:wood-pickaxe",
      label: "Wood Pickaxe",
      stackSize: 1,
      tags: ["tool", "pickaxe"],
      iconFrame: 15,
      category: "tool",
      uiGroup: "utility",
      uiPriority: 40,
      tool: {
        tags: ["pickaxe"],
        power: 1.7,
        speed: 1.2
      }
    });
  }

  private registerStructures(builder: ContentRegistryBuilder): void {
    builder.registerStructure({
      id: "core:campfire",
      label: "Campfire",
      blocksMovement: true,
      tags: ["station", "light-source"],
      frame: 7,
      placeableItemId: "core:brick",
      utilityStationId: "campfire",
      lightTexture: "light-campfire",
      breakable: {
        preferredToolTags: ["pickaxe"],
        hardness: 0.32,
        effectivePower: 1,
        ineffectivePower: 0.9,
        effectiveDropMultiplier: 1,
        ineffectiveDropMultiplier: 1
      }
    });
    builder.registerStructure({
      id: "core:wall",
      label: "Wall",
      blocksMovement: true,
      tags: ["building", "autotile"],
      frame: 8,
      placeableItemId: "core:plank",
      autotileGroup: "wall",
      autotileFrameBase: 11,
      breakable: {
        preferredToolTags: ["axe"],
        hardness: 0.22,
        effectivePower: 1,
        ineffectivePower: 0.9,
        effectiveDropMultiplier: 1,
        ineffectiveDropMultiplier: 1
      }
    });
    builder.registerStructure({
      id: "core:farm",
      label: "Farm Plot",
      blocksMovement: false,
      tags: ["building", "growable"],
      frame: 9,
      placeableItemId: "core:food",
      growSeconds: 55,
      growableStages: [
        { minProgress: 0, frame: 32, tint: 0xbfa57f },
        { minProgress: 0.4, frame: 33, tint: 0xd7e7ad },
        { minProgress: 1, frame: 34, tint: 0xfff3b0 }
      ],
      breakable: {
        preferredToolTags: ["hand"],
        hardness: 0.18,
        effectivePower: 1,
        ineffectivePower: 1,
        effectiveDropMultiplier: 1,
        ineffectiveDropMultiplier: 1,
        drops: [{ itemId: "core:food", min: 5, max: 9 }]
      }
    });
    builder.registerStructure({
      id: "core:workbench-station",
      label: "Workbench",
      blocksMovement: true,
      tags: ["building", "craft-station"],
      frame: 10,
      placeableItemId: "core:workbench",
      pickupItemId: "core:workbench",
      craftStationId: "workbench",
      breakable: {
        preferredToolTags: ["axe"],
        hardness: 0.35,
        effectivePower: 1,
        ineffectivePower: 0.9,
        effectiveDropMultiplier: 1,
        ineffectiveDropMultiplier: 1
      }
    });
    builder.registerStructure({
      id: "core:chest-storage",
      label: "Chest",
      blocksMovement: true,
      tags: ["building", "storage"],
      frame: 35,
      placeableItemId: "core:chest",
      pickupItemId: "core:chest",
      storageSlots: 16,
      breakable: {
        preferredToolTags: ["axe"],
        hardness: 0.28,
        effectivePower: 1,
        ineffectivePower: 0.9,
        effectiveDropMultiplier: 1,
        ineffectiveDropMultiplier: 1
      }
    });
  }

  private registerRecipes(builder: ContentRegistryBuilder): void {
    builder.registerRecipe({
      id: "recipe:plank",
      label: "Plank",
      output: { itemId: "core:plank", quantity: 4 },
      cost: { "core:wood": 1 },
      stationId: null
    });
    builder.registerRecipe({
      id: "recipe:workbench",
      label: "Workbench",
      output: { itemId: "core:workbench", quantity: 1 },
      cost: { "core:plank": 8 },
      stationId: null
    });
    builder.registerRecipe({
      id: "recipe:brick",
      label: "Brick",
      output: { itemId: "core:brick", quantity: 1 },
      cost: { "core:stone": 2 },
      stationId: "workbench"
    });
    builder.registerRecipe({
      id: "recipe:chest",
      label: "Chest",
      output: { itemId: "core:chest", quantity: 1 },
      cost: { "core:plank": 8 },
      stationId: "workbench"
    });
    builder.registerRecipe({
      id: "recipe:wood-axe",
      label: "Wood Axe",
      output: { itemId: "core:wood-axe", quantity: 1 },
      cost: { "core:plank": 3, "core:wood": 2 },
      stationId: "workbench"
    });
    builder.registerRecipe({
      id: "recipe:wood-pickaxe",
      label: "Wood Pickaxe",
      output: { itemId: "core:wood-pickaxe", quantity: 1 },
      cost: { "core:plank": 3, "core:stone": 2 },
      stationId: "workbench"
    });
    builder.registerRecipe({
      id: "recipe:ration",
      label: "Ration",
      output: { itemId: "survival:ration", quantity: 1 },
      cost: { "core:food": 3, "core:wood": 1 },
      stationId: "campfire"
    });
  }

  private registerResources(builder: ContentRegistryBuilder): void {
    builder.registerResource({
      id: "resource:tree",
      label: "Tree",
      frame: 4,
      blocksMovement: true,
      respawnSeconds: 120,
      drops: [{ itemId: "core:wood", min: 3, max: 6 }],
      bonusDrop: { itemId: "core:sapling", chance: 0.45, quantity: 1 },
      breakable: {
        preferredToolTags: ["axe"],
        hardness: 0.28,
        effectivePower: 1,
        ineffectivePower: 0.85,
        effectiveDropMultiplier: 1,
        ineffectiveDropMultiplier: 1
      }
    });
    builder.registerResource({
      id: "resource:stone",
      label: "Stone Deposit",
      frame: 5,
      blocksMovement: true,
      maxHits: 3,
      drops: [{ itemId: "core:stone", min: 2, max: 5 }],
      breakable: {
        preferredToolTags: ["pickaxe"],
        hardness: 0.42,
        effectivePower: 1,
        ineffectivePower: 0.75,
        effectiveDropMultiplier: 1,
        ineffectiveDropMultiplier: 0.75
      }
    });
    builder.registerResource({
      id: "resource:berry",
      label: "Berry Bush",
      frame: 6,
      blocksMovement: false,
      respawnSeconds: 45,
      drops: [{ itemId: "core:food", min: 2, max: 4 }],
      grantsHunger: 12,
      breakable: {
        preferredToolTags: ["hand"],
        hardness: 0.18,
        effectivePower: 1,
        ineffectivePower: 1,
        effectiveDropMultiplier: 1,
        ineffectiveDropMultiplier: 1
      }
    });
  }
}
