# They Will Drown

Jogo cooperativo 2D onde dois piratas pilotam juntos um navio caravela, enfrentando ondas de inimigos em um mar caótico. Cada jogador controla uma estação do navio — leme (direção) ou canhões (ataque) — e a câmera se adapta dinamicamente ao que cada um está fazendo.

**Plataforma:** Web mobile/PC · **Gênero:** bullet-hell co-op top-down · **Estilo:** pixel art 16-bit

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
│   │   │   └── MainScene.ts  # Cena principal — input, socket, render
│   │   ├── entities/         # (stub) Entidades do jogo
│   │   └── network/          # (stub) Gerenciador de rede
│   └── public/assets/
│       ├── maps/
│       │   └── mapa.json         # Export do Tiled (30×20 tiles, infinito)
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
| 2 | Plataforma do navio, estações (leme/canhões), câmera dinâmica | 🔜 Próximo |
| 3 | Ondas, inimigos, disparo dos canhões | ⏳ Futuro |
| 4 | Loja/upgrades, sprites finais | ⏳ Futuro |
