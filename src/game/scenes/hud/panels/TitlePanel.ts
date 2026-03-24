import { HudPanel } from '../HudPanel';
import type { HudContext } from '../HudContext';
import { makePanel, makeText, TEXT_ACCENT } from '../shared';

export class TitlePanel extends HudPanel {
    private bg!: Phaser.GameObjects.Rectangle;
    private title!: Phaser.GameObjects.Text;
    private compact = false;
    private tiny = false;

    constructor(scene: Phaser.Scene, config: ConstructorParameters<typeof HudPanel>[1]) {
        super(scene, config);
        this.init();
    }

    protected create(): void {
        const d = this.config.depth ?? 100;
        this.bg = makePanel(this.scene, 0, 0, this.config.width, this.config.height, d);
        this.title = makeText(this.scene, 0, 0, 'FRONTIER COLONY', d + 1, '15px', TEXT_ACCENT);
        this.objects.push(this.bg, this.title);
    }

    update(ctx: HudContext): void {
        this.setVisible(!ctx.modalOpen && !this.tiny);
    }

    protected beforeLayout(screenW: number, screenH: number): void {
        this.tiny = screenW < 520 || screenH < 360;
        this.compact = !this.tiny && (screenW < 760 || screenH < 460);

        if (this.tiny) {
            this.config.width = 0;
            this.config.height = 0;
            this.setVisible(false);
            return;
        }

        this.setVisible(true);
        this.config.width = this.compact ? 132 : this.baseConfig.width;
        this.config.height = this.compact ? 20 : this.baseConfig.height;
    }

    protected onLayout(x: number, y: number): void {
        if (this.tiny) return;
        this.bg.setPosition(x, y);
        this.bg.setSize(this.config.width, this.config.height);
        this.title.setFontSize(this.compact ? '11px' : '13px');
        this.title.setPosition(x + 8, y + (this.compact ? 3 : 5));
    }
}
