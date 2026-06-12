import Phaser from 'phaser';
import MainMenuScene from './scenes/MainMenuScene';
import LobbyScene from './scenes/LobbyScene';
import MainScene from './scenes/MainScene';
import UIScene from './scenes/UIScene';
import GameOverScene from './scenes/GameOverScene';
import VirtualJoystickPlugin from 'phaser3-rex-plugins/plugins/virtualjoystick-plugin.js';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    render: {
        pixelArt: true,
    },
    parent: 'game-container',
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 800,
        height: 600
    },
    fps: {
        target: 60,
    },
    physics: {
        default: 'matter',
        matter: {
            enabled: true,
            gravity: { y: 0 },
            debug: false
        }
    },
    plugins: {
        global: [{
            key: 'rexVirtualJoystick',
            plugin: VirtualJoystickPlugin,
            start: true
        }]
    },
    scene: [MainMenuScene, LobbyScene, MainScene, UIScene, GameOverScene]
};

const game = new Phaser.Game(config);
