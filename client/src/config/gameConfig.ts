import type { Station } from '../../../shared/types';

export interface StationDef {
	key: Station;
	offsetX: number;
	offsetY: number;
	color: number;
	zoom: number;
	followShip: boolean;
	followOffsetX: number;
	followOffsetY: number;
}

export const STATIONS: StationDef[] = [
	{ key: 'rudder',       offsetX: 0,   offsetY: -70, color: 0xffff00, zoom: 1.5, followShip: true,  followOffsetX: 0,   followOffsetY: 0 },
	{ key: 'cannon_left',  offsetX: -30, offsetY: -10, color: 0xff4444, zoom: 1.8, followShip: true,  followOffsetX: -200, followOffsetY: 0 },
	{ key: 'cannon_right', offsetX: 30,  offsetY: -10, color: 0x4444ff, zoom: 1.8, followShip: true,  followOffsetX: 200,  followOffsetY: 0 },
];

export const DECK_ZOOM = 3.5;
export const CANNONBALL_SPEED = 8;
export const CANNONBALL_LIFE = 50;
export const STATION_PROXIMITY_RANGE = 20;

export const ENEMY_CATEGORY = 0x0008;
export const ENEMY_SPEED = 0.0001;
export const ENEMY_ACCEL = 0.00004;
export const MAX_ENEMIES = 5;
export const ENEMY_SPAWN_INTERVAL = 300;
export const ENEMY_SPAWN_MARGIN = 80;
export const ENEMY_WHISKER_LENGTH = 70;
export const ENEMY_WHISKER_ANGLE = Math.PI / 6;
export const ENEMY_AVOID_FORCE = 0.0003;
export const SHIP_MAX_HP = 100;
export const ENEMY_DAMAGE = 10;
