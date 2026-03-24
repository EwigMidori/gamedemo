import type {
  ResolvedCommand,
  RuntimeAction,
  RuntimeCombinedInteraction,
  RuntimeCombinedInteractionProvider,
  RuntimeCommand,
  RuntimeCommandContext,
  RuntimeCommandInput,
  RuntimeCommandResolver,
  RuntimeCommandTrigger,
  RuntimeInventoryInteraction,
  RuntimeInventoryInteractionProvider,
  RuntimeInventorySelectionProvider,
  RuntimeInventorySlotDescriptor,
  RuntimeProfile,
  RuntimeSessionState,
  RuntimeSystem,
  RuntimeUiPanel,
  RuntimeWorldObjectDescriptor,
  RuntimeWorldObjectInteraction,
  RuntimeWorldObjectInteractionProvider,
  RuntimeWorldObjectProvider,
  WorldBlueprint,
  WorldgenStage
} from "@gamedemo/engine-core";
import type { GameModManifest } from "@gamedemo/mod-api";
import type { RuntimeSession } from "./runtimeTypes";
import { RuntimeWorldBlueprints } from "./worldBlueprints";

interface SessionRegistryLike {
  createInitialState(): RuntimeSessionState;
}

interface RuntimeSessionFactoryInput {
  profile: RuntimeProfile;
  manifests: GameModManifest[];
  content: {
    items: Array<{ id: string }>;
    recipes: Array<{ id: string }>;
    resources: Array<{ id: string }>;
    structures: Array<{ id: string }>;
    terrains: Array<{ id: string }>;
  };
  systems: RuntimeSystem[];
  actions: RuntimeAction[];
  commands: RuntimeCommand[];
  worldgen: WorldgenStage[];
  uiPanels: RuntimeUiPanel[];
  sessionRegistry: SessionRegistryLike;
  commandResolvers: RuntimeCommandResolver[];
  worldObjects: RuntimeWorldObjectProvider[];
  worldObjectInteractions: RuntimeWorldObjectInteractionProvider[];
  inventorySelections: RuntimeInventorySelectionProvider[];
  inventoryInteractions: RuntimeInventoryInteractionProvider[];
  combinedInteractions: RuntimeCombinedInteractionProvider[];
  initialState?: RuntimeSessionState;
}

const worldTileSnapshotKey = Symbol("worldTileSnapshot");
const worldTileCloneCountKey = Symbol("worldTileCloneCount");

type WorldWithSnapshotCache = WorldBlueprint & {
  [worldTileSnapshotKey]?: WorldTile[];
  [worldTileCloneCountKey]?: number;
};

function cloneWorldBlueprint(world: WorldBlueprint): WorldBlueprint {
  const cachedWorld = world as WorldWithSnapshotCache;
  const cachedTiles = cachedWorld[worldTileSnapshotKey] ?? [];
  const cachedCount = cachedWorld[worldTileCloneCountKey] ?? 0;
  if (cachedCount < world.tiles.length) {
    const nextTiles = cachedTiles.slice();
    for (let index = cachedCount; index < world.tiles.length; index += 1) {
      nextTiles.push({ ...world.tiles[index] });
    }
    cachedWorld[worldTileSnapshotKey] = nextTiles;
    cachedWorld[worldTileCloneCountKey] = world.tiles.length;
  }
  return {
    originX: world.originX,
    originY: world.originY,
    width: world.width,
    height: world.height,
    tiles: (cachedWorld[worldTileSnapshotKey] ?? []).slice()
  };
}

function cloneSessionState(state: RuntimeSessionState): RuntimeSessionState {
  return {
    ...state,
    world: cloneWorldBlueprint(state.world),
    player: {
      ...state.player,
      movementInput: state.player.movementInput
        ? {
            ...state.player.movementInput,
            lastTapAt: { ...state.player.movementInput.lastTapAt }
          }
        : undefined,
      motion: state.player.motion ? { ...state.player.motion } : null,
      moveTarget: state.player.moveTarget ? { ...state.player.moveTarget } : null,
      movePath: (state.player.movePath ?? []).map((step) => ({ ...step }))
    },
    needs: { ...state.needs },
    inventory: state.inventory.map((entry) => ({ ...entry })),
    resources: state.resources.map((entry) => ({ ...entry })),
    placedStructures: state.placedStructures.map((entry) => ({
      ...entry,
      inventory: entry.inventory?.map((inventoryEntry) => ({ ...inventoryEntry })) ?? null
    })),
    plantedResources: state.plantedResources?.map((entry) => ({ ...entry })) ?? [],
    droppedItems: state.droppedItems?.map((entry) => ({ ...entry })) ?? [],
    logs: [...state.logs]
  };
}

