extends Node3D

const CityScript = preload("res://scripts/city.gd")
const PlayerScript = preload("res://scripts/player.gd")

func _ready() -> void:
    var city := Node3D.new()
    city.name = "TreFiumi_City"
    city.set_script(CityScript)
    add_child(city)

    var player := CharacterBody3D.new()
    player.name = "Player"
    player.set_script(PlayerScript)
    add_child(player)
    player.global_position = Vector3(0.0, 0.2, 18.0)

    var music := AudioStreamPlayer.new()
    music.name = "WorldMusic"
    music.stream = load("res://assets/audio/music/main-theme.mp3")
    music.volume_db = linear_to_db(0.20)
    music.autoplay = false
    add_child(music)
    music.play()
