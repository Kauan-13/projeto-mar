import Phaser from 'phaser';
import { DECK_ZOOM, STATIONS, DEBUG } from '../config/gameConfig';
import type { EnemyData } from '../../../shared/types';
import Ship from '../entities/Ship';
import PlayerManager from '../entities/PlayerManager';
import StationManager from '../systems/StationManager';
import type { CameraConfig } from '../systems/StationManager';
import CannonballManager from '../entities/CannonballManager';
import EnemyManager from '../entities/EnemyManager';
import NetworkManager from '../network/NetworkManager';

const ISLAND_CATEGORY = 0x0002;
const SHIP_CATEGORY = 0x0001;

export default class MainScene extends Phaser.Scene {
	private ship!: Ship;
	private playerManager!: PlayerManager;
	private stationManager!: StationManager;
	private cannonballManager!: CannonballManager;
	private enemyManager!: EnemyManager;
	private network!: NetworkManager;
	private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
	private keyE!: Phaser.Input.Keyboard.Key;
	private keySpace!: Phaser.Input.Keyboard.Key;
	private lastEmittedState: 'walk' | 'idle' = 'idle';
	private prevShipX!: number;
	private prevShipY!: number;
	private prevShipAngle!: number;
	private gameOver = false;

	constructor() {
		super('MainScene');
	}

	preload() {
		if (DEBUG) console.log('[MainScene] preload: loading assets...');
		this.load.tilemapTiledJSON('map', 'assets/maps/mapa.json');
		this.load.image('water_tiles', 'assets/tilesets/Water and Island tiles.png');
		this.load.image('fog_tiles', 'assets/tilesets/Fog.png');
		this.load.image('ship_tiles', 'assets/tilesets/ships_tiles.png');
		this.load.spritesheet('player_1', 'assets/sprites/player/player_1.png', { frameWidth: 16, frameHeight: 16 });
		this.load.spritesheet('player_2', 'assets/sprites/player/player_2.png', { frameWidth: 16, frameHeight: 16 });
		this.load.image('ship', 'assets/sprites/ship/basic_ship.png');
		this.load.spritesheet('enemy', 'assets/sprites/enemy/anim-nme-ghost.png', { frameWidth: 32, frameHeight: 32 });
	}

	create() {
		if (DEBUG) console.log('[MainScene] create: started');
		this.gameOver = false;
		this.lastEmittedState = 'idle';
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

		if (DEBUG) console.log('[MainScene] create: creating Ship...');
		try {
			this.ship = new Ship(this);
		} catch (e) {
			console.error('[MainScene] create: Ship FAILED:', e);
		}

		if (DEBUG) console.log('[MainScene] create: setting up island collision...');
		const islandLayers = [ilha1, ilha2, ilha3, ilha4, ilha1props, ilha2props, ilha3props, ilha4props];
		try {
		islandLayers.forEach(layer => {
			if (!layer) return;

			if (DEBUG) console.log('[MainScene] create: setting collision for', layer.layer.name);

			layer.setCollisionByProperty({ collides: true });

			let collisionCount = 0;
			if (layer.layer && layer.layer.data) {
				for (const row of layer.layer.data) {
					for (const tile of row) {
						if (tile && tile.collides) collisionCount++;
					}
				}
			}

			if (collisionCount === 0) {
				if (DEBUG) console.log('[MainScene] create: no collides tiles, using exclusion fallback for', layer.layer.name);
				layer.setCollisionByExclusion([-1]);
			}

			let converted = 0;
			if (layer.layer && layer.layer.data) {
				for (const row of layer.layer.data) {
					for (const tile of row) {
						if (tile && tile.collides) {
							this.matter.add.rectangle(
								tile.getCenterX(), tile.getCenterY(),
								tile.width, tile.height,
								{
									isStatic: true,
									label: 'island',
									collisionFilter: { category: ISLAND_CATEGORY, mask: SHIP_CATEGORY, group: 0 },
								},
							);
							converted++;
						}
					}
				}
			}
			if (DEBUG) console.log('[MainScene] create:', layer.layer.name, '-', collisionCount, 'collides tiles,', converted, 'bodies created');
		});
		} catch (e) {
			console.error('[MainScene] create: island setup FAILED:', e);
		}

		if (DEBUG) console.log('[MainScene] create: creating PlayerManager...');
		this.playerManager = new PlayerManager(this, this.ship);
		this.playerManager.createAnimations('player_1', 'player1');
		this.playerManager.createAnimations('player_2', 'player2');

		this.stationManager = new StationManager(this, this.ship, STATIONS);

		this.cannonballManager = new CannonballManager(this);

		this.enemyManager = new EnemyManager(this, this.ship);

		if (DEBUG) console.log('[MainScene] create: creating NetworkManager...');
		this.network = new NetworkManager(
			this.ship,
			this.playerManager,
			this.stationManager,
			(x: number, y: number) => {
				this.cameras.main.centerOn(x, y);
				this.cameras.main.startFollow(this.playerManager.sprite);
			},
			() => {
				this.prevShipX = this.ship.x;
				this.prevShipY = this.ship.y;
				this.prevShipAngle = this.ship.rotation;
			},
			(enemies: EnemyData[], hpPct: number) => {
				enemies.forEach(e => this.enemyManager.spawnEnemy(e.id, e.x, e.y));
				this.events.emit('updateHealth', hpPct);
			},
			(id: string, x: number, y: number) => this.enemyManager.spawnEnemy(id, x, y),
			(id: string) => this.enemyManager.removeEnemy(id),
			(hpPct: number) => this.events.emit('updateHealth', hpPct),
			() => {
				this.gameOver = true;
				this.ship.destroy();
				this.playerManager.sprite?.setVisible(false);
				this.playerManager.group.getChildren().forEach((c: any) => c.setVisible(false));
				this.enemyManager.destroyAll();
				this.events.emit('gameOver');
			},
			(enemies: EnemyData[]) => this.enemyManager.setEnemyPositions(enemies),
			() => {
				this.gameOver = true;
				this.scene.stop('UIScene');
				this.scene.start('MainMenuScene');
			},
		);

		this.prevShipX = this.ship.x;
		this.prevShipY = this.ship.y;
		this.prevShipAngle = this.ship.rotation;

		this.scene.launch('UIScene');

		this.events.on('shutdown', () => {
			this.network.disconnect();
		});

		this.events.on('requestReturnToMenu', () => {
			this.network.emitReturnToMenu();
		});

		if (DEBUG) console.log('[MainScene] create: DONE');
		if (this.input.keyboard) {
			this.cursors = this.input.keyboard.createCursorKeys();
			this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
			this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
		}
	}

