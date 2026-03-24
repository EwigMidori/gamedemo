import type { CommandContext, CommandProvider, GameCommand } from './commandTypes';

const pointerCommandProviders: CommandProvider[] = [];
const globalCommandProviders: CommandProvider[] = [];

export function registerPointerCommandProvider(provider: CommandProvider): void {
    pointerCommandProviders.push(provider);
}

export function registerGlobalCommandProvider(provider: CommandProvider): void {
    globalCommandProviders.push(provider);
}

export function getPointerCommandProviders(): CommandProvider[] {
    return [...pointerCommandProviders];
}

export function getGlobalCommandProviders(): CommandProvider[] {
    return [...globalCommandProviders];
}

export function clearCommandProviders(): void {
    pointerCommandProviders.length = 0;
    globalCommandProviders.length = 0;
}

export function resolveProviderCommands(ctx: CommandContext, providers: CommandProvider[]): GameCommand[] {
    return providers.flatMap((provider) => provider(ctx));
}
