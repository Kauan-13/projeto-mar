extends Node

const DEFAULT_PORT = 1234
const MAX_CLIENTS = 32

var room_code: String = ""

signal server_created
signal join_success
signal join_fail

# variaveis sincronizadas
var jogadores_conectados = 0
var id_admin = 0

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
		print("Erro ao tentar conectar: ", error)
		return
	multiplayer.multiplayer_peer = peer

# funções que é chamada pelo server e executadda todas as instancias
@rpc("authority", "call_local", "reliable")
func atualizar_contador_clientes(valor: int):
	jogadores_conectados = valor
	print("Contador atualizado para: ", valor)

# funções que é chamada pelo server e executadda todas as instancias
@rpc("authority", "call_local", "reliable")
func atualizar_id_admin(valor: int):
	id_admin = valor
	print("id_admin: " + str(valor))

## --- Comando de Início (RPC) ---

# Este comando é chamado pelo Host e executado em TODO MUNDO (call_local)
@rpc("authority", "call_local", "reliable")
func iniciar_partida_para_todos():
	print("Partida iniciada! Carregando mapa...")
	get_tree().change_scene_to_file("res://src/scenes/level_1.tscn")

## --- Callbacks ---

func _on_player_connected(id):
	jogadores_conectados += 1
	print("Novo jogador entrou no lobby: ", id)
	
	if jogadores_conectados == 1:
		id_admin = id
	
	if multiplayer.is_server():
		atualizar_id_admin.rpc(id_admin)
		atualizar_contador_clientes.rpc(jogadores_conectados)
		if jogadores_conectados == 2:
			iniciar_partida_para_todos.rpc()

func _on_player_disconnected(id):
	print("Jogador saiu do lobby: ", id)

func _on_connected_ok():
	print("Conectado ao servidor!")
	join_success.emit()

func _on_connected_fail():
	print("Falha ao conectar.")
	join_fail.emit()
