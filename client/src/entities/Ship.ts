import Phaser from 'phaser';
import {
	SHIP_X, SHIP_Y, SHIP_SPEED, SHIP_ACCELERATION, SHIP_FRICTION,
	SHIP_ROTATION_SPEED, SHIP_ROTATION_ACCEL, SHIP_ROTATION_FRICTION,
} from '../../../shared/types';

const SHIP_CATEGORY = 0x0001;
const ISLAND_CATEGORY = 0x0002;

export default class Ship {
	sprite: Phaser.Physics.Matter.Sprite;
	private shipSpeed: number = 0;
	private shipRotationSpeed: number = 0;

	constructor(scene: Phaser.Scene) {
		console.log('[Ship] constructor start');
		console.log('[Ship] scene.matter exists:', !!scene.matter);
		console.log('[Ship] scene.matter.add exists:', !!(scene.matter && scene.matter.add));

		try {
			this.sprite = scene.matter.add.sprite(SHIP_X, SHIP_Y, 'ship', undefined, {
				shape: { type: 'rectangle', width: 46, height: 105 },
				collisionFilter: { category: SHIP_CATEGORY, mask: 0x0000, group: 0 },
				label: 'ship',
				frictionAir: 0,
				friction: 0,
				frictionStatic: 0,
				restitution: 0,
			});
			console.log('[Ship] sprite created:', !!this.sprite);
			console.log('[Ship] sprite.x:', this.sprite.x, 'sprite.y:', this.sprite.y);
			console.log('[Ship] sprite.visible:', this.sprite.visible);
			console.log('[Ship] sprite.texture:', this.sprite.texture ? this.sprite.texture.key : 'NONE');
			console.log('[Ship] sprite.body:', !!this.sprite.body);
		} catch (e) {
			console.error('[Ship] scene.matter.add.sprite FAILED:', e);
			this.sprite = scene.add.sprite(SHIP_X, SHIP_Y, 'ship') as any;
			console.log('[Ship] fallback sprite created');
		}

		this.sprite.setScale(2);
		this.sprite.setDepth(5);
		console.log('[Ship] constructor end');
	}

	get x(): number { return this.sprite.x; }
	get y(): number { return this.sprite.y; }
	get rotation(): number { return this.sprite.rotation; }
	get speed(): number { return this.shipSpeed; }
	get angularSpeed(): number { return this.shipRotationSpeed; }

	helmUpdate(cursors: Phaser.Types.Input.Keyboard.CursorKeys, dt: number): void {
		if (cursors.up.isDown) {
			this.shipSpeed += SHIP_ACCELERATION * dt;
		} else if (cursors.down.isDown) {
			this.shipSpeed -= SHIP_ACCELERATION * 0.75 * dt;
		} else {
			if (this.shipSpeed > 0) {
				this.shipSpeed = Math.max(0, this.shipSpeed - SHIP_FRICTION * dt);
			} else if (this.shipSpeed < 0) {
				this.shipSpeed = Math.min(0, this.shipSpeed + SHIP_FRICTION * dt);
			}
		}
		this.shipSpeed = Phaser.Math.Clamp(this.shipSpeed, -SHIP_SPEED * 0.5, SHIP_SPEED);

		if (cursors.left.isDown) {
			this.shipRotationSpeed -= SHIP_ROTATION_ACCEL * dt;
		} else if (cursors.right.isDown) {
			this.shipRotationSpeed += SHIP_ROTATION_ACCEL * dt;
		} else {
			if (this.shipRotationSpeed > 0) {
				this.shipRotationSpeed = Math.max(0, this.shipRotationSpeed - SHIP_ROTATION_FRICTION * dt);
			} else if (this.shipRotationSpeed < 0) {
				this.shipRotationSpeed = Math.min(0, this.shipRotationSpeed + SHIP_ROTATION_FRICTION * dt);
			}
		}
		this.shipRotationSpeed = Phaser.Math.Clamp(this.shipRotationSpeed, -SHIP_ROTATION_SPEED, SHIP_ROTATION_SPEED);

		const speedPPS = this.shipSpeed * 60;
		const rotPPS = this.shipRotationSpeed * 60;

		const rad = this.sprite.rotation;
		const forwardX = -Math.sin(rad);
		const forwardY = Math.cos(rad);

		this.sprite.setVelocity(forwardX * speedPPS, forwardY * speedPPS);
		this.sprite.setAngularVelocity(rotPPS);
	}

	stopMovement(): void {
		this.shipSpeed = 0;
		this.shipRotationSpeed = 0;
		this.sprite.setVelocity(0, 0);
		this.sprite.setAngularVelocity(0);
	}

	setCollisionEnabled(enabled: boolean): void {
		this.sprite.setCollidesWith(enabled ? [ISLAND_CATEGORY] : []);
	}
}
