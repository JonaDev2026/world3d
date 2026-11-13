extends Node3D

const PLAYER_SCRIPT := preload("res://scripts/player.gd")

var materials: Dictionary = {}

func _ready() -> void:
	_make_materials()
	_make_environment()
	_make_ground()
	_make_river_and_bridge()
	_make_street()
	_make_houses()
	_make_trees()
	_make_player()

func _make_materials() -> void:
	materials = {
		"grass": _mat(Color(0.24, 0.30, 0.20), 1.0),
		"stone": _mat(Color(0.39, 0.37, 0.32), 1.0),
		"road": _mat(Color(0.31, 0.30, 0.27), 1.0),
		"plaster": _mat(Color(0.70, 0.59, 0.43), 0.92),
		"plaster_light": _mat(Color(0.77, 0.70, 0.56), 0.92),
		"plaster_red": _mat(Color(0.49, 0.31, 0.24), 0.95),
		"timber": _mat(Color(0.20, 0.12, 0.075), 0.9),
		"wood": _mat(Color(0.34, 0.22, 0.12), 0.88),
		"roof": _mat(Color(0.25, 0.16, 0.13), 0.95),
		"roof_red": _mat(Color(0.43, 0.22, 0.16), 0.95),
		"water": _mat(Color(0.12, 0.29, 0.34, 0.88), 0.22),
		"window": _mat(Color(0.12, 0.18, 0.19), 0.35),
		"leaf": _mat(Color(0.16, 0.25, 0.14), 1.0)
	}

func _mat(color: Color, rough: float) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	material.roughness = rough
	if color.a < 1.0:
		material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	return material

func _make_environment() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var sky_mat := ProceduralSkyMaterial.new()
	sky_mat.sky_top_color = Color(0.19, 0.31, 0.46)
	sky_mat.sky_horizon_color = Color(0.72, 0.73, 0.67)
	sky_mat.ground_bottom_color = Color(0.20, 0.22, 0.18)
	sky_mat.ground_horizon_color = Color(0.56, 0.57, 0.51)
	sky.sky_material = sky_mat
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_energy = 0.65
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	var world_env := WorldEnvironment.new()
	world_env.environment = env
	add_child(world_env)

	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-42.0, -28.0, 0.0)
	sun.light_energy = 1.15
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 90.0
	add_child(sun)

func _make_ground() -> void:
	# Il terreno è diviso in due sponde: sotto il fiume non c'è pavimento calpestabile.
	_box("SouthBankGround", Vector3(0, -0.22, -14.0), Vector3(72, 0.4, 44.0), "grass", true)
	_box("NorthBankGround", Vector3(0, -0.22, 27.0), Vector3(72, 0.4, 18.0), "grass", true)

func _make_river_and_bridge() -> void:
	var water := MeshInstance3D.new()
	var water_mesh := PlaneMesh.new()
	water_mesh.size = Vector2(72, 9)
	water.mesh = water_mesh
	water.material_override = materials["water"]
	water.position = Vector3(0, -0.015, 13.0)
	add_child(water)

	# Sponde in pietra
	_box("RiverBankNorth", Vector3(0, 0.04, 8.15), Vector3(72, 0.35, 0.65), "stone", true)
	_box("RiverBankSouth", Vector3(0, 0.04, 17.85), Vector3(72, 0.35, 0.65), "stone", true)

	# Ponte in pietra, leggermente rialzato sull'acqua
	_box("BridgeDeck", Vector3(0, 0.13, 13.0), Vector3(4.8, 0.26, 13.0), "stone", true)
	for side in [-1.0, 1.0]:
		_box("BridgeParapet", Vector3(side * 2.15, 0.95, 13.0), Vector3(0.28, 0.75, 12.6), "stone", true)
		for i in range(7):
			_box("BridgePost", Vector3(side * 2.15, 1.12, 7.8 + float(i) * 1.72), Vector3(0.42, 1.1, 0.42), "stone", true)

func _make_street() -> void:
	# Tratto di strada che conduce dal punto di partenza al ponte.
	for i in range(17):
		var z := -20.0 + float(i) * 1.55
		var x := sin(float(i) * 0.32) * 1.1
		_box("RoadStone", Vector3(x, 0.025, z), Vector3(5.7, 0.12, 1.38), "road", false, randf_range(-0.025, 0.025))
		for edge in [-1.0, 1.0]:
			_box("RoadKerb", Vector3(x + edge * 3.05, 0.07, z), Vector3(0.22, 0.2, 1.4), "stone", false)

	# Piccola piazza irregolare sul lato della strada
	_box("Square", Vector3(-8.0, 0.015, -4.0), Vector3(13.0, 0.10, 12.0), "stone", false, -0.08)
	for x in range(6):
		for z in range(5):
			var px := -13.0 + float(x) * 1.8 + randf_range(-0.12, 0.12)
			var pz := -8.0 + float(z) * 1.8 + randf_range(-0.12, 0.12)
			_box("Paving", Vector3(px, 0.09, pz), Vector3(1.55, 0.07, 1.5), "road", false, randf_range(-0.04, 0.04))

func _make_houses() -> void:
	_house(Vector3(-11.5, 0, -16.0), 7.0, 5.0, 5.1, "plaster", "roof", 0)
	_house(Vector3(10.0, 0, -12.0), 6.0, 7.0, 6.0, "plaster_light", "roof_red", 1)
	_house(Vector3(-13.0, 0, 2.0), 8.0, 6.0, 4.5, "plaster_red", "roof", 2)

