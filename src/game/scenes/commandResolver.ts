import type { CommandContext, GameCommand } from './commandTypes';
import { getGlobalCommandProviders, getPointerCommandProviders, resolveProviderCommands } from './commandProviderRegistry';

export interface PointerCommandVisuals {
    stroke: number;
    fill: number;
    width: number;
    alpha: number;
}

function dedupeCommands(commands: GameCommand[]): GameCommand[] {
    const seen = new Set<string>();
    return commands.filter((command) => {
        const dedupeKey = `${command.id}:${command.key}:${command.tx ?? ''}:${command.ty ?? ''}`;
        if (seen.has(dedupeKey)) return false;
        seen.add(dedupeKey);
        return true;
    });
}

export function resolvePointerCommands(ctx: CommandContext): GameCommand[] {
    return dedupeCommands(resolveProviderCommands(ctx, getPointerCommandProviders()));
}

export function resolveGlobalCommands(ctx: CommandContext): GameCommand[] {
    return dedupeCommands(resolveProviderCommands(ctx, getGlobalCommandProviders()));
}

export function resolveCommands(ctx: CommandContext): GameCommand[] {
    return dedupeCommands([
        ...resolvePointerCommands(ctx),
        ...resolveGlobalCommands(ctx),
    ]);
}

export function findCommandByKey(commands: GameCommand[], key: string): GameCommand | null {
    return commands.find((command) => command.key === key) ?? null;
}

export function getPrimaryCommand(commands: GameCommand[]): GameCommand | null {
    const priority: Record<string, number> = {
        'break-target': 110,
        'plant-item': 90,
        'place-structure': 80,
        'store-item': 70,
        'take-item': 60,
        'craft-recipe': 50,
        'process-item': 45,
        'use-item': 40,
        'remove-structure': 30,
    };

    return [...commands].sort((a, b) => (priority[b.id] ?? 0) - (priority[a.id] ?? 0))[0] ?? null;
}

export function getPointerCommandVisuals(commands: GameCommand[]): PointerCommandVisuals {
    if (commands.some((command) => command.id === 'break-target')) {
        return { stroke: 0xe39b63, fill: 0x2d1a12, width: 2, alpha: 0.12 };
    }

    if (commands.some((command) => command.id === 'plant-item' || command.id === 'place-structure')) {
        return { stroke: 0xf3c96b, fill: 0x2a2315, width: 2, alpha: 0.09 };
    }

    if (commands.some((command) => command.id === 'store-item' || command.id === 'take-item')) {
        return { stroke: 0x7cc9d8, fill: 0x14222a, width: 2, alpha: 0.08 };
    }

    if (commands.some((command) => command.id === 'remove-structure')) {
        return { stroke: 0xd99872, fill: 0x2a1b17, width: 2, alpha: 0.08 };
    }

    return { stroke: 0xf6f2d7, fill: 0x142018, width: 1, alpha: 0 };
}
