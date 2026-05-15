import Phaser from 'phaser';
import { io, Socket } from 'socket.io-client';
import type { PlayerData, Station, PlayerState, PlayerDirection } from '../../../shared/types';
import { SHIP_X, SHIP_Y, PLAYER_SPEED, SHIP_SPEED } from '../../../shared/types';

interface StationDef {
    key: Station;
    offsetX: number;
    offsetY: number;
    color: number;
}

const STATIONS: StationDef[] = [
    { key: 'rudder',       offsetX: 0,    offsetY: -70, color: 0xffff00 },
    { key: 'cannon_left',  offsetX: -30,  offsetY: -10,   color: 0xff4444 },
    { key: 'cannon_right', offsetX: 30,   offsetY: -10,   color: 0x4444ff },
];

const CANNONBALL_SPEED = 8;
const CANNONBALL_LIFE = 50;

export default class MainScene extends Phaser.Scene {
    private socket!: Socket;
    private otherPlayers!: Phaser.GameObjects.Group;
    private player!: Phaser.GameObjects.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private playerOffsetX: number = 0;
    private playerOffsetY: number = 0;

    private ship!: Phaser.GameObjects.Sprite;
    private stationRects: Phaser.GameObjects.Rectangle[] = [];
    private playerStation: Station = null;
    private playerDirection: PlayerDirection = 'down';
    private lastEmittedState: PlayerState = 'idle';
    private keyE!: Phaser.Input.Keyboard.Key;
    private keySpace!: Phaser.Input.Keyboard.Key;
    private cannonballs!: Phaser.GameObjects.Group;

    private readonly DECK_ZOOM = 2.2;
    private readonly RUDDER_ZOOM = 0.5;
    private readonly CANNON_ZOOM = 0.6;

    private speed: number = PLAYER_SPEED;

    constructor() {
        super('MainScene');
    }

