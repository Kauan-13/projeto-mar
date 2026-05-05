import Phaser from 'phaser';
import { io, Socket } from 'socket.io-client';
import type { PlayerData } from '../../../shared/types';
import { SHIP_X, SHIP_Y } from '../../../shared/types';

export default class MainScene extends Phaser.Scene {
    private socket!: Socket;
    private otherPlayers!: Phaser.GameObjects.Group;
    private player!: Phaser.GameObjects.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
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
        const ilhasLayer = map.createLayer('ilhas', allTilesets);
        const aguasLayer = map.createLayer('aguas-rasas', allTilesets);
        const propsLayer = map.createLayer('props', allTilesets);
        const nevoaLayer = map.createLayer('nevoa', allTilesets);

        [marLayer, ilhasLayer, aguasLayer, propsLayer, nevoaLayer].forEach(l => l?.setDepth(0));

        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        // Ship
        const ship = this.add.sprite(SHIP_X, SHIP_Y, 'ship');
        ship.setScale(3);
        ship.setDepth(5);
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
                // Client-side prediction
                this.player.x += dx;
                this.player.y += dy;

                // Emit movement to server
                this.socket.emit('playerMovement', { x: this.player.x, y: this.player.y });
            }
        }
    }

    addPlayer(playerInfo: PlayerData) {
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