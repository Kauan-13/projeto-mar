import Phaser from 'phaser';
import { io, Socket } from 'socket.io-client';
import type { PlayerData, Station } from '../../../shared/types';
import { SHIP_X, SHIP_Y, PLAYER_SPEED, SHIP_SPEED } from '../../../shared/types';

interface StationDef {
    key: Station;
    offsetX: number;
    offsetY: number;
    color: number;
}

const STATIONS: StationDef[] = [
    { key: 'rudder',       offsetX: 0,    offsetY: 130, color: 0xffff00 },
    { key: 'cannon_left',  offsetX: -70,  offsetY: 0,   color: 0xff4444 },
    { key: 'cannon_right', offsetX: 70,   offsetY: 0,   color: 0x4444ff },
];

const CANNONBALL_SPEED = 8;
const CANNONBALL_LIFE = 50;

export default class MainScene extends Phaser.Scene {
    private socket!: Socket;
    private otherPlayers!: Phaser.GameObjects.Group;
    private player!: Phaser.GameObjects.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    private ship!: Phaser.GameObjects.Sprite;
    private stationRects: Phaser.GameObjects.Rectangle[] = [];
    private playerStation: Station = null;
    private keyE!: Phaser.Input.Keyboard.Key;
    private keySpace!: Phaser.Input.Keyboard.Key;
    private cannonballs!: Phaser.GameObjects.Group;

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
        this.cameras.main.setZoom(1.3);

        this.socket = io('http://localhost:3000');

        this.socket.on('connect', () => {
            console.log("Connected to server via Socket.io");
        });

        this.otherPlayers = this.add.group();
        this.cannonballs = this.add.group();

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
                }
            });
        });

        this.socket.on('forcePosition', (playerInfo: PlayerData) => {
            if (this.player) {
                this.player.setPosition(playerInfo.x, playerInfo.y);
            }
        });

        this.socket.on('shipMoved', (data: { x: number; y: number; dx: number; dy: number }) => {
            this.ship.x = data.x;
            this.ship.y = data.y;
            this.updateStationPositions();
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

        const map = this.add.tilemap('map');
        const waterTileset = map.addTilesetImage('Water and Island tiles', 'water_tiles');
        const fogTileset = map.addTilesetImage('Fog', 'fog_tiles');
        const shipTileset = map.addTilesetImage('Ships tiles', 'ship_tiles');

        const allTilesets = [waterTileset!, fogTileset!, shipTileset!];

        const layers = [
            'mar', 'nevoa',
            'ilha1', 'ilha1props',
            'ilha2', 'ilha2props',
            'ilha3', 'ilha3props',
            'ilha4', 'ilha4props',
        ];
        layers.forEach(name => map.createLayer(name, allTilesets)?.setDepth(0));

        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        this.ship = this.add.sprite(SHIP_X, SHIP_Y, 'ship');
        this.ship.setScale(3);
        this.ship.setDepth(5);

        this.createStations();
    }

    update() {
        if (!this.player) return;

        // Move cannonballs
        this.cannonballs.getChildren().forEach((ball: any) => {
            ball.x += ball.vx;
            ball.y += ball.vy;
            ball.life += 1;
            if (ball.life > CANNONBALL_LIFE) {
                ball.destroy();
            }
        });

        if (this.playerStation !== null) {
            this.handleStationOperation();
        } else {
            this.handleDeckMovement();
            this.checkStationProximity();
        }

        // E key — enter/exit station
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

    addPlayer(playerInfo: PlayerData) {
        this.player = this.add.sprite(playerInfo.x, playerInfo.y, 'player_1', 0);
        this.player.setScale(1);
        this.player.setDepth(10);
        this.cameras.main.centerOn(playerInfo.x, playerInfo.y);
        this.cameras.main.startFollow(this.player);
    }

    addOtherPlayer(playerInfo: PlayerData) {
        const otherPlayer = this.add.sprite(playerInfo.x, playerInfo.y, 'player_2', 0);
        otherPlayer.setScale(1);
        (otherPlayer as any).playerId = playerInfo.id;
        (otherPlayer as any).station = null;
        otherPlayer.setDepth(10);
        this.otherPlayers.add(otherPlayer);
    }

    private createStations() {
        STATIONS.forEach(def => {
            const rect = this.add.rectangle(
                this.ship.x + def.offsetX,
                this.ship.y + def.offsetY,
                40, 40, def.color, 0.5
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
            if (dist < 60) {
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
            rect.setAlpha(dist < 60 ? 0.8 : 0.3);
        });
    }

    private enterStation(station: Station) {
        this.playerStation = station;
        this.socket.emit('playerStationChange', { station });

        // Snap player to station position
        const rect = this.stationRects.find(r => (r as any).stationKey === station);
        if (rect) {
            this.player.setPosition(rect.x, rect.y);
        }

        if (station === 'rudder') {
            this.cameras.main.stopFollow();
            this.cameras.main.setZoom(0.5);
            this.cameras.main.centerOn(this.ship.x, this.ship.y);
        } else {
            this.cameras.main.stopFollow();
            this.cameras.main.setZoom(0.6);
            const side = station === 'cannon_left' ? -200 : 200;
            this.cameras.main.centerOn(this.ship.x + side, this.ship.y);
        }
    }

    private exitStation() {
        this.playerStation = null;
        this.socket.emit('playerStationChange', { station: null });
        this.cameras.main.setZoom(1.3);
        this.cameras.main.startFollow(this.player);
    }

    private handleDeckMovement() {
        let moved = false;
        let dx = 0;
        let dy = 0;

        if (this.cursors.left.isDown) {
            dx = -this.speed;
            moved = true;
        } else if (this.cursors.right.isDown) {
            dx = this.speed;
            moved = true;
        }

        if (this.cursors.up.isDown) {
            dy = -this.speed;
            moved = true;
        } else if (this.cursors.down.isDown) {
            dy = this.speed;
            moved = true;
        }

        if (moved) {
            this.player.x += dx;
            this.player.y += dy;
            this.socket.emit('playerMovement', { x: this.player.x, y: this.player.y });
        }
    }

    private handleStationOperation() {
        if (this.playerStation === 'rudder') {
            let moved = false;
            let dx = 0;
            let dy = 0;

            if (this.cursors.left.isDown) {
                dx = -SHIP_SPEED;
                moved = true;
            } else if (this.cursors.right.isDown) {
                dx = SHIP_SPEED;
                moved = true;
            }

            if (this.cursors.up.isDown) {
                dy = -SHIP_SPEED;
                moved = true;
            } else if (this.cursors.down.isDown) {
                dy = SHIP_SPEED;
                moved = true;
            }

            if (moved) {
                // Move ship
                this.ship.x += dx;
                this.ship.y += dy;

                // Move station hitboxes to ship-relative positions
                this.updateStationPositions();

                // Move all players with the ship (they ride the deck)
                this.player.x += dx;
                this.player.y += dy;

                this.otherPlayers.getChildren().forEach((other: any) => {
                    other.x += dx;
                    other.y += dy;
                });

                // Emit ship position change
                this.socket.emit('shipMove', { x: this.ship.x, y: this.ship.y });
            }
        } else if (this.playerStation === 'cannon_left' || this.playerStation === 'cannon_right') {
            if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
                const direction = this.playerStation === 'cannon_left' ? -1 : 1;
                this.fireCannonball(direction);
            }
        }
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
