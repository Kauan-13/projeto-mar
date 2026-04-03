extends Node2D

@onready var http_request = $HTTPRequest
@onready var room_code_input = $Control/LineEdit
@onready var code_label = $CodeLabel
@onready var btn_host = $Control/Host 
@onready var btn_join = $Control/Join

var ip = "127.0.0.1"
# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	pass # Replace with function body.

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass

func _on_host_pressed() -> void:
	_enviar_requisicao("http://" + ip + ":3000/create-room", HTTPClient.METHOD_POST)

func _on_join_pressed() -> void:
	var code = room_code_input.text.strip_edges().to_upper()
	print("Código: " + code)
	if code != "":
		_enviar_requisicao("http://" + ip + ":3000/get-room/" + code, HTTPClient.METHOD_GET)

func _enviar_requisicao(url, metodo):
	var headers = ["Content-Type: application/json"]
	var err = http_request.request(url, headers, metodo)
	if err != OK:
		print("Erro ao tentar disparar a requisição: ", err)
	else:
		print("Requisição disparada com sucesso para: ", url)

func _on_http_request_request_completed(result, response_code, headers, body):
	var json = JSON.parse_string(body.get_string_from_utf8())
	
	if response_code == 200:
		var port = json["port"]
		# No caso do Create, a API retorna 'code'. No Join, retorna 'port'.
		if json.has("code"): 
			print("Sala Criada: ", json["code"])
			code_label.text = "Código " + json["code"]
		
		btn_host.visible = false
		btn_join.visible = false
		# Conecta ao servidor (Docker)
		Network.join_game(ip, port)
		
	else:
		print("Erro na API ou Sala não encontrada")
