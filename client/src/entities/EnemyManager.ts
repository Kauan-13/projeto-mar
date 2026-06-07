import Phaser from 'phaser';
import Ship from './Ship';
import { DEBUG } from '../config/gameConfig';

const HP_BAR_W = 32;
const HP_BAR_H = 4;

export default class EnemyManager {
	private scene: Phaser.Scene;
	private ship: Ship;
	group: Phaser.GameObjects.Group;

	constructor(scene: Phaser.Scene, ship: Ship) {
		this.scene = scene;
		this.ship = ship;
		this.group = scene.add.group();

		scene.anims.create({
			key: 'enemy_walk',
			frames: scene.anims.generateFrameNumbers('enemy', { start: 0, end: 5 }),
			frameRate: 6,
			repeat: -1,
		});
		if (DEBUG) console.log('[EnemyManager] constructor: created, animation enemy_walk registered');
	}

	spawnEnemy(id: string, x: number, y: number, hp: number, maxHp: number): void {
		const enemy = this.scene.add.sprite(x, y, 'enemy');
		(enemy as any).enemyId = id;
		(enemy as any).targetX = x;
		(enemy as any).targetY = y;
		(enemy as any).hp = hp;
		(enemy as any).maxHp = maxHp;
		enemy.setScale(2);
		enemy.setDepth(8);
		enemy.play('enemy_walk');

		const barBg = this.scene.add.rectangle(x, y - 20, HP_BAR_W, HP_BAR_H, 0x333333)
			.setDepth(9);
		const barFill = this.scene.add.rectangle(x, y - 20, HP_BAR_W, HP_BAR_H, 0x44cc44)
			.setOrigin(0, 0.5).setDepth(10);
		barFill.x = x - HP_BAR_W / 2;

		(enemy as any).hpBarBg = barBg;
		(enemy as any).hpBarFill = barFill;

		this.group.add(enemy);
		if (DEBUG) console.log('[EnemyManager] spawnEnemy:', id, 'at', x.toFixed(0), y.toFixed(0), 'HP', hp);
	}

	setEnemyHp(id: string, hp: number): void {
		this.group.getChildren().forEach((child: any) => {
			if (child.enemyId === id) {
				child.hp = hp;
				const pct = Math.max(0, hp / child.maxHp);
				child.hpBarFill.setSize(HP_BAR_W * pct, HP_BAR_H);
				if (pct > 0.5) {
					child.hpBarFill.setFillStyle(0x44cc44);
				} else if (pct > 0.25) {
					child.hpBarFill.setFillStyle(0xcccc44);
				} else {
					child.hpBarFill.setFillStyle(0xcc4444);
				}
				if (DEBUG) console.log('[EnemyManager] setEnemyHp:', id, 'HP', hp);
			}
		});
	}

	removeEnemy(id: string): void {
		this.group.getChildren().forEach((child: any) => {
			if (child.enemyId === id) {
				child.hpBarBg?.destroy();
				child.hpBarFill?.destroy();
				child.destroy();
				if (DEBUG) console.log('[EnemyManager] removeEnemy:', id, 'destroyed');
			}
		});
	}

	destroyAll(): void {
		this.group.getChildren().forEach((child: any) => {
			child.hpBarBg?.destroy();
			child.hpBarFill?.destroy();
			child.destroy();
		});
		if (DEBUG) console.log('[EnemyManager] destroyAll: all enemies destroyed');
	}

	setEnemyPositions(targets: { id: string; x: number; y: number }[]): void {
		this.group.getChildren().forEach((child: any) => {
			const t = targets.find(e => e.id === child.enemyId);
			if (t) {
				child.targetX = t.x;
				child.targetY = t.y;
			}
		});
	}

	update(dt: number): void {
		this.group.getChildren().forEach((child: any) => {
			const dx = child.targetX - child.x;
			const dy = child.targetY - child.y;
			child.x += dx * 0.2 * dt;
			child.y += dy * 0.2 * dt;

			if (child.hpBarBg) {
				child.hpBarBg.x = child.x;
				child.hpBarBg.y = child.y - 20;
			}
			if (child.hpBarFill) {
				child.hpBarFill.x = child.x - HP_BAR_W / 2;
				child.hpBarFill.y = child.y - 20;
			}

			if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
				// child.setRotation(Math.atan2(dy, dx));
			}
		});
	}
}
