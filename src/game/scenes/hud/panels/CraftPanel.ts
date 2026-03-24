import Phaser from 'phaser';
import { HudPanel } from '../HudPanel';
import type { HudContext } from '../HudContext';
import { SLOT_BORDER, SLOT_FILL, TEXT_ACCENT, TEXT_MUTED, TEXT_PRIMARY } from '../shared';
import { CRAFT_RECIPES, type InventoryKey, type RecipeId } from '../../constants';
import { canCraftRecipe, getItemCount } from '../../inventory';
import { uiFrameForItem } from '../../uiFrames';
import { getStationLabel } from '../../../content/capabilities';

interface RexRecipeRow {
    recipeId: RecipeId;
    container: any;
    background: Phaser.GameObjects.Shape;
    icon: Phaser.GameObjects.Image;
    nameText: Phaser.GameObjects.Text;
    costText: Phaser.GameObjects.Text;
    statusText: Phaser.GameObjects.Text;
}

export class CraftPanel extends HudPanel {
    private backdrop!: Phaser.GameObjects.Rectangle;
    private root!: any;
    private title!: Phaser.GameObjects.Text;
    private content!: any;
    private hint!: Phaser.GameObjects.Text;
    private background!: Phaser.GameObjects.Shape;
    private compact = false;
    private tiny = false;
    private rows: RexRecipeRow[] = [];
    private lastLayoutWidth = -1;
    private lastLayoutHeight = -1;
    private readonly onSelectRecipe: (recipeId: RecipeId) => void;
    private readonly onCraftRecipe: (recipeId: RecipeId) => void;
    private readonly onClose: () => void;

    constructor(
        scene: Phaser.Scene,
        config: ConstructorParameters<typeof HudPanel>[1],
        onSelectRecipe: (recipeId: RecipeId) => void,
        onCraftRecipe: (recipeId: RecipeId) => void,
        onClose: () => void,
    ) {
        super(scene, config);
        this.onSelectRecipe = onSelectRecipe;
        this.onCraftRecipe = onCraftRecipe;
        this.onClose = onClose;
        this.init();
    }

    protected create(): void {
        const depth = this.config.depth ?? 100;
        this.backdrop = this.scene.add.rectangle(0, 0, 10, 10, 0x000000, 0.45)
            .setOrigin(0)
            .setScrollFactor(0)
            .setDepth(depth - 1)
            .setInteractive()
            .on('pointerdown', (pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
                event.stopPropagation();
                if (this.isPointerInsidePanel(pointer)) return;
                this.onClose();
            });
        this.root = this.scene.rexUI.add.sizer({
            orientation: 'y',
            originX: 0,
            originY: 0,
            space: { left: 12, right: 12, top: 10, bottom: 10, item: 6 },
        }).setScrollFactor(0).setDepth(depth);
        this.background = this.scene.rexUI.add.roundRectangle(0, 0, 10, 10, 7, 0x08110c, 0.9)
            .setStrokeStyle(1, 0xe9dfbf, 0.24)
            .setInteractive()
            .on('pointerdown', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
                event.stopPropagation();
            });
        this.root.addBackground(this.background);

