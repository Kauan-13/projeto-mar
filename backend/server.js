const express = require('express');
const { spawn } = require('child_process');
const path = require('path'); // Importante para caminhos
const app = express();

const GODOT_BIN_PATH = '/app/builds/piratas.x86_64';

let activeRooms = {}; 
let nextPort = 1234;

app.use(express.json());

// 1. ENDPOINT PARA CRIAR SALA
app.post('/create-room', (req, res) => {
    const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const port = nextPort++;

    console.log(`[API] Iniciando sala ${roomCode} na porta ${port}...`);

    const godotProcess = spawn(GODOT_BIN_PATH, ['--headless'], {
        env: { 
            ...process.env,      // Mantém as variáveis padrão do sistema
            GAME_PORT: port.toString(),
            GAME_ROOM: roomCode.toString()
        }
    });

    // LOGS DE SAÍDA (O que você der print no Godot aparece aqui)
    godotProcess.stdout.on('data', (data) => {
        console.log(`[Godot ${roomCode} STDOUT]: ${data}`);
    });

    // LOGS DE ERRO (Erros da Engine ou do GDScript)
    godotProcess.stderr.on('data', (data) => {
        console.error(`[Godot ${roomCode} STDERR]: ${data}`);
    });

    // EVENTO DE FECHAMENTO (Quando a sala acaba ou crasha)
    godotProcess.on('close', (code) => {
        console.log(`[API] Sala ${roomCode} fechada com código: ${code}`);
        delete activeRooms[roomCode];
    });

    // TRATAMENTO DE ERRO NO SPAWN (Se o binário não existir)
    godotProcess.on('error', (err) => {
        console.error(`[API] Falha ao iniciar Godot: ${err.message}`);
    });

    activeRooms[roomCode] = { port: port };

    res.json({ code: roomCode, port: port });
});

// 2. NOVO: ENDPOINT PARA O PLAYER 2 BUSCAR A PORTA PELO CÓDIGO
app.get('/get-room/:code', (req, res) => {
    const code = req.params.code.toUpperCase();
    const room = activeRooms[code];

    if (room) {
        res.json({ status: "success", port: room.port });
    } else {
        res.status(404).json({ status: "error", message: "Sala não encontrada" });
    }
});

app.listen(3000, () => console.log('Orquestrador rodando na porta 3000'));