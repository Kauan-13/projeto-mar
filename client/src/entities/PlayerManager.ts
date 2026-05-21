import Phaser from 'phaser';
import type { Station, PlayerState, PlayerDirection, PlayerData } from '../../../shared/types';
import { PLAYER_SPEED } from '../../../shared/types';
import Ship from './Ship';

export default class PlayerManager {
	private scene: Phaser.Scene;
	private ship: Ship;

	sprite!: Phaser.GameObjects.Sprite;
	group: Phaser.GameObjects.Group;
	localStation: Station = null;
	direction: PlayerDirection = 'down';
	private offsetX: number = 0;
	private offsetY: number = 0;

	constructor(scene: Phaser.Scene, ship: Ship) {
		this.scene = scene;
		this.ship = ship;
		this.group = scene.add.group();
	}

	createAnimations(textureKey: string, prefix: string): void {
		const gen = (start: number, end: number) =>
			this.scene.anims.generateFrameNumbers(textureKey, { start, end });

		this.scene.anims.create({ key: `${prefix}_idle_down`,  frames: gen(0, 2),   frameRate: 3, repeat: -1 });
		this.scene.anims.create({ key: `${prefix}_idle_up`,    frames: gen(3, 5),   frameRate: 3, repeat: -1 });
		this.scene.anims.create({ key: `${prefix}_idle_right`, frames: gen(6, 8),   frameRate: 3, repeat: -1 });
		this.scene.anims.create({ key: `${prefix}_idle_left`,  frames: gen(9, 11),  frameRate: 3, repeat: -1 });
		this.scene.anims.create({ key: `${prefix}_walk_down`,  frames: gen(12, 14), frameRate: 8, repeat: -1 });
		this.scene.anims.create({ key: `${prefix}_walk_up`,    frames: gen(15, 17), frameRate: 8, repeat: -1 });
		this.scene.anims.create({ key: `${prefix}_walk_right`, frames: gen(18, 20), frameRate: 8, repeat: -1 });
		this.scene.anims.create({ key: `${prefix}_walk_left`,  frames: gen(21, 23), frameRate: 8, repeat: -1 });
	}

	createLocalPlayer(x: number, y: number): void {
		this.offsetX = x - this.ship.x;
		this.offsetY = y - this.ship.y;

		this.sprite = this.scene.add.sprite(x, y, 'player_1', 0);
		this.sprite.setScale(1);
		this.sprite.setDepth(10);
		this.playAnim('idle', 'down');
	}

	addRemotePlayer(playerInfo: PlayerData): void {
		const other = this.scene.add.sprite(playerInfo.x, playerInfo.y, 'player_2', 0);
		other.setScale(1);
		other.setDepth(10);
		(other as any).playerId = playerInfo.id;
		(other as any).station = playerInfo.station;
		this.playAnimOn(other, playerInfo.state, playerInfo.direction);
		this.group.add(other);
	}

	removeRemotePlayer(playerId: string): void {
		this.group.getChildren().forEach((child: any) => {
			if (child.playerId === playerId) {
				child.destroy();
			}
		});
	}

	updateRemotePlayer(id: string, x: number, y: number, state: PlayerState, direction: PlayerDirection): void {
		this.group.getChildren().forEach((child: any) => {
			if (child.playerId === id) {
				child.setPosition(x, y);
				this.playAnimOn(child, state, direction);
			}
		});
	}

	setRemotePlayerStation(id: string, station: Station): void {
		this.group.getChildren().forEach((child: any) => {
			if (child.playerId === id) {
				child.station = station;
			}
		});
	}

