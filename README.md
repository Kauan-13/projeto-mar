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
│       ├── sprites/          # player/, ship/, enemies/
│       ├── audio/            # (vazio)
│       └── maps/             # mapa.json, mapa.png
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
