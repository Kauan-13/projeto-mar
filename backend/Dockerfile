# Usamos uma imagem leve do Node
FROM node:18-slim

# Instala bibliotecas que o Godot exige para rodar no Linux (mesmo headless)
# Corrigido: libxrender-dev e adicionado libdbus-1-3
RUN apt-get update && apt-get install -y \
    libfontconfig1 \
    libxcursor1 \
    libxinerama1 \
    libxrandr2 \
    libxrender-dev \
    libasound2 \
    libpulse0 \
    libdbus-1-3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia os arquivos da API primeiro para aproveitar o cache do Docker
COPY package*.json ./
RUN npm install

# Copia o restante do código
COPY . .

# Dá permissão de execução para o binário do Godot
# IMPORTANTE: Verifique se o nome do arquivo na pasta builds é exatamente este
RUN chmod +x ./builds/piratas.x86_64

# Expõe a porta da API e o range de portas UDP para os jogos
EXPOSE 3000
EXPOSE 1200-1210/udp

CMD ["node", "server.js"]