    preload() {
        this.load.tilemapTiledJSON('map', 'assets/maps/mapa.json');
        this.load.image('water_tiles', 'assets/tilesets/Water and Island tiles.png');
        this.load.image('fog_tiles', 'assets/tilesets/Fog.png');
        this.load.image('ship_tiles', 'assets/tilesets/ships_tiles.png');
        this.load.spritesheet('player_1', 'assets/sprites/player/player_1.png', { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('player_2', 'assets/sprites/player/player_2.png', { frameWidth: 16, frameHeight: 16 });
        this.load.image('ship', 'assets/sprites/ship/basic_ship.png');
    }

    create() {
        console.log("MainScene created");
        this.cameras.main.setBackgroundColor('#1a1a2e');
        this.cameras.main.setZoom(this.DECK_ZOOM);

        const map = this.add.tilemap('map');
        const waterTileset = map.addTilesetImage('Water and Island tiles', 'water_tiles');
        const fogTileset = map.addTilesetImage('Fog', 'fog_tiles');
        const shipTileset = map.addTilesetImage('Ships tiles', 'ship_tiles');

        const allTilesets = [waterTileset!, fogTileset!, shipTileset!];

        const marLayer = map.createLayer('mar', allTilesets);
        const nevoaLayer = map.createLayer('nevoa', allTilesets);
        const ilha1 = map.createLayer('ilha1', allTilesets);
        const ilha1props = map.createLayer('ilha1props', allTilesets);
        const ilha2 = map.createLayer('ilha2', allTilesets);
        const ilha2props = map.createLayer('ilha2props', allTilesets);
        const ilha3 = map.createLayer('ilha3', allTilesets);
        const ilha3props = map.createLayer('ilha3props', allTilesets);
        const ilha4 = map.createLayer('ilha4', allTilesets);
        const ilha4props = map.createLayer('ilha4props', allTilesets);

        [marLayer, nevoaLayer, ilha1, ilha1props, ilha2, ilha2props, ilha3, ilha3props, ilha4, ilha4props].forEach(l => l?.setDepth(0));

        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        // Ship
        this.ship = this.add.sprite(SHIP_X, SHIP_Y, 'ship');
        this.ship.setScale(2);
        this.ship.setDepth(5);

        // Ship physics + island collision
        this.physics.add.existing(this.ship);
        const shipBody = this.ship.body as Phaser.Physics.Arcade.Body;
        shipBody.allowGravity = false;

        [ilha1, ilha2, ilha3, ilha4].forEach(layer => {
            layer!.setCollisionByExclusion([-1]);
            this.physics.add.collider(this.ship, layer!);
        });
        this.createStations();
        this.createPlayerAnimations('player_1', 'player1');
        this.createPlayerAnimations('player_2', 'player2');

        this.otherPlayers = this.add.group();
        this.cannonballs = this.add.group();

        this.socket = io('http://localhost:3000');

        this.socket.on('connect', () => {
            console.log("Connected to server via Socket.io");
        });

        this.socket.on('currentPlayers', (players: { [id: string]: PlayerData }) => {
            Object.keys(players).forEach((id) => {
                if (players[id].id === this.socket.id) {
                    this.addPlayer(players[id]);
                } else {
                    this.addOtherPlayer(players[id]);
                }
            });
        });

        this.socket.on('playerJoined', (playerInfo: PlayerData) => {
            this.addOtherPlayer(playerInfo);
        });

        this.socket.on('playerLeft', (playerId: string) => {
            this.otherPlayers.getChildren().forEach((otherPlayer: any) => {
                if (playerId === otherPlayer.playerId) {
                    otherPlayer.destroy();
                }
            });
        });

        this.socket.on('playerMoved', (playerInfo: PlayerData) => {
            this.otherPlayers.getChildren().forEach((otherPlayer: any) => {
                if (playerInfo.id === otherPlayer.playerId) {
                    otherPlayer.setPosition(playerInfo.x, playerInfo.y);
                    this.playPlayerAnimation(otherPlayer, playerInfo.state, playerInfo.direction);
                }
            });
        });

        this.socket.on('forcePosition', (playerInfo: PlayerData) => {
            if (this.player) {
                this.playerOffsetX = playerInfo.x - this.ship.x;
                this.playerOffsetY = playerInfo.y - this.ship.y;
                this.player.setPosition(playerInfo.x, playerInfo.y);
            }
        });

        this.socket.on('shipMoved', (data: { x: number; y: number; dx: number; dy: number }) => {
            this.ship.x = data.x;
            this.ship.y = data.y;
            this.updateStationPositions();

            if (this.player && this.playerStation === null) {
                this.player.x = this.ship.x + this.playerOffsetX;
                this.player.y = this.ship.y + this.playerOffsetY;
            }
        });

        this.socket.on('playersMoved', (players: { [id: string]: PlayerData }) => {
            Object.keys(players).forEach((id) => {
                if (id === this.socket.id) {
                    if (this.player) {
                        this.player.setPosition(players[id].x, players[id].y);
                    }
                } else {
                    this.otherPlayers.getChildren().forEach((otherPlayer: any) => {
                        if (id === otherPlayer.playerId) {
                            otherPlayer.setPosition(players[id].x, players[id].y);
                            this.playPlayerAnimation(otherPlayer, players[id].state, players[id].direction);
                        }
                    });
                }
            });
        });

        this.socket.on('playerStationChanged', (data: { id: string; station: Station }) => {
            this.otherPlayers.getChildren().forEach((otherPlayer: any) => {
                if (data.id === otherPlayer.playerId) {
                    (otherPlayer as any).station = data.station;
                }
            });
        });

        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
            this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        }
    }

    update(_time: number, delta: number) {
        if (!this.player) return;

        const dt = delta / 16.67;

        this.cannonballs.getChildren().forEach((ball: any) => {
            ball.x += ball.vx * dt;
            ball.y += ball.vy * dt;
            ball.life += dt;
            if (ball.life > CANNONBALL_LIFE) {
                ball.destroy();
            }
        });

        if (this.playerStation !== null) {
            this.handleStationOperation(dt);
        } else {
            this.handleDeckMovement(dt);
            this.checkStationProximity();
        }

        if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
            if (this.playerStation === null) {
                const nearby = this.findNearestStation();
                if (nearby) {
                    this.enterStation(nearby);
                }
            } else {
                this.exitStation();
            }
        }
    }

    private createStations() {
        STATIONS.forEach(def => {
            const rect = this.add.rectangle(
                this.ship.x + def.offsetX,
                this.ship.y + def.offsetY,
                30, 30, def.color, 0.5
            );
            rect.setDepth(6);
            (rect as any).stationKey = def.key;
            this.stationRects.push(rect);
        });
    }

    private updateStationPositions() {
        this.stationRects.forEach(r => {
            const def = STATIONS.find(s => s.key === (r as any).stationKey);
            if (def) {
                r.x = this.ship.x + def.offsetX;
                r.y = this.ship.y + def.offsetY;
            }
        });
    }

