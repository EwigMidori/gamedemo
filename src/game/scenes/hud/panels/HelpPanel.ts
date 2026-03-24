import { HudPanel } from '../HudPanel';
import type { HudContext } from '../HudContext';
import { TEXT_MUTED } from '../shared';

const HELP =
    'WASD move  |  E craft  |  Hold LMB break  |  RMB use/place  |  Shift+RMB force place  |  G drop  |  F/R use';
const HELP_COMPACT = 'WASD  E craft  LMB break  RMB use/place  G drop';
const HELP_TINY = 'WASD  E  LMB  RMB';

export class HelpPanel extends HudPanel {
    private body!: Phaser.GameObjects.Text;
    private compact = false;
    private tiny = false;

    constructor(scene: Phaser.Scene, config: ConstructorParameters<typeof HudPanel>[1]) {
        super(scene, config);
        this.init();
    }

    protected create(): void {
        const d = this.config.depth ?? 105;
        this.body = this.scene.add
            .text(0, 0, HELP, {
                fontFamily: 'monospace',
                fontSize: '11px',
                color: TEXT_MUTED,
                wordWrap: { width: this.config.width },
            })
            .setScrollFactor(0).setDepth(d);
        this.objects.push(this.body);
    }

    update(_ctx: HudContext): void {
        // static
    }

    protected beforeLayout(screenW: number, screenH: number): void {
        this.tiny = screenW < 520 || screenH < 360;
        this.compact = screenW < 760 || screenH < 460;
        this.config.width = Math.min(this.baseConfig.width, Math.max(0, screenW - 24));
        this.config.height = this.tiny ? 14 : 18;
        this.body.setFontSize(this.tiny ? '10px' : this.compact ? '10px' : '11px');
        this.body.setText(this.tiny ? HELP_TINY : this.compact ? HELP_COMPACT : HELP);
    }

    protected onLayout(x: number, y: number, screenW: number): void {
        this.body.setPosition(x, y);
        this.body.setWordWrapWidth(screenW - 24);
    }
}
