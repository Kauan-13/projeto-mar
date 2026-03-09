extends Node

const DEFAULT_PORT = 1234
const MAX_CLIENTS = 32

signal server_created
signal join_success
signal join_fail

func _ready():
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
		print("Erro ao tentar conectar: ", error)
		return
	multiplayer.multiplayer_peer = peer

## --- Comando de Início (RPC) ---

# Este comando é chamado pelo Host e executado em TODO MUNDO (call_local)
@rpc("authority", "call_local", "reliable")
func iniciar_partida_para_todos():
	print("Partida iniciada! Carregando mapa...")
	get_tree().change_scene_to_file("res://src/scenes/level_1.tscn")

## --- Callbacks ---

func _on_player_connected(id):
	print("Novo jogador entrou no lobby: ", id)

func _on_player_disconnected(id):
	print("Jogador saiu do lobby: ", id)

func _on_connected_ok():
	print("Conectado ao servidor!")
	join_success.emit()

func _on_connected_fail():
	print("Falha ao conectar.")
	join_fail.emit()
