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
		"grass": _mat(Color(0.25, 0.31, 0.20), 1.0),
		"grass_light": _mat(Color(0.34, 0.38, 0.23), 1.0),
		"stone": _mat(Color(0.43, 0.41, 0.36), 0.94),
		"stone_light": _mat(Color(0.57, 0.53, 0.45), 0.96),
		"road": _mat(Color(0.36, 0.34, 0.29), 0.98),
		"road_dark": _mat(Color(0.27, 0.27, 0.24), 1.0),
		"plaster": _mat(Color(0.72, 0.60, 0.43), 0.96),
		"plaster_light": _mat(Color(0.79, 0.72, 0.58), 0.96),
		"plaster_red": _mat(Color(0.57, 0.36, 0.27), 0.96),
		"plaster_cream": _mat(Color(0.78, 0.68, 0.51), 0.96),
		"timber": _mat(Color(0.19, 0.115, 0.065), 0.91),
		"wood": _mat(Color(0.36, 0.235, 0.13), 0.92),
		"wood_light": _mat(Color(0.49, 0.34, 0.20), 0.93),
		"roof": _mat(Color(0.29, 0.18, 0.14), 0.94),
		"roof_red": _mat(Color(0.48, 0.24, 0.17), 0.94),
		"roof_light": _mat(Color(0.57, 0.31, 0.21), 0.94),
		"water": _mat(Color(0.12, 0.30, 0.34, 0.92), 0.18),
		"window": _mat(Color(0.075, 0.105, 0.12), 0.28),
		"glass_glow": _mat(Color(0.78, 0.56, 0.28), 0.35),
		"leaf": _mat(Color(0.18, 0.29, 0.15), 1.0),
		"leaf_light": _mat(Color(0.27, 0.36, 0.18), 1.0),
		"iron": _mat(Color(0.105, 0.12, 0.12), 0.72)
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
	sky_mat.sky_top_color = Color(0.24, 0.36, 0.49)
	sky_mat.sky_horizon_color = Color(0.82, 0.75, 0.61)
	sky_mat.ground_bottom_color = Color(0.22, 0.24, 0.19)
	sky_mat.ground_horizon_color = Color(0.62, 0.58, 0.47)
	sky.sky_material = sky_mat
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_energy = 0.72
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.tonemap_exposure = 1.0
	env.fog_enabled = true
	env.fog_light_color = Color(0.72, 0.69, 0.59)
	env.fog_density = 0.0018
	var world_env := WorldEnvironment.new()
	world_env.environment = env
	add_child(world_env)

	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-38.0, -32.0, 0.0)
	sun.light_color = Color(1.0, 0.91, 0.76)
	sun.light_energy = 1.25
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 100.0
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
	# Strada in ciottoli irregolari, con bordi consumati.
	for row in range(25):
		var z := -23.0 + float(row) * 1.22
		var bend := sin(float(row) * 0.23) * 0.8
		for col in range(6):
			var x := bend + (float(col) - 2.5) * 0.91
			var stone_size := Vector3(randf_range(0.78, 0.91), randf_range(0.10, 0.16), randf_range(0.88, 1.12))
			_box("StreetCobble", Vector3(x, 0.04, z + randf_range(-0.12, 0.12)), stone_size, "road" if (row + col) % 4 != 0 else "road_dark", false, randf_range(-0.035, 0.035))
		for edge in [-1.0, 1.0]:
			_box("StreetKerb", Vector3(bend + edge * 3.15, 0.12, z), Vector3(0.24, 0.25, 1.18), "stone", false)

	# Piazzetta in pietra, con pavimentazione a raggiera irregolare.
	_box("SquareBase", Vector3(-8.0, 0.015, -4.0), Vector3(14.0, 0.12, 13.0), "stone", false, -0.035)
	for x in range(8):
		for z in range(7):
			var px := -14.0 + float(x) * 1.65 + randf_range(-0.10, 0.10)
			var pz := -9.0 + float(z) * 1.75 + randf_range(-0.10, 0.10)
			_box("SquarePaving", Vector3(px, 0.095, pz), Vector3(randf_range(1.35, 1.58), 0.055, randf_range(1.42, 1.62)), "road" if (x + z) % 3 != 0 else "stone_light", false, randf_range(-0.025, 0.025))

	_make_fountain()
	_make_market_stall()
	_make_lamppost(Vector3(-2.8, 0, -7.8))
	_make_lamppost(Vector3(2.8, 0, -1.5))
	_make_crates_and_barrels()

