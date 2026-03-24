import {
    executeBreakAction,
    executeCraftRecipeAction,
    executePlaceStructureAction,
    executePlantAction,
    executeProcessItemAction,
    executeStoreItemAction,
    executeTakeItemAction,
    executeUseItemAction,
} from './commandActions';
import { registerCommandHandler } from './commandRegistry';

export function installVanillaCommandHandlers(): void {
    registerCommandHandler('break-target', (command, ctx) => executeBreakAction(command, ctx));
    registerCommandHandler('plant-item', (command, ctx) => executePlantAction(command, ctx));
    registerCommandHandler('place-structure', (command, ctx) => executePlaceStructureAction(command, ctx));
    registerCommandHandler('store-item', (command, ctx) => executeStoreItemAction(command, ctx));
    registerCommandHandler('take-item', (command, ctx) => executeTakeItemAction(command, ctx));
    registerCommandHandler('use-item', (_command, ctx) => executeUseItemAction(ctx));
    registerCommandHandler('craft-recipe', (_command, ctx) => executeCraftRecipeAction(ctx));
    registerCommandHandler('process-item', (_command, ctx) => executeProcessItemAction(ctx));
}
