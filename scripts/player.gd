extends CharacterBody3D

@export var walk_speed: float = 4.2
@export var run_speed: float = 6.2
@export var mouse_sensitivity: float = 0.0022
@export var gravity: float = 9.8

var camera_pivot: Node3D
var camera: Camera3D
var pitch: float = 0.0

func _ready() -> void:
    var capsule := CapsuleShape3D.new()
    capsule.radius = 0.34
    capsule.height = 1.76
    var collision := CollisionShape3D.new()
    collision.shape = capsule
    collision.position.y = 0.88
    add_child(collision)

    camera_pivot = Node3D.new()
    camera_pivot.position.y = 1.62
    add_child(camera_pivot)

    camera = Camera3D.new()
    camera.current = true
    camera.fov = 74.0
    camera.near = 0.08
    camera.far = 420.0
    camera_pivot.add_child(camera)

    Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func _unhandled_input(event: InputEvent) -> void:
    if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
        rotate_y(-event.relative.x * mouse_sensitivity)
        pitch = clampf(pitch - event.relative.y * mouse_sensitivity, -1.35, 1.35)
        camera_pivot.rotation.x = pitch
    elif event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
        Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
    elif event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
        Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func _physics_process(delta: float) -> void:
    if not is_on_floor():
        velocity.y -= gravity * delta
    else:
        velocity.y = -0.15

    var input := Vector2(
        Input.get_action_strength("move_right") - Input.get_action_strength("move_left"),
        Input.get_action_strength("move_back") - Input.get_action_strength("move_forward")
    )
    var direction := (transform.basis * Vector3(input.x, 0.0, input.y)).normalized()
    var speed := run_speed if Input.is_key_pressed(KEY_SHIFT) else walk_speed
    if direction.length_squared() > 0.001:
        velocity.x = direction.x * speed
        velocity.z = direction.z * speed
    else:
        velocity.x = move_toward(velocity.x, 0.0, 18.0 * delta)
        velocity.z = move_toward(velocity.z, 0.0, 18.0 * delta)
    move_and_slide()
