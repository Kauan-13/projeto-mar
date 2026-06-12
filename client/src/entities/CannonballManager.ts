import Phaser from 'phaser';
import { CANNONBALL_SPEED, CANNONBALL_LIFE, ENEMY_CATEGORY, CANNONBALL_HIT_RADIUS, DEBUG } from '../config/gameConfig';

const CANNONBALL_CATEGORY = 0x0004;

export interface CannonballSpawnData {
	x: number;
	y: number;
	vx: number;
	vy: number;
}

export default class CannonballManager {
	private scene: Phaser.Scene;
	private group: Phaser.GameObjects.Group;

	constructor(scene: Phaser.Scene) {
		this.scene = scene;
		this.group = scene.add.group();
		if (DEBUG) console.log('[CannonballManager] constructor: created');
	}

	fire(shipX: number, shipY: number, shipAngle: number, direction: number): CannonballSpawnData {
		const cos = Math.cos(shipAngle);
		const sin = Math.sin(shipAngle);

		const localX = direction;
		const spawnX = shipX + (localX*45) * cos;
		const spawnY = -10 + shipY + (localX*45) * sin;

		const speed = CANNONBALL_SPEED * 60;
		const vx = -speed * (direction*-1) * cos;
		const vy = -speed * (direction*-1) * sin;

		const ball = this.scene.add.sprite(spawnX, spawnY, 'cannonball');
		ball.setScale(0.25);
		ball.setDepth(15);

		this.scene.matter.add.gameObject(ball, {
			shape: { type: 'circle', radius: 4 },
			label: 'cannonball',
			frictionAir: 0,
			restitution: 0,
			collisionFilter: { category: CANNONBALL_CATEGORY, mask: ENEMY_CATEGORY, group: 0 },
		});

		(ball as any).setVelocity(vx, vy);
		(ball as any).life = 0;
		(ball as any).remote = false;
		this.group.add(ball);

		if (DEBUG) console.log('[CannonballManager] fire: at', spawnX.toFixed(0), spawnY.toFixed(0), 'velocity', vx.toFixed(1), vy.toFixed(1));

		return { x: spawnX, y: spawnY, vx, vy };
	}

	spawnVisual(x: number, y: number, vx: number, vy: number): void {
		const ball = this.scene.add.sprite(x, y, 'cannonball');
		ball.setScale(0.25);
		ball.setDepth(15);

		this.scene.matter.add.gameObject(ball, {
			shape: { type: 'circle', radius: 4 },
			label: 'cannonball_remote',
			frictionAir: 0,
			restitution: 0,
			collisionFilter: { category: 0, mask: 0x0000, group: 0 },
		});

		(ball as any).setVelocity(vx, vy);
		(ball as any).life = 0;
		(ball as any).remote = true;
		this.group.add(ball);

		if (DEBUG) console.log('[CannonballManager] spawnVisual: at', x.toFixed(0), y.toFixed(0), 'velocity', vx.toFixed(1), vy.toFixed(1));
	}

	update(dt: number): void {
		const before = this.group.getLength();
		this.group.getChildren().forEach((ball: any) => {
			ball.life += dt;
			if (ball.life > CANNONBALL_LIFE) {
				ball.destroy();
			}
		});
		const after = this.group.getLength();
		if (DEBUG && before !== after) console.log('[CannonballManager] update:', before - after, 'destroyed,', after, 'remaining');
	}

	checkEnemyCollisions(enemies: Phaser.GameObjects.Group): string[] {
		const hits: string[] = [];
		const toRemove: any[] = [];

		this.group.getChildren().forEach((ball: any) => {
			if (ball.remote) return;
			enemies.getChildren().forEach((enemy: any) => {
				const d = Phaser.Math.Distance.Between(ball.x, ball.y, enemy.x, enemy.y);
				if (d < CANNONBALL_HIT_RADIUS) {
					hits.push(enemy.enemyId as string);
					toRemove.push(ball);
				}
			});
		});

		toRemove.forEach(b => b.destroy());

		if (DEBUG && hits.length > 0) console.log('[CannonballManager] checkEnemyCollisions:', hits.length, 'hits');
		return hits;
	}
}
