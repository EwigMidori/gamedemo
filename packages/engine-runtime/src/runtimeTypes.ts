import type { ContentRegistryBuilder } from "@gamedemo/engine-content";
import type {
  ResolvedCommand,
  RuntimeAction,
  RuntimeActionResult,
  RuntimeCombinedInteraction,
  RuntimeCommand,
  RuntimeCommandInput,
  RuntimeCommandTrigger,
  RuntimeInventoryInteraction,
  RuntimeInventorySlotDescriptor,
  RuntimeProfile,
  RuntimeSessionState,
  RuntimeSystem,
  RuntimeUiPanel,
  RuntimeWorldObjectDescriptor,
  RuntimeWorldObjectInteraction,
  WorldgenStage
} from "@gamedemo/engine-core";
import type { GameModManifest } from "@gamedemo/mod-api";

export interface RuntimeSession {
  tick(deltaSeconds: number): RuntimeSessionState;
  dispatchAction(
    actionId: string,
    command?: {
      id: string;
      trigger: RuntimeCommandTrigger;
      payload?: Record<string, unknown>;
    }
  ): RuntimeActionResult;
  resolveCommands(input?: RuntimeCommandTrigger | Partial<RuntimeCommandInput>): ResolvedCommand[];
  executeCommand(
    commandId: string,
    input?: RuntimeCommandTrigger | Partial<RuntimeCommandInput>
  ): RuntimeActionResult;
  inspectWorldObject(
    input?: RuntimeCommandTrigger | Partial<RuntimeCommandInput>
  ): RuntimeWorldObjectDescriptor | null;
  inspectSelectedInventorySlot(
    input?: RuntimeCommandTrigger | Partial<RuntimeCommandInput>
  ): RuntimeInventorySlotDescriptor | null;
  resolveCombinedInteractions(
    input?: RuntimeCommandTrigger | Partial<RuntimeCommandInput>
  ): RuntimeCombinedInteraction[];
  resolveSelectedInventoryInteractions(
    input?: RuntimeCommandTrigger | Partial<RuntimeCommandInput>
  ): RuntimeInventoryInteraction[];
  resolveWorldObjectInteractions(
    input?: RuntimeCommandTrigger | Partial<RuntimeCommandInput>
  ): RuntimeWorldObjectInteraction[];
  snapshot(): RuntimeSessionState;
}

export interface AssembledRuntime {
  profile: RuntimeProfile;
  manifests: GameModManifest[];
  content: ReturnType<ContentRegistryBuilder["snapshot"]>;
  systems: RuntimeSystem[];
  actions: RuntimeAction[];
  commands: RuntimeCommand[];
  worldgen: WorldgenStage[];
  uiPanels: RuntimeUiPanel[];
  createSession(initialState?: RuntimeSessionState): RuntimeSession;
}
