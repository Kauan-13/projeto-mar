import { io, Socket } from 'socket.io-client';
import type { PlayerData, Station, PlayerState, PlayerDirection } from '../../../shared/types';
import Ship from '../entities/Ship';
import PlayerManager from '../entities/PlayerManager';
import StationManager from '../systems/StationManager';

export default class NetworkManager {
	private socket: Socket;
	private playerManager: PlayerManager;

	constructor(
		ship: Ship,
		playerManager: PlayerManager,
		stationManager: StationManager,
		onLocalPlayerCreated: (x: number, y: number) => void,
	) {
		this.playerManager = playerManager;
		this.socket = io('http://localhost:3000');

		this.socket.on('connect', () => {
			console.log('Connected to server via Socket.io');
		});

		this.socket.on('currentPlayers', (players: { [id: string]: PlayerData }) => {
			console.log('[Network] currentPlayers received, count:', Object.keys(players).length);
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
			playerManager.addRemotePlayer(playerInfo);
		});

		this.socket.on('playerLeft', (playerId: string) => {
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

			playerManager.recalcLocalPosition();
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
			ship.sprite.x = data.x;
			ship.sprite.y = data.y;
			ship.sprite.rotation = data.angle;
			ship.sprite.setVelocity(0, 0);
			ship.sprite.setAngularVelocity(0);
			stationManager.updatePositions();
			playerManager.recalcLocalPosition();
		});

    this.socket.on('playerStationChanged', (data: { id: string; station: Station }) => {
      playerManager.setRemotePlayerStation(data.id, data.station);
    });
  }

	emitPlayerMovement(x: number, y: number, state: PlayerState, direction: PlayerDirection): void {
		this.socket.emit('playerMovement', { x, y, state, direction });
	}

	emitStationChange(station: Station): void {
		this.socket.emit('playerStationChange', { station });
	}

	emitShipMove(x: number, y: number, angle: number): void {
		const positions = this.playerManager.getPlayerWorldPositions(this.socket.id);
		this.socket.emit('shipMove', { x, y, angle, players: positions });
	}

	getSocketId(): string {
		return this.socket.id || '';
	}
}