func _make_houses() -> void:
	# Edifici disposti attorno alla strada: sagome, altezze e facciate differenti.
	_house(Vector3(-11.7, 0, -16.0), 7.2, 6.0, 5.0, "plaster", "roof_red", 0)
	_house(Vector3(10.8, 0, -13.0), 6.4, 7.0, 6.1, "plaster_light", "roof", 1)
	_house(Vector3(-13.2, 0, 2.0), 8.0, 6.5, 4.6, "plaster_red", "roof_light", 2)

func _house(origin: Vector3, width: float, depth: float, wall_height: float, wall_key: String, roof_key: String, style: int) -> void:
	var root := Node3D.new()
	root.position = origin
	root.rotation.y = deg_to_rad(float(style * 3 - 2))
	add_child(root)

	var base_y := 0.55
	var door_w := 1.12
	var door_h := 2.18
	var wall_top := base_y + wall_height
	# Fondazioni e pareti divise: la porta è un'apertura vera, non una tavola incollata.
	_box_at(root, "StoneFoundation", Vector3(0, 0.30, 0), Vector3(width + 0.48, 0.60, depth + 0.48), "stone", true)
	_box_at(root, "RearWall", Vector3(0, base_y + wall_height * 0.5, depth * 0.5), Vector3(width, wall_height, 0.28), wall_key, true)
	_box_at(root, "LeftWall", Vector3(-width * 0.5, base_y + wall_height * 0.5, 0), Vector3(0.28, wall_height, depth), wall_key, true)
	_box_at(root, "RightWall", Vector3(width * 0.5, base_y + wall_height * 0.5, 0), Vector3(0.28, wall_height, depth), wall_key, true)
	_box_at(root, "FrontLeft", Vector3(-(door_w + width) * 0.25, base_y + wall_height * 0.5, -depth * 0.5), Vector3((width - door_w) * 0.5, wall_height, 0.28), wall_key, true)
	_box_at(root, "FrontRight", Vector3((door_w + width) * 0.25, base_y + wall_height * 0.5, -depth * 0.5), Vector3((width - door_w) * 0.5, wall_height, 0.28), wall_key, true)
	_box_at(root, "FrontLintel", Vector3(0, base_y + door_h + (wall_height - door_h) * 0.5, -depth * 0.5), Vector3(door_w, wall_height - door_h, 0.28), wall_key, true)

	# Zoccolo in pietra e cantonali che danno peso alle facciate.
	_box_at(root, "FrontStoneCourse", Vector3(0, 0.78, -depth * 0.5 - 0.17), Vector3(width + 0.08, 0.42, 0.16), "stone_light", false)
	for side in [-1.0, 1.0]:
		for level in range(4):
			_box_at(root, "CornerStone", Vector3(side * (width * 0.5 - 0.10), 1.12 + float(level) * 0.92, -depth * 0.5 - 0.17), Vector3(0.34, 0.78, 0.16), "stone_light", false)

	# Porta ad arco stilizzato, telaio, assi e ferramenta.
	_box_at(root, "DoorLeaf", Vector3(0, 1.62, -depth * 0.5 - 0.18), Vector3(door_w - 0.12, 1.72, 0.12), "wood", false)
	for plank in range(5):
		_box_at(root, "DoorPlank", Vector3(-0.43 + float(plank) * 0.215, 1.62, -depth * 0.5 - 0.25), Vector3(0.035, 1.62, 0.035), "wood_light", false)
	_box_at(root, "DoorLintel", Vector3(0, 2.78, -depth * 0.5 - 0.20), Vector3(1.42, 0.16, 0.22), "timber", false)
	_box_at(root, "DoorJambL", Vector3(-0.63, 1.65, -depth * 0.5 - 0.20), Vector3(0.16, 2.0, 0.22), "stone_light", false)
	_box_at(root, "DoorJambR", Vector3(0.63, 1.65, -depth * 0.5 - 0.20), Vector3(0.16, 2.0, 0.22), "stone_light", false)
	_sphere_at(root, "DoorKnob", Vector3(0.34, 1.55, -depth * 0.5 - 0.34), 0.07, "iron")
	_box_at(root, "DoorStep", Vector3(0, 0.12, -depth * 0.5 - 0.42), Vector3(1.55, 0.24, 0.68), "stone", false)

	# Finestre profonde, davanzali, scuri aperti e traversi.
	var window_count := 2 if style != 1 else 3
	for index in range(window_count):
		var wx := -width * 0.31 + float(index) * (width * 0.31) if window_count == 3 else (-1.0 if index == 0 else 1.0) * width * 0.29
		var wy := 2.65 if style != 1 else 4.85
		_box_at(root, "WindowShadow", Vector3(wx, wy, -depth * 0.5 - 0.16), Vector3(1.18, 1.28, 0.12), "timber", false)
		_box_at(root, "WindowGlass", Vector3(wx, wy, -depth * 0.5 - 0.24), Vector3(0.78, 0.92, 0.06), "window", false)
		_box_at(root, "WindowMullionV", Vector3(wx, wy, -depth * 0.5 - 0.30), Vector3(0.07, 0.92, 0.06), "wood_light", false)
		_box_at(root, "WindowMullionH", Vector3(wx, wy, -depth * 0.29 - 0.5), Vector3(0.78, 0.07, 0.06), "wood_light", false)
		_box_at(root, "WindowSill", Vector3(wx, wy - 0.66, -depth * 0.5 - 0.29), Vector3(1.38, 0.16, 0.42), "stone_light", false)
		for side in [-1.0, 1.0]:
			_box_at(root, "Shutter", Vector3(wx + side * 0.61, wy, -depth * 0.5 - 0.27), Vector3(0.20, 1.02, 0.10), "wood", false, side * 0.12)
			_box_at(root, "ShutterBrace", Vector3(wx + side * 0.61, wy, -depth * 0.5 - 0.34), Vector3(0.18, 0.07, 0.06), "timber", false)

	# Travi a vista e mensole sotto il tetto.
	_box_at(root, "FacadeBeam", Vector3(0, wall_top - 0.12, -depth * 0.5 - 0.19), Vector3(width + 0.32, 0.24, 0.28), "timber", false)
	for side in [-1.0, 1.0]:
		_box_at(root, "FacadePost", Vector3(side * (width * 0.5 - 0.20), base_y + wall_height * 0.5, -depth * 0.5 - 0.19), Vector3(0.22, wall_height - 0.2, 0.24), "timber", false)
		for level in range(3):
			_box_at(root, "TimberBrace", Vector3(side * (width * 0.5 - 0.22), 2.0 + float(level) * 1.0, -depth * 0.5 - 0.24), Vector3(0.62, 0.13, 0.12), "timber", false, side * 0.55)

	# Tetto a falde con coppi sovrapposti, colmo e gronde.
	var half_w := width * 0.58
	var rise := maxf(1.9, wall_height * 0.46)
	var roof_base := wall_top
	var slope_len := sqrt(half_w * half_w + rise * rise)
	var angle := atan2(rise, half_w)
	_box_at(root, "RoofDeckLeft", Vector3(-half_w * 0.5, roof_base + rise * 0.5, 0), Vector3(slope_len, 0.22, depth + 0.95), roof_key, true, angle)
	_box_at(root, "RoofDeckRight", Vector3(half_w * 0.5, roof_base + rise * 0.5, 0), Vector3(slope_len, 0.22, depth + 0.95), roof_key, true, -angle)
	for side in [-1.0, 1.0]:
		for course in range(7):
			var along := (float(course) + 0.5) * half_w / 7.0
			var rx: float = side * (half_w - along)
			var ry := roof_base + rise * (along / half_w) + 0.18
			for tile in range(7):
				var rz := -depth * 0.5 - 0.35 + float(tile) * (depth + 0.7) / 6.0
				_box_at(root, "RoofTile", Vector3(rx, ry, rz), Vector3(0.92, 0.10, 0.78), "roof_light" if (tile + course) % 5 == 0 else roof_key, false, side * angle)
		_box_at(root, "EaveFascia", Vector3(side * half_w, roof_base + 0.08, 0), Vector3(0.20, 0.24, depth + 1.0), "timber", false)
	_box_at(root, "RidgeCap", Vector3(0, roof_base + rise + 0.12, 0), Vector3(0.30, 0.28, depth + 1.15), "roof_red", false)

	# Camino e dettagli differenti per ogni edificio.
	_box_at(root, "Chimney", Vector3(width * 0.27, roof_base + rise + 0.65, depth * 0.18), Vector3(0.72, 1.45, 0.82), "stone", true)
	_box_at(root, "ChimneyCap", Vector3(width * 0.27, roof_base + rise + 1.42, depth * 0.18), Vector3(0.92, 0.18, 1.02), "stone_light", false)
	if style == 1:
		_box_at(root, "UpperFloorFront", Vector3(0, 4.35, -depth * 0.5 - 0.34), Vector3(width + 0.45, 0.20, 0.28), "timber", false)
		_box_at(root, "UpperFloorSill", Vector3(0, 4.05, -depth * 0.5 - 0.38), Vector3(width + 0.75, 0.16, 0.48), "wood_light", false)
		for side in [-1.0, 1.0]:
			_box_at(root, "UpperSupport", Vector3(side * width * 0.36, 3.75, -depth * 0.5 - 0.35), Vector3(0.20, 0.72, 0.22), "timber", false)
	elif style == 2:
		_box_at(root, "ShopAwning", Vector3(0, 3.05, -depth * 0.5 - 0.88), Vector3(width * 0.88, 0.18, 1.65), "roof_red", false, -0.12)
		for side in [-1.0, 1.0]:
			_box_at(root, "AwningPost", Vector3(side * width * 0.40, 1.62, -depth * 0.5 - 1.55), Vector3(0.16, 3.15, 0.16), "timber", true)
		_box_at(root, "ShopSign", Vector3(0, 3.72, -depth * 0.5 - 0.32), Vector3(1.75, 0.68, 0.12), "wood_light", false)
		_box_at(root, "ShopSignFrame", Vector3(0, 3.72, -depth * 0.5 - 0.40), Vector3(1.88, 0.78, 0.08), "timber", false)

