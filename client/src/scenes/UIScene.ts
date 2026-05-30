import Phaser from 'phaser';

export default class UIScene extends Phaser.Scene {
	private hpBarBg!: Phaser.GameObjects.Rectangle;
	private hpBarFill!: Phaser.GameObjects.Rectangle;
	private gameOverOverlay!: Phaser.GameObjects.Rectangle;
	private gameOverText!: Phaser.GameObjects.Text;

	constructor() {
		super('UIScene');
	}

	create() {
		const barW = 180;
		const barH = 16;
		const barX = 16;
		const barY = 16;

		this.hpBarBg = this.add.rectangle(barX, barY, barW, barH, 0x333333)
			.setOrigin(0, 0).setDepth(0);
		this.hpBarFill = this.add.rectangle(barX, barY, barW, barH, 0x44cc44)
			.setOrigin(0, 0).setDepth(1);

		this.gameOverOverlay = this.add.rectangle(0, 0, 1, 1, 0x000000, 0.7)
			.setOrigin(0, 0).setDepth(10).setVisible(false);
		this.gameOverText = this.add.text(0, 0, 'GAME OVER', {
			fontFamily: 'monospace', fontSize: '48px', color: '#cc4444',
		}).setOrigin(0.5).setDepth(11).setVisible(false);

		this.positionGameOver();

		this.scale.on('resize', () => {
			this.positionGameOver();
		});

		this.scene.get('MainScene').events.on('updateHealth', (pct: number) => {
			this.hpBarFill.setSize(Math.max(0, (pct / 100) * 180), 16);
			if (pct > 50) {
				this.hpBarFill.setFillStyle(0x44cc44);
			} else if (pct > 25) {
				this.hpBarFill.setFillStyle(0xcccc44);
			} else {
				this.hpBarFill.setFillStyle(0xcc4444);
			}
		});

		this.scene.get('MainScene').events.on('gameOver', () => {
			this.gameOverOverlay.setVisible(true);
			this.gameOverText.setVisible(true);
			this.positionGameOver();
		});
	}

	private positionGameOver(): void {
		const w = this.cameras.main.width;
		const h = this.cameras.main.height;
		this.gameOverOverlay.setSize(w, h);
		this.gameOverText.setPosition(w / 2, h / 2);
	}
}
