extends Node2D


# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	pass # Replace with function body.


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass


func _on_host_pressed() -> void:
	Network.create_server()
	$StatusLabel.text = "Aguardando jogadores..."
	$Control/Join.visible = false
	$Control/Host.visible = false
	$Control/Start.visible = true # Botão que só o Host vê


func _on_join_pressed() -> void:
	# O cliente APENAS conecta. Ele fica parado esperando o sinal do Host.
	Network.join_game("127.0.0.1")
	$StatusLabel.text = "Conectado! Aguardando o Host iniciar a fase..."
	$Control/Join.visible = false
	$Control/Host.visible = false
	print("Conectado! Aguardando o Host iniciar a fase...")


func _on_start_pressed() -> void:
	# O Host decide quando começar
	Network.iniciar_partida_para_todos.rpc()
