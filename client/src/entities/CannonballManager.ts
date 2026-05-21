import Phaser from 'phaser';
import { CANNONBALL_SPEED, CANNONBALL_LIFE } from '../config/gameConfig';

const CANNONBALL_CATEGORY = 0x0004;

export default class CannonballManager {
	private scene: Phaser.Scene;
	private group: Phaser.GameObjects.Group;

	constructor(scene: Phaser.Scene) {
		this.scene = scene;
		this.group = scene.add.group();
	}

	fire(shipX: number, shipY: number, direction: number): void {
		const ball = this.scene.add.circle(
			shipX + direction * 80,
			shipY,
			4, 0xff8800,
		);
		ball.setDepth(15);

		this.scene.matter.add.gameObject(ball, {
			shape: { type: 'circle', radius: 4 },
			label: 'cannonball',
			frictionAir: 0,
			restitution: 0,
			collisionFilter: { category: CANNONBALL_CATEGORY, mask: 0x0000, group: 0 },
		});

		(ball as any).setVelocity(CANNONBALL_SPEED * 60 * direction, 0);
		(ball as any).life = 0;
		this.group.add(ball);
	}

	update(dt: number): void {
		this.group.getChildren().forEach((ball: any) => {
			ball.life += dt;
			if (ball.life > CANNONBALL_LIFE) {
				ball.destroy();
			}
		});
	}
}
