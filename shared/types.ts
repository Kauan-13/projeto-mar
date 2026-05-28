export type Station = 'rudder' | 'cannon_left' | 'cannon_right' | null;
export type PlayerState = 'idle' | 'walk';
export type PlayerDirection = 'down' | 'up' | 'left' | 'right';

export interface PlayerData {
    id: string;
    x: number;
    y: number;
    color: number;
    station: Station;
    state: PlayerState;
    direction: PlayerDirection;
}

export interface PlayerMovementData {
    x: number;
    y: number;
    state?: PlayerState;
    direction?: PlayerDirection;
}

export interface StationChangeData {
    station: Station;
}

export interface ShipMoveData {
    x: number;
    y: number;
    angle: number;
    players?: Record<string, { x: number; y: number }>;
}

export interface ShipMovedData {
    x: number;
    y: number;
    dx: number;
    dy: number;
    angle: number;
}

export const SHIP_X = 640;
export const SHIP_Y = 640;
export const SHIP_DISPLAY_WIDTH = 138;
export const SHIP_DISPLAY_HEIGHT = 384;
export const PLAYER_SPEED = 2;
export const SHIP_SPEED = 4;
export const SHIP_ACCELERATION = 0.08;
export const SHIP_FRICTION = 0.02;
export const SHIP_ROTATION_SPEED = 0.7;
export const SHIP_ROTATION_ACCEL = 0.2;
export const SHIP_ROTATION_FRICTION = 0.001;

export interface EnemyData {
    id: string;
    x: number;
    y: number;
}

export const SHIP_MAX_HP = 100;
export const ENEMY_DAMAGE = 10;
export const MAX_ENEMIES = 5;
export const ENEMY_SPAWN_INTERVAL_MS = 5000;
export const ENEMY_SPAWN_MARGIN = 80;
export const MAP_WIDTH = 1280;
export const MAP_HEIGHT = 1280;
export const ENEMY_SERVER_SPEED = 1.5;
export const ENEMY_HIT_DISTANCE = 100;
