import Phaser from 'phaser';
import { DEBUG } from '../config/gameConfig';

export default class UIScene extends Phaser.Scene {
	private hpBarBg!: Phaser.GameObjects.Rectangle;
	private hpBarFill!: Phaser.GameObjects.Rectangle;
	private gameOverOverlay!: Phaser.GameObjects.Rectangle;
	private gameOverText!: Phaser.GameObjects.Text;
	private voltarBtnBg!: Phaser.GameObjects.Rectangle;
	private voltarBtnText!: Phaser.GameObjects.Text;
	private voltarEnabled = false;

	constructor() {
		super('UIScene');
	}

	create() {
		if (DEBUG) console.log('[UIScene] create: started');
		const barW = 180;
		const barH = 16;
		const barX = 16;
		const barY = 16;

		this.hpBarBg = this.add.rectangle(barX, barY, barW, barH, 0x333333)
			.setOrigin(0, 0).setDepth(0);
		this.hpBarFill = this.add.rectangle(barX, barY, barW, barH, 0x44cc44)
			.setOrigin(0, 0).setDepth(1);

		this.gameOverOverlay = this.add.rectangle(0, 0, 1, 1, 0x000000, 1)
			.setOrigin(0, 0).setDepth(10).setVisible(false);
		this.gameOverText = this.add.text(0, 0, 'GAME OVER', {
			fontFamily: 'monospace', fontSize: '48px', color: '#cc4444',
		}).setOrigin(0.5).setDepth(11).setVisible(false);

		const btnWidth = 240;
		const btnHeight = 64;
		this.voltarBtnBg = this.add.rectangle(0, 0, btnWidth, btnHeight, 0x333333, 0.85)
			.setStrokeStyle(3, 0xffffff)
			.setDepth(12)
			.setVisible(false)
			.setInteractive({ useHandCursor: true });
		this.voltarBtnText = this.add.text(0, 0, 'Voltar ao Menu', {
			fontFamily: 'monospace', fontSize: '24px', color: '#ffffff',
		}).setOrigin(0.5).setDepth(13).setVisible(false);

		this.voltarBtnBg.on('pointerover', () => this.voltarBtnBg.setFillStyle(0x555555, 0.85));
		this.voltarBtnBg.on('pointerout', () => this.voltarBtnBg.setFillStyle(0x333333, 0.85));
		this.voltarBtnBg.on('pointerdown', () => this.voltarBtnBg.setFillStyle(0x777777, 0.85));
		this.voltarBtnBg.on('pointerup', () => this.requestReturn());

		this.voltarBtnText.setInteractive({ useHandCursor: true });
		this.voltarBtnText.on('pointerup', () => this.requestReturn());

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
			if (DEBUG) console.log('[UIScene] updateHealth: HP', pct.toFixed(0), '%');
		});

		this.scene.get('MainScene').events.on('gameOver', () => {
			if (DEBUG) console.log('[UIScene] gameOver: showing overlay');
			this.gameOverOverlay.setVisible(true);
			this.gameOverOverlay.setAlpha(0.5);
			this.gameOverText.setVisible(true);
			this.positionGameOver();

			this.tweens.add({
				targets: this.gameOverOverlay,
				alpha: 1,
				duration: 3000,
				ease: 'Linear',
				onComplete: () => {
					this.voltarEnabled = true;
					this.voltarBtnBg.setVisible(true);
					this.voltarBtnText.setVisible(true);
					this.positionGameOver();
				},
			});
		});
	}

	private requestReturn() {
		if (!this.voltarEnabled) return;
		if (DEBUG) console.log('[UIScene] requestReturn: emitting requestReturnToMenu');
		const mainScene = this.scene.get('MainScene');
		if (mainScene) {
			mainScene.events.emit('requestReturnToMenu');
		}
	}

	private positionGameOver(): void {
		const w = this.cameras.main.width;
		const h = this.cameras.main.height;
		this.gameOverOverlay.setSize(w, h);
		this.gameOverText.setPosition(w / 2, h / 2 - 60);
		this.voltarBtnBg.setPosition(w / 2, h / 2 + 40);
		this.voltarBtnText.setPosition(w / 2, h / 2 + 40);
	}
}
