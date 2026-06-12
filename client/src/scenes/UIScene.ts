import Phaser from 'phaser';
import { DEBUG } from '../config/gameConfig';

export default class UIScene extends Phaser.Scene {
	private hpBarBg!: Phaser.GameObjects.Rectangle;
	private hpBarFill!: Phaser.GameObjects.Rectangle;
	private scoreText!: Phaser.GameObjects.Text;
	private startHintContainer!: Phaser.GameObjects.Container;
	private cannonHintContainer!: Phaser.GameObjects.Container;
	private cannonHintTimer?: Phaser.Time.TimerEvent;
	private cannonHintHidden = false;

	constructor() {
		super('UIScene');
	}

	create() {
		if (DEBUG) console.log('[UIScene] create: started');
		this.cannonHintHidden = false;
		if (this.cannonHintTimer) {
			this.cannonHintTimer.destroy();
			this.cannonHintTimer = undefined;
		}
		const barW = 180;
		const barH = 16;
		const barX = 16;
		const barY = 16;

		this.hpBarBg = this.add.rectangle(barX, barY, barW, barH, 0x333333)
			.setOrigin(0, 0).setDepth(0);
		this.hpBarFill = this.add.rectangle(barX, barY, barW, barH, 0x44cc44)
			.setOrigin(0, 0).setDepth(1);

		this.scoreText = this.add.text(this.cameras.main.width - 16, 14, 'Pontuação: 0', {
			fontFamily: 'monospace', fontSize: '20px', color: '#ffffff',
			stroke: '#000000', strokeThickness: 3,
		}).setOrigin(1, 0).setDepth(10);

		this.createStartHint();
		this.createCannonHint();

		this.scene.get('MainScene').events.on('updateScore', (score: number) => {
			if (!this.scoreText) return;
			this.scoreText.setText('Pontuação: ' + String(Math.floor(score)));
		});

		this.scene.get('MainScene').events.on('updateHealth', (pct: number) => {
			if (!this.hpBarFill) return;
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

		this.scene.get('MainScene').events.on('playerFirstMoved', () => {
			this.startHintContainer.setVisible(false);
		});

		this.scene.get('MainScene').events.on('enteredCannon', () => {
			if (this.cannonHintHidden) return;
			this.cannonHintContainer.setVisible(true);
			if (this.cannonHintTimer) this.cannonHintTimer.destroy();
			this.cannonHintTimer = this.time.delayedCall(5000, () => {
				this.cannonHintContainer.setVisible(false);
				this.cannonHintHidden = true;
			});
		});

		this.scene.get('MainScene').events.on('cannonFiredFirst', () => {
			this.cannonHintHidden = true;
			this.cannonHintContainer.setVisible(false);
			if (this.cannonHintTimer) {
				this.cannonHintTimer.destroy();
				this.cannonHintTimer = undefined;
			}
		});
	}

	private createStartHint(): void {
		const label = this.add.text(0, 0, 'use ', {
			fontFamily: 'monospace', fontSize: '14px', color: '#ffffff',
			stroke: '#000000', strokeThickness: 3,
		}).setOrigin(0, 0.5);
		const icon = this.add.image(label.x + label.width + 2, label.y, 'controls_icon').setScale(0.5).setOrigin(0, 0.5);
		const text = this.add.text(icon.x + icon.displayWidth + 2, label.y, 'para se mover', {
			fontFamily: 'monospace', fontSize: '14px', color: '#ffffff',
			stroke: '#000000', strokeThickness: 3,
		}).setOrigin(0, 0.5);

		this.startHintContainer = this.add.container(16, this.cameras.main.height - 40, [label, icon, text])
			.setDepth(100);
	}

	private createCannonHint(): void {
		const label = this.add.text(0, 0, 'aperte ', {
			fontFamily: 'monospace', fontSize: '14px', color: '#ffffff',
			stroke: '#000000', strokeThickness: 3,
		}).setOrigin(0, 0.5);
		const icon = this.add.image(label.x + label.width + 2, label.y, 'space_icon').setScale(0.25).setOrigin(0, 0.5);
		const text = this.add.text(icon.x + icon.displayWidth + 2, label.y, 'para atirar', {
			fontFamily: 'monospace', fontSize: '14px', color: '#ffffff',
			stroke: '#000000', strokeThickness: 3,
		}).setOrigin(0, 0.5);

		this.cannonHintContainer = this.add.container(16, this.cameras.main.height - 40, [label, icon, text])
			.setDepth(100)
			.setVisible(false);
	}
}
