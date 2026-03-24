import type { PlacedStructure, StructureDef } from "@gamedemo/engine-core";

export class StructureAutotileResolver {
  resolveFrame(
    structure: PlacedStructure,
    definition: StructureDef | null,
    placedStructures: ReadonlyArray<PlacedStructure>
  ): number | null {
    if (!definition?.autotileGroup || definition.autotileFrameBase === undefined) {
      return null;
    }
    let mask = 0;
    if (this.hasNeighbor(placedStructures, structure, definition, 0, -1)) mask |= 1;
    if (this.hasNeighbor(placedStructures, structure, definition, 1, 0)) mask |= 2;
    if (this.hasNeighbor(placedStructures, structure, definition, 0, 1)) mask |= 4;
    if (this.hasNeighbor(placedStructures, structure, definition, -1, 0)) mask |= 8;
    return definition.autotileFrameBase + mask;
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
