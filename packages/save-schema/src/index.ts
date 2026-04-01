import { Type, type Static } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import type {
  RuntimeProfile,
  RuntimeSessionState
} from "@gamedemo/engine-core";

export const SAVE_SCHEMA_VERSION = 1;

const RuntimeProfileEntrySchema = Type.Object({
  id: Type.String(),
  version: Type.String()
});

const RuntimeProfileSchema = Type.Object({
  mods: Type.Array(RuntimeProfileEntrySchema)
});

const WorldTileSchema = Type.Object({
  x: Type.Number(),
  y: Type.Number(),
  terrainId: Type.String()
});

const WorldBlueprintSchema = Type.Object({
  originX: Type.Number(),
  originY: Type.Number(),
  width: Type.Number(),
  height: Type.Number(),
  tiles: Type.Array(WorldTileSchema)
});

const NeedsStateSchema = Type.Object({
  hunger: Type.Number(),
  health: Type.Number()
});

const InventoryEntrySchema = Type.Object({
  itemId: Type.String(),
  quantity: Type.Number()
});

const TilePointSchema = Type.Object({
  x: Type.Number(),
  y: Type.Number()
});

const MovementInputSchema = Type.Object({
  up: Type.Boolean(),
  left: Type.Boolean(),
  down: Type.Boolean(),
  right: Type.Boolean(),
  facing: Type.Union([
    Type.Literal("up"),
    Type.Literal("left"),
    Type.Literal("down"),
    Type.Literal("right")
  ]),
  sprintFacing: Type.Union([
    Type.Literal("up"),
    Type.Literal("left"),
    Type.Literal("down"),
    Type.Literal("right"),
    Type.Null()
  ]),
  sprintUntil: Type.Number(),
  lastTapAt: Type.Object({
    up: Type.Number(),
    left: Type.Number(),
    down: Type.Number(),
    right: Type.Number()
  })
});

const MotionSchema = Type.Object({
  fromX: Type.Number(),
  fromY: Type.Number(),
  toX: Type.Number(),
  toY: Type.Number(),
  progressSeconds: Type.Number(),
  durationSeconds: Type.Number()
});

const PlayerStateSchema = Type.Object({
  x: Type.Number(),
  y: Type.Number(),
  movementInput: Type.Optional(MovementInputSchema),
  motion: Type.Optional(Type.Union([MotionSchema, Type.Null()])),
  moveTarget: Type.Optional(Type.Union([TilePointSchema, Type.Null()])),
  movePath: Type.Optional(Type.Array(TilePointSchema))
});

const ResourceNodeSchema = Type.Object({
  id: Type.String(),
  resourceId: Type.String(),
  x: Type.Number(),
  y: Type.Number(),
  depleted: Type.Boolean(),
  respawnAt: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  hitsLeft: Type.Optional(Type.Union([Type.Number(), Type.Null()]))
});

const PlacedStructureSchema = Type.Object({
  id: Type.String(),
  structureId: Type.String(),
  x: Type.Number(),
  y: Type.Number(),
  isOpen: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  autoCloseAt: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  growth: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  inventory: Type.Optional(Type.Union([Type.Array(InventoryEntrySchema), Type.Null()]))
});

const DroppedItemStateSchema = Type.Object({
  id: Type.String(),
  itemId: Type.String(),
  quantity: Type.Number(),
  x: Type.Number(),
  y: Type.Number(),
  vx: Type.Number(),
  vy: Type.Number(),
  spawnedAt: Type.Number(),
  pickupDelay: Type.Number(),
  manualDrop: Type.Optional(Type.Boolean()),
  pickupArmed: Type.Optional(Type.Boolean())
});

const PlantedResourceStateSchema = Type.Object({
  id: Type.String(),
  resourceId: Type.String(),
  x: Type.Number(),
  y: Type.Number(),
  growAt: Type.Number()
});

export const RuntimeSessionStateSchema = Type.Object({
  timeSeconds: Type.Number(),
  day: Type.Number(),
  world: WorldBlueprintSchema,
  player: PlayerStateSchema,
  needs: NeedsStateSchema,
  inventory: Type.Array(InventoryEntrySchema),
  resources: Type.Array(ResourceNodeSchema),
  placedStructures: Type.Array(PlacedStructureSchema),
  plantedResources: Type.Optional(Type.Array(PlantedResourceStateSchema)),
  droppedItems: Type.Optional(Type.Array(DroppedItemStateSchema)),
  logs: Type.Array(Type.String()),
  nextStructureId: Type.Number()
});

export const GameSaveEnvelopeSchema = Type.Object({
  version: Type.Number(),
  profile: RuntimeProfileSchema,
  session: RuntimeSessionStateSchema
});

export type GameSaveEnvelope = Static<typeof GameSaveEnvelopeSchema>;

const gameSaveEnvelopeValidator = TypeCompiler.Compile(GameSaveEnvelopeSchema);

function createEnvelope(
  profile: RuntimeProfile,
  session: RuntimeSessionState
): GameSaveEnvelope {
  return {
    version: SAVE_SCHEMA_VERSION,
    profile,
    session
  };
}

function parseEnvelope(input: unknown): GameSaveEnvelope {
  if (!gameSaveEnvelopeValidator.Check(input)) {
    const [firstError] = [...gameSaveEnvelopeValidator.Errors(input)];
    const path = firstError?.path || "/";
    const message = firstError?.message || "Unknown save validation error.";
    throw new Error(`Invalid save envelope at ${path}: ${message}`);
  }
  return input;
}

export const SaveSchema = {
  createEnvelope,
  parseEnvelope
};
