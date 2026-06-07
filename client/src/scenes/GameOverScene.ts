import Phaser from 'phaser';
import { io } from 'socket.io-client';
import { DEBUG } from '../config/gameConfig';

export default class GameOverScene extends Phaser.Scene {
  private socket: any;

  constructor() {
    super('GameOverScene');
  }

  create() {
    if (DEBUG) console.log('[GameOverScene] create: started');
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    const overlay = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.85).setDepth(0);

    this.add.text(w / 2, h * 0.3, 'Game Over', {
      fontFamily: 'monospace', fontSize: '52px', color: '#cc4444',
      stroke: '#000000', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(1);

    this.add.text(w / 2, h * 0.3 + 60, 'Seu navio foi destruído!', {
      fontFamily: 'monospace', fontSize: '24px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(1);

    // Pega o IP/Domínio que está atualmente na barra de endereços do navegador
    const serverHost = window.location.hostname; 

    // Conecta na porta 3000 usando o mesmo IP de onde o jogo está vindo
    this.socket = io(`http://${serverHost}:3000`, { forceNew: true });

    this.socket.on('returnToMenu', () => {
      if (DEBUG) console.log('[GameOverScene] returnToMenu received');
      this.socket.disconnect();
      this.scene.start('MainMenuScene');
    });

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

      btnBg.on('pointerover', () => btnBg.setFillStyle(0x555555, 0.85));
      btnBg.on('pointerout', () => btnBg.setFillStyle(0x333333, 0.85));
      btnBg.on('pointerdown', () => btnBg.setFillStyle(0x777777, 0.85));
      btnBg.on('pointerup', () => {
        if (DEBUG) console.log('[GameOverScene] Voltar ao Menu clicked');
        this.socket.emit('returnToMenu');
        btnBg.disableInteractive();
        btnText.setText('Retornando...');
      });

      btnText.setInteractive({ useHandCursor: true });
      btnText.on('pointerup', () => {
        if (DEBUG) console.log('[GameOverScene] Voltar ao Menu clicked');
        this.socket.emit('returnToMenu');
        btnBg.disableInteractive();
        btnText.setText('Retornando...');
      });

      if (DEBUG) console.log('[GameOverScene] create: button shown');
    });
  }
}
