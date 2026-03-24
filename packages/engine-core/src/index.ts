export const ENGINE_PACKAGE_NAME = "@gamedemo/engine-core";
export const ENGINE_VERSION = "0.1.0";
export const MOD_API_VERSION = "0.1.0";

export interface RuntimeProfileEntry {
  id: string;
  version: string;
}

export interface RuntimeProfile {
  mods: RuntimeProfileEntry[];
}

export interface ItemDef {
  id: string;
  label: string;
  stackSize: number;
  tags: string[];
  iconFrame?: number;
  category?: string;
  uiGroup?: string;
  uiPriority?: number;
  consumable?: {
    hunger?: number;
    health?: number;
    consumeMessage: string;
    emptyMessage: string;
    blockedMessage: string;
  };
  plantable?: {
    validTerrainIds: string[];
    growSeconds: number;
    growsIntoResourceId: string;
    needMessage: string;
    invalidTerrainMessage: string;
    occupiedMessage: string;
    successMessage: string;
  };
  processable?: {
    stationId: string;
    cost: Record<string, number>;
    output: {
      itemId: string;
      quantity: number;
    };
    successMessage: string;
    missingMessage: string;
    noSpaceMessage: string;
  };
  tool?: {
    tags: string[];
    power?: number;
    speed?: number;
  };
}

export interface StructureDef {
  id: string;
  label: string;
  blocksMovement: boolean;
  tags: string[];
  frame?: number;
  placeableItemId?: string;
  pickupItemId?: string;
  storageSlots?: number;
  craftStationId?: string;
  utilityStationId?: string;
  autotileGroup?: string;
  autotileFrameBase?: number;
  openFrame?: number;
  autoOpen?: boolean;
  growableStages?: Array<{
    minProgress: number;
    frame: number;
    tint?: number;
  }>;
  growSeconds?: number;
  lightTexture?: string;
  breakable?: {
    preferredToolTags?: string[];
    hardness?: number;
    effectivePower?: number;
    ineffectivePower?: number;
    effectiveDropMultiplier?: number;
    ineffectiveDropMultiplier?: number;
    drops?: Array<{
      itemId: string;
      min: number;
      max: number;
    }>;
  };
}

export interface RecipeDef {
  id: string;
  label: string;
  output: {
    itemId: string;
    quantity: number;
  };
  cost: Record<string, number>;
  stationId?: string | null;
}

export interface ResourceDef {
  id: string;
  label: string;
  frame: number;
  blocksMovement: boolean;
  drops: Array<{
    itemId: string;
    min: number;
    max: number;
  }>;
  respawnSeconds?: number;
  maxHits?: number;
  grantsHunger?: number;
  bonusDrop?: {
    itemId: string;
    chance: number;
    quantity: number;
  };
  breakable?: {
    preferredToolTags?: string[];
    hardness?: number;
    effectivePower?: number;
    ineffectivePower?: number;
    effectiveDropMultiplier?: number;
    ineffectiveDropMultiplier?: number;
  };
}

export interface TerrainDef {
  id: string;
  label: string;
  walkable: boolean;
  tags: string[];
  frame?: number;
  tint?: number;
}

export interface ContentSnapshot {
  items: ItemDef[];
  recipes: RecipeDef[];
  resources: ResourceDef[];
  structures: StructureDef[];
  terrains: TerrainDef[];
}

export type RuntimeSystemPhase =
  | "preUpdate"
  | "simulation"
  | "postSimulation"
  | "renderPrepare";

export interface NeedsState {
  hunger: number;
  health: number;
}

export interface InventoryEntry {
  itemId: string;
  quantity: number;
}

export interface PlayerState {
  x: number;
  y: number;
  movementInput?: {
    up: boolean;
    left: boolean;
    down: boolean;
    right: boolean;
    facing: "up" | "left" | "down" | "right";
    sprintFacing: "up" | "left" | "down" | "right" | null;
    sprintUntil: number;
    lastTapAt: {
      up: number;
      left: number;
      down: number;
      right: number;
    };
  };
  motion?: {
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    progressSeconds: number;
    durationSeconds: number;
  } | null;
  moveTarget?: {
    x: number;
    y: number;
  } | null;
  movePath?: Array<{
    x: number;
    y: number;
  }>;
}

export interface ResourceNode {
  id: string;
  resourceId: string;
  x: number;
  y: number;
  depleted: boolean;
  respawnAt?: number | null;
  hitsLeft?: number | null;
}

export interface PlacedStructure {
  id: string;
  structureId: string;
  x: number;
  y: number;
  isOpen?: boolean | null;
  autoCloseAt?: number | null;
  growth?: number | null;
  inventory?: InventoryEntry[] | null;
}

export interface DroppedItemState {
  id: string;
  itemId: string;
  quantity: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spawnedAt: number;
  pickupDelay: number;
  manualDrop?: boolean;
  pickupArmed?: boolean;
}

export interface PlantedResourceState {
  id: string;
  resourceId: string;
  x: number;
  y: number;
  growAt: number;
}

export interface RuntimeSessionState {
  timeSeconds: number;
  day: number;
  world: WorldBlueprint;
  player: PlayerState;
  needs: NeedsState;
  inventory: InventoryEntry[];
  resources: ResourceNode[];
  placedStructures: PlacedStructure[];
  plantedResources?: PlantedResourceState[];
  droppedItems?: DroppedItemState[];
  logs: string[];
}

export interface RuntimeSystemContext {
  deltaSeconds: number;
  state: RuntimeSessionState;
  content: ContentSnapshot;
}

export type SessionBootstrapper = (state: RuntimeSessionState) => void;

