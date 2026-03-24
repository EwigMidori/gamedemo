import { executeRegisteredCommand } from './commandRegistry';
import type { CommandContext, GameCommand } from './commandTypes';

export function executeCommand(command: GameCommand, ctx: CommandContext): string {
    return executeRegisteredCommand(command, ctx);
}
