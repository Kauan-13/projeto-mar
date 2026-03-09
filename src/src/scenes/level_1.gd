extends Node2D

var player_scene = preload("res://src/entities/player/player.tscn")

func _ready():
	# Apenas o servidor (Host) decide quem nasce e onde
	if not multiplayer.is_server():
		return
	
	# 1. Spawna o Host (ID 1)
	add_player(1)
	
	# 2. Spawna todos os outros que JÁ estavam conectados no menu/lobby
	# O get_peers() retorna a lista de IDs de todos os clientes atuais
	for id in multiplayer.get_peers():
		add_player(id)
	
	# 3. (Opcional) Conecta o sinal para o caso de alguém entrar com a partida em andamento
	multiplayer.peer_connected.connect(add_player)

func add_player(id: int):
	if has_node(str(id)):
		return
		
	var player = player_scene.instantiate()
	player.name = str(id)
	
	# 1. DEFINE A SKIN (Antes de entrar na árvore)
	player.skin_id = 1 if id == 1 else 0
	
	# 2. DEFINE A AUTORIDADE (Antes de entrar na árvore)
	# Isso garante que quando o cliente receber o nó, ele já saiba quem manda
	player.set_multiplayer_authority(id)
	
	# 3. SÓ AGORA ADICIONA À ÁRVORE
	add_child(player)
	
	print("Player spawnado no mapa: ", id, " com skin: ", player.skin_id)
