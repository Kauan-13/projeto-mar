import Phaser from 'phaser';
import { CANNONBALL_SPEED, CANNONBALL_LIFE, DEBUG } from '../config/gameConfig';

const CANNONBALL_CATEGORY = 0x0004;

export default class CannonballManager {
	private scene: Phaser.Scene;
	private group: Phaser.GameObjects.Group;

	constructor(scene: Phaser.Scene) {
		this.scene = scene;
		this.group = scene.add.group();
		if (DEBUG) console.log('[CannonballManager] constructor: created');
	}

	fire(shipX: number, shipY: number, shipAngle: number, direction: number): void {
		const cos = Math.cos(shipAngle);
		const sin = Math.sin(shipAngle);

		const localX = direction;
		const spawnX = shipX + (localX*45) * cos;
		const spawnY = -10 + shipY + (localX*45) * sin;

		const ball = this.scene.add.circle(spawnX, spawnY, 4, 0xff8800);
		ball.setDepth(15);

		this.scene.matter.add.gameObject(ball, {
			shape: { type: 'circle', radius: 4 },
			label: 'cannonball',
			frictionAir: 0,
			restitution: 0,
			collisionFilter: { category: CANNONBALL_CATEGORY, mask: 0x0000, group: 0 },
		});

		const speed = CANNONBALL_SPEED * 60;
		const vx = -speed * (direction*-1) * cos;
		const vy = -speed * (direction*-1) * sin;
		(ball as any).setVelocity(vx, vy);
		(ball as any).life = 0;
		this.group.add(ball);

		if (DEBUG) console.log('[CannonballManager] fire: at', spawnX.toFixed(0), spawnY.toFixed(0), 'velocity', vx.toFixed(1), vy.toFixed(1));
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
}
