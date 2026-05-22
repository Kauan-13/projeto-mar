import Phaser from 'phaser';
import MainScene from './scenes/MainScene';
import VirtualJoystickPlugin from 'phaser3-rex-plugins/plugins/virtualjoystick-plugin.js';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    render: {
        pixelArt: true,
    },
    parent: 'game-container',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 800,
        height: 600
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
    scene: [MainScene]
};

const game = new Phaser.Game(config);
