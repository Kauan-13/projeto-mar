import Phaser from 'phaser';
import Ship from './Ship';
import { DEBUG } from '../config/gameConfig';
import { ENEMY_SERVER_SPEED } from '../../../shared/types';

const HP_BAR_W = 32;
const HP_BAR_H = 4;

export default class EnemyManager {
	private scene: Phaser.Scene;
	private ship: Ship;
	group: Phaser.GameObjects.Group;

	constructor(scene: Phaser.Scene, ship: Ship) {
		this.scene = scene;
		this.ship = ship;
		this.group = scene.add.group();

		scene.anims.create({
			key: 'enemy_walk',
			frames: scene.anims.generateFrameNumbers('enemy', { start: 0, end: 5 }),
			frameRate: 6,
			repeat: -1,
		});
		if (DEBUG) console.log('[EnemyManager] constructor: created, animation enemy_walk registered');
	}

	spawnEnemy(id: string, x: number, y: number, hp: number, maxHp: number): void {
		const enemy = this.scene.add.sprite(x, y, 'enemy');
		(enemy as any).enemyId = id;
		(enemy as any).targetX = x;
		(enemy as any).targetY = y;
		(enemy as any).hp = hp;
		(enemy as any).maxHp = maxHp;
		enemy.setScale(2);
		enemy.setDepth(8);
		enemy.play('enemy_walk');

		const barBg = this.scene.add.rectangle(x, y - 20, HP_BAR_W, HP_BAR_H, 0x333333)
			.setDepth(9);
		const barFill = this.scene.add.rectangle(x, y - 20, HP_BAR_W, HP_BAR_H, 0x44cc44)
			.setOrigin(0, 0.5).setDepth(10);
		barFill.x = x - HP_BAR_W / 2;

		(enemy as any).hpBarBg = barBg;
		(enemy as any).hpBarFill = barFill;

		this.group.add(enemy);
		if (DEBUG) console.log('[EnemyManager] spawnEnemy:', id, 'at', x.toFixed(0), y.toFixed(0), 'HP', hp);
	}

	setEnemyHp(id: string, hp: number): void {
		this.group.getChildren().forEach((child: any) => {
			if (child.enemyId === id) {
				child.hp = hp;
				const pct = Math.max(0, hp / child.maxHp);
				child.hpBarFill.setSize(HP_BAR_W * pct, HP_BAR_H);
				if (pct > 0.5) {
					child.hpBarFill.setFillStyle(0x44cc44);
				} else if (pct > 0.25) {
					child.hpBarFill.setFillStyle(0xcccc44);
				} else {
					child.hpBarFill.setFillStyle(0xcc4444);
				}
				if (DEBUG) console.log('[EnemyManager] setEnemyHp:', id, 'HP', hp);
			}
		});
	}

	removeEnemy(id: string): void {
		this.group.getChildren().forEach((child: any) => {
			if (child.enemyId === id) {
				child.hpBarBg?.destroy();
				child.hpBarFill?.destroy();
				child.destroy();
				if (DEBUG) console.log('[EnemyManager] removeEnemy:', id, 'destroyed');
			}
		});
	}

	destroyAll(): void {
		this.group.getChildren().forEach((child: any) => {
			child.hpBarBg?.destroy();
			child.hpBarFill?.destroy();
			child.destroy();
		});
		if (DEBUG) console.log('[EnemyManager] destroyAll: all enemies destroyed');
	}

	setEnemyPositions(targets: { id: string; x: number; y: number }[]): void {
		this.group.getChildren().forEach((child: any) => {
			const t = targets.find(e => e.id === child.enemyId);
			if (t) {
				child.targetX = t.x;
				child.targetY = t.y;
			}
		});
	}

	update(dt: number): void {

		// Defina a velocidade fixa que você deseja (ex: 200 pixels por segundo)
		const SPEED = ENEMY_SERVER_SPEED * 20; 

		this.group.getChildren().forEach((child: any) => {
			const dx = child.targetX - child.x;
			const dy = child.targetY - child.y;
			
			// Calcula a distância real em pixels usando Pitágoras
			const distance = Math.sqrt(dx * dx + dy * dy);

			// Se o inimigo já estiver muito perto do alvo, evita que ele fique "tremendo"
			if (distance > 1) {
				// Calcula o vetor de direção unitário (valores entre -1 e 1)
				const dirX = dx / distance;
				const dirY = dy / distance;

				// Calcula o quanto ele deve andar neste frame (Velocidade * Tempo)
				let moveStep = SPEED * dt;

				// Evita que o inimigo passe direto do alvo caso o frame seja longo
				if (moveStep > distance) {
					moveStep = distance;
				}

				// Move o inimigo em velocidade constante
				child.x += dirX * moveStep;
				child.y += dirY * moveStep;
			} else {
				// Força a posição exata se estiver muito perto
				child.x = child.targetX;
				child.y = child.targetY;
			}

			if (child.hpBarBg) {
				child.hpBarBg.x = child.x;
				child.hpBarBg.y = child.y - 20;
			}
			if (child.hpBarFill) {
				child.hpBarFill.x = child.x - HP_BAR_W / 2;
				child.hpBarFill.y = child.y - 20;
			}

			if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
				// child.setRotation(Math.atan2(dy, dx));
			}
		});
	}
}
