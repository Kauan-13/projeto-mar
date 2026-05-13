import Phaser from 'phaser';
import { io, Socket } from 'socket.io-client';
import type { PlayerData } from '../../../shared/types';
import { SHIP_X, SHIP_Y } from '../../../shared/types';

export default class MainScene extends Phaser.Scene {
    private socket!: Socket;
    private otherPlayers!: Phaser.GameObjects.Group;
    private player!: Phaser.GameObjects.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private ship!: Phaser.GameObjects.Sprite;
    private playerOffsetX: number = 0;
    private playerOffsetY: number = 0;
    private speed: number = 5;

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
        
        // Setup Socket.io connection to the server
        this.socket = io('http://localhost:3000');

        this.socket.on('connect', () => {
            console.log("Connected to server via Socket.io");
        });

        this.otherPlayers = this.add.group();

        // Listen for current players
        this.socket.on('currentPlayers', (players: { [id: string]: PlayerData }) => {
            Object.keys(players).forEach((id) => {
                if (players[id].id === this.socket.id) {
                    this.addPlayer(players[id]);
                } else {
                    this.addOtherPlayer(players[id]);
                }
            });
        });

        // Listen for new player joined
        this.socket.on('playerJoined', (playerInfo: PlayerData) => {
            this.addOtherPlayer(playerInfo);
        });

        // Listen for player disconnected
        this.socket.on('playerLeft', (playerId: string) => {
            this.otherPlayers.getChildren().forEach((otherPlayer: any) => {
                if (playerId === otherPlayer.playerId) {
                    otherPlayer.destroy();
                }
            });
        });

        // Listen for other player movement
        this.socket.on('playerMoved', (playerInfo: PlayerData) => {
            this.otherPlayers.getChildren().forEach((otherPlayer: any) => {
                if (playerInfo.id === otherPlayer.playerId) {
                    // Simple snap to position (will add lerping later as per design doc)
                    otherPlayer.setPosition(playerInfo.x, playerInfo.y);
                }
            });
        });

        // Server forces position correction
        this.socket.on('forcePosition', (playerInfo: PlayerData) => {
            if (this.player) {
                this.playerOffsetX = playerInfo.x - this.ship.x;
                this.playerOffsetY = playerInfo.y - this.ship.y;
                this.player.setPosition(playerInfo.x, playerInfo.y);
            }
        });

        // Input
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
        }

        // Tilemap
        const map = this.add.tilemap('map');
        const waterTileset = map.addTilesetImage('Water and Island tiles', 'water_tiles');
        const fogTileset = map.addTilesetImage('Fog', 'fog_tiles');
        const shipTileset = map.addTilesetImage('Ships tiles', 'ship_tiles');

        const allTilesets = [waterTileset!, fogTileset!, shipTileset!];

        const marLayer = map.createLayer('mar', allTilesets);
        const ilha1 = map.createLayer('ilha1',allTilesets);
        const ilha1props = map.createLayer('ilha1props',allTilesets);
        const ilha2 = map.createLayer('ilha2',allTilesets);
        const ilha2props = map.createLayer('ilha2props',allTilesets);
        const ilha3 = map.createLayer('ilha3',allTilesets);
        const ilha3props = map.createLayer('ilha3props',allTilesets);
        const ilha4 = map.createLayer('ilha4',allTilesets);
        const ilha4props = map.createLayer('ilha4props',allTilesets);
        const nevoaLayer = map.createLayer('nevoa', allTilesets);

        [marLayer, nevoaLayer, ilha1, ilha1props, ilha2, ilha2props, ilha3, ilha3props, ilha4, ilha4props].forEach(l => l?.setDepth(0));

        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        // Ship
        this.ship = this.add.sprite(SHIP_X, SHIP_Y, 'ship');
        this.ship.setScale(3);
        this.ship.setDepth(5);

        // Ship physics + island collision
        this.physics.add.existing(this.ship);
        const shipBody = this.ship.body as Phaser.Physics.Arcade.Body;
        shipBody.allowGravity = false;

        [ilha1, ilha2, ilha3, ilha4].forEach(layer => {
            layer!.setCollisionByExclusion([-1]);
            this.physics.add.collider(this.ship, layer!);
        });
    }

    update() {
        if (this.player) {
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
                this.playerOffsetX += dx;
                this.playerOffsetY += dy;

                const DECK_MARGIN_Y = 50;
                const maxOffX = (this.ship.displayWidth - this.player.displayWidth) / 2;
                const maxOffY = (this.ship.displayHeight - this.player.displayHeight) / 2 - DECK_MARGIN_Y;
                this.playerOffsetX = Phaser.Math.Clamp(this.playerOffsetX, -maxOffX, maxOffX);
                this.playerOffsetY = Phaser.Math.Clamp(this.playerOffsetY, -maxOffY, maxOffY);

                this.player.x = this.ship.x + this.playerOffsetX;
                this.player.y = this.ship.y + this.playerOffsetY;

                // Emit movement to server
                this.socket.emit('playerMovement', { x: this.player.x, y: this.player.y });
            }
        }
    }

    addPlayer(playerInfo: PlayerData) {
        this.playerOffsetX = playerInfo.x - this.ship.x;
        this.playerOffsetY = playerInfo.y - this.ship.y;

        this.player = this.add.sprite(playerInfo.x, playerInfo.y, 'player_1', 0);
        this.player.setScale(2);
        this.player.setDepth(10);
        this.cameras.main.centerOn(playerInfo.x, playerInfo.y);
        this.cameras.main.startFollow(this.player);
    }

    addOtherPlayer(playerInfo: PlayerData) {
        const otherPlayer = this.add.sprite(playerInfo.x, playerInfo.y, 'player_2', 0);
        otherPlayer.setScale(2);
        (otherPlayer as any).playerId = playerInfo.id;
        otherPlayer.setDepth(10);
        this.otherPlayers.add(otherPlayer);
    }
}