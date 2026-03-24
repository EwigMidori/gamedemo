import type {
  ContentSnapshot,
  PlacedStructure,
  ResourceNode,
  RuntimeSessionState
} from "@gamedemo/engine-core";

interface BreakToolProfile {
  readonly tags: string[];
  readonly power: number;
  readonly speed: number;
}

interface BreakProfile {
  readonly durationSeconds: number;
  readonly dropMultiplier: number;
}

export class VanillaBreakRules {
  static forResource(
    content: ContentSnapshot,
    state: RuntimeSessionState,
    resource: ResourceNode,
    selectedSlot: number | null | undefined
  ): BreakProfile {
    const definition = content.resources.find((entry) => entry.id === resource.resourceId) ?? null;
    const tool = this.resolveTool(content, state, selectedSlot);
    const preferred = definition?.breakable?.preferredToolTags;
    return this.createProfile(
      tool,
      preferred,
      definition?.breakable?.hardness ?? 0.28,
      definition?.breakable?.effectivePower ?? 1,
      definition?.breakable?.ineffectivePower ?? 0.85,
      definition?.breakable?.effectiveDropMultiplier ?? 1,
      definition?.breakable?.ineffectiveDropMultiplier ?? 1,
      0.12,
      0.9
    );
  }

  static forStructure(
    content: ContentSnapshot,
    state: RuntimeSessionState,
    structure: PlacedStructure,
    selectedSlot: number | null | undefined
  ): BreakProfile {
    const definition = content.structures.find((entry) => entry.id === structure.structureId) ?? null;
    const tool = this.resolveTool(content, state, selectedSlot);
    const preferred = definition?.breakable?.preferredToolTags;
    return this.createProfile(
      tool,
      preferred,
      definition?.breakable?.hardness ?? 0.3,
      definition?.breakable?.effectivePower ?? 1,
      definition?.breakable?.ineffectivePower ?? 0.9,
      definition?.breakable?.effectiveDropMultiplier ?? 1,
      definition?.breakable?.ineffectiveDropMultiplier ?? 1,
      0.14,
      1.1
    );
  }

  static rollDrops(
    drops: Array<{ itemId: string; min: number; max: number }>,
    dropMultiplier: number
  ): Array<{ itemId: string; quantity: number }> {
    return drops
      .map((drop) => {
        const base = this.randomInt(drop.min, drop.max);
        return {
          itemId: drop.itemId,
          quantity: Math.max(0, Math.round(base * dropMultiplier))
        };
      })
      .filter((drop) => drop.quantity > 0);
  }

  private static createProfile(
    tool: BreakToolProfile,
    preferredToolTags: string[] | undefined,
    hardness: number,
    effectivePower: number,
    ineffectivePower: number,
    effectiveDropMultiplier: number,
    ineffectiveDropMultiplier: number,
    minDurationSeconds: number,
    maxDurationSeconds: number
  ): BreakProfile {
    const effective = this.isEffectiveTool(tool.tags, preferredToolTags);
    const scaledPower = tool.power * (effective ? effectivePower : ineffectivePower);
    return {
      durationSeconds: this.clamp(
        hardness / Math.max(0.2, scaledPower * tool.speed),
        minDurationSeconds,
        maxDurationSeconds
      ),
      dropMultiplier: effective ? effectiveDropMultiplier : ineffectiveDropMultiplier
    };
  }

  private static resolveTool(
    content: ContentSnapshot,
    state: RuntimeSessionState,
    selectedSlot: number | null | undefined
  ): BreakToolProfile {
    if (selectedSlot === null || selectedSlot === undefined) {
      return { tags: ["hand"], power: 1, speed: 1 };
    }
    const entry = state.inventory[selectedSlot] ?? null;
    if (!entry?.itemId || entry.quantity <= 0) {
      return { tags: ["hand"], power: 1, speed: 1 };
    }
    const item = content.items.find((candidate) => candidate.id === entry.itemId) ?? null;
    if (!item?.tool) {
      return { tags: ["hand"], power: 1, speed: 1 };
    }
    return {
      tags: item.tool.tags.length > 0 ? item.tool.tags : ["hand"],
      power: item.tool.power ?? 1,
      speed: item.tool.speed ?? 1
    };
  }

  private static isEffectiveTool(toolTags: string[], preferredToolTags: string[] | undefined): boolean {
    if (!preferredToolTags || preferredToolTags.length === 0) {
      return true;
    }
    return preferredToolTags.some((tag) => toolTags.includes(tag));
  }

  private static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private static randomInt(min: number, max: number): number {
    const lower = Math.min(min, max);
    const upper = Math.max(min, max);
    return Math.floor(Math.random() * (upper - lower + 1)) + lower;
  }
}
