import Phaser from 'phaser';
import UIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js';
import { MainScene } from './scenes/MainScene';

let game: Phaser.Game | null = null;

export function createGame(parent: string): Phaser.Game {
  if (game) {
    game.destroy(true);
  }

  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#171411',
    width: 640,
    height: 384,
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    plugins: {
      scene: [
        { key: 'rexUI', plugin: UIPlugin, mapping: 'rexUI' },
      ],
    },
    scene: [MainScene],
  });

  return game;
}