func _make_trees() -> void:
	var tree_positions := [Vector3(19, 0, -17), Vector3(21, 0, -5), Vector3(-22, 0, 10), Vector3(18, 0, 23)]
	for index in range(tree_positions.size()):
		var p: Vector3 = tree_positions[index]
		_cylinder("TreeTrunk", p + Vector3(0, 1.35, 0), 0.28, 2.7, "wood", true)
		for branch in range(3):
			var branch_angle := float(branch) * TAU / 3.0
			_box("TreeBranch", p + Vector3(cos(branch_angle) * 0.62, 2.35, sin(branch_angle) * 0.62), Vector3(0.16, 1.45, 0.16), "wood", false, 0.0)
		for crown in range(7):
			var angle := float(crown) * TAU / 7.0
			var offset := Vector3(cos(angle) * 1.15, 3.25 + randf_range(-0.35, 0.45), sin(angle) * 1.15)
			_sphere("TreeFoliage", p + offset, randf_range(1.15, 1.55), "leaf" if crown % 2 else "leaf_light")
		_sphere("TreeFoliageTop", p + Vector3(0, 4.25, 0), 1.35, "leaf")

	# Siepi basse e ciuffi d'erba lungo i margini, non sulla carreggiata.
	for p in [Vector3(15, 0, -22), Vector3(16, 0, -19), Vector3(-19, 0, -2), Vector3(17, 0, 19)]:
		for i in range(4):
			_sphere("Bush", p + Vector3(float(i) * 0.72, 0.62, 0), 0.72, "leaf")


