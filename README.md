# They Will Drown

Jogo cooperativo 2D onde dois piratas pilotam juntos um navio caravela, enfrentando ondas de inimigos em um mar caótico. Cada jogador controla uma estação do navio — leme (direção) ou canhões (ataque) — e a câmera se adapta dinamicamente ao que cada um está fazendo.

**Plataforma:** Web mobile/PC · **Gênero:** bullet-hell co-op top-down · **Estilo:** pixel art 16-bit

---

## Integração com a Feira de Jogos

Este jogo pode ser integrado à [Feira de Jogos](https://feira-de-jogos.dev.br) para que os jogadores recebam créditos (tijolinhos) com base na pontuação que alcançam.

### Como funciona

No fim de cada partida, a tela de *Game Over* exibe a pontuação dos jogadores. A integração com a Feira de Jogos usa OAuth 2.0 (Google) para autenticar o jogador e envia um `POST` para a API da feira com a pontuação obtida.

### Passo a passo para o professor

1. **Descomentar o script do Google no `index.html`**

   Arquivo: `client/src/index.html`

   ```html
   <!-- <script src="https://accounts.google.com/gsi/client" async></script> -->
   ```
   Remova os `<!-- -->` ao redor da linha.

2. **Descomentar o bloco de integração no `GameOverScene.ts`**

   Arquivo: `client/src/scenes/GameOverScene.ts`

   Localize o bloco comentado dentro do método `create()` e descomente tudo entre `// import axios from "axios"` e `// google.accounts.id.prompt();`.

3. **Verificar dependências**

   As bibliotecas `axios` e `@types/google.accounts` já estão no `client/package.json`. Se precisar reinstalar:
   ```bash
   cd client && npm install
   ```

4. **Configurar o `product`**

   No `GameOverScene.ts`, dentro do bloco descomentado, substitua:
   ```ts
   product: "They Will Drown",
   ```
   pelo **ID numérico** do jogo "They Will Drown" no banco de dados da Feira de Jogos. O professor responsável terá esse número.

5. **Valor enviado**

   O parâmetro `value` enviado para a API é a pontuação final dos jogadores (`finalScore`), que vai de 0 a 200 (padrão definido em `shared/types.ts` — `MAX_SCORE`).

### Diagrama da requisição

```
Game Over (tela)
    ↓
Google OAuth (pop-up de login)
    ↓
POST https://feira-de-jogos.dev.br/api/v2/credit
  body: { product: "They Will Drown", value: <pontuação> }
  headers: { Authorization: Bearer <token_google> }
    ↓
Crédito adicionado à conta do jogador na Feira de Jogos
```

---

## Como rodar

### Pré-requisitos
- Node.js 18+

### Iniciar tudo de uma vez
```bash
bash start.sh
```
Isso sobe o servidor Express em `http://localhost:3000` e o Vite em `http://localhost:5173`.

### Rodar separadamente
```bash
# Servidor (porta 3000)
cd server && npm install && npm start

# Cliente (porta 5173)
cd client && npm install && npm run dev
```

Abra `http://localhost:5173` no navegador. Duas abas = dois jogadores.

---

## Mapa do projeto

```
/
├── start.sh                  # Script único para subir servidor + cliente
├── tsconfig.base.json        # Config TypeScript compartilhada
│
├── client/                   # Frontend Phaser 3 + Vite
│   ├── src/
│   │   ├── main.ts           # Config do Phaser, registro de plugins (RexUI)
│   │   ├── index.html        # Página HTML (game-container)
│   │   ├── scenes/
│   │   │   └── MainScene.ts  # Cena principal — input, socket, estações, tanque, canhões, animações
│   │   ├── entities/         # (stub) Entidades do jogo
│   │   └── network/          # (stub) Gerenciador de rede
│   └── public/assets/
│       ├── maps/
│       │   └── mapa.json         # Export do Tiled (80×80 tiles, finito)
│       ├── tilesets/
│       │   ├── Water and Island tiles.png  # Tiles de água e ilhas (384×144)
│       │   ├── Fog.png                    # Tiles de neblina (135×237)
│       │   ├── ships_tiles.png            # Tiles do navio (cópia do Scallywag_Ships)
│       │   ├── plants-and-flowers-8px_floortiles.png
│       │   └── plants-and-flowers-8px.png
│       ├── sprites/
│       │   ├── player/
│       │   │   ├── player_1.png
│       │   │   └── player_2.png
│       │   ├── ship/Scallywag_Ships/  # Assets do navio (tileset, animações GIF, .aseprite)
│       │   ├── objects/
│       │   │   ├── Chest Animations.gif
│       │   │   └── Open chest Animations.gif
│       │   ├── environment/
│       │   │   ├── Wave shore 1 animation.gif
│       │   │   ├── Wave shore 2 animation.gif
│       │   │   └── waves Animations.gif
│       │   └── enemies/       # (vazio)
│       ├── audio/             # (vazio)
│       └── unsorted/          # Arquivos-fonte (.aseprite) e mockups — não carregados em runtime
│
├── server/                   # Backend Node.js + Socket.io
│   ├── server.ts             # Servidor principal — estado, validação, broadcast
│   ├── data/                 # (stub) Dados de jogo/cenário
│   └── logic/                # (stub) Lógica de ondas, colisão, etc.
│
├── shared/
│   └── types.ts              # Interfaces TypeScript (PlayerData, PlayerMovementData)
│
└── docs/
    └── Game Design Document Template - Kauan e Kauê.md  # Documento de design completo
```

### Como as peças se conectam

1. **Cliente** (`MainScene.ts`) conecta via Socket.io em `http://localhost:3000`
2. Movimento do jogador: cliente move localmente → emite posição → servidor valida (distância por tick) → broadcast para outros jogadores
3. Tipos compartilhados em `shared/types.ts` são importados tanto pelo cliente quanto pelo servidor
4. Plugin RexUI Virtual Joystick já está instalado e registrado, mas ainda não integrado no MainScene

---

## Status do desenvolvimento

| Sprint | Descrição | Status |
|--------|-----------|--------|
| 1 | Esqueleto inicial — dois quadrados se movem e sincronizam | ✅ Concluído |
| 2 | Plataforma do navio, estações (leme/canhões), câmera dinâmica | 🔜 Em andamento (mapa, navio, sprites, estações, tanque feitos) |
| 3 | Ondas, inimigos, disparo dos canhões | ⏳ Futuro |
| 4 | Loja/upgrades, sprites finais | ⏳ Futuro |
