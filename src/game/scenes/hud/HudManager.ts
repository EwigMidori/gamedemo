import Phaser from 'phaser';
import type { HudPanel } from './HudPanel';
import type { HudContext } from './HudContext';
import type { ToastPanel } from './panels/ToastPanel';

export class HudManager {
    private scene: Phaser.Scene;
    private panels: Map<string, HudPanel> = new Map();

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    addPanel(id: string, panel: HudPanel): this {
        this.panels.set(id, panel);
        panel.layout(this.scene.scale.width, this.scene.scale.height);
        return this;
    }

    removePanel(id: string): void {
        this.panels.get(id)?.destroy();
        this.panels.delete(id);
    }

    getPanel<T extends HudPanel>(id: string): T | undefined {
        return this.panels.get(id) as T | undefined;
    }

    update(ctx: HudContext): void {
        for (const panel of this.panels.values()) {
            panel.update(ctx);
        }
    }

    onResize(width: number, height: number): void {
        for (const panel of this.panels.values()) {
            panel.layout(width, height);
        }
    }

    toast(message: string, seconds: number, worldTime: number): void {
        const tp = this.getPanel<ToastPanel>('toast');
        tp?.show(message, seconds, worldTime);
    }

    getObjects(): Phaser.GameObjects.GameObject[] {
        const all: Phaser.GameObjects.GameObject[] = [];
        for (const panel of this.panels.values()) {
            all.push(...panel.getObjects());
        }
        return all;
    }

    destroy(): void {
        for (const panel of this.panels.values()) panel.destroy();
        this.panels.clear();
    }
}