func _make_fountain() -> void:
	_cylinder("FountainBase", Vector3(-8.0, 0.22, -4.0), 2.0, 0.42, "stone", true)
	_cylinder("FountainBasin", Vector3(-8.0, 0.55, -4.0), 1.72, 0.30, "stone_light", false)
	_cylinder("FountainWater", Vector3(-8.0, 0.72, -4.0), 1.42, 0.05, "water", false)
	_cylinder("FountainColumn", Vector3(-8.0, 1.28, -4.0), 0.30, 1.15, "stone", false)
	_sphere("FountainFinial", Vector3(-8.0, 1.95, -4.0), 0.34, "stone_light")

func _make_market_stall() -> void:
	var p := Vector3(-13.1, 0, -4.4)
	for side in [-1.0, 1.0]:
		_cylinder("StallPost", p + Vector3(side * 1.55, 1.35, 0), 0.09, 2.7, "timber", true)
		_cylinder("StallPostBack", p + Vector3(side * 1.55, 1.35, 1.35), 0.09, 2.7, "timber", true)
	_box("StallCounter", p + Vector3(0, 0.95, 0.55), Vector3(3.4, 0.22, 1.9), "wood", true)
	_box("StallCanopy", p + Vector3(0, 2.65, 0.65), Vector3(3.8, 0.18, 2.35), "roof_red", false, -0.08)
	for i in range(5):
		_box("CanopyStripe", p + Vector3(-1.5 + float(i) * 0.75, 2.76, -0.52), Vector3(0.62, 0.035, 0.10), "plaster_cream", false)

