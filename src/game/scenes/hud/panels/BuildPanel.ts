import Phaser from 'phaser';
import { HudPanel } from '../HudPanel';
import type { HudContext } from '../HudContext';
import { TEXT_ACCENT, TEXT_MUTED, TEXT_PRIMARY } from '../shared';
import type { InventoryKey, Inventory, ItemId, RecipeId, StructureType } from '../../constants';
import { CRAFT_RECIPES, STRUCTURE_COST } from '../../constants';
import { getItemCount } from '../../inventory';
import { getConsumableDefinition, getItemLabel, getPlantableDefinition, getPlaceableStructureForItem, getProcessableDefinition, getRecipeDefinition, getStationLabel, getStorageSlots, getStructureLabel } from '../../../content/capabilities';
import { getPrimaryCommand, resolveCommands, type CommandContext } from '../../commands';

export class BuildPanel extends HudPanel {
    private root!: any;
    private background!: any;
    private title!: Phaser.GameObjects.Text;
    private handLabel!: Phaser.GameObjects.Text;
    private primaryLine!: Phaser.GameObjects.Text;
    private secondaryLine!: Phaser.GameObjects.Text;
    private compact = false;
    private tiny = false;

    constructor(scene: Phaser.Scene, config: ConstructorParameters<typeof HudPanel>[1]) {
        super(scene, config);
        this.init();
    }

    protected create(): void {
        const depth = this.config.depth ?? 100;
        this.root = this.scene.rexUI.add.sizer({
            orientation: 'y',
            originX: 0,
            originY: 0,
            space: { left: 10, right: 10, top: 8, bottom: 8, item: 3 },
        }).setScrollFactor(0).setDepth(depth);
        this.background = this.scene.rexUI.add.roundRectangle(0, 0, 10, 10, 8, 0x08110c, 0.84)
            .setStrokeStyle(1, 0xe9dfbf, 0.22)
            .setInteractive();
        this.root.addBackground(this.background);

        this.title = this.scene.add.text(0, 0, 'ACTION', {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: TEXT_MUTED,
        }).setScrollFactor(0).setDepth(depth + 1);
        this.handLabel = this.scene.add.text(0, 0, '', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: TEXT_ACCENT,
        }).setScrollFactor(0).setDepth(depth + 1);
        this.primaryLine = this.scene.add.text(0, 0, '', {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: TEXT_PRIMARY,
            wordWrap: { width: this.config.width - 20 },
        }).setScrollFactor(0).setDepth(depth + 1);
        this.secondaryLine = this.scene.add.text(0, 0, '', {
            fontFamily: 'monospace',
            fontSize: '9px',
            color: TEXT_MUTED,
            wordWrap: { width: this.config.width - 20 },
        }).setScrollFactor(0).setDepth(depth + 1);

        this.root.add(this.title, { expand: true });
        this.root.add(this.handLabel, { expand: true });
        this.root.add(this.primaryLine, { expand: true });
        this.root.add(this.secondaryLine, { expand: true });

