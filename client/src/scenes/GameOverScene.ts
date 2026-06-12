import Phaser from 'phaser';
import { DEBUG } from '../config/gameConfig';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(data: { score?: number }) {
    if (DEBUG) console.log('[GameOverScene] create: started, score', data?.score ?? 'none');
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const finalScore = data?.score ?? 0;

    this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.85).setDepth(0);

    this.add.text(w / 2, h * 0.3, 'Game Over', {
      fontFamily: 'monospace', fontSize: '52px', color: '#cc4444',
      stroke: '#000000', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(1);

    this.add.text(w / 2, h * 0.3 + 60, 'Seu navio foi destruído!', {
      fontFamily: 'monospace', fontSize: '24px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(1);

    this.add.text(w / 2, h * 0.3 + 100, `Pontuação: ${finalScore}`, {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffcc44',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(1);

    // ====================================================================
    // INTEGRAÇÃO COM A FEIRA DE JOGOS
    // ====================================================================
    // Para ativar a integração, siga os passos abaixo:
    //
    // 1. Instale a dependência axios (já está no package.json):
    //    cd client && npm install axios
    //
    // 2. Descomente a tag <script> no arquivo index.html:
    //    client/src/index.html → <!-- <script src="https://accounts.google.com/gsi/client" async></script> -->
    //
    // 3. Descomente todo o bloco abaixo (linhas 37..72).
    //
    // 4. Substitua o valor de 'product' pelo ID numérico do jogo
    //    "They Will Drown" no banco de dados da Feira de Jogos.
    //    O professor responsável terá essa informação.
    //
    // 5. O parâmetro 'value' é a pontuação que os jogadores fizeram
    //    (finalScore). Ele será creditado na conta do jogador na feira.
    //
    // import axios from "axios";
    //
    // const fdjScore = finalScore;
    // google.accounts.id.initialize({
    //   client_id:
    //     "331191695151-ku8mdhd76pc2k36itas8lm722krn0u64.apps.googleusercontent.com",
    //   callback: (res: any) => {
    //     if (res.error) {
    //       console.error(res.error);
    //     } else {
    //       axios
    //         .post(
    //           "https://feira-de-jogos.dev.br/api/v2/credit",
    //           {
    //             product: "They Will Drown", // ← troque pelo ID numérico do jogo
    //             value: fdjScore,
    //           },
    //           {
    //             headers: {
    //               Authorization: `Bearer ${res.credential}`,
    //             },
    //           },
    //         )
    //         .then((response: any) => {
    //           console.log(response);
    //           alert("Crédito adicionado! Você ganhou " + fdjScore + " tijolinhos.");
    //         })
    //         .catch((error: any) => {
    //           console.error(error);
    //           alert("Erro ao adicionar crédito :(");
    //         });
    //     }
    //   },
    // });
    // google.accounts.id.prompt();
    // ====================================================================

    this.time.delayedCall(1000, () => {
      const btnW = 240;
      const btnH = 64;
      const btnX = w / 2;
      const btnY = h * 0.65;

      const btnBg = this.add.rectangle(btnX, btnY, btnW, btnH, 0x333333, 0.85)
        .setStrokeStyle(3, 0xffffff)
        .setDepth(2)
        .setInteractive({ useHandCursor: true });

      const btnText = this.add.text(btnX, btnY, 'Voltar ao Menu', {
        fontFamily: 'monospace', fontSize: '24px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(3);

      const goToMenu = () => {
        if (DEBUG) console.log('[GameOverScene] returning to menu');
        this.scene.start('MainMenuScene');
      };

      btnBg.on('pointerover', () => btnBg.setFillStyle(0x555555, 0.85));
      btnBg.on('pointerout', () => btnBg.setFillStyle(0x333333, 0.85));
      btnBg.on('pointerdown', () => btnBg.setFillStyle(0x777777, 0.85));
      btnBg.on('pointerup', goToMenu);

      btnText.setInteractive({ useHandCursor: true });
      btnText.on('pointerup', goToMenu);

      if (DEBUG) console.log('[GameOverScene] create: button shown');
    });
  }
}
