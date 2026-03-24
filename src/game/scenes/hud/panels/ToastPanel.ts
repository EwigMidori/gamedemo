import Phaser from 'phaser';
import { HudPanel } from '../HudPanel';
import type { HudContext } from '../HudContext';
import { PANEL_BORDER, TEXT_PRIMARY } from '../shared';

export class ToastPanel extends HudPanel {
    private bg!: Phaser.GameObjects.Rectangle;
    private body!: Phaser.GameObjects.Text;
    private toastUntil = 0;

    constructor(scene: Phaser.Scene, config: ConstructorParameters<typeof HudPanel>[1]) {
        super(scene, config);
        this.init();
    }

    protected create(): void {
        const d = this.config.depth ?? 110;
        this.bg = this.scene.add
            .rectangle(0, 0, 20, 30, 0x040704, 0.82)
            .setOrigin(0.5).setScrollFactor(0)
            .setStrokeStyle(1, PANEL_BORDER, 0.18).setDepth(d)
            .setVisible(false);
        this.body = this.scene.add
            .text(0, 0, '', {
                fontFamily: 'monospace', fontSize: '12px',
                color: TEXT_PRIMARY, align: 'center',
            })
            .setOrigin(0.5).setScrollFactor(0).setDepth(d + 1)
            .setVisible(false);
        this.objects.push(this.bg, this.body);
    }

    /** Called externally via HudManager event bus */
    show(message: string, seconds: number, worldTime: number): void {
        this.toastUntil = worldTime + Math.max(0.2, seconds);
        this.body.setText(message).setVisible(true);
        this.bg.setSize(Math.max(140, this.body.width + 24), this.body.height + 14).setVisible(true);
    }

    update(ctx: HudContext): void {
        this.bg.setDepth(ctx.modalOpen ? 120 : 110);
        this.body.setDepth(ctx.modalOpen ? 121 : 111);
        if (this.body.visible && ctx.worldTime >= this.toastUntil) {
            this.body.setVisible(false);
            this.bg.setVisible(false);
        }
    }

    protected onLayout(x: number, y: number): void {
        // anchor config is bottom-center, so x,y is already resolved
        const cx = x + this.config.width / 2;
        const cy = y + this.config.height / 2;
        this.bg.setPosition(cx, cy);
        this.body.setPosition(cx, cy);
    }
}
