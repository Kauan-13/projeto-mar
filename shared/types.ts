export type Station = 'rudder' | 'cannon_left' | 'cannon_right' | null;

export interface PlayerData {
    id: string;
    x: number;
    y: number;
    color: number;
    station: Station;
}

export interface PlayerMovementData {
    x: number;
    y: number;
}

export interface StationChangeData {
    station: Station;
}

export interface ShipMoveData {
    x: number;
    y: number;
}

export interface ShipMovedData {
    x: number;
    y: number;
    dx: number;
    dy: number;
}

export const SHIP_X = 640;
export const SHIP_Y = 640;
export const PLAYER_SPEED = 3;
export const SHIP_SPEED = 4;