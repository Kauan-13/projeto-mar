import Phaser from 'phaser';
import { DECK_ZOOM, STATIONS } from '../config/gameConfig';
import Ship from '../entities/Ship';
import PlayerManager from '../entities/PlayerManager';
import StationManager from '../systems/StationManager';
import type { CameraConfig } from '../systems/StationManager';
import CannonballManager from '../entities/CannonballManager';
import NetworkManager from '../network/NetworkManager';

export default class MainScene extends Phaser.Scene {
	private ship!: Ship;
	private playerManager!: PlayerManager;
	private stationManager!: StationManager;
	private cannonballManager!: CannonballManager;
	private network!: NetworkManager;
	private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
	private keyE!: Phaser.Input.Keyboard.Key;
	private keySpace!: Phaser.Input.Keyboard.Key;
	private lastEmittedState: 'walk' | 'idle' = 'idle';

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
		this.cameras.main.setZoom(DECK_ZOOM);

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

		const allLayers = [marLayer, nevoaLayer, ilha1, ilha1props, ilha2, ilha2props, ilha3, ilha3props, ilha4, ilha4props];
		allLayers.forEach(l => l?.setDepth(0));

		this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

		this.ship = new Ship(this);
		this.playerManager = new PlayerManager(this, this.ship);
		this.playerManager.createAnimations('player_1', 'player1');
		this.playerManager.createAnimations('player_2', 'player2');

		this.stationManager = new StationManager(this, this.ship, STATIONS);

		const islandLayers = [ilha1, ilha2, ilha3, ilha4, ilha1props, ilha2props, ilha3props, ilha4props];
		this.ship.setupCollision(this, islandLayers, () => this.playerManager.localStation === 'rudder');

		this.cannonballManager = new CannonballManager(this);

		this.network = new NetworkManager(
			this.ship,
			this.playerManager,
			this.stationManager,
			(x: number, y: number) => {
				this.cameras.main.centerOn(x, y);
				this.cameras.main.startFollow(this.playerManager.sprite);
			},
		);

		if (this.input.keyboard) {
			this.cursors = this.input.keyboard.createCursorKeys();
			this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
			this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
		}
	}

	update(_time: number, delta: number) {
		const dt = delta / 16.67;

		this.cannonballManager.update(dt);

		if (!this.playerManager.sprite) return;

		if (this.playerManager.localStation !== null) {
			this.handleStationOperation(dt);
		} else {
			this.handleDeckMovement(dt);
			this.stationManager.highlightProximity(
				this.playerManager.sprite.x,
				this.playerManager.sprite.y,
			);
		}

		if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
			this.toggleStation();
		}
	}

	private handleStationOperation(dt: number) {
		const station = this.playerManager.localStation;

		if (station === 'rudder') {
			const result = this.ship.helmUpdate(this.cursors, dt);
			if (result.moved) {
				this.stationManager.updatePositions();
				this.playerManager.syncToShip(result.dx, result.dy, result.angleDelta);
				this.network.emitShipMove(this.ship.x, this.ship.y, this.ship.rotation);
			}
		} else if (station === 'cannon_left' || station === 'cannon_right') {
			if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
				const direction = station === 'cannon_left' ? -1 : 1;
				this.cannonballManager.fire(this.ship.x, this.ship.y, direction);
			}
		}
	}

	private handleDeckMovement(dt: number) {
		const moved = this.playerManager.moveOnDeck(this.cursors, dt);

		if (moved) {
			this.network.emitPlayerMovement(
				this.playerManager.sprite.x,
				this.playerManager.sprite.y,
				'walk',
				this.playerManager.direction,
			);
			this.lastEmittedState = 'walk';
		} else {
			if (this.lastEmittedState !== 'idle') {
				this.network.emitPlayerMovement(
					this.playerManager.sprite.x,
					this.playerManager.sprite.y,
					'idle',
					this.playerManager.direction,
				);
				this.lastEmittedState = 'idle';
			}
		}
	}

	private toggleStation() {
		if (this.playerManager.localStation === null) {
			const station = this.stationManager.findNearest(
				this.playerManager.sprite.x,
				this.playerManager.sprite.y,
			);
			if (station) {
				const worldPos = this.stationManager.getStationWorldPosition(station);
				this.playerManager.enterStation(station, worldPos.x, worldPos.y);
				this.applyCamera(this.stationManager.getCameraConfig(station, this.playerManager.sprite));
				this.network.emitStationChange(station);
			}
		} else {
			this.ship.stopMovement();
			this.playerManager.exitStation();
			this.applyCamera(this.stationManager.getDeckCameraConfig(this.playerManager.sprite));
			this.network.emitStationChange(null);
		}
	}

	private applyCamera(config: CameraConfig) {
		this.cameras.main.setZoom(config.zoom);
		this.cameras.main.startFollow(config.followTarget);
		this.cameras.main.setFollowOffset(config.followOffsetX, config.followOffsetY);
	}
}
