import type { CommandHandler, CommandContext, GameCommand, GameCommandId } from './commandTypes';

const commandHandlers = new Map<GameCommandId, CommandHandler>();

export function registerCommandHandler(commandId: GameCommandId, handler: CommandHandler): void {
    commandHandlers.set(commandId, handler);
}

export function getCommandHandler(commandId: GameCommandId): CommandHandler | undefined {
    return commandHandlers.get(commandId);
}

export function executeRegisteredCommand(command: GameCommand, ctx: CommandContext): string {
    const handler = getCommandHandler(command.id);
    if (!handler) return `No handler registered for ${command.id}.`;
    return handler(command, ctx);
}

export function clearCommandHandlers(): void {
    commandHandlers.clear();
}
