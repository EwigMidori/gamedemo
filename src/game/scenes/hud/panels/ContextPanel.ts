import Phaser from 'phaser';
import { HudPanel } from '../HudPanel';
import type { HudContext } from '../HudContext';
import { TEXT_ACCENT, TEXT_MUTED, TEXT_PRIMARY } from '../shared';
import { tileKey } from '../../constants';
import { getGroundAt, getResourceAt } from '../../terrain';
import {
    getResourceInspector,
    getResourceInspectLabel,
    getResourceDefinition,
    getStorageStructureAt,
    getStructureInspector,
    getStructureInspectLabel,
} from '../../../content/capabilities';
import { resolveCommands, type CommandContext } from '../../commands';

export class ContextPanel extends HudPanel {
    private root!: any;
    private background!: any;
    private title!: Phaser.GameObjects.Text;
    private targetLine!: Phaser.GameObjects.Text;
    private detailLine!: Phaser.GameObjects.Text;
    private actionLine!: Phaser.GameObjects.Text;
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
            space: { left: 10, right: 10, top: 8, bottom: 8, item: 4 },
        }).setScrollFactor(0).setDepth(depth);
        this.background = this.scene.rexUI.add.roundRectangle(0, 0, 10, 10, 8, 0x08110c, 0.84)
            .setStrokeStyle(1, 0xe9dfbf, 0.22)
            .setInteractive();
        this.root.addBackground(this.background);

        this.title = this.scene.add.text(0, 0, 'TARGET', {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: TEXT_MUTED,
        }).setScrollFactor(0).setDepth(depth + 1);
        this.targetLine = this.scene.add.text(0, 0, '', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: TEXT_ACCENT,
            wordWrap: { width: this.config.width - 20 },
        }).setScrollFactor(0).setDepth(depth + 1);
        this.detailLine = this.scene.add.text(0, 0, '', {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: TEXT_PRIMARY,
            wordWrap: { width: this.config.width - 20 },
        }).setScrollFactor(0).setDepth(depth + 1);
        this.actionLine = this.scene.add.text(0, 0, '', {
            fontFamily: 'monospace',
            fontSize: '9px',
            color: TEXT_MUTED,
            wordWrap: { width: this.config.width - 20 },
        }).setScrollFactor(0).setDepth(depth + 1);

        this.root.add(this.title, { expand: true });
        this.root.add(this.targetLine, { expand: true });
        this.root.add(this.detailLine, { expand: true });
        this.root.add(this.actionLine, { expand: true });

        this.objects.push(this.root, this.background, this.title, this.targetLine, this.detailLine, this.actionLine);
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
        this.config.width = this.compact ? 206 : this.baseConfig.width;
        this.config.height = this.compact ? 78 : 92;
        this.targetLine.setFontSize(this.compact ? '11px' : '12px');
        this.detailLine.setFontSize(this.compact ? '9px' : '10px');
        this.actionLine.setFontSize(this.compact ? '8px' : '9px');
        this.targetLine.setWordWrapWidth(this.config.width - 20);
        this.detailLine.setWordWrapWidth(this.config.width - 20);
        this.actionLine.setWordWrapWidth(this.config.width - 20);
    }

    update(ctx: HudContext): void {
        this.setVisible(!ctx.modalOpen && !this.tiny);
        if (this.tiny || ctx.modalOpen) return;
        this.targetLine.setText(this.describeTarget(ctx));
        this.detailLine.setText(this.describeDetails(ctx));
        this.actionLine.setText(this.describeActions(ctx));
    }

    protected onLayout(x: number, y: number): void {
        if (this.tiny) return;
        this.root
            .setMinSize(this.config.width, this.config.height)
            .setPosition(x, y)
            .layout();
    }

    private describeTarget(ctx: HudContext): string {
        if (!ctx.pointerTile) return 'POINT AT SOMETHING';
        const { x, y } = ctx.pointerTile;
        const key = tileKey(x, y);
        const ground = getGroundAt(x, y);
        const structure = ctx.structures.get(key);
        const resource = getResourceAt(
            x, y, ctx.worldTime, ctx.resourceRespawnAt, ctx.structures, ctx.plantedTrees, ctx.stoneHealth,
        );
        if (structure) return `${getStructureInspectLabel(structure).toUpperCase()}  ${x},${y}`;
        if (resource) return `${getResourceInspectLabel(resource).toUpperCase()}  ${x},${y}`;
        return `${ground.toUpperCase()}  ${x},${y}`;
    }

    private describeDetails(ctx: HudContext): string {
        if (!ctx.pointerTile) return 'MOVE CLOSER OR HOVER A TILE';
        const { x, y } = ctx.pointerTile;
        const key = tileKey(x, y);
        const structure = ctx.structures.get(key);
        const resource = getResourceAt(
            x, y, ctx.worldTime, ctx.resourceRespawnAt, ctx.structures, ctx.plantedTrees, ctx.stoneHealth,
        );
        const respawnAt = ctx.resourceRespawnAt.get(key);
        const plantedTreeAt = ctx.plantedTrees.get(key);
        const chestInventory = ctx.chestInventories.get(key);
        const storage = getStorageStructureAt(ctx.structures, key);
        const storageUsedSlots = chestInventory?.slots.filter((slot) => slot.itemId && slot.quantity > 0).length ?? 0;
        const storageTotalSlots = chestInventory?.slots.length ?? storage?.slots ?? 0;
        const stoneHitsLeft = resource === 'stone'
            ? (ctx.stoneHealth.get(key) ?? getResourceDefinition(resource)?.maxHits ?? 3)
            : undefined;
        const inspectCtx = {
            tx: x,
            ty: y,
            key,
            worldTime: ctx.worldTime,
            structureId: structure,
            resourceId: resource ?? undefined,
            resourceRespawnAt: respawnAt,
            plantedTreeAt,
            growProgress: ctx.farmProgress.get(key),
            storageUsedSlots,
            storageTotalSlots,
            stoneHitsLeft,
        };

        const details: string[] = [];
        if (structure) details.push(...(getStructureInspector(structure)?.(inspectCtx) ?? []).slice(0, 2));
        if (resource) details.push(...(getResourceInspector(resource)?.(inspectCtx) ?? []).slice(0, 2));
        if (!structure && !resource) details.push(`GROUND ${getGroundAt(x, y).toUpperCase()}`);
        if (respawnAt !== undefined && respawnAt > ctx.worldTime) details.push(`BACK ${Math.ceil(respawnAt - ctx.worldTime)}S`);
        if (details.length === 0) details.push('NOTHING SPECIAL HERE');
        return details.join('  ');
    }

    private describeActions(ctx: HudContext): string {
        const actions = this.getAvailableActions(ctx);
        if (actions.length === 0) return 'NO ACTIONS';
        return actions.slice(0, 2).map((action) => `${action.key} ${action.label}`).join('  ').toUpperCase();
    }

    private getAvailableActions(ctx: HudContext): Array<{ key: string; label: string }> {
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