    private findNearestStation(): Station | null {
        for (const rect of this.stationRects) {
            const dist = Phaser.Math.Distance.Between(
                this.player.x, this.player.y,
                rect.x, rect.y
            );
            if (dist < 20) {
                return (rect as any).stationKey as Station;
            }
        }
        return null;
    }

    private checkStationProximity() {
        this.stationRects.forEach(rect => {
            const dist = Phaser.Math.Distance.Between(
                this.player.x, this.player.y,
                rect.x, rect.y
            );
            rect.setAlpha(dist < 20 ? 0.8 : 0.3);
        });
    }

    private enterStation(station: Station) {
        this.playerStation = station;
        this.socket.emit('playerStationChange', { station });

        // Snap player to station position
        const rect = this.stationRects.find(r => (r as any).stationKey === station);
        if (rect) {
            this.player.setPosition(rect.x, rect.y);
            this.playerOffsetX = this.player.x - this.ship.x;
            this.playerOffsetY = this.player.y - this.ship.y;
        }

        if (station === 'cannon_left') {
            this.playerDirection = 'left';
        } else if (station === 'cannon_right') {
            this.playerDirection = 'right';
        } else {
            this.playerDirection = 'down';
        }
        this.playPlayerAnimation(this.player, 'idle', this.playerDirection);
        this.socket.emit('playerMovement', {
            x: this.player.x, y: this.player.y,
            state: 'idle', direction: this.playerDirection
        });
        this.lastEmittedState = 'idle';

        if (station === 'rudder') {
            this.cameras.main.setZoom(this.RUDDER_ZOOM);
            this.cameras.main.setFollowOffset(0, 0);
            this.cameras.main.startFollow(this.ship);
        } else {
            this.cameras.main.setZoom(this.CANNON_ZOOM);
            const side = station === 'cannon_left' ? -200 : 200;
            this.cameras.main.setFollowOffset(side, 0);
            this.cameras.main.startFollow(this.ship);
        }
    }

    private exitStation() {
        this.playerStation = null;
        this.socket.emit('playerStationChange', { station: null });
        this.cameras.main.setFollowOffset(0, 0);
        this.cameras.main.setZoom(this.DECK_ZOOM);
        this.cameras.main.startFollow(this.player);
    }

    private handleDeckMovement(dt: number) {
        let dx = 0;
        let dy = 0;

        if (this.cursors.left.isDown) {
            dx = -this.speed * dt;
        } else if (this.cursors.right.isDown) {
            dx = this.speed * dt;
        }

        if (this.cursors.up.isDown) {
            dy = -this.speed * dt;
        } else if (this.cursors.down.isDown) {
            dy = this.speed * dt;
        }

        const moved = dx !== 0 || dy !== 0;

        if (moved) {
            const dir = this.directionFromDelta(dx, dy);
            if (dir) {
                this.playerDirection = dir;
                this.playPlayerAnimation(this.player, 'walk', dir);
            }

            this.playerOffsetX += dx;
            this.playerOffsetY += dy;

            const DECK_MARGIN_Y = 50;
            const maxOffX = (this.ship.displayWidth - this.player.displayWidth) / 2;
            const maxOffY = (this.ship.displayHeight - this.player.displayHeight) / 2 - DECK_MARGIN_Y;
            this.playerOffsetX = Phaser.Math.Clamp(this.playerOffsetX, -maxOffX, maxOffX);
            this.playerOffsetY = Phaser.Math.Clamp(this.playerOffsetY, -maxOffY, maxOffY);

            this.player.x = this.ship.x + this.playerOffsetX;
            this.player.y = this.ship.y + this.playerOffsetY;

            this.socket.emit('playerMovement', {
                x: this.player.x, y: this.player.y,
                state: 'walk', direction: this.playerDirection
            });
            this.lastEmittedState = 'walk';
        } else {
            this.playPlayerAnimation(this.player, 'idle', this.playerDirection);
            if (this.lastEmittedState !== 'idle') {
                this.socket.emit('playerMovement', {
                    x: this.player.x, y: this.player.y,
                    state: 'idle', direction: this.playerDirection
                });
                this.lastEmittedState = 'idle';
            }
        }
    }

