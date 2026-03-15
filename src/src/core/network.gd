extends Node

const DEFAULT_PORT = 1234
const MAX_CLIENTS = 32

signal server_created
signal join_success
signal join_fail

var room_code: String = ""

var jogadores_conectados = 0
var admin_id: int = -1:
	set(valor):
		print("REDE: admin_id mudando de ", admin_id, " para ", valor)
		admin_id = valor

signal o_admin_foi_definido

func _ready():
	var target_port = DEFAULT_PORT
	var target_room = ""
	
	# Tenta ler das variáveis de ambiente
	var env_port = OS.get_environment("GAME_PORT")
	var env_room = OS.get_environment("GAME_ROOM")
	
	if env_port != "":
		target_port = env_port.to_int()
	if env_room != "":
		target_room = env_room
		room_code = target_room

	if DisplayServer.get_name() == "headless":
		print("--- MODO SERVER DETECTADO ---")
		print("Porta via ENV: ", target_port)
		print("Sala via ENV: ", target_room)
		
		create_server(target_port)
		multiplayer.peer_connected.connect(_on_player_connected)
		multiplayer.peer_disconnected.connect(_on_player_disconnected)
		multiplayer.connected_to_server.connect(_on_connected_ok)
		multiplayer.connection_failed.connect(_on_connected_fail)

## --- Lógica de Conexão ---

func create_server(port: int = DEFAULT_PORT):
	var peer = ENetMultiplayerPeer.new()
	var error = peer.create_server(port, MAX_CLIENTS)
	if error != OK:
		print("Erro ao criar servidor: ", error)
		return
	multiplayer.multiplayer_peer = peer
	server_created.emit()
	print("Servidor iniciado na porta: ", port)

func join_game(address: String, port: int = DEFAULT_PORT):
	var peer = ENetMultiplayerPeer.new()
	var error = peer.create_client(address, port)
	if error != OK:
		print("Erro ao tentar criar cliente: ", error)
		return
	
	multiplayer.multiplayer_peer = peer
	print("Tentando conectar em ", address, " na porta ", port)

@rpc("authority", "call_local", "reliable")
func definir_admin(id):
	admin_id = id
	print("Você é o administrador da sala!")
	print("Admin ID no Singleton: ", admin_id)
	o_admin_foi_definido.emit() # Adicione esta linha!

@rpc("authority", "reliable")
func atualizar_lobby(qtd):
	jogadores_conectados = qtd
	# Aqui você pode atualizar uma Label na sua UI:
	# label_contagem.text = "Jogadores: " + str(qtd)

## --- Comando de Início (RPC) ---

@rpc("any_peer", "call_local", "reliable")
func solicitar_inicio_partida():
	# Só o Servidor (Docker) deve processar isso
	if multiplayer.is_server():
		print("Servidor recebeu pedido de início. Avisando todos...")
		iniciar_partida_para_todos.rpc() # Comando para todos mudarem de cena

@rpc("authority", "call_local", "reliable")
func iniciar_partida_para_todos():
	print("Carregando mapa...")
	get_tree().change_scene_to_file("res://src/scenes/level_1.tscn")

## --- Callbacks ---

# No servidor (Docker), quando um player entra:
func _on_player_connected(id):
	jogadores_conectados += 1 # Incrementa primeiro!
	print("Player conectado: ", id, " Total: ", jogadores_conectados)
	
	# Atualiza a contagem para todos
	atualizar_lobby.rpc(jogadores_conectados)
	
	# Se for o primeiro player (Admin)
	if jogadores_conectados == 1:
		definir_admin.rpc(id)

func _on_player_disconnected(id):
	print("Jogador saiu do lobby: ", id)

# Adicione este callback para ver se o cliente RECONHECE que conectou
func _on_connected_ok():
	print("SUCESSO: Eu me conectei ao servidor do Docker!")
	join_success.emit()

func _on_connected_fail():
	print("Falha ao conectar.")
	join_fail.emit()
