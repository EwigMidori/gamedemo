import type { PlacedStructure, StructureDef } from "@gamedemo/engine-core";

export class StructureAutotileResolver {
  resolveFrame(
    structure: PlacedStructure,
    definition: StructureDef | null,
    placedStructures: ReadonlyArray<PlacedStructure>
  ): number | null {
    // 1. 基础检查
    if (!definition?.autotileGroup) {
      return null;
    }

    // 🔥 修复潜在隐患：确保 base 是数字，防止 null + mask = NaN
    if (typeof definition.autotileFrameBase !== 'number') {
      console.warn('[Autotile] Invalid autotileFrameBase:', definition.autotileFrameBase, 'for structure:', structure.structureId);
      return null;
    }

    let mask = 0;
    const neighborInfo: Record<string, boolean> = {};

    // 2. 计算掩码并记录邻居状态
    // 上 (Top) - Bit 0
    const hasTop = this.hasNeighbor(placedStructures, structure, definition, 0, -1);
    if (hasTop) mask |= 1;
    neighborInfo.top = hasTop;

    // 右 (Right) - Bit 1
    const hasRight = this.hasNeighbor(placedStructures, structure, definition, 1, 0);
    if (hasRight) mask |= 2;
    neighborInfo.right = hasRight;

    // 下 (Bottom) - Bit 2
    const hasBottom = this.hasNeighbor(placedStructures, structure, definition, 0, 1);
    if (hasBottom) mask |= 4;
    neighborInfo.bottom = hasBottom;

    // 左 (Left) - Bit 3
    const hasLeft = this.hasNeighbor(placedStructures, structure, definition, -1, 0);
    if (hasLeft) mask |= 8;
    neighborInfo.left = hasLeft;

    const finalFrame = definition.autotileFrameBase + mask;

    // 🔥 核心调试日志：只在开发环境或需要时打印
    // 技巧：你可以暂时注释掉这行，或者加一个条件判断只打印特定的 structureId
    // console.log(
    //   `[🧱 Autotile] Pos(${structure.x}, ${structure.y}) [${structure.structureId}]`,
    //   `Mask: ${mask} (Binary: ${mask.toString(2).padStart(4, '0')})`,
    //   `Neighbors: ${JSON.stringify(neighborInfo)}`,
    //   `Base: ${definition.autotileFrameBase} -> Final Frame: ${finalFrame}`
    // );

    return finalFrame;
  }

  private hasNeighbor(
    placedStructures: ReadonlyArray<PlacedStructure>,
    source: PlacedStructure,
    _definition: StructureDef,
    deltaX: number,
    deltaY: number
  ): boolean {
    const neighbor = placedStructures.find(
      (entry) => entry.x === source.x + deltaX && entry.y === source.y + deltaY
    ) ?? null;

    return neighbor?.structureId === source.structureId;
  }
}