extends CharacterBody3D

const WALK_SPEED := 5.0
const MOUSE_SENSITIVITY := 0.0022
const GRAVITY := 18.0

var camera_pivot: Node3D
var camera: Camera3D

func _ready() -> void:
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.34
	capsule.height = 1.8
	var collision := CollisionShape3D.new()
	collision.shape = capsule
	collision.position.y = 0.9
	add_child(collision)

	camera_pivot = Node3D.new()
	camera_pivot.position.y = 1.65
	add_child(camera_pivot)

	camera = Camera3D.new()
	camera.current = true
	camera.fov = 75.0
	camera.far = 500.0
	camera_pivot.add_child(camera)

	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		rotate_y(-event.relative.x * MOUSE_SENSITIVITY)
		camera_pivot.rotate_x(-event.relative.y * MOUSE_SENSITIVITY)
		camera_pivot.rotation.x = clamp(camera_pivot.rotation.x, deg_to_rad(-85.0), deg_to_rad(85.0))
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

func _physics_process(delta: float) -> void:
	if Input.is_key_pressed(KEY_ESCAPE):
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	if Input.mouse_mode == Input.MOUSE_MODE_VISIBLE and Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

	var move := Vector2.ZERO
	if Input.is_key_pressed(KEY_A):
		move.x -= 1.0
	if Input.is_key_pressed(KEY_D):
		move.x += 1.0
	if Input.is_key_pressed(KEY_W):
		move.y -= 1.0
	if Input.is_key_pressed(KEY_S):
		move.y += 1.0
	move = move.normalized()

	var direction := (global_transform.basis * Vector3(move.x, 0.0, move.y)).normalized()
	velocity.x = direction.x * WALK_SPEED
	velocity.z = direction.z * WALK_SPEED
	if not is_on_floor():
		velocity.y -= GRAVITY * delta
	elif Input.is_key_pressed(KEY_SPACE):
		velocity.y = 6.0
	move_and_slide()
