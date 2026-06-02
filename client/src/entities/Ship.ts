import Phaser from 'phaser';
import {
	SHIP_X, SHIP_Y, SHIP_SPEED, SHIP_ROTATION_SPEED,
} from '../../../shared/types';

const SHIP_CATEGORY = 0x0001;
const ISLAND_CATEGORY = 0x0002;

export default class Ship {
	sprite: Phaser.Physics.Matter.Sprite;

	constructor(scene: Phaser.Scene) {
		this.sprite = scene.matter.add.sprite(SHIP_X, SHIP_Y, 'ship', undefined, {
			shape: { type: 'rectangle', width: 46, height: 105 },
			collisionFilter: { category: SHIP_CATEGORY, mask: 0x0000, group: 0 },
			label: 'ship',
			friction: 0,
			frictionStatic: 0,
			restitution: 0,
		});
		this.sprite.setScale(2);
		this.sprite.setDepth(5);
		this.sprite.setMass(1);
		this.sprite.setFrictionAir(0.05);
	}

	get x(): number { return this.sprite.x; }
	get y(): number { return this.sprite.y; }
	get rotation(): number { return this.sprite.rotation; }

	helmUpdate(cursors: Phaser.Types.Input.Keyboard.CursorKeys, dt: number): void {
		const rad = this.sprite.rotation;
		const forwardX = -Math.sin(rad);
		const forwardY = Math.cos(rad);

		if (cursors.up.isDown) {
			this.sprite.applyForce({ x: forwardX * 0.01 * dt, y: forwardY * 0.01 * dt });
		} else if (cursors.down.isDown) {
			this.sprite.applyForce({ x: -forwardX * 0.0075 * dt, y: -forwardY * 0.0075 * dt });
		}

		if (cursors.left.isDown) {
			this.sprite.setAngularVelocity(-SHIP_ROTATION_SPEED / 60 * dt);
		} else if (cursors.right.isDown) {
			this.sprite.setAngularVelocity(SHIP_ROTATION_SPEED / 60 * dt);
		} else {
			this.sprite.setAngularVelocity(0);
		}

		const body = this.sprite.body as MatterJS.BodyType;
		const vx = body.velocity.x;
		const vy = body.velocity.y;
		const speed = Math.sqrt(vx * vx + vy * vy);
		const maxSpeed = SHIP_SPEED / 60 * dt;
		if (speed > maxSpeed) {
			const scale = maxSpeed / speed;
			this.sprite.setVelocity(vx * scale, vy * scale);
		}
	}

	stopMovement(): void {
		this.sprite.setVelocity(0, 0);
		this.sprite.setAngularVelocity(0);
	}

	setCollisionEnabled(enabled: boolean): void {
		this.sprite.setCollidesWith(enabled ? [ISLAND_CATEGORY] : []);
	}

	destroy(): void {
		this.sprite.setVisible(false);
		this.sprite.setVelocity(0, 0);
		this.sprite.setAngularVelocity(0);
		this.sprite.setCollidesWith([]);
	}
}
