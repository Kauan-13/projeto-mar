extends CharacterBody2D

const SPEED = 200.0

func _enter_tree():
	# Define a autoridade IMEDIATAMENTE ao entrar na árvore
	set_multiplayer_authority(name.to_int())

func _ready():
	# Agora sim, um pequeno await apenas para a câmera e o visual inicial
	await get_tree().process_frame
	atualizar_visual()
	
	var is_admin: bool = Network.id_admin == name.to_int()
	
	if is_admin:
		$Label.text = "1"
	else:
		$Label.text = "2"

	if is_multiplayer_authority():
		$Camera2D.enabled = true
		$Camera2D.make_current()
	elif has_node("Camera2D"):
		$Camera2D.queue_free()

func atualizar_visual():
	# get_node_or_null é mais seguro que has_node
	var sprite = get_node_or_null("Sprite")
	if not sprite: return
	
	var is_admin: bool = Network.id_admin == name.to_int()
	
	if is_admin:
		sprite.texture = load("res://assets/player.png")
	else:
		sprite.texture = load("res://assets/player2.png")


func _physics_process(delta):
	# ESSA É A TRAVA PRINCIPAL:
	# Se este boneco na tela não for o MEU, eu não rodo o código abaixo.
	if not is_multiplayer_authority(): 
		return
	
	var input_direction = Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
	
	# Virar o sprite (Ajustado para o nome do seu nó $Sprite)
	if input_direction.x > 0: 
		$Sprite.flip_h = true
	elif input_direction.x < 0: 
		$Sprite.flip_h = false
	
	velocity = input_direction * SPEED
	move_and_slide()
