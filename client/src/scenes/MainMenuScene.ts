import Phaser from 'phaser';

export default class MainMenuScene extends Phaser.Scene {
  private music: Phaser.Sound.BaseSound | null = null;

  constructor() {
    super('MainMenuScene');
  }

  preload() {
    this.load.image('menuBg', 'assets/main_menu_background.png');
    this.load.audio('menuMusic', 'assets/audio/main_menu_track.mp3');
  }

  create() {
    const bg = this.add.image(0, 0, 'menuBg').setOrigin(0, 0);
    bg.setDisplaySize(this.scale.width, this.scale.height);

    const overlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.5)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });

    const tapText = this.add.text(this.scale.width / 2, this.scale.height / 2, 'Toque para começar', {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: tapText,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    overlay.once('pointerdown', () => {
      this.music = this.sound.add('menuMusic', { loop: true, volume: 0.1 });
      this.music.play();

      overlay.destroy();
      tapText.destroy();

      this.showMenu();
    });
  }

  private showMenu() {
    const title = this.add.text(this.scale.width / 2, this.scale.height * 0.2, 'They Will Drown:', {
      fontSize: '52px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5);

    const subtitle = this.add.text(this.scale.width / 2, this.scale.height * 0.2, 'Corsários de Desterro', {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5, -1);

    const btnWidth = 240;
    const btnHeight = 64;
    const btnX = this.scale.width / 2;
    const btnY = this.scale.height * 0.55;

    const btnBg = this.add.rectangle(btnX, btnY, btnWidth, btnHeight, 0x333333, 0.85)
      .setStrokeStyle(3, 0xffffff)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add.text(btnX, btnY, 'Começar', {
      fontSize: '30px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    btnBg.on('pointerover', () => btnBg.setFillStyle(0x555555, 0.85));
    btnBg.on('pointerout', () => btnBg.setFillStyle(0x333333, 0.85));
    btnBg.on('pointerdown', () => btnBg.setFillStyle(0x777777, 0.85));
    btnBg.on('pointerup', () => this.startGame());

    btnText.setInteractive({ useHandCursor: true });
    btnText.on('pointerup', () => this.startGame());
  }

  private startGame() {
    if (this.music && this.music.isPlaying) {
      this.music.stop();
    }
    this.scene.start('MainScene');
  }
}
