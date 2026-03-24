import Phaser from 'phaser';
import { HudManager } from './hud/HudManager';
import { TitlePanel } from './hud/panels/TitlePanel';
import { StatusPanel } from './hud/panels/StatusPanel';
import { BuildPanel } from './hud/panels/BuildPanel';
import { ContextPanel } from './hud/panels/ContextPanel';
import { InventoryPanel } from './hud/panels/InventoryPanel';
import { HandCraftPanel } from './hud/panels/HandCraftPanel';
import { CraftPanel } from './hud/panels/CraftPanel';
import { ToastPanel } from './hud/panels/ToastPanel';
import type { RecipeId } from './constants';
import type { HudContext } from './hud/HudContext';

export class Hud {
    private manager: HudManager;

    constructor(
        scene: Phaser.Scene,
        onSelectSlot: (index: number) => void,
        onSelectRecipe: (recipeId: RecipeId) => void,
        onCraftRecipe: (recipeId: RecipeId) => void,
        onCloseHandcraft: () => void,
        onCloseCraft: () => void,
    ) {
        this.manager = new HudManager(scene);

        this.manager.addPanel('title', new TitlePanel(scene, {
            anchor: 'top-left', offsetX: 12, offsetY: 10,
            width: 150, height: 24, depth: 100,
        }));

        this.manager.addPanel('status', new StatusPanel(scene, {
            anchor: 'top-left', offsetX: 12, offsetY: 42,
            width: 248, height: 84, depth: 100,
        }));

        this.manager.addPanel('build', new BuildPanel(scene, {
            anchor: 'bottom-left', offsetX: 12, offsetY: 48,
            width: 232, height: 60, depth: 100,
        }));

        this.manager.addPanel('context', new ContextPanel(scene, {
            anchor: 'top-right', offsetX: 12, offsetY: 10,
            width: 228, height: 132, depth: 100,
        }));

        this.manager.addPanel('inventory', new InventoryPanel(
            scene,
            {
                anchor: 'bottom-center', offsetX: 0, offsetY: 12,
                width: 420, height: 44, depth: 100,
            },
            onSelectSlot,
        ));

        this.manager.addPanel('handcraft', new HandCraftPanel(
            scene,
            {
                anchor: 'top-center', offsetX: 0, offsetY: 38,
                width: 300, height: 74, depth: 106,
            },
            onSelectRecipe,
            onCraftRecipe,
            onCloseHandcraft,
        ));

        this.manager.addPanel('craft', new CraftPanel(
            scene,
            {
                anchor: 'bottom-right', offsetX: 12, offsetY: 72,
                width: 300, height: 154, depth: 106,
            },
            onSelectRecipe,
            onCraftRecipe,
            onCloseCraft,
        ));

        this.manager.addPanel('toast', new ToastPanel(scene, {
            anchor: 'bottom-center', offsetX: 0, offsetY: 120,
            width: 20, height: 30, depth: 110,
        }));

    }

    getObjects(): Phaser.GameObjects.GameObject[] {
        return this.manager.getObjects();
    }

    onResize(width: number, height: number): void {
        this.manager.onResize(width, height);
    }

    toast(message: string, seconds: number, worldTime: number): void {
        this.manager.toast(message, seconds, worldTime);
    }

    update(ctx: HudContext): void {
        this.manager.update(ctx);
    }
}