export interface RuntimeActionContext {
  state: RuntimeSessionState;
  content: ContentSnapshot;
  command?: {
    id: string;
    trigger: RuntimeCommandTrigger;
    payload?: Record<string, unknown>;
  };
}

export interface RuntimeActionResult {
  ok: boolean;
  message: string;
}

export interface RuntimeSystem {
  id: string;
  phase: RuntimeSystemPhase;
  description: string;
  run?(context: RuntimeSystemContext): void;
}

export interface RuntimeAction {
  id: string;
  label: string;
  execute(context: RuntimeActionContext): RuntimeActionResult;
}

export interface RuntimeCommand {
  id: string;
  label: string;
  binding: string;
}

export type RuntimeCommandTrigger = "ui" | "keyboard" | "pointer" | "system";

export interface RuntimePointerTile {
  x: number;
  y: number;
}

export interface RuntimeCommandInput {
  trigger: RuntimeCommandTrigger;
  pointerTile?: RuntimePointerTile | null;
  selectedSlot?: number | null;
  focusedResourceId?: string | null;
  focusedStructureId?: string | null;
}

export type RuntimeWorldObjectKind = "resource" | "structure" | "tile";

export interface RuntimeWorldObjectDescriptor {
  id: string;
  kind: RuntimeWorldObjectKind;
  typeId: string;
  label: string;
  summary: string;
  x: number;
  y: number;
  sourceModId: string;
}

export interface ResolvedCommand extends RuntimeCommand {
  actionId: string;
  enabled: boolean;
  reasonDisabled?: string;
  sourceModId: string;
  priority?: number;
  payload?: Record<string, unknown>;
}

export interface RuntimeCommandContext extends RuntimeCommandInput {
  content: ContentSnapshot;
  session: RuntimeSessionState;
}

export interface RuntimeWorldObjectContext extends RuntimeCommandInput {
  content: ContentSnapshot;
  session: RuntimeSessionState;
}

export type RuntimeInteractionAffordance = "primary" | "secondary" | "context";

export interface RuntimeInteractionCost {
  itemId: string;
  quantity: number;
  available: number;
}

export interface RuntimeInteractionReward {
  itemId: string;
  quantity: number;
}

export interface RuntimeInteractionPresentation {
  summary?: string;
  detail?: string;
  costs?: RuntimeInteractionCost[];
  rewards?: RuntimeInteractionReward[];
}

export interface RuntimeInventorySlotDescriptor {
  slotIndex: number;
  itemId: string;
  label: string;
  summary: string;
  detail?: string;
  quantity: number;
  sourceModId: string;
  presentation?: RuntimeInteractionPresentation;
}

export interface RuntimeInventoryInteraction extends ResolvedCommand {
  slotIndex: number;
  itemId: string;
  itemLabel: string;
  presentation?: RuntimeInteractionPresentation;
}

export interface RuntimeCombinedInteraction extends ResolvedCommand {
  slotIndex: number;
  itemId: string;
  itemLabel: string;
  targetObjectId: string;
  targetObjectKind: RuntimeWorldObjectKind;
  targetObjectTypeId: string;
  targetObjectLabel: string;
  affordance: RuntimeInteractionAffordance;
  presentation?: RuntimeInteractionPresentation;
}

export interface RuntimeWorldObjectInteraction extends ResolvedCommand {
  targetObjectId: string;
  targetObjectKind: RuntimeWorldObjectKind;
  targetObjectTypeId: string;
  targetObjectLabel: string;
  affordance: RuntimeInteractionAffordance;
  presentation?: RuntimeInteractionPresentation;
}

export interface RuntimeCommandResolver {
  id: string;
  resolve(context: RuntimeCommandContext): ResolvedCommand[];
}

export interface RuntimeWorldObjectProvider {
  id: string;
  inspect(context: RuntimeWorldObjectContext): RuntimeWorldObjectDescriptor | null;
}

export interface RuntimeWorldObjectInteractionContext extends RuntimeWorldObjectContext {
  object: RuntimeWorldObjectDescriptor;
}

export interface RuntimeWorldObjectInteractionProvider {
  id: string;
  collect(context: RuntimeWorldObjectInteractionContext): RuntimeWorldObjectInteraction[];
}

export interface RuntimeInventorySelectionContext extends RuntimeCommandInput {
  content: ContentSnapshot;
  session: RuntimeSessionState;
  slotIndex: number;
  entry: InventoryEntry;
}

export interface RuntimeInventorySelectionProvider {
  id: string;
  inspect(context: RuntimeInventorySelectionContext): RuntimeInventorySlotDescriptor | null;
}

export interface RuntimeInventoryInteractionContext extends RuntimeInventorySelectionContext {
  descriptor: RuntimeInventorySlotDescriptor;
}

export interface RuntimeInventoryInteractionProvider {
  id: string;
  collect(context: RuntimeInventoryInteractionContext): RuntimeInventoryInteraction[];
}

export interface RuntimeCombinedInteractionContext
  extends RuntimeInventoryInteractionContext {
  object: RuntimeWorldObjectDescriptor;
}

export interface RuntimeCombinedInteractionProvider {
  id: string;
  collect(context: RuntimeCombinedInteractionContext): RuntimeCombinedInteraction[];
}

export interface WorldTile {
  x: number;
  y: number;
  terrainId: string;
}

export interface WorldBlueprint {
  originX: number;
  originY: number;
  width: number;
  height: number;
  tiles: WorldTile[];
}

export interface WorldgenStage {
  id: string;
  order: number;
  description: string;
  generate(blueprint: WorldBlueprint): WorldBlueprint;
}

export interface RuntimeUiPanel {
  id: string;
  title: string;
  body: string;
}
