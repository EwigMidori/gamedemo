import Phaser from 'phaser';
import { HudPanel } from '../HudPanel';
import type { HudContext } from '../HudContext';
import { TEXT_MUTED, TEXT_PRIMARY } from '../shared';
import { DAY_LENGTH, worldToTile } from '../../constants';
import { UI_FRAME } from '../../uiFrames';

const BAR_BG = 0x142018;
const HP_BAR = 0xbc4b51;
const HUNGER_BAR = 0xd4a24c;

interface MeterRow {
    row: any;
    icon: Phaser.GameObjects.Image;
    barBg: any;
    barFill: any;
    value: Phaser.GameObjects.Text;
}

export class StatusPanel extends HudPanel {
    private root!: any;
    private background!: Phaser.GameObjects.Shape;
    private title!: Phaser.GameObjects.Text;
    private meta!: Phaser.GameObjects.Text;
    private hp!: MeterRow;
    private hunger!: MeterRow;
    private compact = false;
    private tiny = false;
    private barWidth = 120;

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
            space: { left: 10, right: 10, top: 8, bottom: 8, item: 6 },
        }).setScrollFactor(0).setDepth(depth);
        this.background = this.scene.rexUI.add.roundRectangle(0, 0, 10, 10, 8, 0x08110c, 0.84)
            .setStrokeStyle(1, 0xe9dfbf, 0.22)
            .setInteractive();
        this.root.addBackground(this.background);

        this.title = this.scene.add.text(0, 0, 'STATUS', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: TEXT_MUTED,
        }).setScrollFactor(0).setDepth(depth + 1);
        this.meta = this.scene.add.text(0, 0, '', {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: TEXT_MUTED,
        }).setScrollFactor(0).setDepth(depth + 1);

        this.hp = this.createMeterRow(UI_FRAME.heartFull, HP_BAR, depth + 1);
        this.hunger = this.createMeterRow(UI_FRAME.food, HUNGER_BAR, depth + 1);

        this.root.add(this.title, { expand: true });
        this.root.add(this.meta, { expand: true });
        this.root.add(this.hp.row, { expand: true });
        this.root.add(this.hunger.row, { expand: true });

        this.objects.push(
            this.root,
            this.background,
            this.title,
            this.meta,
            this.hp.row,
            this.hp.icon,
            this.hp.barBg,
            this.hp.barFill,
            this.hp.value,
            this.hunger.row,
            this.hunger.icon,
            this.hunger.barBg,
            this.hunger.barFill,
            this.hunger.value,
        );
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
        this.config.height = this.compact ? 70 : 82;
        this.barWidth = this.compact ? 104 : 128;
        this.title.setFontSize(this.compact ? '10px' : '12px');
        this.meta.setFontSize(this.compact ? '9px' : '10px');
        this.hp.value.setFontSize(this.compact ? '9px' : '10px');
        this.hunger.value.setFontSize(this.compact ? '9px' : '10px');
        this.hp.row.setMinSize(this.config.width - 20, 12);
        this.hunger.row.setMinSize(this.config.width - 20, 12);
    }

    update(ctx: HudContext): void {
        this.setVisible(!ctx.modalOpen && !this.tiny);
        if (this.tiny || ctx.modalOpen) return;

        const dayPercent = Math.floor(((ctx.worldTime % DAY_LENGTH) / DAY_LENGTH) * 100);
        const tx = worldToTile(ctx.playerX);
        const ty = worldToTile(ctx.playerY);
        this.meta.setText(
            this.compact
                ? `D${ctx.day} ${dayPercent}%  ${tx},${ty}`
                : `Day ${ctx.day}  ${dayPercent}%  Zoom ${ctx.cameraZoom.toFixed(1)}  ${tx},${ty}`,
        );

        this.hp.value.setText(`${Math.round(ctx.needs.health)}`);
        this.hunger.value.setText(`${Math.round(ctx.needs.hunger)}`);
        this.hp.barFill.setSize(this.barWidth * Phaser.Math.Clamp(ctx.needs.health / 100, 0, 1), 8);
        this.hunger.barFill.setSize(this.barWidth * Phaser.Math.Clamp(ctx.needs.hunger / 100, 0, 1), 8);
    }

    protected onLayout(x: number, y: number): void {
        if (this.tiny) return;
        this.root
            .setMinSize(this.config.width, this.config.height)
            .setPosition(x, y)
            .layout();
    }

    private createMeterRow(iconFrame: number, fillColor: number, depth: number): MeterRow {
        const icon = this.scene.add.image(0, 0, 'ui', iconFrame).setScrollFactor(0).setDepth(depth + 1).setScale(0.9);
        const barBg = this.scene.rexUI.add.roundRectangle(0, 0, this.barWidth, 8, 3, BAR_BG, 1)
            .setStrokeStyle(1, 0x29382d, 1);
        const barFill = this.scene.rexUI.add.roundRectangle(0, 0, this.barWidth, 8, 3, fillColor, 1);
        const barStack = this.scene.rexUI.add.overlapSizer({
            width: this.barWidth,
            height: 8,
        }).setScrollFactor(0).setDepth(depth);
        barStack.addBackground(barBg);
        barStack.add(barFill, { align: 'left-center' });

        const value = this.scene.add.text(0, 0, '', {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: TEXT_PRIMARY,
        }).setScrollFactor(0).setDepth(depth + 1);

        const row = this.scene.rexUI.add.sizer({
            orientation: 'x',
            space: { item: 8 },
        }).setScrollFactor(0).setDepth(depth);
        row.add(icon, { align: 'center' });
        row.add(barStack, { proportion: 1, expand: true, align: 'center' });
        row.add(value, { align: 'center' });

        return { row, icon, barBg, barFill, value };
    }
}
