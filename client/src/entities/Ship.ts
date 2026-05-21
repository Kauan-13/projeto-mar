import Phaser from 'phaser';
import {
	SHIP_X, SHIP_Y, SHIP_SPEED, SHIP_ACCELERATION, SHIP_FRICTION,
	SHIP_ROTATION_SPEED, SHIP_ROTATION_ACCEL, SHIP_ROTATION_FRICTION,
} from '../../../shared/types';

export interface ShipMovementResult {
	moved: boolean;
	dx: number;
	dy: number;
	angleDelta: number;
}

export default class Ship {
	sprite: Phaser.GameObjects.Sprite;
	private body: Phaser.Physics.Arcade.Body;
	private shipSpeed: number = 0;
	private shipRotationSpeed: number = 0;
	private prevX: number;
	private prevY: number;
	private prevRotation: number;

	constructor(scene: Phaser.Scene) {
		this.sprite = scene.add.sprite(SHIP_X, SHIP_Y, 'ship');
		this.sprite.setScale(2);
		this.sprite.setDepth(5);

		this.prevX = this.sprite.x;
		this.prevY = this.sprite.y;
		this.prevRotation = this.sprite.rotation;

		scene.physics.add.existing(this.sprite);
		this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
		this.body.allowGravity = false;
		this.body.setSize(46, 105);
		this.body.setOffset(0, 5);
	}

	setupCollision(
		scene: Phaser.Scene,
		islandLayers: Phaser.Tilemaps.TilemapLayer[],
		processCallback: () => boolean,
	): Phaser.Physics.Arcade.Collider[] {
		const colliders: Phaser.Physics.Arcade.Collider[] = [];
		islandLayers.forEach(layer => {
			if (!layer) {
				console.warn('[Collision] Layer is null, skipping');
				return;
			}

			console.log(`[Collision] Layer "${layer.layer.name}": setting up...`);

			layer.setCollisionByProperty({ collides: true });

			let collisionCount = 0;
			if (layer.layer && layer.layer.data) {
				for (const row of layer.layer.data) {
					for (const tile of row) {
						if (tile && tile.collides) collisionCount++;
					}
				}
			}

			console.log(`[Collision] Layer "${layer.layer.name}": ${collisionCount} tiles marked`);

			if (collisionCount === 0) {
				console.warn(`[Collision] Falling back to setCollisionByExclusion for "${layer.layer.name}"`);
				layer.setCollisionByExclusion([-1]);
			}

			const collider = scene.physics.add.collider(this.sprite, layer, undefined, processCallback);
			colliders.push(collider);
		});
		return colliders;
	}

	get x(): number { return this.sprite.x; }
	get y(): number { return this.sprite.y; }
	get rotation(): number { return this.sprite.rotation; }
	get speed(): number { return this.shipSpeed; }
	get angularSpeed(): number { return this.shipRotationSpeed; }

	helmUpdate(cursors: Phaser.Types.Input.Keyboard.CursorKeys, dt: number): ShipMovementResult {
		this.prevX = this.sprite.x;
		this.prevY = this.sprite.y;
		this.prevRotation = this.sprite.rotation;

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

		const moved = this.shipSpeed !== 0 || this.shipRotationSpeed !== 0;

		if (moved) {
			this.sprite.rotation += this.shipRotationSpeed;

			const rad = this.sprite.rotation;
			const forwardX = -Math.sin(rad);
			const forwardY = Math.cos(rad);

			const forwardDx = forwardX * this.shipSpeed;
			const forwardDy = forwardY * this.shipSpeed;

			this.sprite.x += forwardDx;
			this.sprite.y += forwardDy;
		}

		return {
			moved,
			dx: this.sprite.x - this.prevX,
			dy: this.sprite.y - this.prevY,
			angleDelta: this.sprite.rotation - this.prevRotation,
		};
	}

	stopMovement(): void {
		this.shipSpeed = 0;
		this.shipRotationSpeed = 0;
	}
}
