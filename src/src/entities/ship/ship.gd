extends CharacterBody2D

# Atributos definidos no GDD para a caravela
@export var max_speed = 300.0
@export var acceleration = 100.0
@export var rotation_speed = 1.2

# Variáveis internas para processamento de input
var input_steering = 0.0
var input_throttle = 0.0

func _enter_tree():
	# Garante que a autoridade de rede é aplicada assim que o navio nasce
	if name.is_valid_int():
		set_multiplayer_authority(name.to_int())

func _ready():
	# Configura a câmara apenas para o jogador que possui a autoridade sobre o navio
	await get_tree().process_frame
	
	if is_multiplayer_authority():
		$Camera2D.enabled = true
		$Camera2D.make_current()
	elif has_node("Camera2D"):
		$Camera2D.queue_free()
		
		print("Interface de navegação ativada para o jogador: ", multiplayer.get_unique_id())

func _physics_process(delta):
	# Apenas o dono da instância processa os inputs locais
	if is_multiplayer_authority():
		# Leitura dos controlos (Setas ou WASD)
		input_steering = Input.get_axis("ui_left", "ui_right")
		input_throttle = Input.get_axis("ui_up", "ui_down")
		
		_apply_movement(delta)

func _apply_movement(delta):
	# 1. Rotação do Navio (Tank Controls)
	rotation += input_steering * rotation_speed * delta
	
	# 2. Movimento Frontal
	# transform.y é a frente do navio (ajuste para -transform.y se o sprite apontar para cima)
	var target_velocity = transform.y * input_throttle * max_speed
	
	# Interpolação para dar "peso" ao movimento na água
	velocity = velocity.move_toward(target_velocity, acceleration * delta)
	
	move_and_slide()

# Preparado para o sistema de estações/leme via RPC
@rpc("any_peer", "call_local")
func update_ship_controls(steering: float, throttle: float):
	input_steering = steering
	input_throttle = throttle
