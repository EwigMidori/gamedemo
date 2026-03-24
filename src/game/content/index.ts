import {
    createContentRegistry,
    registerEntityKind,
    registerItem,
    registerRecipe,
    registerResource,
    type GameContentRegistry,
    type RegisteredEntityKind,
    type RegisteredItemDefinition,
    type RegisteredRecipeDefinition,
    type RegisteredResourceDefinition,
} from './registry';
import {
    registerCommandHandler,
    registerGlobalCommandProvider,
    registerPointerCommandProvider,
    type CommandHandler,
    type CommandProvider,
    type GameCommandId,
} from '../scenes/commands';
import { installVanillaContent } from './vanilla';
import { installVanillaCommandHandlers } from '../scenes/vanillaCommands';
import { installVanillaCommandProviders } from '../scenes/vanillaCommandProviders';

export interface GameMod {
    readonly id: string;
    readonly version?: string;
    readonly dependsOn?: string[];
    readonly items?: RegisteredItemDefinition[];
    readonly recipes?: RegisteredRecipeDefinition[];
    readonly entityKinds?: RegisteredEntityKind[];
    readonly resources?: RegisteredResourceDefinition[];
    readonly commandHandlers?: Array<{ commandId: GameCommandId; handler: CommandHandler }>;
    readonly pointerCommandProviders?: CommandProvider[];
    readonly globalCommandProviders?: CommandProvider[];
    install?(api: ModApi): void;
}

export interface ModApi {
    registerItem(item: RegisteredItemDefinition): void;
    registerRecipe(recipe: RegisteredRecipeDefinition): void;
    registerEntityKind(kind: RegisteredEntityKind): void;
    registerResource(resource: RegisteredResourceDefinition): void;
    registerCommandHandler(commandId: GameCommandId, handler: CommandHandler): void;
    registerPointerCommandProvider(provider: CommandProvider): void;
    registerGlobalCommandProvider(provider: CommandProvider): void;
    installMod(mod: GameMod): void;
}

export const gameContentRegistry: GameContentRegistry = createContentRegistry();

const installedMods = new Map<string, GameMod>();

export function createModApi(registry: GameContentRegistry = gameContentRegistry): ModApi {
    const api: ModApi = {
        registerItem(item) {
            registerItem(registry, item);
        },
        registerRecipe(recipe) {
            registerRecipe(registry, recipe);
        },
        registerEntityKind(kind) {
            registerEntityKind(registry, kind);
        },
        registerResource(resource) {
            registerResource(registry, resource);
        },
        registerCommandHandler(commandId, handler) {
            registerCommandHandler(commandId, handler);
        },
        registerPointerCommandProvider(provider) {
            registerPointerCommandProvider(provider);
        },
        registerGlobalCommandProvider(provider) {
            registerGlobalCommandProvider(provider);
        },
        installMod(mod) {
            installMod(mod, registry);
        },
    };

    return api;
}

export function installMod(mod: GameMod, registry: GameContentRegistry = gameContentRegistry): void {
    if (installedMods.has(mod.id)) return;

    for (const dependencyId of mod.dependsOn ?? []) {
        if (!installedMods.has(dependencyId)) {
            throw new Error(`Mod ${mod.id} requires missing dependency ${dependencyId}.`);
        }
    }

    const api = createModApi(registry);

    for (const item of mod.items ?? []) api.registerItem(item);
    for (const recipe of mod.recipes ?? []) api.registerRecipe(recipe);
    for (const kind of mod.entityKinds ?? []) api.registerEntityKind(kind);
    for (const resource of mod.resources ?? []) api.registerResource(resource);
    for (const entry of mod.commandHandlers ?? []) api.registerCommandHandler(entry.commandId, entry.handler);
    for (const provider of mod.pointerCommandProviders ?? []) api.registerPointerCommandProvider(provider);
    for (const provider of mod.globalCommandProviders ?? []) api.registerGlobalCommandProvider(provider);

    mod.install?.(api);
    installedMods.set(mod.id, mod);
}

export function isModInstalled(modId: string): boolean {
    return installedMods.has(modId);
}

export function getInstalledMods(): GameMod[] {
    return [...installedMods.values()];
}

export const vanillaMod: GameMod = {
    id: 'core:vanilla',
    version: '1.0.0',
    install(api) {
        const registry = createContentRegistry();
        installVanillaContent(registry);
        for (const item of registry.items.values()) api.registerItem(item);
        for (const recipe of registry.recipes.values()) api.registerRecipe(recipe);
        for (const kind of registry.entityKinds.values()) api.registerEntityKind(kind);
        for (const resource of registry.resources.values()) api.registerResource(resource);
        installVanillaCommandHandlers();
        installVanillaCommandProviders();
    },
};

installMod(vanillaMod);