    private handleStationOperation(dt: number) {
        if (this.playerStation === 'rudder') {
            let dx = 0;
            let dy = 0;

            if (this.cursors.left.isDown) {
                dx = -SHIP_SPEED * dt;
            } else if (this.cursors.right.isDown) {
                dx = SHIP_SPEED * dt;
            }

            if (this.cursors.up.isDown) {
                dy = -SHIP_SPEED * dt;
            } else if (this.cursors.down.isDown) {
                dy = SHIP_SPEED * dt;
            }

            const moved = dx !== 0 || dy !== 0;

            if (moved) {
                this.ship.x += dx;
                this.ship.y += dy;
                this.updateStationPositions();

                this.player.x = this.ship.x + this.playerOffsetX;
                this.player.y = this.ship.y + this.playerOffsetY;

                this.otherPlayers.getChildren().forEach((other: any) => {
                    other.x += dx;
                    other.y += dy;
                });

                this.socket.emit('shipMove', { x: this.ship.x, y: this.ship.y });
            }
        } else if (this.playerStation === 'cannon_left' || this.playerStation === 'cannon_right') {
            if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
                const direction = this.playerStation === 'cannon_left' ? -1 : 1;
                this.fireCannonball(direction);
            }
        }
    }

    private createPlayerAnimations(textureKey: string, prefix: string) {
        const gen = (start: number, end: number) =>
            this.anims.generateFrameNumbers(textureKey, { start, end });

        this.anims.create({ key: `${prefix}_idle_down`,    frames: gen(0, 2),   frameRate: 3, repeat: -1 });
        this.anims.create({ key: `${prefix}_idle_up`,      frames: gen(3, 5),   frameRate: 3, repeat: -1 });
        this.anims.create({ key: `${prefix}_idle_right`,   frames: gen(6, 8),   frameRate: 3, repeat: -1 });
        this.anims.create({ key: `${prefix}_idle_left`,    frames: gen(9, 11),  frameRate: 3, repeat: -1 });
        this.anims.create({ key: `${prefix}_walk_down`,    frames: gen(12, 14), frameRate: 8, repeat: -1 });
        this.anims.create({ key: `${prefix}_walk_up`,      frames: gen(15, 17), frameRate: 8, repeat: -1 });
        this.anims.create({ key: `${prefix}_walk_right`,   frames: gen(18, 20), frameRate: 8, repeat: -1 });
        this.anims.create({ key: `${prefix}_walk_left`,    frames: gen(21, 23), frameRate: 8, repeat: -1 });
    }

    private playPlayerAnimation(sprite: Phaser.GameObjects.Sprite, state: 'idle' | 'walk', direction: 'down' | 'up' | 'left' | 'right') {
        const prefix = sprite.texture.key === 'player_1' ? 'player1' : 'player2';
        sprite.play(`${prefix}_${state}_${direction}`, true);
    }

    private directionFromDelta(dx: number, dy: number): 'down' | 'up' | 'left' | 'right' | null {
        if (dx < 0) return 'left';
        if (dx > 0) return 'right';
        if (dy < 0) return 'up';
        if (dy > 0) return 'down';
        return null;
    }

    addPlayer(playerInfo: PlayerData) {
        this.playerOffsetX = playerInfo.x - this.ship.x;
        this.playerOffsetY = playerInfo.y - this.ship.y;

        this.player = this.add.sprite(playerInfo.x, playerInfo.y, 'player_1', 0);
        this.player.setScale(1);
        this.player.setDepth(10);
        this.playPlayerAnimation(this.player, 'idle', 'down');
        this.cameras.main.centerOn(playerInfo.x, playerInfo.y);
        this.cameras.main.startFollow(this.player);
    }

    addOtherPlayer(playerInfo: PlayerData) {
        const otherPlayer = this.add.sprite(playerInfo.x, playerInfo.y, 'player_2', 0);
        otherPlayer.setScale(1);
        (otherPlayer as any).playerId = playerInfo.id;
        (otherPlayer as any).station = null;
        otherPlayer.setDepth(10);
        this.playPlayerAnimation(otherPlayer, 'idle', 'down');
        this.otherPlayers.add(otherPlayer);
    }

    private fireCannonball(direction: number) {
        const ball = this.add.circle(
            this.ship.x + direction * 80,
            this.ship.y,
            4, 0xff8800
        );
        ball.setDepth(15);
        (ball as any).vx = direction * CANNONBALL_SPEED;
        (ball as any).vy = 0;
        (ball as any).life = 0;
        this.cannonballs.add(ball);
    }
}
