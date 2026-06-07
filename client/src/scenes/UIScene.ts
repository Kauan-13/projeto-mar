import Phaser from 'phaser';
import { DEBUG } from '../config/gameConfig';

export default class UIScene extends Phaser.Scene {
	private hpBarBg!: Phaser.GameObjects.Rectangle;
	private hpBarFill!: Phaser.GameObjects.Rectangle;

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
	}
}
