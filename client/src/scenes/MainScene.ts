import Phaser from 'phaser';
import { io, Socket } from 'socket.io-client';

interface PlayerData {
    id: string;
    x: number;
    y: number;
    color: number;
}

export default class MainScene extends Phaser.Scene {
    private socket!: Socket;
    private otherPlayers!: Phaser.GameObjects.Group;
    private player!: Phaser.GameObjects.Rectangle;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private speed: number = 5;

    constructor() {
        super('MainScene');
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
        // Player is a colored rectangle
        this.player = this.add.rectangle(playerInfo.x, playerInfo.y, 32, 32, playerInfo.color);
        this.player.setStrokeStyle(2, 0xffffff);
    }

    addOtherPlayer(playerInfo: PlayerData) {
        const otherPlayer = this.add.rectangle(playerInfo.x, playerInfo.y, 32, 32, playerInfo.color) as any;
        otherPlayer.playerId = playerInfo.id;
        this.otherPlayers.add(otherPlayer);
    }
}