func _house(origin: Vector3, width: float, depth: float, wall_height: float, wall_key: String, roof_key: String, style: int) -> void:
	var root := Node3D.new()
	root.position = origin
	add_child(root)

	_box_at(root, "Foundation", Vector3(0, 0.28, 0), Vector3(width + 0.35, 0.55, depth + 0.35), "stone", true)
	_box_at(root, "Walls", Vector3(0, 0.55 + wall_height * 0.5, 0), Vector3(width, wall_height, depth), wall_key, true)
	# Tetto a due falde, con colmo lungo la profondità dell'edificio.
	var half_w := width * 0.56
	var rise := maxf(1.7, wall_height * 0.43)
	var slope_len := sqrt(half_w * half_w + rise * rise)
	var angle := atan2(rise, half_w)
	_box_at(root, "RoofLeft", Vector3(-half_w * 0.5, 0.55 + wall_height + rise * 0.5, 0), Vector3(slope_len, 0.32, depth + 0.8), roof_key, true, angle)
	_box_at(root, "RoofRight", Vector3(half_w * 0.5, 0.55 + wall_height + rise * 0.5, 0), Vector3(slope_len, 0.32, depth + 0.8), roof_key, true, -angle)

	# Facciata rivolta verso la strada (asse -Z).
	var door_width := 1.05
	_box_at(root, "Door", Vector3(0, 1.15, -depth * 0.5 - 0.045), Vector3(door_width, 2.05, 0.12), "wood", false)
	_box_at(root, "DoorLintel", Vector3(0, 2.22, -depth * 0.5 - 0.12), Vector3(1.35, 0.18, 0.2), "timber", false)
	for side in [-1.0, 1.0]:
		var wx := side * width * 0.29
		_box_at(root, "WindowFrame", Vector3(wx, 2.35, -depth * 0.5 - 0.07), Vector3(1.0, 1.2, 0.16), "timber", false)
		_box_at(root, "WindowGlass", Vector3(wx, 2.35, -depth * 0.5 - 0.16), Vector3(0.72, 0.92, 0.08), "window", false)
		_box_at(root, "WindowCross", Vector3(wx, 2.35, -depth * 0.5 - 0.22), Vector3(0.08, 1.0, 0.08), "wood", false)
		_box_at(root, "WindowSill", Vector3(wx, 1.72, -depth * 0.5 - 0.18), Vector3(1.15, 0.13, 0.35), "stone", false)

	if style == 1:
		# Piccolo piano superiore sporgente con travi a vista.
		_box_at(root, "UpperBeam", Vector3(0, 3.25, -depth * 0.5 - 0.12), Vector3(width + 0.35, 0.22, 0.24), "timber", false)
		_box_at(root, "UpperBeamSide", Vector3(width * 0.5, 3.25, 0), Vector3(0.22, 0.22, depth), "timber", false)
	elif style == 2:
		_box_at(root, "ShopAwning", Vector3(0, 2.8, -depth * 0.5 - 0.8), Vector3(width * 0.78, 0.16, 1.55), "roof_red", false, -0.12)
		for side in [-1.0, 1.0]:
			_box_at(root, "AwningPost", Vector3(side * width * 0.36, 1.45, -depth * 0.5 - 1.45), Vector3(0.14, 2.9, 0.14), "timber", true)

func _make_trees() -> void:
	for p in [Vector3(18, 0, -16), Vector3(20, 0, -5), Vector3(-21, 0, 10), Vector3(18, 0, 22)]:
		_box("TreeTrunk", p + Vector3(0, 1.3, 0), Vector3(0.55, 2.6, 0.55), "wood", true)
		var crown := MeshInstance3D.new()
		var sphere := SphereMesh.new()
		sphere.radius = 2.0
		sphere.height = 4.0
		crown.mesh = sphere
		crown.material_override = materials["leaf"]
		crown.position = p + Vector3(0, 3.7, 0)
		add_child(crown)

func _make_player() -> void:
	var player := CharacterBody3D.new()
	player.name = "Player"
	player.set_script(PLAYER_SCRIPT)
	add_child(player)
	player.position = Vector3(0, 0.15, -25)

func _box(node_name: String, pos: Vector3, size: Vector3, material_key: String, collision: bool, rotation_y: float = 0.0) -> void:
	_box_at(self, node_name, pos, size, material_key, collision, rotation_y)

func _box_at(parent: Node3D, node_name: String, pos: Vector3, size: Vector3, material_key: String, collision: bool, rotation_z: float = 0.0) -> void:
	var body: Node3D
	if collision:
		var static_body := StaticBody3D.new()
		body = static_body
		parent.add_child(static_body)
	else:
		body = Node3D.new()
		parent.add_child(body)
	body.name = node_name
	body.position = pos
	body.rotation.z = rotation_z

	var mesh_instance := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	mesh_instance.mesh = mesh
	mesh_instance.material_override = materials[material_key]
	body.add_child(mesh_instance)

	if collision:
		var shape_node := CollisionShape3D.new()
		var shape := BoxShape3D.new()
		shape.size = size
		shape_node.shape = shape
		body.add_child(shape_node)
