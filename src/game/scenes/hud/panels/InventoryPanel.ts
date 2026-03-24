import Phaser from 'phaser';
import { HudPanel } from '../HudPanel';
import type { HudContext } from '../HudContext';
import { SLOT_BORDER, SLOT_FILL, TEXT_ACCENT, TEXT_MUTED, TEXT_PRIMARY } from '../shared';
import { uiFrameForItem } from '../../uiFrames';

const SLOT_COUNT = 12;

interface HotbarSlot {
    container: any;
    background: Phaser.GameObjects.Shape;
    icon: Phaser.GameObjects.Image;
    amount: Phaser.GameObjects.Text;
}

export class InventoryPanel extends HudPanel {
    private root!: any;
    private background!: Phaser.GameObjects.Shape;
    private slots: HotbarSlot[] = [];
    private compact = false;
    private tiny = false;
    private slotSize = 24;
    private readonly onSelectSlot: (index: number) => void;

    constructor(
        scene: Phaser.Scene,
        config: ConstructorParameters<typeof HudPanel>[1],
        onSelectSlot: (index: number) => void,
    ) {
        super(scene, config);
        this.onSelectSlot = onSelectSlot;
        this.init();
    }

    protected create(): void {
        const depth = this.config.depth ?? 100;
        this.root = this.scene.rexUI.add.sizer({
            orientation: 'x',
            originX: 0,
            originY: 0,
            space: { left: 8, right: 8, top: 8, bottom: 8, item: 4 },
        }).setScrollFactor(0).setDepth(depth);
        this.background = this.scene.rexUI.add.roundRectangle(0, 0, 10, 10, 8, 0x08110c, 0.84)
            .setStrokeStyle(1, 0xe9dfbf, 0.2)
            .setInteractive();
        this.root.addBackground(this.background);

        for (let i = 0; i < SLOT_COUNT; i += 1) {
            const slot = this.createSlot(i, depth + 1);
            this.slots.push(slot);
            this.root.add(slot.container, { align: 'center' });
        }

        this.objects.push(this.root, this.background);
        for (const slot of this.slots) {
            this.objects.push(slot.container, slot.background, slot.icon, slot.amount);
        }
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
        this.slotSize = this.compact ? 22 : 24;
        const gap = this.compact ? 4 : 5;
        this.root.space.item = gap;
        this.root.space.left = 8;
        this.root.space.right = 8;
        this.root.space.top = 8;
        this.root.space.bottom = 8;
        this.config.width = Math.min(screenW - 24, 16 + SLOT_COUNT * this.slotSize + (SLOT_COUNT - 1) * gap);
        this.config.height = this.slotSize + 16;
        for (const slot of this.slots) {
            slot.container.setMinSize(this.slotSize, this.slotSize);
            slot.icon.setScale(this.compact ? 0.82 : 0.92);
            slot.amount.setFontSize(this.compact ? '9px' : '10px');
        }
    }

    update(ctx: HudContext): void {
        this.setVisible(!ctx.modalOpen && !this.tiny);
        if (this.tiny || ctx.modalOpen) return;

        for (let i = 0; i < SLOT_COUNT; i += 1) {
            const slotData = ctx.inventory.slots[i];
            const slot = this.slots[i];
            const isActive = i === ctx.activeSlotIndex;
            const filled = !!slotData?.itemId && slotData.quantity > 0;

            slot.background
                .setFillStyle(
                    isActive ? 0x243924 : filled ? 0x18281b : SLOT_FILL,
                    isActive ? 1 : (filled ? 0.98 : 0.78),
                )
                .setStrokeStyle(isActive ? 2 : 1, isActive ? 0xf3c96b : SLOT_BORDER, 1);

            if (!filled) {
                slot.icon.setVisible(false);
                slot.amount.setText('').setColor(TEXT_MUTED);
                continue;
            }

            slot.icon.setVisible(true).setFrame(uiFrameForItem(slotData.itemId!));
            slot.amount
                .setText(`${slotData.quantity}`)
                .setColor(isActive ? TEXT_ACCENT : TEXT_PRIMARY);
        }
    }

    protected onLayout(x: number, y: number): void {
        if (this.tiny) return;
        this.root
            .setMinSize(this.config.width, this.config.height)
            .setPosition(x, y)
            .layout();
    }

    private createSlot(index: number, depth: number): HotbarSlot {
        const background = this.scene.rexUI.add.roundRectangle(0, 0, 10, 10, 5, SLOT_FILL, 0.92)
            .setStrokeStyle(1, SLOT_BORDER, 1)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
                event.stopPropagation();
                this.onSelectSlot(index);
            });
        const icon = this.scene.add.image(0, 0, 'ui', 0).setScrollFactor(0).setDepth(depth + 1).setVisible(false);
        const amount = this.scene.add.text(0, 0, '', {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: TEXT_PRIMARY,
        }).setOrigin(1, 1).setScrollFactor(0).setDepth(depth + 1);

        const stack = this.scene.rexUI.add.overlapSizer({
            width: this.slotSize,
            height: this.slotSize,
        }).setScrollFactor(0).setDepth(depth);
        stack.addBackground(background);
        stack.add(icon, { align: 'center' });
        stack.add(amount, { align: 'right-bottom', padding: { right: 2, bottom: 1 } });
        stack.setMinSize(this.slotSize, this.slotSize);

        return { container: stack, background, icon, amount };
    }
}
