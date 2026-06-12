import { io, Socket } from 'socket.io-client';
import type { PlayerData, Station, PlayerState, PlayerDirection, EnemyData, GameStartedData } from '../../../shared/types';
import { DEBUG } from '../config/gameConfig';
import Ship from '../entities/Ship';
import PlayerManager from '../entities/PlayerManager';
import StationManager from '../systems/StationManager';

export default class NetworkManager {
	private socket: Socket;
	private playerManager: PlayerManager;
	private onShipSynced?: () => void;
	private onLocalPlayerCreated?: (x: number, y: number) => void;
	private onEnemySpawned?: (id: string, x: number, y: number, hp: number, maxHp: number) => void;
	private onEnemyDestroyed?: (id: string) => void;
	private onEnemyDamaged?: (id: string, hp: number) => void;
	private onShipDamaged?: (hpPct: number) => void;
	private onGameOver?: (data: { score: number }) => void;
	private onScoreUpdated?: (score: number) => void;
	private onCannonFired?: (x: number, y: number, vx: number, vy: number) => void;
	private onEnemiesMoved?: (enemies: EnemyData[]) => void;
	private onReturnToMenu?: () => void;

	constructor(
		ship: Ship,
		playerManager: PlayerManager,
		stationManager: StationManager,
		existingSocket?: Socket,
		onLocalPlayerCreated?: (x: number, y: number) => void,
		onShipSyncedFromNetwork?: () => void,
		onEnemyState?: (enemies: EnemyData[], hpPct: number) => void,
		onEnemySpawned?: (id: string, x: number, y: number, hp: number, maxHp: number) => void,
		onEnemyDestroyed?: (id: string) => void,
		onEnemyDamaged?: (id: string, hp: number) => void,
		onShipDamaged?: (hpPct: number) => void,
		onGameOver?: (data: { score: number }) => void,
		onScoreUpdated?: (score: number) => void,
		onCannonFired?: (x: number, y: number, vx: number, vy: number) => void,
		onEnemiesMoved?: (enemies: EnemyData[]) => void,
		onReturnToMenu?: () => void,
	) {
		this.onShipSynced = onShipSyncedFromNetwork;
		this.playerManager = playerManager;
		this.onLocalPlayerCreated = onLocalPlayerCreated;
		this.onEnemySpawned = onEnemySpawned;
		this.onEnemyDestroyed = onEnemyDestroyed;
		this.onEnemyDamaged = onEnemyDamaged;
		this.onShipDamaged = onShipDamaged;
		this.onGameOver = onGameOver;
		this.onScoreUpdated = onScoreUpdated;
		this.onCannonFired = onCannonFired;
		this.onEnemiesMoved = onEnemiesMoved;
		this.onReturnToMenu = onReturnToMenu;
		this.socket = existingSocket ?? io();

		this.socket.on('connect', () => {
			if (DEBUG) console.log('[NetworkManager] connect: connected, id', this.socket.id);
		});

		this.socket.on('playerJoined', (playerInfo: PlayerData) => {
			if (DEBUG) console.log('[NetworkManager] playerJoined:', playerInfo.id);
			playerManager.addRemotePlayer(playerInfo);
		});

		this.socket.on('playerLeft', (playerId: string) => {
			if (DEBUG) console.log('[NetworkManager] playerLeft:', playerId);
			playerManager.removeRemotePlayer(playerId);
		});

		this.socket.on('playerMoved', (playerInfo: PlayerData) => {
			playerManager.updateRemotePlayer(
				playerInfo.id,
				playerInfo.x,
				playerInfo.y,
				playerInfo.state,
				playerInfo.direction,
			);
		});

		this.socket.on('forcePosition', (playerInfo: PlayerData) => {
			if (DEBUG) console.log('[NetworkManager] forcePosition:', playerInfo.id, 'to', playerInfo.x.toFixed(0), playerInfo.y.toFixed(0));
			playerManager.snapPosition(playerInfo.x, playerInfo.y);
		});

		this.socket.on('shipMoved', (data: { x: number; y: number; dx: number; dy: number; angle: number }) => {
			if (playerManager.localStation === 'rudder') return;

			const prevAngle = ship.rotation;
			ship.sprite.x = data.x;
			ship.sprite.y = data.y;
			ship.sprite.rotation = data.angle;
			ship.sprite.setVelocity(0, 0);
			ship.sprite.setAngularVelocity(0);
			stationManager.updatePositions();

			const rawAngleDelta = ship.rotation - prevAngle;
			const angleDelta = ((rawAngleDelta + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
			if (angleDelta !== 0) {
				const cos = Math.cos(angleDelta);
				const sin = Math.sin(angleDelta);

				playerManager.group.getChildren().forEach((other: any) => {
					const offX = other.x - ship.x;
					const offY = other.y - ship.y;
					other.x = ship.x + offX * cos - offY * sin;
					other.y = ship.y + offX * sin + offY * cos;
				});
			}

			if (data.dx !== 0 || data.dy !== 0) {
				playerManager.group.getChildren().forEach((other: any) => {
					other.x += data.dx;
					other.y += data.dy;
				});
			}

			playerManager.group.getChildren().forEach((other: any) => {
				playerManager.clampRemoteToDeck(other);
			});

			playerManager.recalcLocalPosition();
			this.onShipSynced?.();
		});

		this.socket.on('playersMoved', (players: { [id: string]: PlayerData }) => {
			Object.keys(players).forEach((id) => {
				if (id === this.socket.id) return;
				playerManager.updateRemotePlayer(
					id,
					players[id].x,
					players[id].y,
					players[id].state,
					players[id].direction,
				);
			});
		});

		this.socket.on('forceShipPosition', (data: { x: number; y: number; angle: number }) => {
			if (playerManager.localStation === 'rudder') return;
			if (DEBUG) console.log('[NetworkManager] forceShipPosition:', data.x.toFixed(0), data.y.toFixed(0), data.angle.toFixed(3));
			ship.sprite.x = data.x;
			ship.sprite.y = data.y;
			ship.sprite.rotation = data.angle;
			ship.sprite.setVelocity(0, 0);
			ship.sprite.setAngularVelocity(0);
			stationManager.updatePositions();
			playerManager.recalcLocalPosition();
			this.onShipSynced?.();
		});

    this.socket.on('playerStationChanged', (data: { id: string; station: Station }) => {
			if (DEBUG) console.log('[NetworkManager] playerStationChanged:', data.id, '->', data.station);
      playerManager.setRemotePlayerStation(data.id, data.station);
    });

    this.socket.on('enemyState', (data: { enemies: EnemyData[]; shipHpPct: number }) => {
			if (DEBUG) console.log('[NetworkManager] enemyState:', data.enemies.length, 'enemies, HP', data.shipHpPct.toFixed(0), '%');
      onEnemyState?.(data.enemies, data.shipHpPct);
    });

    this.socket.on('enemySpawned', (data: EnemyData) => {
			if (DEBUG) console.log('[NetworkManager] enemySpawned:', data.id, 'at', data.x.toFixed(0), data.y.toFixed(0), 'HP', data.hp);
      this.onEnemySpawned?.(data.id, data.x, data.y, data.hp, data.maxHp);
    });

    this.socket.on('enemyDestroyed', (data: { id: string }) => {
			if (DEBUG) console.log('[NetworkManager] enemyDestroyed:', data.id);
      this.onEnemyDestroyed?.(data.id);
    });

    this.socket.on('enemyDamaged', (data: { id: string; hp: number }) => {
			if (DEBUG) console.log('[NetworkManager] enemyDamaged:', data.id, 'HP', data.hp);
      this.onEnemyDamaged?.(data.id, data.hp);
    });

    this.socket.on('shipDamaged', (data: { hp: number; hpPct: number }) => {
			if (DEBUG) console.log('[NetworkManager] shipDamaged: HP', data.hp, '(data.hpPct.toFixed(0)', '%)');
      this.onShipDamaged?.(data.hpPct);
    });

    this.socket.on('gameOver', (data: { score: number }) => {
			if (DEBUG) console.log('[NetworkManager] gameOver: score', data.score);
      this.onGameOver?.(data);
    });

    this.socket.on('scoreUpdated', (data: { score: number }) => {
			if (DEBUG) console.log('[NetworkManager] scoreUpdated:', data.score);
      this.onScoreUpdated?.(data.score);
    });

    this.socket.on('enemiesMoved', (data: { enemies: EnemyData[] }) => {
      this.onEnemiesMoved?.(data.enemies);
    });

    this.socket.on('cannonFired', (data: { x: number; y: number; vx: number; vy: number }) => {
      this.onCannonFired?.(data.x, data.y, data.vx, data.vy);
    });

    this.socket.on('returnToMenu', () => {
			if (DEBUG) console.log('[NetworkManager] returnToMenu');
      this.onReturnToMenu?.();
    });
  }

	emitPlayerMovement(x: number, y: number, state: PlayerState, direction: PlayerDirection): void {
		if (DEBUG) console.log('[NetworkManager] emitPlayerMovement:', x.toFixed(0), y.toFixed(0), state, direction);
		this.socket.emit('playerMovement', { x, y, state, direction });
	}

	emitStationChange(station: Station): void {
		if (DEBUG) console.log('[NetworkManager] emitStationChange:', station);
		this.socket.emit('playerStationChange', { station });
	}

	emitShipMove(x: number, y: number, angle: number): void {
		const positions = this.playerManager.getPlayerWorldPositions(this.socket.id!);
		if (DEBUG) console.log('[NetworkManager] emitShipMove:', x.toFixed(0), y.toFixed(0), angle.toFixed(3), Object.keys(positions).length, 'players');
		this.socket.emit('shipMove', { x, y, angle, players: positions });
	}

	emitCannonHit(enemyId: string): void {
		if (DEBUG) console.log('[NetworkManager] emitCannonHit:', enemyId);
		this.socket.emit('cannonHit', { enemyId });
	}

	emitCannonFired(x: number, y: number, vx: number, vy: number): void {
		if (DEBUG) console.log('[NetworkManager] emitCannonFired:', x.toFixed(0), y.toFixed(0));
		this.socket.emit('cannonFired', { x, y, vx, vy });
	}

	getSocketId(): string {
		return this.socket.id || '';
	}

	disconnect(): void {
		if (DEBUG) console.log('[NetworkManager] disconnect');
		this.socket.disconnect();
	}

	emitReturnToMenu(): void {
		if (DEBUG) console.log('[NetworkManager] emitReturnToMenu');
		this.socket.emit('returnToMenu');
	}

	initializeFromState(state: GameStartedData): void {
		const myId = this.socket.id;
		if (myId && state.players[myId]) {
			const me = state.players[myId];
			this.playerManager.createLocalPlayer(me.x, me.y);
			this.onLocalPlayerCreated?.(me.x, me.y);
		}
		Object.keys(state.players).forEach(id => {
			if (id !== myId) {
				this.playerManager.addRemotePlayer(state.players[id]);
			}
		});
		this.onShipDamaged?.(state.hpPct);
		this.onScoreUpdated?.(state.score);
	}
}
