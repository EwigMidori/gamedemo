import Phaser from 'phaser';
import type { HudContext } from './HudContext';

export type Anchor = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface PanelConfig {
    anchor: Anchor;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
    depth?: number;
}

export abstract class HudPanel {
    protected scene: Phaser.Scene;
    protected config: PanelConfig;
    protected readonly baseConfig: Readonly<PanelConfig>;
    protected objects: Phaser.GameObjects.GameObject[] = [];

    constructor(scene: Phaser.Scene, config: PanelConfig) {
        this.scene = scene;
        this.baseConfig = { ...config };
        this.config = { ...config };
    }

    protected init(): void {
        this.create();
    }

    /** Build all GameObjects and push them into this.objects */
    protected abstract create(): void;

    /** Refresh content each frame */
    abstract update(ctx: HudContext): void;

    /** Reposition after resize */
    layout(width: number, height: number): void {
        this.beforeLayout(width, height);
        const pos = this.resolveAnchor(width, height);
        this.onLayout(pos.x, pos.y, width, height);
    }

    /**
     * Optional hook before anchor resolution.
     * Panels can mutate this.config.width/height here to adapt to screen size.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected beforeLayout(_screenW: number, _screenH: number): void {
        // default: no-op
    }

    /** Override for custom repositioning logic */
    protected abstract onLayout(x: number, y: number, screenW: number, screenH: number): void;

    getObjects(): Phaser.GameObjects.GameObject[] {
        return this.objects;
    }

    setVisible(visible: boolean): void {
        for (const obj of this.objects) {
            if ('setVisible' in obj && typeof obj.setVisible === 'function') {
                obj.setVisible(visible);
            }
        }
    }

    destroy(): void {
        for (const obj of this.objects) obj.destroy();
        this.objects.length = 0;
    }

    private resolveAnchor(w: number, h: number): { x: number; y: number } {
        const { anchor, offsetX, offsetY } = this.config;
        switch (anchor) {
            case 'top-left': return { x: offsetX, y: offsetY };
            case 'top-center': return { x: (w - this.config.width) / 2 + offsetX, y: offsetY };
            case 'top-right': return { x: w - this.config.width - offsetX, y: offsetY };
            case 'bottom-left': return { x: offsetX, y: h - this.config.height - offsetY };
            case 'bottom-center': return { x: (w - this.config.width) / 2 + offsetX, y: h - this.config.height - offsetY };
            case 'bottom-right': return { x: w - this.config.width - offsetX, y: h - this.config.height - offsetY };
        }
    }
}
