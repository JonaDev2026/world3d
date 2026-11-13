extends Node3D

func _ready() -> void:
	_create_environment()
	_create_ground()
	_create_player()

func _create_environment() -> void:
	var environment := Environment.new()
	environment.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var sky_material := ProceduralSkyMaterial.new()
	sky_material.sky_top_color = Color(0.20, 0.31, 0.43)
	sky_material.sky_horizon_color = Color(0.70, 0.73, 0.70)
	sky_material.ground_bottom_color = Color(0.20, 0.22, 0.19)
	sky_material.ground_horizon_color = Color(0.58, 0.60, 0.55)
	sky.sky_material = sky_material
	environment.sky = sky
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	environment.tonemap_mode = Environment.TONE_MAPPER_FILMIC

	var world_environment := WorldEnvironment.new()
	world_environment.environment = environment
	add_child(world_environment)

	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-48.0, -32.0, 0.0)
	sun.light_energy = 1.15
	sun.shadow_enabled = true
	add_child(sun)

func _create_ground() -> void:
	var ground := StaticBody3D.new()
	ground.name = "Ground"
	add_child(ground)

	var mesh_instance := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = Vector2(500.0, 500.0)
	mesh_instance.mesh = plane
	var material := StandardMaterial3D.new()
	material.albedo_color = Color(0.36, 0.39, 0.32)
	material.roughness = 1.0
	plane.material = material
	ground.add_child(mesh_instance)

	var collision := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = Vector3(500.0, 0.2, 500.0)
	collision.shape = shape
	collision.position.y = -0.1
	ground.add_child(collision)

func _create_player() -> void:
	var player := CharacterBody3D.new()
	player.name = "Player"
	player.set_script(load("res://scripts/player.gd"))
	add_child(player)
	player.position = Vector3(0.0, 0.1, 0.0)