function normalizeCommandInput(
  input?: RuntimeCommandTrigger | Partial<RuntimeCommandInput>
): RuntimeCommandInput {
  if (!input) {
    return {
      trigger: "ui",
      pointerTile: null,
      selectedSlot: null,
      focusedResourceId: null,
      focusedStructureId: null
    };
  }
  if (typeof input === "string") {
    return {
      trigger: input,
      pointerTile: null,
      selectedSlot: null,
      focusedResourceId: null,
      focusedStructureId: null
    };
  }
  return {
    trigger: input.trigger ?? "ui",
    pointerTile: input.pointerTile ?? null,
    selectedSlot: input.selectedSlot ?? null,
    focusedResourceId: input.focusedResourceId ?? null,
    focusedStructureId: input.focusedStructureId ?? null
  };
}

function createRuntimeStub(input: RuntimeSessionFactoryInput) {
  return {
    profile: input.profile,
    manifests: input.manifests,
    content: input.content,
    systems: input.systems,
    actions: input.actions,
    commands: input.commands,
    worldgen: input.worldgen,
    uiPanels: input.uiPanels,
    createSession() {
      throw new Error("Nested session creation is unavailable.");
    }
  };
}

function sortAndDeduplicateCommands<T extends ResolvedCommand>(commands: T[]): T[] {
  const seen = new Set<string>();
  return commands
    .sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0))
    .filter((command) => {
      if (seen.has(command.id)) return false;
      seen.add(command.id);
      return true;
    });
}