        this.title = this.scene.add.text(0, 0, 'WORKBENCH', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: TEXT_MUTED,
        }).setScrollFactor(0).setDepth(depth + 1);
        this.content = this.scene.rexUI.add.sizer({
            orientation: 'y',
            space: { item: 4 },
        }).setScrollFactor(0).setDepth(depth + 1);
        this.hint = this.scene.add.text(0, 0, 'Click to craft', {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: TEXT_MUTED,
        }).setScrollFactor(0).setDepth(depth + 1);

        this.root.add(this.title);
        this.root.add(this.content);
        this.root.add(this.hint);

        for (const recipe of CRAFT_RECIPES) {
            const row = this.createRow(recipe.id, depth + 1);
            this.rows.push(row);
            this.content.add(row.container);
        }

        this.objects.push(this.backdrop, this.root, this.background, this.title, this.content, this.hint);
        for (const row of this.rows) {
            this.objects.push(row.container, row.background, row.icon, row.nameText, row.costText, row.statusText);
        }
    }

    protected beforeLayout(screenW: number, screenH: number): void {
        this.tiny = screenW < 520 || screenH < 360;
        this.compact = screenW < 760 || screenH < 460;
        this.config.width = this.compact ? Math.min(280, screenW - 32) : Math.min(320, screenW - 48);
        this.title.setFontSize(this.compact ? '10px' : '12px');
        this.hint.setFontSize(this.compact ? '9px' : '10px');
        for (const row of this.rows) {
            row.nameText.setFontSize(this.compact ? '10px' : '11px');
            row.costText.setFontSize(this.compact ? '9px' : '10px');
            row.statusText.setFontSize(this.compact ? '9px' : '10px');
        }
    }

    update(ctx: HudContext): void {
        const stationId = ctx.stationPanelOpen ? ctx.openedStationId : null;
        const availableRecipes = stationId
            ? CRAFT_RECIPES.filter((recipe) => recipe.station === stationId && ctx.nearbyStations.has(stationId))
            : [];
        const visible = ctx.stationPanelOpen && !this.tiny && availableRecipes.length > 0;
        this.setVisible(visible);
        if (!visible) {
            return;
        }

        const rowHeight = this.compact ? 32 : 34;
        this.config.height = 18 + availableRecipes.length * (rowHeight + 4) + 20;
        this.content.setMinSize(this.config.width - 24, availableRecipes.length * (rowHeight + 4));
        this.title.setText(stationId ? getStationLabel(stationId).toUpperCase() : 'WORKBENCH');

        for (const row of this.rows) {
            const recipe = CRAFT_RECIPES.find((entry) => entry.id === row.recipeId);
            if (!recipe) {
                row.container.setVisible(false);
                continue;
            }

            const available = !!recipe.station && ctx.nearbyStations.has(recipe.station);
            const selected = recipe.id === ctx.selectedRecipeId;
            const ready = available && canCraftRecipe(ctx.inventory, recipe);
            row.container.setVisible(available);
            if (!available) {
                continue;
            }

            row.container.setMinSize(this.config.width - 20, rowHeight);
            row.icon.setFrame(uiFrameForItem(recipe.output.itemId));
            row.nameText.setText(`${recipe.label} x${recipe.output.quantity}`);
            row.nameText.setColor(selected ? TEXT_ACCENT : TEXT_PRIMARY);
            row.costText.setText(this.describeCost(recipe.cost, ctx));
            row.costText.setColor(ready ? TEXT_MUTED : '#d99872');
            row.statusText.setText(ready ? 'READY' : 'MISS');
            row.statusText.setColor(ready ? '#91c483' : TEXT_MUTED);
            row.background
                .setFillStyle(selected ? 0x1d3323 : SLOT_FILL, 0.96)
                .setStrokeStyle(selected ? 2 : 1, selected ? 0xf3c96b : SLOT_BORDER, 1);
        }

        if (this.lastLayoutWidth !== this.config.width || this.lastLayoutHeight !== this.config.height) {
            this.lastLayoutWidth = this.config.width;
            this.lastLayoutHeight = this.config.height;
            this.layout(ctx.scaleWidth, ctx.scaleHeight);
        }
    }

    protected onLayout(_x: number, _y: number, screenW: number, screenH: number): void {
        this.backdrop.setPosition(0, 0).setSize(screenW, screenH);
        const x = Math.floor((screenW - this.config.width) * 0.5);
        const y = Math.max(24, Math.floor((screenH - this.config.height) * 0.5) - 28);
        this.root
            .setMinSize(this.config.width, this.config.height)
            .setPosition(x, y)
            .layout();
    }

    private createRow(recipeId: RecipeId, depth: number): RexRecipeRow {
        const handleClick = (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
            event.stopPropagation();
            this.onSelectRecipe(recipeId);
            this.onCraftRecipe(recipeId);
        };

        const background = this.scene.rexUI.add.roundRectangle(0, 0, 10, 10, 5, SLOT_FILL, 0.96)
            .setStrokeStyle(1, SLOT_BORDER, 1)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', handleClick);

        const icon = this.scene.add.image(0, 0, 'ui', 0)
            .setScrollFactor(0)
            .setDepth(depth + 1)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', handleClick);
        const nameText = this.scene.add.text(0, 0, '', {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: TEXT_PRIMARY,
        }).setScrollFactor(0).setDepth(depth + 1)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', handleClick);
        const costText = this.scene.add.text(0, 0, '', {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: TEXT_MUTED,
        }).setScrollFactor(0).setDepth(depth + 1)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', handleClick);
        const statusText = this.scene.add.text(0, 0, '', {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: TEXT_MUTED,
        }).setScrollFactor(0).setDepth(depth + 1)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', handleClick);

        const textColumn = this.scene.rexUI.add.sizer({
            orientation: 'y',
            space: { item: 0 },
        }).setScrollFactor(0).setDepth(depth + 1);
        textColumn.add(nameText, { expand: true });
        textColumn.add(costText, { expand: true });

        const container = this.scene.rexUI.add.sizer({
            orientation: 'x',
            space: { left: 8, right: 8, top: 4, bottom: 4, item: 8 },
        }).setScrollFactor(0).setDepth(depth);
        container.addBackground(background);
        container.add(icon, { padding: { left: 2, right: 2 }, align: 'center' });
        container.add(textColumn, { proportion: 1, expand: true, align: 'center' });
        container.add(statusText, { align: 'center' });

        return { recipeId, container, background, icon, nameText, costText, statusText };
    }

    private describeCost(cost: Partial<Record<InventoryKey, number>>, ctx: HudContext): string {
        return (Object.keys(cost) as InventoryKey[])
            .map((key) => `${key} ${getItemCount(ctx.inventory, key)}/${cost[key]}`)
            .join('  ');
    }

    private isPointerInsidePanel(pointer: Phaser.Input.Pointer): boolean {
        const bounds = this.background.getBounds();
        return bounds.contains(pointer.x, pointer.y);
    }
}
