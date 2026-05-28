import Phaser from 'phaser';
import MainScene from './scenes/MainScene';
import UIScene from './scenes/UIScene';
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
    physics: {
        default: 'matter',
        matter: {
            enabled: true,
            gravity: { y: 0 },
            debug: true
        }
    },
    plugins: {
        global: [{
            key: 'rexVirtualJoystick',
            plugin: VirtualJoystickPlugin,
            start: true
        }]
    },
    scene: [MainScene, UIScene]
};

const game = new Phaser.Game(config);
