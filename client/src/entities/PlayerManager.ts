import Phaser from 'phaser';
import type { Station, PlayerState, PlayerDirection, PlayerData } from '../../../shared/types';
import { PLAYER_SPEED } from '../../../shared/types';
import { DEBUG } from '../config/gameConfig';
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
		if (DEBUG) console.log('[PlayerManager] constructor: created');
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
		if (DEBUG) console.log('[PlayerManager] createAnimations: created 8 animations for', prefix);
	}

	createLocalPlayer(x: number, y: number): void {
		const local = this.worldToLocal(x, y);
		this.offsetX = local.x;
		this.offsetY = local.y;

		this.sprite = this.scene.add.sprite(x, y, 'player_1', 0);
		this.sprite.setScale(1);
		this.sprite.setDepth(10);
		this.playAnim('idle', 'down');
		if (DEBUG) console.log('[PlayerManager] createLocalPlayer: at', x.toFixed(0), y.toFixed(0), 'offset', this.offsetX.toFixed(0), this.offsetY.toFixed(0));
	}

	addRemotePlayer(playerInfo: PlayerData): void {
		const other = this.scene.add.sprite(playerInfo.x, playerInfo.y, 'player_2', 0);
		other.setScale(1);
		other.setDepth(10);
		(other as any).playerId = playerInfo.id;
		(other as any).station = playerInfo.station;
		this.playAnimOn(other, playerInfo.state, playerInfo.direction);
		this.group.add(other);
		if (DEBUG) console.log('[PlayerManager] addRemotePlayer:', playerInfo.id, 'at', playerInfo.x.toFixed(0), playerInfo.y.toFixed(0));
	}

	removeRemotePlayer(playerId: string): void {
		this.group.getChildren().forEach((child: any) => {
			if (child.playerId === playerId) {
				child.destroy();
				if (DEBUG) console.log('[PlayerManager] removeRemotePlayer:', playerId, 'destroyed');
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
		if (DEBUG) console.log('[PlayerManager] setRemotePlayerStation:', id, '->', station);
	}

	moveOnDeck(cursors: Phaser.Types.Input.Keyboard.CursorKeys, dt: number): boolean {
		let worldDx = 0;
		let worldDy = 0;
		const speed = PLAYER_SPEED;

		if (cursors.left.isDown) {
			worldDx = -speed * dt;
		} else if (cursors.right.isDown) {
			worldDx = speed * dt;
		}

		if (cursors.up.isDown) {
			worldDy = -speed * dt;
		} else if (cursors.down.isDown) {
			worldDy = speed * dt;
		}

		if (worldDx === 0 && worldDy === 0) {
			this.playAnim('idle', this.direction);
			return false;
		}

		this.direction = this.getDirection(worldDx, worldDy);
		this.playAnim('walk', this.direction);

		const cos = Math.cos(this.ship.rotation);
		const sin = Math.sin(this.ship.rotation);
		const localDx = worldDx * cos + worldDy * sin;
		const localDy = -worldDx * sin + worldDy * cos;

		this.offsetX += localDx;
		this.offsetY += localDy;

		const DECK_MARGIN_Y = 50;
		const maxOffX = (this.ship.sprite.displayWidth - this.sprite.displayWidth) / 2;
		const maxOffY = (this.ship.sprite.displayHeight - this.sprite.displayHeight) / 2 - DECK_MARGIN_Y;
		this.offsetX = Phaser.Math.Clamp(this.offsetX, -maxOffX, maxOffX);
		this.offsetY = Phaser.Math.Clamp(this.offsetY, -maxOffY, maxOffY);

		const worldPos = this.localToWorld(this.offsetX, this.offsetY);
		this.sprite.x = worldPos.x;
		this.sprite.y = worldPos.y;

		if (DEBUG) console.log('[PlayerManager] moveOnDeck:', this.direction, 'offset', this.offsetX.toFixed(0), this.offsetY.toFixed(0));
		return true;
	}

	syncToShip(dx: number, dy: number, angleDelta: number): void {
		if (angleDelta !== 0) {
			const cos = Math.cos(angleDelta);
			const sin = Math.sin(angleDelta);

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

		this.group.getChildren().forEach((other: any) => {
			this.clampRemoteToDeck(other);
		});

		const worldPos = this.localToWorld(this.offsetX, this.offsetY);
		this.sprite.x = worldPos.x;
		this.sprite.y = worldPos.y;

		if (DEBUG && (dx !== 0 || dy !== 0 || angleDelta !== 0)) {
			console.log('[PlayerManager] syncToShip: dx', dx.toFixed(1), 'dy', dy.toFixed(1), 'angleDelta', angleDelta.toFixed(3));
		}
	}

	enterStation(station: Station, worldX: number, worldY: number): void {
		this.localStation = station;
		const local = this.worldToLocal(worldX, worldY);
		this.offsetX = local.x;
		this.offsetY = local.y;
		this.sprite.setPosition(worldX, worldY);

		if (station === 'cannon_left') {
			this.direction = 'left';
		} else if (station === 'cannon_right') {
			this.direction = 'right';
		} else {
			this.direction = 'down';
		}
		this.playAnim('idle', this.direction);
		if (DEBUG) console.log('[PlayerManager] enterStation:', station, 'at', worldX.toFixed(0), worldY.toFixed(0));
	}

	exitStation(): void {
		if (DEBUG) console.log('[PlayerManager] exitStation:', this.localStation);
		this.localStation = null;
	}

	snapPosition(x: number, y: number): void {
		const local = this.worldToLocal(x, y);
		this.offsetX = local.x;
		this.offsetY = local.y;

		const DECK_MARGIN_Y = 50;
		const maxOffX = (this.ship.sprite.displayWidth - this.sprite.displayWidth) / 2;
		const maxOffY = (this.ship.sprite.displayHeight - this.sprite.displayHeight) / 2 - DECK_MARGIN_Y;
		this.offsetX = Phaser.Math.Clamp(this.offsetX, -maxOffX, maxOffX);
		this.offsetY = Phaser.Math.Clamp(this.offsetY, -maxOffY, maxOffY);

		const worldPos = this.localToWorld(this.offsetX, this.offsetY);
		this.sprite.setPosition(worldPos.x, worldPos.y);
		if (DEBUG) console.log('[PlayerManager] snapPosition: forced to', x.toFixed(0), y.toFixed(0), '-> clamped to', worldPos.x.toFixed(0), worldPos.y.toFixed(0));
	}

	clampRemoteToDeck(sprite: Phaser.GameObjects.Sprite): void {
		const before = { x: sprite.x, y: sprite.y };
		const local = this.worldToLocal(sprite.x, sprite.y);
		const DECK_MARGIN_Y = 50;
		const maxOffX = (this.ship.sprite.displayWidth - sprite.displayWidth) / 2;
		const maxOffY = (this.ship.sprite.displayHeight - sprite.displayHeight) / 2 - DECK_MARGIN_Y;
		const cx = Phaser.Math.Clamp(local.x, -maxOffX, maxOffX);
		const cy = Phaser.Math.Clamp(local.y, -maxOffY, maxOffY);
		const worldPos = this.localToWorld(cx, cy);
		sprite.x = worldPos.x;
		sprite.y = worldPos.y;
		if (DEBUG && (sprite.x !== before.x || sprite.y !== before.y)) {
			console.log('[PlayerManager] clampRemoteToDeck:', before.x.toFixed(0), before.y.toFixed(0), '->', sprite.x.toFixed(0), sprite.y.toFixed(0));
		}
	}

	recalcLocalPosition(): void {
		if (!this.sprite) return;
		const worldPos = this.localToWorld(this.offsetX, this.offsetY);
		this.sprite.x = worldPos.x;
		this.sprite.y = worldPos.y;
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

	private localToWorld(localX: number, localY: number): { x: number; y: number } {
		const cos = Math.cos(this.ship.rotation);
		const sin = Math.sin(this.ship.rotation);
		return {
			x: this.ship.x + localX * cos - localY * sin,
			y: this.ship.y + localX * sin + localY * cos,
		};
	}

	private worldToLocal(worldX: number, worldY: number): { x: number; y: number } {
		const cos = Math.cos(this.ship.rotation);
		const sin = Math.sin(this.ship.rotation);
		const dx = worldX - this.ship.x;
		const dy = worldY - this.ship.y;
		return {
			x: dx * cos + dy * sin,
			y: -dx * sin + dy * cos,
		};
	}
}
