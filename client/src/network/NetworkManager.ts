import { io, Socket } from 'socket.io-client';
import type { PlayerData, Station, PlayerState, PlayerDirection, EnemyData } from '../../../shared/types';
import { DEBUG } from '../config/gameConfig';
import Ship from '../entities/Ship';
import PlayerManager from '../entities/PlayerManager';
import StationManager from '../systems/StationManager';

export default class NetworkManager {
	private socket: Socket;
	private playerManager: PlayerManager;
	private onShipSynced?: () => void;
	private onEnemySpawned?: (id: string, x: number, y: number, hp: number, maxHp: number) => void;
	private onEnemyDestroyed?: (id: string) => void;
	private onEnemyDamaged?: (id: string, hp: number) => void;
	private onShipDamaged?: (hpPct: number) => void;
	private onGameOver?: () => void;
	private onEnemiesMoved?: (enemies: EnemyData[]) => void;
	private onReturnToMenu?: () => void;

	constructor(
		ship: Ship,
		playerManager: PlayerManager,
		stationManager: StationManager,
		onLocalPlayerCreated: (x: number, y: number) => void,
		onShipSyncedFromNetwork?: () => void,
		onEnemyState?: (enemies: EnemyData[], hpPct: number) => void,
		onEnemySpawned?: (id: string, x: number, y: number, hp: number, maxHp: number) => void,
		onEnemyDestroyed?: (id: string) => void,
		onEnemyDamaged?: (id: string, hp: number) => void,
		onShipDamaged?: (hpPct: number) => void,
		onGameOver?: () => void,
		onEnemiesMoved?: (enemies: EnemyData[]) => void,
		onReturnToMenu?: () => void,
	) {
		this.onShipSynced = onShipSyncedFromNetwork;
		this.playerManager = playerManager;
		this.onEnemySpawned = onEnemySpawned;
		this.onEnemyDestroyed = onEnemyDestroyed;
		this.onEnemyDamaged = onEnemyDamaged;
		this.onShipDamaged = onShipDamaged;
		this.onGameOver = onGameOver;
		this.onEnemiesMoved = onEnemiesMoved;
		this.onReturnToMenu = onReturnToMenu;
		// Pega o IP/Domínio que está atualmente na barra de endereços do navegador
		const serverHost = window.location.hostname; 

		// Conecta na porta 3000 usando o mesmo IP de onde o jogo está vindo
		this.socket = io(`http://${serverHost}:3000`);

		this.socket.on('connect', () => {
			if (DEBUG) console.log('[NetworkManager] connect: connected, id', this.socket.id);
		});

		this.socket.on('currentPlayers', (players: { [id: string]: PlayerData }) => {
			if (DEBUG) console.log('[NetworkManager] currentPlayers:', Object.keys(players).length, 'players received');
			Object.keys(players).forEach((id) => {
				if (players[id].id === this.socket.id) {
					playerManager.createLocalPlayer(players[id].x, players[id].y);
					onLocalPlayerCreated(players[id].x, players[id].y);
				} else {
					playerManager.addRemotePlayer(players[id]);
				}
			});
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

    this.socket.on('gameOver', () => {
			if (DEBUG) console.log('[NetworkManager] gameOver');
      this.onGameOver?.();
    });

    this.socket.on('enemiesMoved', (data: { enemies: EnemyData[] }) => {
      this.onEnemiesMoved?.(data.enemies);
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
}
