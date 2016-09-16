const PIXI = require('pixi.js')
const fs = require('fs')

// Local modules
const Player = require('player')
const World = require('world')
const Tile = require('tile')
const DebugInfo = require('debug-info')
const Input = require('input')
const Editor = require('editor')
const Resources = require('resources')
const Script = require('script')

require('electron').webFrame.setZoomLevelLimits(1, 1)

let titlebarHeight = 22
let windowWidth = window.innerWidth
let windowHeight = window.innerHeight - titlebarHeight
let gameOffset = {x: 256, y: 0}

const renderer = PIXI.autoDetectRenderer(windowWidth, windowHeight)
document.body.appendChild(renderer.view)
const canvas = document.querySelector('canvas')

let gameLayers = [new PIXI.Container(), new PIXI.Container(), new PIXI.Container()]
let playerLayer = new PIXI.Container()
let scriptLayer = new PIXI.Container()
let debugLayer = new PIXI.Container()
let editorLayer = new PIXI.Container()

let world = undefined
let player = undefined

let currentTypeIndex = 0
let types = []

let dragging = {
	object: undefined,
	copy: false
}

Resources.load(__dirname + '/resources/', setup)

function setup () {
	DebugInfo.init(debugLayer, windowWidth, windowHeight)

	for (var i = 0; i < gameLayers.length; i++) {
		gameLayers[i].position.x = gameOffset.x
		gameLayers[i].position.y = gameOffset.y
	}

	playerLayer.position.x = gameOffset.x
	playerLayer.position.y = gameOffset.y

	scriptLayer.position.x = gameOffset.x
	scriptLayer.position.y = gameOffset.y


	Editor.init('editor', 'method-selection', 'script-editor', 'editor-save', 'editor-close', 'editor-remove')

	world = new World(gameLayers, 20, 15)

	setupScriptLayer(world.width, world.height, world.tileSize)

	player = new Player(5, 3, world)

	world.load('map', function (options) {
		if (options.player) {
			let x = options.player.x
			let y = options.player.y
			let direction = options.player.direction
			player.setPosition(x, y)
			player.setDirection(direction)
		}
		updateLayers()
	})

	types = Resources.getSpriteNames('atlas')
	DebugInfo.tile = types[0]

	let script = new Script(0, 0, 'action', 'console.log("Pepe is awesome")')
	script.run()

	animate()
}

function animate (time) {
	requestAnimationFrame(animate)

	player.update(time)

	handleInput(time)
	Input.update()

	let stage = new PIXI.Container()
	playerLayer.addChild(player.sprite)
	stage.addChild(gameLayers[0], gameLayers[1], playerLayer, gameLayers[2], scriptLayer, debugLayer, editorLayer)
	renderer.render(stage)
}

function setupScriptLayer(width, height, step) {
	for (let x = 0; x < width * step; x += step) {
		let line = new PIXI.Graphics().lineStyle(1, 0xFFFFFF)
		
		let x1 = x
		let y1 = 0

		let x2 = x
		let y2 = height * step

		line.moveTo(x1, y1)
		line.lineTo(x2, y2)
		scriptLayer.addChild(line)
	}

	let line = new PIXI.Graphics().lineStyle(1, 0xFFFFFF)
	line.moveTo(width * step, 0)
	line.lineTo(width * step, height * step)
	scriptLayer.addChild(line)

	for (let y = 0; y < height * step; y += step) {
		let line = new PIXI.Graphics().lineStyle(1, 0xFFFFFF)

		let x1 = 0
		let y1 = y

		let x2 = width * step
		let y2 = y

		line.moveTo(x1, y1)
		line.lineTo(x2, y2)
		scriptLayer.addChild(line)
	}

	let line2 = new PIXI.Graphics().lineStyle(1, 0xFFFFFF)
	line2.moveTo(0, height * step)
	line2.lineTo(width * step, height * step)
	scriptLayer.addChild(line2)
}

function updateLayers() {
	if (DebugInfo.mode === 'edit') {
		scriptLayer.visible = true
	} else {
		scriptLayer.visible = false
	}

	for (let i = 0; i < gameLayers.length; i++) {
		if (DebugInfo.mode === 'paint' && DebugInfo.layer < 3) {
			gameLayers[i].alpha = .3
			gameLayers[DebugInfo.layer].alpha = 1
		} else {
			gameLayers[i].alpha = 1
		}
	}

	// for (let i = 0; i < world.tiles.length; i++) {
	// 	let tile = world.tiles[i]
	// 	if (DebugInfo.mode === 'edit') {
	// 		if (tile.options && tile.options.method) {
	// 			tile.sprite.tint = '0xFF0000'
	// 		} else {
	// 			tile.sprite.tint = '0xFFFFFF'
	// 		}
	// 	} else {
	// 		tile.sprite.tint = '0xFFFFFF'
	// 	}
	// }
}

