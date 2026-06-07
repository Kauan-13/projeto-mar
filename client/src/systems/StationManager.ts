import Phaser from 'phaser';
import type { Station } from '../../../shared/types';
import { STATION_PROXIMITY_RANGE, DEBUG } from '../config/gameConfig';
import type { StationDef } from '../config/gameConfig';
import Ship from '../entities/Ship';

export interface CameraConfig {
	zoom: number;
	followTarget: Phaser.GameObjects.Sprite;
	followOffsetX: number;
	followOffsetY: number;
}

export default class StationManager {
	private scene: Phaser.Scene;
	private ship: Ship;
	private objs: Phaser.GameObjects.GameObject[] = [];
	private defs: StationDef[];

	constructor(scene: Phaser.Scene, ship: Ship, defs: StationDef[]) {
		this.scene = scene;
		this.ship = ship;
		this.defs = defs;

		defs.forEach(def => {
			const x = this.ship.x + def.offsetX;
			const y = this.ship.y + def.offsetY;
			let obj: Phaser.GameObjects.GameObject;

			if (def.key === 'cannon_left' || def.key === 'cannon_right') {
				const spr = scene.add.sprite(x, y, 'cannon');
				spr.setScale(0.5);
				spr.setDepth(6);
				if (def.key === 'cannon_left') spr.setFlipX(true);
				obj = spr;
			} else if (def.key === 'rudder') {
				const spr = scene.add.sprite(x, y, 'rudder');
				spr.setScale(0.3);
				spr.setDepth(6);
				obj = spr;
			} else {
				const rect = scene.add.rectangle(x, y, 30, 30, def.color, 0.5);
				rect.setDepth(6);
				obj = rect;
			}

			(obj as any).stationKey = def.key;
			this.objs.push(obj);
		});
		if (DEBUG) console.log('[StationManager] constructor:', defs.length, 'stations created');
	}

	updatePositions(): void {
		const cos = Math.cos(this.ship.rotation);
		const sin = Math.sin(this.ship.rotation);
		this.objs.forEach(obj => {
			const key = (obj as any).stationKey as Station;
			const def = this.defs.find(d => d.key === key);
			if (def) {
				(obj as any).x = this.ship.x + def.offsetX * cos - def.offsetY * sin;
				(obj as any).y = this.ship.y + def.offsetX * sin + def.offsetY * cos;
				(obj as any).setRotation(this.ship.rotation);
			}
		});
	}

	highlightProximity(playerX: number, playerY: number): void {
		let nearest: string | null = null;
		let minDist = Infinity;
		this.objs.forEach(obj => {
			const dist = Phaser.Math.Distance.Between(playerX, playerY, (obj as any).x, (obj as any).y);
			(obj as any).setAlpha(dist < STATION_PROXIMITY_RANGE ? 1 : 0.7);
			if (dist < minDist) { minDist = dist; nearest = (obj as any).stationKey as string; }
		});
		if (DEBUG && minDist < STATION_PROXIMITY_RANGE) {
			console.log('[StationManager] highlightProximity: nearest', nearest, 'dist', minDist.toFixed(0));
		}
	}

	findNearest(playerX: number, playerY: number): Station | null {
		for (const obj of this.objs) {
			const dist = Phaser.Math.Distance.Between(playerX, playerY, (obj as any).x, (obj as any).y);
			if (dist < STATION_PROXIMITY_RANGE) {
				return (obj as any).stationKey as Station;
			}
		}
		return null;
	}

	getStationDef(station: Station): StationDef | undefined {
		return this.defs.find(d => d.key === station);
	}

	getStationWorldPosition(station: Station): { x: number; y: number } {
		const def = this.defs.find(d => d.key === station);
		if (!def) return { x: this.ship.x, y: this.ship.y };
		const cos = Math.cos(this.ship.rotation);
		const sin = Math.sin(this.ship.rotation);
		return {
			x: this.ship.x + def.offsetX * cos - def.offsetY * sin,
			y: this.ship.y + def.offsetX * sin + def.offsetY * cos,
		};
	}

	getCameraConfig(station: Station, player: Phaser.GameObjects.Sprite): CameraConfig {
		const def = this.defs.find(d => d.key === station);
		if (!def) {
			return { zoom: 2.2, followTarget: player, followOffsetX: 0, followOffsetY: 0 };
		}
		return {
			zoom: def.zoom,
			followTarget: def.followShip ? this.ship.sprite : player,
			followOffsetX: def.followOffsetX,
			followOffsetY: def.followOffsetY,
		};
	}

	getDeckCameraConfig(player: Phaser.GameObjects.Sprite): CameraConfig {
		return { zoom: 2.2, followTarget: player, followOffsetX: 0, followOffsetY: 0 };
	}
}
