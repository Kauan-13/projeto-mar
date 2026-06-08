import Phaser from 'phaser';
import { DEBUG } from '../config/gameConfig';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create() {
    if (DEBUG) console.log('[GameOverScene] create: started');
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.85).setDepth(0);

    this.add.text(w / 2, h * 0.3, 'Game Over', {
      fontFamily: 'monospace', fontSize: '52px', color: '#cc4444',
      stroke: '#000000', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(1);

    this.add.text(w / 2, h * 0.3 + 60, 'Seu navio foi destruído!', {
      fontFamily: 'monospace', fontSize: '24px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(1);

    this.time.delayedCall(1000, () => {
      const btnW = 240;
      const btnH = 64;
      const btnX = w / 2;
      const btnY = h * 0.65;

      const btnBg = this.add.rectangle(btnX, btnY, btnW, btnH, 0x333333, 0.85)
        .setStrokeStyle(3, 0xffffff)
        .setDepth(2)
        .setInteractive({ useHandCursor: true });

      const btnText = this.add.text(btnX, btnY, 'Voltar ao Menu', {
        fontFamily: 'monospace', fontSize: '24px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(3);

      const goToMenu = () => {
        if (DEBUG) console.log('[GameOverScene] returning to menu');
        this.scene.start('MainMenuScene');
      };

      btnBg.on('pointerover', () => btnBg.setFillStyle(0x555555, 0.85));
      btnBg.on('pointerout', () => btnBg.setFillStyle(0x333333, 0.85));
      btnBg.on('pointerdown', () => btnBg.setFillStyle(0x777777, 0.85));
      btnBg.on('pointerup', goToMenu);

      btnText.setInteractive({ useHandCursor: true });
      btnText.on('pointerup', goToMenu);

      if (DEBUG) console.log('[GameOverScene] create: button shown');
    });
  }
}