	moveOnDeck(cursors: Phaser.Types.Input.Keyboard.CursorKeys, dt: number): boolean {
		let dx = 0;
		let dy = 0;
		const speed = PLAYER_SPEED;

		if (cursors.left.isDown) {
			dx = -speed * dt;
		} else if (cursors.right.isDown) {
			dx = speed * dt;
		}

		if (cursors.up.isDown) {
			dy = -speed * dt;
		} else if (cursors.down.isDown) {
			dy = speed * dt;
		}

		if (dx === 0 && dy === 0) {
			this.playAnim('idle', this.direction);
			return false;
		}

		this.direction = this.getDirection(dx, dy);
		this.playAnim('walk', this.direction);

		this.offsetX += dx;
		this.offsetY += dy;

		const DECK_MARGIN_Y = 50;
		const maxOffX = (this.ship.sprite.displayWidth - this.sprite.displayWidth) / 2;
		const maxOffY = (this.ship.sprite.displayHeight - this.sprite.displayHeight) / 2 - DECK_MARGIN_Y;
		this.offsetX = Phaser.Math.Clamp(this.offsetX, -maxOffX, maxOffX);
		this.offsetY = Phaser.Math.Clamp(this.offsetY, -maxOffY, maxOffY);

		this.sprite.x = this.ship.x + this.offsetX;
		this.sprite.y = this.ship.y + this.offsetY;

		return true;
	}

	syncToShip(dx: number, dy: number, angleDelta: number): void {
		if (angleDelta !== 0) {
			const cos = Math.cos(angleDelta);
			const sin = Math.sin(angleDelta);

			// Rotate local player offset
			const newOffX = this.offsetX * cos - this.offsetY * sin;
			const newOffY = this.offsetX * sin + this.offsetY * cos;
			this.offsetX = newOffX;
			this.offsetY = newOffY;

			// Rotate remote players around ship center
			const shipX = this.ship.x;
			const shipY = this.ship.y;
			this.group.getChildren().forEach((other: any) => {
				const offX = other.x - shipX;
				const offY = other.y - shipY;
				other.x = shipX + offX * cos - offY * sin;
				other.y = shipY + offX * sin + offY * cos;
			});
		}

		if (dx !== 0 || dy !== 0) {
			this.group.getChildren().forEach((other: any) => {
				other.x += dx;
				other.y += dy;
			});
		}

		this.sprite.x = this.ship.x + this.offsetX;
		this.sprite.y = this.ship.y + this.offsetY;
	}

	enterStation(station: Station, worldX: number, worldY: number): void {
		this.localStation = station;
		this.offsetX = worldX - this.ship.x;
		this.offsetY = worldY - this.ship.y;
		this.sprite.setPosition(worldX, worldY);

		if (station === 'cannon_left') {
			this.direction = 'left';
		} else if (station === 'cannon_right') {
			this.direction = 'right';
		} else {
			this.direction = 'down';
		}
		this.playAnim('idle', this.direction);
	}

	exitStation(): void {
		this.localStation = null;
	}

	snapPosition(x: number, y: number): void {
		this.offsetX = x - this.ship.x;
		this.offsetY = y - this.ship.y;
		this.sprite.setPosition(x, y);
	}

	rotateLocalOffset(angleDelta: number): void {
		const cos = Math.cos(angleDelta);
		const sin = Math.sin(angleDelta);
		const newOffX = this.offsetX * cos - this.offsetY * sin;
		const newOffY = this.offsetX * sin + this.offsetY * cos;
		this.offsetX = newOffX;
		this.offsetY = newOffY;
	}

	recalcLocalPosition(): void {
		if (!this.sprite) return;
		this.sprite.x = this.ship.x + this.offsetX;
		this.sprite.y = this.ship.y + this.offsetY;
	}

	getPlayerWorldPositions(localId: string): Record<string, { x: number; y: number }> {
		const positions: Record<string, { x: number; y: number }> = {};
		positions[localId] = { x: this.sprite.x, y: this.sprite.y };
		this.group.getChildren().forEach((other: any) => {
			positions[other.playerId] = { x: other.x, y: other.y };
		});
		return positions;
	}

	playAnim(state: PlayerState, direction: PlayerDirection): void {
		this.playAnimOn(this.sprite, state, direction);
	}

	playAnimOn(sprite: Phaser.GameObjects.Sprite, state: PlayerState, direction: PlayerDirection): void {
		const prefix = sprite.texture.key === 'player_1' ? 'player1' : 'player2';
		sprite.play(`${prefix}_${state}_${direction}`, true);
	}

	private getDirection(dx: number, dy: number): PlayerDirection {
		if (Math.abs(dx) >= Math.abs(dy)) {
			return dx < 0 ? 'left' : 'right';
		}
		return dy < 0 ? 'up' : 'down';
	}
}
