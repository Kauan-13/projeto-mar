extends Node2D

# Precarregamento das cenas necessárias
var player_scene = preload("res://src/entities/player/player.tscn")
var ship_scene = preload("res://src/entities/ship/ship.tscn") 

func _ready():
	# Apenas o servidor (Host) tem autoridade para instanciar entidades no mapa
	if not multiplayer.is_server():
		return
	
	# 1. Spawna o Host (ID 1) sempre como um Pirata
	add_entity(1, "player")
	
	# 2. Spawna os jogadores que já estão no lobby
	var peers = multiplayer.get_peers()
	for i in range(peers.size()):
		var id = peers[i]
		# No nosso teste, o primeiro peer que entrar (índice 0) controla o Navio
		if i == 0:
			add_entity(id, "ship")
		else:
			add_entity(id, "player")
	
	# 3. Escuta a entrada de novos jogadores durante a partida
	multiplayer.peer_connected.connect(_on_peer_connected)

func _on_peer_connected(id):
	# Se for o segundo jogador a entrar (Host + 1), ele assume o Navio
	if multiplayer.get_peers().size() == 1:
		add_entity(id, "ship")
	else:
		add_entity(id, "player")

func add_entity(id: int, type: String):
	# Evita duplicados se o sinal disparar duas vezes
	if has_node(str(id)):
		return
		
	var entity
	if type == "ship":
		entity = ship_scene.instantiate()
		print("A instanciar NAVIO para o jogador: ", id)
	else:
		entity = player_scene.instantiate()
		# Define a skin do pirata: Host (1) vs Clientes (0)
		entity.skin_id = 1 if id == 1 else 0
		print("A instanciar PIRATA para o jogador: ", id)
	
	# Define o nome do nó como o ID do jogador para facilitar a autoridade
	entity.name = str(id)
	
	# Define a autoridade de rede antes de adicionar à árvore de nós
	entity.set_multiplayer_authority(id)
	
	add_child(entity)
