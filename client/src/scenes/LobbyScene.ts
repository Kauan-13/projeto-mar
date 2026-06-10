import Phaser from 'phaser';
import { io, Socket } from 'socket.io-client';
import type { LobbyState, GameStartedData } from '../../../shared/types';
import { MAX_PLAYERS_PER_LOBBY, LOBBY_CODE_LENGTH } from '../../../shared/types';
import { DEBUG } from '../config/gameConfig';

export default class LobbyScene extends Phaser.Scene {
  private socket!: Socket;
  private codeText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private playerListText!: Phaser.GameObjects.Text;
  private lobbyCode = '';
  private isHost = false;

  constructor() {
    super('LobbyScene');
  }

  create() {
    if (DEBUG) console.log('[LobbyScene] create: started');

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.socket = io();
    this.registry.set('lobbySocket', this.socket);

    this.add.text(w / 2, h * 0.12, 'Lobby', {
      fontFamily: 'monospace', fontSize: '40px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(w / 2, h * 0.22, 'Insira o código:', {
      fontFamily: 'monospace', fontSize: '18px', color: '#aaaaaa',
    }).setOrigin(0.5);

    const codeInputBg = this.add.rectangle(w / 2, h * 0.28, 200, 40, 0x222222)
      .setStrokeStyle(2, 0xffffff).setDepth(0);
    this.codeText = this.add.text(w / 2, h * 0.28, '------', {
      fontFamily: 'monospace', fontSize: '24px', color: '#ffffff',
    }).setOrigin(0.5);

    const enterBtn = this.add.rectangle(w / 2, h * 0.36, 200, 48, 0x336633, 0.9)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    const enterBtnText = this.add.text(w / 2, h * 0.36, 'Entrar', {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5);

    this.statusText = this.add.text(w / 2, h * 0.44, '', {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffcc44',
    }).setOrigin(0.5);

    this.playerListText = this.add.text(w / 2, h * 0.52, '', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5, 0).setLineSpacing(8);

    const backBtn = this.add.rectangle(w / 2, h * 0.88, 160, 40, 0x555555, 0.85)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    const backBtnText = this.add.text(w / 2, h * 0.88, 'Voltar', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5);

    // Keyboard input for code
    let currentCode = '';
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        this.tryJoin(currentCode);
        return;
      }
      if (event.key === 'Backspace') {
        currentCode = currentCode.slice(0, -1);
      } else if (event.key.length === 1 && /[a-zA-Z0-9]/.test(event.key) && currentCode.length < LOBBY_CODE_LENGTH) {
        currentCode += event.key.toUpperCase();
      }
      this.codeText.setText(currentCode || '------');
    });

    enterBtn.on('pointerup', () => this.tryJoin(currentCode));
    enterBtnText.on('pointerup', () => this.tryJoin(currentCode));

    backBtn.on('pointerup', () => {
      this.socket.emit('leaveLobby');
      this.socket.disconnect();
      if (DEBUG) console.log('[LobbyScene] back to menu');
      this.scene.start('MainMenuScene');
    });
    backBtnText.on('pointerup', () => {
      this.socket.emit('leaveLobby');
      this.socket.disconnect();
      this.scene.start('MainMenuScene');
    });

    // Socket events
    this.socket.on('lobbyHint', (data: { code: string }) => {
      currentCode = data.code;
      this.codeText.setText(currentCode);
      if (DEBUG) console.log('[LobbyScene] lobbyHint:', data.code);
    });

    this.socket.on('lobbyState', (data: LobbyState) => {
      this.lobbyCode = data.code;
      this.isHost = data.hostId === this.socket.id;
      if (DEBUG) console.log('[LobbyScene] lobbyState: code', data.code, 'isHost', this.isHost);
      this.renderLobby(data);
    });

    this.socket.on('lobbyUpdate', (data: { players: Record<string, any>; hostId: string }) => {
      this.isHost = data.hostId === this.socket.id;
      this.renderLobby({ code: this.lobbyCode, players: data.players, hostId: data.hostId });
    });

    this.socket.on('lobbyError', (data: { message: string }) => {
      this.statusText.setText(data.message);
      this.statusText.setColor('#cc4444');
      if (DEBUG) console.log('[LobbyScene] lobbyError:', data.message);
    });

    this.socket.on('gameStarted', (data: GameStartedData) => {
      if (DEBUG) console.log('[LobbyScene] gameStarted: transitioning to MainScene');
      this.registry.set('initialGameState', data);
      this.scene.start('MainScene');
    });

    this.events.on('shutdown', () => {
      this.socket.off();
    });
  }

  private tryJoin(code: string) {
    if (!code) return;
    this.statusText.setText('Entrando...');
    this.statusText.setColor('#ffffff');
    this.socket.emit('joinLobby', { code });
  }

  private renderLobby(data: { code: string; players: Record<string, any>; hostId: string }) {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    const lines = Object.keys(data.players).map(id => {
      const isHost = id === data.hostId;
      const isMe = id === this.socket.id;
      const label = isMe ? 'Você' : `Jogador ${id.slice(-4)}`;
      return `  ${label}${isHost ? ' (Host)' : ''}`;
    });

    this.playerListText.setText([
      `Código: ${data.code}`,
      '',
      `Jogadores (${Object.keys(data.players).length}/${MAX_PLAYERS_PER_LOBBY}):`,
      ...lines,
    ].join('\n'));

    // Show start/copy buttons only after lobby state received
    this.children.getAll().forEach(child => {
      if ((child as any).isCustomBtn) child.destroy();
    });

    const copyBtn = this.add.rectangle(w / 2, h * 0.72, 200, 40, 0x444477, 0.9)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    (copyBtn as any).isCustomBtn = true;
    const copyBtnText = this.add.text(w / 2, h * 0.72, 'Copiar Código', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5);
    (copyBtnText as any).isCustomBtn = true;

    copyBtn.on('pointerup', () => {
      navigator.clipboard.writeText(data.code);
      this.statusText.setText('Código copiado!');
      this.statusText.setColor('#44cc44');
    });
    copyBtnText.on('pointerup', () => {
      navigator.clipboard.writeText(data.code);
      this.statusText.setText('Código copiado!');
      this.statusText.setColor('#44cc44');
    });

    if (this.isHost) {
      const startBtn = this.add.rectangle(w / 2, h * 0.80, 200, 48, 0x44aa44, 0.9)
        .setStrokeStyle(2, 0xffffff)
        .setInteractive({ useHandCursor: true });
      (startBtn as any).isCustomBtn = true;
      const startBtnText = this.add.text(w / 2, h * 0.80, 'Começar Jogo', {
        fontFamily: 'monospace', fontSize: '20px', color: '#ffffff',
      }).setOrigin(0.5);
      (startBtnText as any).isCustomBtn = true;

      startBtn.on('pointerup', () => {
        this.socket.emit('startGame');
        startBtn.disableInteractive();
        startBtnText.setText('Iniciando...');
      });
      startBtnText.on('pointerup', () => {
        this.socket.emit('startGame');
        startBtn.disableInteractive();
        startBtnText.setText('Iniciando...');
      });
    } else {
      const waitingText = this.add.text(w / 2, h * 0.80, 'Aguardando o host iniciar...', {
        fontFamily: 'monospace', fontSize: '16px', color: '#aaaaaa',
      }).setOrigin(0.5);
      (waitingText as any).isCustomBtn = true;
    }

    this.statusText.setText('');
  }
}