function handleInput (time) {
	if (Editor.isOpem) return

	if (Input.isKeyDown('KeyE') && Input.isKeyPressed('AltLeft')) {
		if (DebugInfo.mode === 'play') {
			DebugInfo.mode = (DebugInfo.layer === 3 ? 'edit' : 'paint')
		} else {
			DebugInfo.mode = 'play'
		}
		DebugInfo.update()
		updateLayers()
	}

	if (DebugInfo.mode !== 'playing') {
		if (Input.isKeyDown('KeyZ')) {
			currentTypeIndex --
			if (currentTypeIndex < 0) currentTypeIndex = types.length -1
			DebugInfo.tile = types[currentTypeIndex]
			DebugInfo.update()
		}

		if (Input.isKeyDown('KeyX')) {
			currentTypeIndex ++
			currentTypeIndex %= types.length
			DebugInfo.tile = types[currentTypeIndex]
			DebugInfo.update()
		}

		if (Input.isKeyDown('KeyP')) {
			DebugInfo.walkable = !DebugInfo.walkable
			DebugInfo.update()
		}

		for (let i = 0; i < 3; i++) {
			if (Input.isKeyDown('Digit' + (i + 1))) {
				DebugInfo.layer = i
				DebugInfo.mode = 'paint'
				DebugInfo.update()
				updateLayers()
			}
		}

		if (Input.isKeyDown('Digit4')) {
			DebugInfo.layer = 3
			DebugInfo.mode = 'edit'
			DebugInfo.update()
			updateLayers()
		}
	}

	if (Input.isKeyPressed('ArrowDown'	)) player.move( 0,  1)
	if (Input.isKeyPressed('ArrowUp'	)) player.move( 0, -1)
	if (Input.isKeyPressed('ArrowLeft'	)) player.move(-1,  0)
	if (Input.isKeyPressed('ArrowRight'	)) player.move( 1,  0)

	if (Input.isKeyDown('KeyW') && !Input.isKeyPressed('AltLeft')) player.setDirection('up')
	if (Input.isKeyDown('KeyS') && !Input.isKeyPressed('AltLeft')) player.setDirection('down')
	if (Input.isKeyDown('KeyA') && !Input.isKeyPressed('AltLeft')) player.setDirection('left')
	if (Input.isKeyDown('KeyD') && !Input.isKeyPressed('AltLeft')) player.setDirection('right')

	if (Input.isKeyDown('Space')) {
		let x = player.getFacingPosition().x
		let y = player.getFacingPosition().y
		let script = world.getScript(x, y)
		if (script && script.method === 'action') {
			script.run()
		}
	}

	if (Input.isKeyDown('KeyR') && Input.isKeyPressed('AltLeft')) {
		world.load('map', function (options) {
			if (options.player) {
				let x = options.player.x
				let y = options.player.y
				let direction = options.player.direction
				player.setPosition(x, y)
				player.setDirection(direction)
			}
			updateLayers()
		})
	}

	if (Input.isKeyDown('KeyS') && Input.isKeyPressed('AltLeft')) {
		let options = {
			player: {
				x: player.getPosition().x,
				y: player.getPosition().y,
				direction: player.getDirection()
			}
		}

		world.save('map', options, function() {
			console.log('Map was sucessfully saved')
		})
	}
}

canvas.ondblclick = function (event) {
	let mouseX = event.layerX
	let mouseY = event.layerY

	mouseX = Math.floor((mouseX - gameOffset.x) / world.tileSize)
	mouseY = Math.floor((mouseY - gameOffset.y) / world.tileSize)

	if (DebugInfo.mode === 'edit') {
		let newScript = false
		let script = world.getScript(mouseX, mouseY)
		if (!script) {
			script = world.createScript(mouseX, mouseY, 'touch', '')
			script.addToStage(scriptLayer)
			newScript = true
		}

		Editor.open(script.method, script.body, function (state, method, body) {
			if (state === 'save') {
				script.method = method
				script.body = body
				script.compile()
			}

			if ((state === 'cancel' && script.body.length === 0 && newScript) || state === 'remove') {
				world.removeScript(mouseX, mouseY)
			}

			updateLayers()
		})
	}
}

function buildTile (event) {
	let mouseX = event.layerX
	let mouseY = event.layerY

	mouseX = Math.floor((mouseX - gameOffset.x) / world.tileSize)
	mouseY = Math.floor((mouseY - gameOffset.y) / world.tileSize)

	world.createTile(mouseX, mouseY, DebugInfo.tile, {layer: DebugInfo.layer, walkable: DebugInfo.walkable, source: 'atlas.json'})
}

function removeTile (event) {
	let mouseX = event.layerX
	let mouseY = event.layerY

	mouseX = Math.floor((mouseX - gameOffset.x) / world.tileSize)
	mouseY = Math.floor((mouseY - gameOffset.y) / world.tileSize)

	world.removeTile(mouseX, mouseY, DebugInfo.layer)
}

canvas.onmousedown = function (event) {
	if (DebugInfo.mode === 'paint') {
		if (event.button === 0) {
			removeTile(event)
		}

		if (event.button === 2) {
			buildTile(event)
		}
	}
}

canvas.onmousemove = function (event) {
	if (event.buttons > 0) {
		if (DebugInfo.mode === 'paint') {
			if (event.button === 0) {
				removeTile(event)
			}

			if (event.button === 2) {
				buildTile(event)
			}
		}
	}
}

window.onresize = function () {
	windowWidth = window.innerWidth
	windowHeight = window.innerHeight

	if (window.innerHeight === screen.height) {
		document.querySelector('.titlebar').style.display = 'none'
		document.querySelector('#editor').style.top = '0'
	} else {
		document.querySelector('.titlebar').style.display = 'block'
		windowHeight -= titlebarHeight
		document.querySelector('#editor').style.top = titlebarHeight + 'px'
	}

	renderer.view.style.width = windowWidth + 'px'
	renderer.view.style.height = windowHeight + 'px'
	renderer.resize(windowWidth, windowHeight)

	DebugInfo.relocate()
}

window.onresize()
