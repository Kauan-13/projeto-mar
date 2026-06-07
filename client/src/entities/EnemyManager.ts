import Phaser from 'phaser';
import Ship from './Ship';
import { DEBUG } from '../config/gameConfig';

export default class EnemyManager {
	private scene: Phaser.Scene;
	private ship: Ship;
	private group: Phaser.GameObjects.Group;

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

	spawnEnemy(id: string, x: number, y: number): void {
		const enemy = this.scene.add.sprite(x, y, 'enemy');
		(enemy as any).enemyId = id;
		(enemy as any).targetX = x;
		(enemy as any).targetY = y;
		enemy.setScale(2);
		enemy.setDepth(8);
		enemy.play('enemy_walk');
		this.group.add(enemy);
		if (DEBUG) console.log('[EnemyManager] spawnEnemy:', id, 'at', x.toFixed(0), y.toFixed(0));
	}

	removeEnemy(id: string): void {
		this.group.getChildren().forEach((child: any) => {
			if (child.enemyId === id) {
				child.destroy();
				if (DEBUG) console.log('[EnemyManager] removeEnemy:', id, 'destroyed');
			}
		});
	}

	destroyAll(): void {
		const count = this.group.getLength();
		this.group.getChildren().forEach((child: any) => child.destroy());
		if (DEBUG) console.log('[EnemyManager] destroyAll:', count, 'enemies destroyed');
	}

	setEnemyPositions(targets: { id: string; x: number; y: number }[]): void {
		this.group.getChildren().forEach((child: any) => {
			const t = targets.find(e => e.id === child.enemyId);
			if (t) {
				child.targetX = t.x;
				child.targetY = t.y;
			}
		});
		if (DEBUG) console.log('[EnemyManager] setEnemyPositions:', targets.length, 'targets');
	}

	update(dt: number): void {
		this.group.getChildren().forEach((child: any) => {
			const dx = child.targetX - child.x;
			const dy = child.targetY - child.y;
			child.x += dx * 0.2 * dt;
			child.y += dy * 0.2 * dt;

			if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
				// child.setRotation(Math.atan2(dy, dx));
			}
		});
	}
}
