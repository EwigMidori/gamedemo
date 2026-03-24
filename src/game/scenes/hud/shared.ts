import Phaser from 'phaser';

export const PANEL_FILL = 0x08110c;
export const PANEL_ALPHA = 0.62;
export const PANEL_BORDER = 0xe9dfbf;
export const TEXT_PRIMARY = '#f6efd8';
export const TEXT_MUTED = '#b6b096';
export const TEXT_ACCENT = '#f3c96b';
export const SLOT_FILL = 0x132016;
export const SLOT_BORDER = 0x314135;

export function makePanel(
    scene: Phaser.Scene,
    x: number, y: number, w: number, h: number, depth: number,
): Phaser.GameObjects.Rectangle {
    return scene.add
        .rectangle(x, y, w, h, PANEL_FILL, PANEL_ALPHA)
        .setOrigin(0).setScrollFactor(0)
        .setStrokeStyle(1, PANEL_BORDER, 0.22).setDepth(depth);
}

export function makeText(
    scene: Phaser.Scene,
    x: number, y: number, text: string, depth: number, fontSize: string,
    color: string = TEXT_PRIMARY,
): Phaser.GameObjects.Text {
    return scene.add
        .text(x, y, text, { fontFamily: 'monospace', fontSize, color })
        .setScrollFactor(0).setDepth(depth);
}
