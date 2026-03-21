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
    "core:sand": 0xf0d277,
    "core:water": 0x7fd6ff
  };
  static readonly groundFrame: Record<string, number> = {
    "core:grass": 0,
    "core:sand": 2,
    "core:water": 3
  };
  static readonly itemFrame: Record<string, number> = {
    "core:wood": 8,
    "core:stone": 9,
    "survival:ration": 7,
    "survival:berry": 6
  };
  static readonly structureFrame: Record<string, number> = {
    "core:campfire": 192
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
