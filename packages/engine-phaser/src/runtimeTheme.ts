export class RuntimeTheme {
  static readonly panelFill = 0x08110c;
  static readonly panelBorder = 0xe9dfbf;
  static readonly textPrimary = "#f6efd8";
  static readonly textMuted = "#b6b096";
  static readonly textAccent = "#f3c96b";
  static readonly slotFill = 0x132016;
  static readonly slotBorder = 0x314135;
  static readonly background = "#171411";
  static readonly objectTint = 0xd7d1b8;
  static readonly groundTint: Record<string, number> = {
    "core:grass": 0xb8d8a3,
    "core:dirt": 0xc8b08a,
    "core:sand": 0xf0d277,
    "core:water": 0x7fd6ff
  };
  static readonly groundFrame: Record<string, number> = {
    "core:grass": 0,
    "core:dirt": 1,
    "core:sand": 2,
    "core:water": 3
  };
  static readonly itemFrame: Record<string, number> = {
    "core:wood": 8,
    "core:stone": 9,
    "core:food": 6,
    "core:plank": 10,
    "core:brick": 11,
    "core:sapling": 12,
    "core:workbench": 13,
    "core:chest": 13,
    "core:wood-axe": 14,
    "core:wood-pickaxe": 15,
    "survival:ration": 7,
    "resource:berry": 6
  };
  static readonly structureFrame: Record<string, number> = {
    "core:campfire": 7,
    "core:wall": 8,
    "core:farm": 9,
    "core:workbench-station": 10,
    "core:chest-storage": 35
  };

  static terrainFrame(terrainId: string): number {
    return this.groundFrame[terrainId] ?? 1;
  }

  static terrainTint(terrainId: string): number {
    return this.groundTint[terrainId] ?? 0xc8b08a;
  }

  static resourceFrame(resourceId: string): number {
    if (resourceId.includes("tree")) {
      return 168;
    }
    if (resourceId.includes("stone")) {
      return 105;
    }
    return 105;
  }

  static structureFrameFor(structureId: string): number {
    return this.structureFrame[structureId] ?? 192;
  }

  static itemFrameFor(itemId: string): number {
    return this.itemFrame[itemId] ?? 9;
  }
}
