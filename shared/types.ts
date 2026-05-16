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
export const SHIP_ROTATION_SPEED = 0.035;
export const SHIP_ROTATION_ACCEL = 0.002;
export const SHIP_ROTATION_FRICTION = 0.001;
