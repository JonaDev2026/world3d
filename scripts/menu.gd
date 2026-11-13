extends Control

const WORLD_SCENE := "res://scenes/empty_world.tscn"
const MUSIC_PATH := "res://assets/audio/music/main-theme.mp3"

var music_player: AudioStreamPlayer

func _ready() -> void:
	_build_menu()
	_start_music()

func _build_menu() -> void:
	var background := ColorRect.new()
	background.color = Color(0.105, 0.095, 0.085)
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(background)

	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(center)

	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(540, 500)
	panel.add_theme_stylebox_override("panel", _panel_style())
	center.add_child(panel)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 58)
	margin.add_theme_constant_override("margin_right", 58)
	margin.add_theme_constant_override("margin_top", 48)
	margin.add_theme_constant_override("margin_bottom", 48)
	panel.add_child(margin)

	var layout := VBoxContainer.new()
	layout.alignment = BoxContainer.ALIGNMENT_CENTER
	layout.add_theme_constant_override("separation", 18)
	margin.add_child(layout)

	var eyebrow := Label.new()
	eyebrow.text = "UN MONDO DA ATTRAVERSARE"
	eyebrow.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	eyebrow.add_theme_font_size_override("font_size", 13)
	eyebrow.add_theme_color_override("font_color", Color(0.48, 0.34, 0.22))
	layout.add_child(eyebrow)

	var title := Label.new()
	title.text = "WORLD"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 54)
	title.add_theme_color_override("font_color", Color(0.25, 0.17, 0.12))
	layout.add_child(title)

	var subtitle := Label.new()
	subtitle.text = "Le Cronache di Vaelmar"
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	subtitle.add_theme_font_size_override("font_size", 21)
	subtitle.add_theme_color_override("font_color", Color(0.43, 0.30, 0.20))
	layout.add_child(subtitle)

	var separator := HSeparator.new()
	separator.add_theme_color_override("color", Color(0.62, 0.49, 0.34, 0.65))
	layout.add_child(separator)

	var description := Label.new()
	description.text = "Una storia, un mondo, un viaggio."
	description.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	description.add_theme_font_size_override("font_size", 16)
	description.add_theme_color_override("font_color", Color(0.38, 0.29, 0.22))
	layout.add_child(description)

	var spacer := Control.new()
	spacer.custom_minimum_size.y = 16
	layout.add_child(spacer)

	var start_button := _make_button("ENTRA", true)
	start_button.pressed.connect(_enter_world)
	layout.add_child(start_button)

	var exit_button := _make_button("ESCI", false)
	exit_button.pressed.connect(get_tree().quit)
	layout.add_child(exit_button)

func _panel_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.88, 0.83, 0.73)
	style.border_color = Color(0.48, 0.35, 0.24)
	style.set_border_width_all(1)
	style.set_corner_radius_all(3)
	style.content_margin_left = 20
	style.content_margin_right = 20
	style.content_margin_top = 20
	style.content_margin_bottom = 20
	return style

func _make_button(caption: String, primary: bool) -> Button:
	var button := Button.new()
	button.text = caption
	button.custom_minimum_size = Vector2(0, 52)
	button.focus_mode = Control.FOCUS_ALL
	button.add_theme_font_size_override("font_size", 16)
	button.add_theme_color_override("font_color", Color(0.91, 0.86, 0.76) if primary else Color(0.31, 0.22, 0.15))
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color(0.31, 0.23, 0.16) if primary else Color(0.80, 0.74, 0.64)
	normal.border_color = Color(0.48, 0.35, 0.24)
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(2)
	var hover := normal.duplicate() as StyleBoxFlat
	hover.bg_color = Color(0.40, 0.29, 0.19) if primary else Color(0.85, 0.79, 0.69)
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("pressed", hover)
	return button

func _start_music() -> void:
	if not ResourceLoader.exists(MUSIC_PATH):
		return
	var track := load(MUSIC_PATH) as AudioStreamMP3
	if track == null:
		return
	track.loop = true
	music_player = AudioStreamPlayer.new()
	music_player.stream = track
	music_player.volume_db = linear_to_db(0.2)
	add_child(music_player)
	music_player.play()

func _enter_world() -> void:
	get_tree().change_scene_to_file(WORLD_SCENE)
