import Phaser from 'phaser';
import Ship from './Ship';
import {
	ENEMY_CATEGORY, ENEMY_ACCEL,
	MAX_ENEMIES, ENEMY_SPAWN_INTERVAL, ENEMY_SPAWN_MARGIN,
	ENEMY_WHISKER_LENGTH, ENEMY_WHISKER_ANGLE, ENEMY_AVOID_FORCE,
} from '../config/gameConfig';

const ISLAND_CATEGORY = 0x0002;

export default class EnemyManager {
	private scene: Phaser.Scene;
	private ship: Ship;
	private group: Phaser.GameObjects.Group;
	private spawnTimer = 0;
	private islandBodies: MatterJS.BodyType[] = [];

	constructor(scene: Phaser.Scene, ship: Ship) {
		this.scene = scene;
		this.ship = ship;
		this.group = scene.add.group();

		const bodies = scene.matter.world.getAllBodies() as MatterJS.BodyType[];
		this.islandBodies = bodies.filter(b => b.label === 'island');
	}

	spawn(): void {
		const side = Phaser.Math.Between(0, 3);
		let x: number;
		let y: number;
		const M = ENEMY_SPAWN_MARGIN;
		const W = 1280;
		const H = 1280;

		switch (side) {
			case 0: x = Phaser.Math.Between(0, W); y = -M; break;
			case 1: x = W + M; y = Phaser.Math.Between(0, H); break;
			case 2: x = Phaser.Math.Between(0, W); y = H + M; break;
			default: x = -M; y = Phaser.Math.Between(0, H); break;
		}

		const enemy = this.scene.matter.add.sprite(x, y, 'enemy', undefined, {
			shape: 'circle',
			collisionFilter: { category: ENEMY_CATEGORY, mask: ISLAND_CATEGORY, group: 0 },
			label: 'enemy',
			frictionAir: 0.02,
			restitution: 0.3,
		});
		enemy.setScale(2);
		enemy.setDepth(8);
		this.group.add(enemy);
	}

	update(dt: number): void {
		this.spawnTimer += dt;
		if (this.spawnTimer >= ENEMY_SPAWN_INTERVAL && this.group.getLength() < MAX_ENEMIES) {
			this.spawnTimer -= ENEMY_SPAWN_INTERVAL;
			this.spawn();
		}

		const Matter = Phaser.Physics.Matter.Matter;
		const shipX = this.ship.x;
		const shipY = this.ship.y;

		this.group.getChildren().forEach((child: any) => {
			const ex = child.x;
			const ey = child.y;

			const toShipX = shipX - ex;
			const toShipY = shipY - ey;
			const dist = Math.sqrt(toShipX * toShipX + toShipY * toShipY);
			if (dist < 4) return;

			const angle = Math.atan2(toShipY, toShipX);

			const whiskerAngles = [0, -ENEMY_WHISKER_ANGLE, ENEMY_WHISKER_ANGLE];
			const hits = [false, false, false];

			for (let i = 0; i < 3; i++) {
				const a = angle + whiskerAngles[i];
				const endX = ex + Math.cos(a) * ENEMY_WHISKER_LENGTH;
				const endY = ey + Math.sin(a) * ENEMY_WHISKER_LENGTH;
				const collisions = Matter.Query.ray(
					this.islandBodies,
					{ x: ex, y: ey },
					{ x: endX, y: endY },
				);
				hits[i] = collisions.length > 0;
			}

			let avoidX = 0;
			let avoidY = 0;

			if (hits[0]) {
				if (!hits[1]) {
					avoidX = Math.cos(angle + Math.PI / 2) * ENEMY_AVOID_FORCE;
					avoidY = Math.sin(angle + Math.PI / 2) * ENEMY_AVOID_FORCE;
				} else if (!hits[2]) {
					avoidX = Math.cos(angle - Math.PI / 2) * ENEMY_AVOID_FORCE;
					avoidY = Math.sin(angle - Math.PI / 2) * ENEMY_AVOID_FORCE;
				} else {
					avoidX = -Math.cos(angle) * ENEMY_AVOID_FORCE * 2;
					avoidY = -Math.sin(angle) * ENEMY_AVOID_FORCE * 2;
				}
			} else {
				if (hits[1]) {
					avoidX = Math.cos(angle - Math.PI / 2) * ENEMY_AVOID_FORCE * 0.7;
					avoidY = Math.sin(angle - Math.PI / 2) * ENEMY_AVOID_FORCE * 0.7;
				}
				if (hits[2]) {
					avoidX += Math.cos(angle + Math.PI / 2) * ENEMY_AVOID_FORCE * 0.7;
					avoidY += Math.sin(angle + Math.PI / 2) * ENEMY_AVOID_FORCE * 0.7;
				}
			}

			const seekX = (toShipX / dist) * ENEMY_ACCEL;
			const seekY = (toShipY / dist) * ENEMY_ACCEL;

			child.applyForce({ x: seekX + avoidX, y: seekY + avoidY });
			child.setRotation(angle);
		});
	}
}