function create(input: RuntimeSessionFactoryInput): RuntimeSession {
  const generatedWorld = RuntimeWorldBlueprints.build(createRuntimeStub(input), 96, 96);
  const state = input.initialState
    ? cloneSessionState({ ...input.initialState, world: input.initialState.world ?? generatedWorld })
    : input.sessionRegistry.createInitialState();

  if (state.world.width === 0 || state.world.height === 0 || state.world.tiles.length === 0) {
    state.world = cloneWorldBlueprint(generatedWorld);
  }

  if (!input.initialState && state.player.x === 3 && state.player.y === 3) {
    state.player.x = state.world.originX + Math.floor(state.world.width * 0.5);
    state.player.y = state.world.originY + Math.floor(state.world.height * 0.5);
  }

  const createCommandContext = (
    runtimeInput?: RuntimeCommandTrigger | Partial<RuntimeCommandInput>
  ): RuntimeCommandContext => {
    const normalizedInput = normalizeCommandInput(runtimeInput);
    return {
      content: input.content,
      session: cloneSessionState(state),
      ...normalizedInput
    };
  };

  const resolveCommands = (
    runtimeInput?: RuntimeCommandTrigger | Partial<RuntimeCommandInput>
  ): ResolvedCommand[] => {
    const context = createCommandContext(runtimeInput);
    return sortAndDeduplicateCommands(
      input.commandResolvers.flatMap((resolver) => resolver.resolve(context))
    );
  };

  const inspectWorldObject = (
    runtimeInput?: RuntimeCommandTrigger | Partial<RuntimeCommandInput>
  ): RuntimeWorldObjectDescriptor | null => {
    const context = createCommandContext(runtimeInput);

    for (const provider of input.worldObjects) {
      const descriptor = provider.inspect(context);
      if (descriptor) return descriptor;
    }

    return null;
  };

  const resolveWorldObjectInteractions = (
    runtimeInput?: RuntimeCommandTrigger | Partial<RuntimeCommandInput>
  ): RuntimeWorldObjectInteraction[] => {
    const context = createCommandContext(runtimeInput);
    const object = inspectWorldObject(runtimeInput);
    if (!object) return [];

    return sortAndDeduplicateCommands(
      input.worldObjectInteractions.flatMap((provider) => provider.collect({
        ...context,
        object
      }))
    );
  };

  const inspectSelectedInventorySlot = (
    runtimeInput?: RuntimeCommandTrigger | Partial<RuntimeCommandInput>
  ): RuntimeInventorySlotDescriptor | null => {
    const context = createCommandContext(runtimeInput);
    if (context.selectedSlot === null || context.selectedSlot === undefined) {
      return null;
    }

    const entry = context.session.inventory[context.selectedSlot];
    if (!entry) {
      return null;
    }

    for (const provider of input.inventorySelections) {
      const descriptor = provider.inspect({
        ...context,
        slotIndex: context.selectedSlot,
        entry
      });
      if (descriptor) return descriptor;
    }

    return null;
  };

  const resolveSelectedInventoryInteractions = (
    runtimeInput?: RuntimeCommandTrigger | Partial<RuntimeCommandInput>
  ): RuntimeInventoryInteraction[] => {
    const context = createCommandContext(runtimeInput);
    const descriptor = inspectSelectedInventorySlot(runtimeInput);
    if (!descriptor || context.selectedSlot === null || context.selectedSlot === undefined) {
      return [];
    }

    const entry = context.session.inventory[context.selectedSlot];
    if (!entry) {
      return [];
    }

    return sortAndDeduplicateCommands(
      input.inventoryInteractions.flatMap((provider) => provider.collect({
        ...context,
        slotIndex: context.selectedSlot,
        entry,
        descriptor
      }))
    );
  };

  const resolveCombinedInteractions = (
    runtimeInput?: RuntimeCommandTrigger | Partial<RuntimeCommandInput>
  ): RuntimeCombinedInteraction[] => {
    const context = createCommandContext(runtimeInput);
    const descriptor = inspectSelectedInventorySlot(runtimeInput);
    const object = inspectWorldObject(runtimeInput);
    if (
      !descriptor ||
      !object ||
      context.selectedSlot === null ||
      context.selectedSlot === undefined
    ) {
      return [];
    }

    const entry = context.session.inventory[context.selectedSlot];
    if (!entry) {
      return [];
    }

    return sortAndDeduplicateCommands(
      input.combinedInteractions.flatMap((provider) => provider.collect({
        ...context,
        slotIndex: context.selectedSlot,
        entry,
        descriptor,
        object
      }))
    );
  };

  return {
    tick(deltaSeconds) {
      for (const system of input.systems) {
        system.run?.({ deltaSeconds, state, content: input.content });
      }
      return cloneSessionState(state);
    },
    dispatchAction(actionId, command) {
      const action = input.actions.find((entry) => entry.id === actionId);
      if (!action) {
        return { ok: false, message: `Unknown action: ${actionId}` };
      }
      const result = action.execute({ state, content: input.content, command });
      state.logs.push(result.message);
      return result;
    },
    resolveCommands(runtimeInput) {
      return resolveCommands(runtimeInput);
    },
    executeCommand(commandId, runtimeInput) {
      const normalizedInput = normalizeCommandInput(runtimeInput);
      const command = [
        ...resolveCombinedInteractions(normalizedInput),
        ...resolveSelectedInventoryInteractions(normalizedInput),
        ...resolveWorldObjectInteractions(normalizedInput),
        ...resolveCommands(normalizedInput)
      ].find((entry) => entry.id === commandId);
      if (!command) {
        return { ok: false, message: `Unknown command: ${commandId}` };
      }
      if (!command.enabled) {
        return {
          ok: false,
          message: command.reasonDisabled ?? `${command.label} is unavailable.`
        };
      }
      return this.dispatchAction(command.actionId, {
        id: command.id,
        trigger: normalizedInput.trigger,
        payload: command.payload
      });
    },
    inspectWorldObject(runtimeInput) {
      return inspectWorldObject(runtimeInput);
    },
    inspectSelectedInventorySlot(runtimeInput) {
      return inspectSelectedInventorySlot(runtimeInput);
    },
    resolveCombinedInteractions(runtimeInput) {
      return resolveCombinedInteractions(runtimeInput);
    },
    resolveSelectedInventoryInteractions(runtimeInput) {
      return resolveSelectedInventoryInteractions(runtimeInput);
    },
    resolveWorldObjectInteractions(runtimeInput) {
      return resolveWorldObjectInteractions(runtimeInput);
    },
    snapshot() {
      return cloneSessionState(state);
    }
  };
}

export const RuntimeSessionFactory = {
  create
};