	update(_time: number, delta: number) {
		if (this.gameOver) return;
		const dt = delta / 16.67;

		const shipDx = this.ship.x - this.prevShipX;
		const shipDy = this.ship.y - this.prevShipY;
		const rawAngleDelta = this.ship.rotation - this.prevShipAngle;
		const shipAngleDelta = ((rawAngleDelta + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;

		if (shipDx !== 0 || shipDy !== 0 || shipAngleDelta !== 0) {
			this.stationManager.updatePositions();
			this.playerManager.syncToShip(shipDx, shipDy, shipAngleDelta);

			if (this.playerManager.localStation === 'rudder') {
				this.network.emitShipMove(this.ship.x, this.ship.y, this.ship.rotation);
			}
		}

		this.prevShipX = this.ship.x;
		this.prevShipY = this.ship.y;
		this.prevShipAngle = this.ship.rotation;

		this.cannonballManager.update(dt);

		this.enemyManager.update(dt);

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
			this.ship.helmUpdate(this.cursors, dt);
		} else if (station === 'cannon_left' || station === 'cannon_right') {
			if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
				const direction = station === 'cannon_left' ? -1 : 1;
				this.cannonballManager.fire(this.ship.x, this.ship.y, this.ship.rotation, direction);
				if (DEBUG) console.log('[MainScene] handleStationOperation: fired cannon', station);
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
				if (station === 'rudder') {
					this.ship.setCollisionEnabled(true);
				}
				if (DEBUG) console.log('[MainScene] toggleStation: entered', station);
			}
		} else {
			const prev = this.playerManager.localStation;
			if (this.playerManager.localStation === 'rudder') {
				this.ship.setCollisionEnabled(false);
				this.ship.stopMovement();
			}
			this.playerManager.exitStation();
			this.applyCamera(this.stationManager.getDeckCameraConfig(this.playerManager.sprite));
			this.network.emitStationChange(null);
			if (DEBUG) console.log('[MainScene] toggleStation: exited', prev);
		}
	}

	private applyCamera(config: CameraConfig) {
		this.cameras.main.setZoom(config.zoom);
		this.cameras.main.startFollow(config.followTarget);
		this.cameras.main.setFollowOffset(config.followOffsetX, config.followOffsetY);
		if (DEBUG) console.log('[MainScene] applyCamera: zoom', config.zoom);
	}
}
