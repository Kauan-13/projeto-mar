extends Node2D

@onready var http_request = $HTTPRequest
@onready var room_code_input = $Control/LineEdit # Onde o player digita o código
@onready var btn_create = $Control/Create 
@onready var btn_join = $Control/Join
@onready var code_label = $Control/CodeLabel
@onready var btn_start = $Control/Start  # Arraste seu botão de Start aqui

func _ready():
	# Começa escondido
	btn_start.visible = false
	
	# Conecta o sinal do Network
	Network.o_admin_foi_definido.connect(_on_admin_confirmado)

func _on_admin_confirmado():
	# Se o sinal disparou, este player é o admin!
	btn_start.visible = true

func _on_create_pressed():
	# Chama o endpoint que já criamos
	_enviar_requisicao("http://192.168.3.57:3000/create-room", HTTPClient.METHOD_POST)

func _on_join_pressed():
	var code = room_code_input.text.strip_edges().to_upper()
	print("Código: " + code)
	if code != "":
		print("entrou nesse if")
		# Chama o novo endpoint de consulta
		_enviar_requisicao("http://192.168.3.57:3000/get-room/" + code, HTTPClient.METHOD_GET)

func _on_start_pressed():
	# O Admin pede ao Network para iniciar a partida
	Network.solicitar_inicio_partida.rpc_id(1) # Manda para o Servidor (ID 1)

func _enviar_requisicao(url, metodo):
	var headers = ["Content-Type: application/json"]
	var err = http_request.request(url, headers, metodo)
	if err != OK:
		print("Erro ao tentar disparar a requisição: ", err)
	else:
		print("Requisição disparada com sucesso para: ", url)

func _on_http_request_request_completed(result, response_code, headers, body):
	var json = JSON.parse_string(body.get_string_from_utf8())
	
	print("chegou até aqui")
	
	if response_code == 200:
		var port = json["port"]
		# No caso do Create, a API retorna 'code'. No Join, retorna 'port'.
		if json.has("code"): 
			print("Sala Criada: ", json["code"])
			code_label.text = "Código " + json["code"]
		
		btn_create.visible = false
		btn_join.visible = false
		# Conecta ao servidor (Docker)
		Network.join_game("192.168.3.57", port)
		
	else:
		print("Erro na API ou Sala não encontrada")