func _make_lamppost(p: Vector3) -> void:
	_cylinder("LampBase", p + Vector3(0, 0.18, 0), 0.24, 0.36, "stone", true)
	_cylinder("LampPost", p + Vector3(0, 1.55, 0), 0.075, 2.8, "iron", true)
	_box("LampArm", p + Vector3(0.35, 2.8, 0), Vector3(0.82, 0.08, 0.08), "iron", false)
	_box("LampLanternFrame", p + Vector3(0.72, 2.48, 0), Vector3(0.42, 0.58, 0.42), "iron", false)
	_box("LampGlass", p + Vector3(0.72, 2.48, 0), Vector3(0.29, 0.42, 0.29), "glass_glow", false)
	_box("LampRoof", p + Vector3(0.72, 2.83, 0), Vector3(0.55, 0.12, 0.55), "iron", false)

func _make_crates_and_barrels() -> void:
	_box("CrateA", Vector3(3.7, 0.48, -5.8), Vector3(0.9, 0.9, 0.9), "wood", true)
	_box("CrateB", Vector3(4.45, 0.42, -5.3), Vector3(0.75, 0.78, 0.75), "wood_light", true)
	_cylinder("Barrel", Vector3(5.2, 0.55, -6.1), 0.42, 1.1, "wood", true)
	for y in [0.20, 0.90]:
		_cylinder("BarrelHoop", Vector3(5.2, y, -6.1), 0.44, 0.08, "iron", false)

func _cylinder(node_name: String, pos: Vector3, radius: float, height: float, material_key: String, collision: bool) -> void:
	var body: Node3D = StaticBody3D.new() if collision else Node3D.new()
	body.name = node_name
	body.position = pos
	add_child(body)
	var mesh_instance := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height
	mesh.radial_segments = 12
	mesh_instance.mesh = mesh
	mesh_instance.material_override = materials[material_key]
	body.add_child(mesh_instance)
	if collision:
		var shape_node := CollisionShape3D.new()
		var shape := CylinderShape3D.new()
		shape.radius = radius
		shape.height = height
		shape_node.shape = shape
		body.add_child(shape_node)

func _sphere(node_name: String, pos: Vector3, radius: float, material_key: String) -> void:
	_sphere_at(self, node_name, pos, radius, material_key)

func _sphere_at(parent: Node3D, node_name: String, pos: Vector3, radius: float, material_key: String) -> void:
	var mesh_instance := MeshInstance3D.new()
	var mesh := SphereMesh.new()
	mesh.radius = radius
	mesh.height = radius * 2.0
	mesh.radial_segments = 10
	mesh.rings = 6
	mesh_instance.mesh = mesh
	mesh_instance.material_override = materials[material_key]
	mesh_instance.position = pos
	parent.add_child(mesh_instance)

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
