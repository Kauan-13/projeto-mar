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
	private shipSpeed: number = 0;
	private shipRotationSpeed: number = 0;
	private prevX: number;
	private prevY: number;
	private prevRotation: number;
	private halfW: number;
	private halfH: number;

	constructor(scene: Phaser.Scene) {
		this.sprite = scene.add.sprite(SHIP_X, SHIP_Y, 'ship');
		this.sprite.setScale(2);
		this.sprite.setDepth(5);

		this.halfW = 46 / 2;
		this.halfH = 105 / 2;

		this.prevX = this.sprite.x;
		this.prevY = this.sprite.y;
		this.prevRotation = this.sprite.rotation;

		scene.physics.add.existing(this.sprite);
		const body = this.sprite.body as Phaser.Physics.Arcade.Body;
		body.allowGravity = false;
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

	resolveIslandCollision(layers: Phaser.Tilemaps.TilemapLayer[]): void {
		for (const layer of layers) {
			if (!layer) continue;

			const corners = this.getRotatedCorners();
			const topLeft = this.getMinMax(corners);
			const tileRange = this.getTileRange(layer, topLeft);

			for (let ty = tileRange.minY; ty <= tileRange.maxY; ty++) {
				for (let tx = tileRange.minX; tx <= tileRange.maxX; tx++) {
					const tile = layer.getTileAt(tx, ty);
					if (!tile || !tile.collides) continue;

					const tileRect = new Phaser.Geom.Rectangle(
						tile.pixelX, tile.pixelY,
						tile.width, tile.height,
					);

					if (this.intersects(corners, tileRect)) {
						const pushOut = this.computePushOut(corners, tileRect);
						this.sprite.x += pushOut.x;
						this.sprite.y += pushOut.y;
						return;
					}
				}
			}
		}
	}

	private getRotatedCorners(): Phaser.Math.Vector2[] {
		const cos = Math.cos(this.sprite.rotation);
		const sin = Math.sin(this.sprite.rotation);
		const cx = this.sprite.x;
		const cy = this.sprite.y;

		return [
			new Phaser.Math.Vector2(cx - this.halfW * cos + this.halfH * sin, cy - this.halfW * sin - this.halfH * cos),
			new Phaser.Math.Vector2(cx + this.halfW * cos + this.halfH * sin, cy + this.halfW * sin - this.halfH * cos),
			new Phaser.Math.Vector2(cx + this.halfW * cos - this.halfH * sin, cy + this.halfW * sin + this.halfH * cos),
			new Phaser.Math.Vector2(cx - this.halfW * cos - this.halfH * sin, cy - this.halfW * sin + this.halfH * cos),
		];
	}

	private getMinMax(corners: Phaser.Math.Vector2[]): { minX: number; maxX: number; minY: number; maxY: number } {
		let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
		for (const c of corners) {
			if (c.x < minX) minX = c.x;
			if (c.x > maxX) maxX = c.x;
			if (c.y < minY) minY = c.y;
			if (c.y > maxY) maxY = c.y;
		}
		return { minX, maxX, minY, maxY };
	}

	private getTileRange(
		layer: Phaser.Tilemaps.TilemapLayer,
		bounds: { minX: number; maxX: number; minY: number; maxY: number },
	) {
		return {
			minX: layer.worldToTileX(bounds.minX) ?? 0,
			maxX: layer.worldToTileX(bounds.maxX) ?? 0,
			minY: layer.worldToTileY(bounds.minY) ?? 0,
			maxY: layer.worldToTileY(bounds.maxY) ?? 0,
		};
	}

	private intersects(corners: Phaser.Math.Vector2[], rect: Phaser.Geom.Rectangle): boolean {
		for (const c of corners) {
			if (rect.contains(c.x, c.y)) return true;
		}

		const tileCorners = [
			new Phaser.Math.Vector2(rect.x, rect.y),
			new Phaser.Math.Vector2(rect.x + rect.width, rect.y),
			new Phaser.Math.Vector2(rect.x + rect.width, rect.y + rect.height),
			new Phaser.Math.Vector2(rect.x, rect.y + rect.height),
		];

		for (const tc of tileCorners) {
			if (this.pointInRotatedRect(tc.x, tc.y, corners)) return true;
		}

		return false;
	}

	private pointInRotatedRect(px: number, py: number, corners: Phaser.Math.Vector2[]): boolean {
		const d1 = this.cross(corners[0], corners[1], px, py);
		const d2 = this.cross(corners[1], corners[2], px, py);
		const d3 = this.cross(corners[2], corners[3], px, py);
		const d4 = this.cross(corners[3], corners[0], px, py);
		const allPos = d1 >= 0 && d2 >= 0 && d3 >= 0 && d4 >= 0;
		const allNeg = d1 <= 0 && d2 <= 0 && d3 <= 0 && d4 <= 0;
		return allPos || allNeg;
	}

	private cross(a: Phaser.Math.Vector2, b: Phaser.Math.Vector2, px: number, py: number): number {
		return (b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x);
	}

	private computePushOut(corners: Phaser.Math.Vector2[], rect: Phaser.Geom.Rectangle): Phaser.Math.Vector2 {
		const shipCenter = new Phaser.Math.Vector2(this.sprite.x, this.sprite.y);
		const rectCenter = new Phaser.Math.Vector2(rect.x + rect.width / 2, rect.y + rect.height / 2);
		const dir = shipCenter.clone().subtract(rectCenter);
		const len = dir.length();
		if (len < 0.001) return new Phaser.Math.Vector2(1, 0);
		dir.normalize();

		const maxPen = this.halfW + this.halfH;
		for (let step = 1; step <= maxPen; step++) {
			const testX = this.sprite.x + dir.x * step;
			const testY = this.sprite.y + dir.y * step;
			const originalX = this.sprite.x;
			const originalY = this.sprite.y;
			this.sprite.x = testX;
			this.sprite.y = testY;
			const testCorners = this.getRotatedCorners();
			this.sprite.x = originalX;
			this.sprite.y = originalY;
			if (!this.intersects(testCorners, rect)) {
				return new Phaser.Math.Vector2(dir.x * step, dir.y * step);
			}
		}

		return new Phaser.Math.Vector2(dir.x * maxPen, dir.y * maxPen);
	}
}