        this.objects.push(this.root, this.background, this.title, this.handLabel, this.primaryLine, this.secondaryLine);
    }

    protected beforeLayout(screenW: number, screenH: number): void {
        this.tiny = screenW < 520 || screenH < 360;
        this.compact = screenW < 760 || screenH < 460;

        if (this.tiny) {
            this.config.width = 0;
            this.config.height = 0;
            this.setVisible(false);
            return;
        }

        this.setVisible(true);
        this.config.width = this.compact ? 220 : this.baseConfig.width;
        this.config.height = this.compact ? 64 : 72;
        this.handLabel.setFontSize(this.compact ? '11px' : '12px');
        this.primaryLine.setFontSize(this.compact ? '9px' : '10px');
        this.secondaryLine.setFontSize(this.compact ? '8px' : '9px');
        this.primaryLine.setWordWrapWidth(this.config.width - 20);
        this.secondaryLine.setWordWrapWidth(this.config.width - 20);
    }

    update(ctx: HudContext): void {
        this.setVisible(!ctx.modalOpen && !this.tiny);
        if (this.tiny || ctx.modalOpen) return;
        this.handLabel.setText(this.describeHeldItem(ctx.heldItemId));
        this.primaryLine.setText(this.describeNextStep(ctx));
        this.secondaryLine.setText(this.describeFollowUp(ctx));
    }

    protected onLayout(x: number, y: number): void {
        if (this.tiny) return;
        this.root
            .setMinSize(this.config.width, this.config.height)
            .setPosition(x, y)
            .layout();
    }

    private describeBuildCost(selectedStructure: StructureType | null, inventory: Inventory): string {
        if (!selectedStructure) return '';
        const cost = STRUCTURE_COST[selectedStructure];
        const parts: string[] = [];
        let ok = true;
        for (const key of Object.keys(cost) as InventoryKey[]) {
            const amount = cost[key] ?? 0;
            const have = getItemCount(inventory, key);
            if (have < amount) ok = false;
            parts.push(`${key} ${have}/${amount}`);
        }
        return `${ok ? 'Ready' : 'Need'} ${parts.join('  ')}`;
    }

    private describeHeldItem(itemId: ItemId | null): string {
        if (!itemId) return 'HAND EMPTY';
        return `HAND ${getItemLabel(itemId).toUpperCase()}`;
    }

    private describeNextStep(ctx: HudContext): string {
        const command = this.getPrimaryCommand(ctx);
        if (command) {
            return `${command.key} ${command.label}`.toUpperCase();
        }
        if (!ctx.heldItemId) return 'HOLD LMB TO BREAK OR RMB TO USE';
        if (ctx.selectedStructure) return `RMB PLACE ${getStructureLabel(ctx.selectedStructure).toUpperCase()}`;
        if (ctx.heldItemId && getConsumableDefinition(ctx.heldItemId)) return 'F OR R USE ITEM';
        const recipeStation = getRecipeDefinition(ctx.selectedRecipeId)?.station;
        if (recipeStation && ctx.nearbyStations.has(recipeStation)) {
            return `CLICK ${this.recipeLabel(ctx.selectedRecipeId)} TO CRAFT`;
        }
        const processable = ctx.heldItemId ? getProcessableDefinition(ctx.heldItemId) : undefined;
        if (processable) {
            if (ctx.nearbyStations.has(processable.station)) return 'RMB STATION TO PROCESS';
            return `BUILD ${getStationLabel(processable.station).toUpperCase()}`;
        }
        if (ctx.heldItemId && getPlantableDefinition(ctx.heldItemId)) return 'RMB VALID GROUND TO PLANT';
        const placeable = ctx.heldItemId ? getPlaceableStructureForItem(ctx.heldItemId) : null;
        if (placeable) return `RMB PLACE ${getStructureLabel(placeable).toUpperCase()}`;
        return 'USE OR BREAK SOMETHING';
    }

    private describeFollowUp(ctx: HudContext): string {
        const commands = this.getCommands(ctx);
        if (commands.length > 1) {
            return commands.slice(1, 3).map((command) => `${command.key} ${command.label}`).join('  ').toUpperCase();
        }
        if (ctx.selectedStructure) return this.describeBuildCost(ctx.selectedStructure, ctx.inventory);
        const recipeStation = getRecipeDefinition(ctx.selectedRecipeId)?.station;
        if (recipeStation && ctx.nearbyStations.has(recipeStation)) {
            const recipe = getRecipeDefinition(ctx.selectedRecipeId);
            if (!recipe) return '';
            return Object.entries(recipe.cost)
                .map(([itemId, amount]) => `${itemId} ${getItemCount(ctx.inventory, itemId)}/${amount}`)
                .join('  ');
        }
        const processable = ctx.heldItemId ? getProcessableDefinition(ctx.heldItemId) : undefined;
        if (processable && ctx.nearbyStations.has(processable.station)) return processable.missingMessage;
        if (ctx.heldItemId && getConsumableDefinition(ctx.heldItemId)) return 'FOOD AND HEAL ITEMS ARE USED WITH F OR R';
        if (ctx.heldItemId && getPlantableDefinition(ctx.heldItemId)) return 'SAPLINGS NEED VALID GROUND';
        const placeable = ctx.heldItemId ? getPlaceableStructureForItem(ctx.heldItemId) : null;
        if (placeable) {
            const storageSlots = getStorageSlots(placeable);
            if (storageSlots !== null) return 'RMB STORAGE TO USE, SHIFT+RMB FORCE PLACE';
            return `${getStructureLabel(placeable).toUpperCase()} CAN BE PLACED ON EMPTY GROUND`;
        }
        return 'BREAK TREES AND STONE FIRST';
    }

    private recipeLabel(recipeId: RecipeId): string {
        return CRAFT_RECIPES.find((recipe) => recipe.id === recipeId)?.label.toUpperCase() ?? recipeId.toUpperCase();
    }

    private getPrimaryCommand(ctx: HudContext) {
        return getPrimaryCommand(this.getCommands(ctx));
    }

    private getCommands(ctx: HudContext) {
        const commandCtx: CommandContext = {
            playerX: ctx.playerX,
            playerY: ctx.playerY,
            worldTime: ctx.worldTime,
            inventory: ctx.inventory,
            needs: ctx.needs,
            resourceRespawnAt: ctx.resourceRespawnAt,
            plantedTrees: ctx.plantedTrees,
            stoneHealth: ctx.stoneHealth,
            chestInventories: ctx.chestInventories,
            farmProgress: ctx.farmProgress,
            structures: ctx.structures,
            droppedItems: ctx.droppedItems,
            heldItemId: ctx.heldItemId,
            selectedStructure: ctx.selectedStructure,
            selectedRecipeId: ctx.selectedRecipeId,
            activeSlotIndex: ctx.activeSlotIndex,
            pointerTile: ctx.pointerTile,
        };

        return resolveCommands(commandCtx);
    }
}
