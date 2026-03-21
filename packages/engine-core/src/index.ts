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
}

export interface StructureDef {
  id: string;
  label: string;
  blocksMovement: boolean;
  tags: string[];
}

export interface TerrainDef {
  id: string;
  label: string;
  walkable: boolean;
  tags: string[];
}

export interface ContentSnapshot {
  items: ItemDef[];
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
}

export interface PlacedStructure {
  id: string;
  structureId: string;
  x: number;
  y: number;
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
