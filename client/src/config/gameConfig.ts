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
	{ key: 'rudder',       offsetX: 0,   offsetY: -70, color: 0xffff00, zoom: 0.5, followShip: true,  followOffsetX: 0,   followOffsetY: 0 },
	{ key: 'cannon_left',  offsetX: -30, offsetY: -10, color: 0xff4444, zoom: 0.6, followShip: true,  followOffsetX: -200, followOffsetY: 0 },
	{ key: 'cannon_right', offsetX: 30,  offsetY: -10, color: 0x4444ff, zoom: 0.6, followShip: true,  followOffsetX: 200,  followOffsetY: 0 },
];

export const DECK_ZOOM = 2.2;
export const CANNONBALL_SPEED = 8;
export const CANNONBALL_LIFE = 50;
export const STATION_PROXIMITY_RANGE = 20;
