/** @type {import('./victor.js')} */ //curse you, lsp's
const Vec = Victor

//TODO: garbage collect feathers
//TODO: take dpi into account

function emToPixels(element, em) {
	const elementFontSize = parseFloat(getComputedStyle(element).fontSize);
	return em * elementFontSize;
}
function addAlpha(color, opacity) {
	var _opacity = Math.round(Math.min(Math.max(opacity ?? 1, 0), 1) * 255);
	return color + _opacity.toString(16).toUpperCase().padStart(2, '0');
}
function lerp(a, b, t) {
	return a + (b - a) * t;
}
function clamp(min, target, max) {
	return Math.min(Math.max(target, min), max);
};

const worldspeed = 1
const gravity = 10
const mouseStrength = 1
const mouseRange = emToPixels(document.body, 5)
const defaultLineWidth = emToPixels(document.body, 0.2)
const startingOpacity = 0.5
var mousepos = new Vec(0, 0)
const vec50 = new Vec(50, 50)
var mouseRegistered = false
var trackedObjects = []
var featherScale = 4

class Point {
	constructor(context, pos, radius, lineWidth, color, gravityBoost) {
		this.context = context
		this.pos = pos
		this.boundPos = pos.clone()
		this.radius = radius
		this.lineWidth = lineWidth
		this.color = color
		this.strength = 1.125 - Math.random() / 4
		this.weight = gravityBoost
	}
	appendChild(node) {
		this.child = node
		node.parent = this
		node.boundDiffFromParent = node.boundPos.clone().subtract(this.boundPos)
		return node
	}
	newChild(context, pos, radius, defaultLineWidth, color, gravityBoost) {
		var child = new Point(context, pos, radius, defaultLineWidth, color, gravityBoost)
		return this.appendChild(child)
	}
	getIntegrity() {
		var targetLength = this.child.boundDiffFromParent.length()
		var currentLength = this.pos.clone().subtract(this.child.pos).length()
		return (targetLength / currentLength) * this.strength
	}
	simulateMousePush(dt) {
		if (!mouseRegistered) {
			return false
		}
		var effectStrength = (mouseStrength / this.strength) * dt
		var variation = this.pos.clone().subtract(mousepos)
		effectStrength = lerp(0, effectStrength, Math.max(mouseRange - variation.length(), 0))
		var direction = variation.clone().norm()
		direction.x = direction.x * effectStrength // as a lua developer i refuse to use *=
		direction.y = direction.y * effectStrength
		this.pos.add(direction)
	}
	simulateJoints(dt) {
		var currDiffFromParent = this.pos.clone().subtract(this.parent.pos)
		var variation = currDiffFromParent.clone().subtract(this.boundDiffFromParent)
		var effectStrength = (this.strength * dt) * 4
		variation.x = variation.x * effectStrength
		variation.y = variation.y * effectStrength
		this.pos = this.pos.subtract(variation)
		this.parent.pos = this.parent.pos.add(variation)
	}
	simulateGravity(dt) {
		this.pos.y += gravity * this.weight * dt
	}
	simulateJustGravity(dt) {
		this.simulateGravity(dt)
		if (this.last) {
			return true
		}
		this.child.simulateJustGravity(dt)
	}
	simulate(dt) {
		this.simulateJoints(dt)
		this.simulateMousePush(dt)
		this.simulateGravity(dt)
		if (this.last) {
			return true
		}
		this.child.simulate(dt)
	}
	drawLine() {
		var ctx = this.context
		ctx.save();
		ctx.beginPath();
		ctx.lineWidth = this.lineWidth;
		ctx.moveTo(this.pos.x, this.pos.y)
		ctx.lineTo(this.child.pos.x, this.child.pos.y)
		var integrity = this.getIntegrity() - 1
		ctx.strokeStyle = addAlpha(this.color, Math.max(startingOpacity + integrity, 0.1));
		ctx.stroke();
		ctx.restore()
	}
	moveAll(vec) {
		this.pos.add(vec)
		if (this.last) {
			return true
		}
		this.child.moveAll(vec)


	}
	drawPoint() {
		var ctx = this.context
		ctx.save();
		ctx.beginPath();
		ctx.lineWidth = 0;
		ctx.arc(this.pos.x, this.pos.y, this.radius, 0, 2 * Math.PI);
		ctx.fillStyle = this.color;
		ctx.fill();
		ctx.stroke();
		ctx.restore()

	}
	getLowestPoint(lowestPoint) {
		lowestPoint = lowestPoint ?? this.pos.y
		var thisPoint = this.pos.y
		if (thisPoint < lowestPoint) {
			lowestPoint = thisPoint
		}
		if (this.last) {
			return lowestPoint
		}
		lowestPoint = this.child.getLowestPoint(lowestPoint)
		return lowestPoint
	}
	end() {
		var node = this
		while (node.parent) {
			node = node.parent
		}
		this.appendChild(node)
		this.last = true
	}
	draw() {
		this.drawPoint()
		if (this.child instanceof Point) {
			this.drawLine()
			if (this.last) {
				return true
			}
			this.child.draw();
		} else {
			throw ("Chain of points must be closed")
		}
	}
}

function parsePointJson(jsonData, context, startingPos, scale, rotation, pointSize, lineWidth, color, gravityBoost) {
	var startingPoint
	const pointCount = Object.keys(jsonData).length
	var previousPoint
	for (const index in jsonData) {
		var pointPos = new Vec(jsonData[index].x, jsonData[index].y)
		pointPos.subtract(vec50)
		pointPos.rotate(rotation * (Math.PI / 180))
		pointPos.x = pointPos.x * scale
		pointPos.y = pointPos.y * scale
		pointPos.add(startingPos)
		newPoint = new Point(context, pointPos, pointSize, lineWidth, color, gravityBoost)
		if (previousPoint == null) {
			startingPoint = newPoint
		}
		else {
			previousPoint.appendChild(newPoint)
			if (index == pointCount - 1) {
				newPoint.end()
			}
		}
		previousPoint = newPoint
	}
	trackedObjects.push(startingPoint)
	return startingPoint
}

async function loadPointJson(jsonPath) {
	try {
		const response = await fetch(jsonPath);
		const data = await response.json();
		return data;
	} catch (err) {
		console.log('error: ' + err);
	}
}
var featherDatas = JSON.parse // woe, curse be upon ye
	(`[
[{"x": 43.176688, "y": 81.784835},{"x": 43.466599, "y": 64.615385},{"x": 45.910931, "y": 51.968622},{"x": 49.949393, "y": 37.621458},{"x": 53.243926, "y": 29.863359},{"x": 45.48583, "y": 39.109311},{"x": 42.403847, "y": 46.761132},{"x": 40.384616, "y": 58.876517},{"x": 40.597166, "y": 70.035424},{"x": 41.978744, "y": 84.488866},{"x": 31.457489, "y": 76.199393},{"x": 25.399797, "y": 63.977731},{"x": 25.718623, "y": 54.731782},{"x": 31.988865, "y": 65.890687},{"x": 31.88259, "y": 57.70749},{"x": 29.013158, "y": 47.823887},{"x": 31.032389, "y": 29.119433},{"x": 34.539473, "y": 20.829959},{"x": 39.640687, "y": 16.791498},{"x": 35.283401, "y": 31.988865},{"x": 41.766193, "y": 22.211538},{"x": 58.876517, "y": 10.202429},{"x": 65.996962, "y": 2.7631578},{"x": 70.247975, "y": 14.559716},{"x": 70.460525, "y": 28.269231},{"x": 66.422063, "y": 39.959515},{"x": 56.857288, "y": 51.11842},{"x": 64.402834, "y": 48.248987},{"x": 56.751011, "y": 62.277326},{"x": 47.721777, "y": 74.50879},{"x": 45.401482, "y": 84.613389},{"x": 45.901165, "y": 97.88344}],
[{"x": 13.343828, "y": 25.406654},{"x": 18.310737, "y": 45.362337},{"x": 26.206688, "y": 55.940798},{"x": 38.890846, "y": 65.220189},{"x": 28.937425, "y": 53.961496},{"x": 18.984079, "y": 38.899018},{"x": 30.706951, "y": 42.548594},{"x": 37.342542, "y": 54.271466},{"x": 48.512448, "y": 61.128242},{"x": 53.489139, "y": 56.593922},{"x": 56.735476, "y": 62.904542},{"x": 55.811597, "y": 52.170196},{"x": 62.004812, "y": 58.5846},{"x": 57.581087, "y": 47.304098},{"x": 60.898881, "y": 38.567239},{"x": 67.86625, "y": 31.046905},{"x": 82.796322, "y": 29.830382},{"x": 89.431917, "y": 44.760453},{"x": 88.215389, "y": 54.382058},{"x": 78.593787, "y": 59.248159},{"x": 85.892935, "y": 58.252819},{"x": 78.48319, "y": 69.20154},{"x": 59.239986, "y": 78.048991},{"x": 69.082772, "y": 67.542643},{"x": 77.487855, "y": 46.751131},{"x": 64.32727, "y": 69.20154},{"x": 50.945497, "y": 79.597296},{"x": 42.304194, "y": 79.086868},{"x": 44.48264, "y": 72.720891},{"x": 37.231948, "y": 79.376109},{"x": 26.615007, "y": 75.284165},{"x": 23.518396, "y": 64.003663},{"x": 23.076023, "y": 72.408741},{"x": 14.670945, "y": 62.344765},{"x": 15.555691, "y": 49.405368},{"x": 12.01671, "y": 57.368074},{"x": 14.11798, "y": 40.33673},{"x": 10.468406, "y": 28.503262}],
[{"x": 37.724289, "y": 82.963376},{"x": 48.846192, "y": 74.546803},{"x": 44.187017, "y": 67.783484},{"x": 50.048559, "y": 68.234371},{"x": 46.591751, "y": 62.222533},{"x": 49.146782, "y": 53.505367},{"x": 53.35507, "y": 55.910101},{"x": 48.094712, "y": 48.545599},{"x": 38.926656, "y": 41.78228},{"x": 44.238589, "y": 38.553128},{"x": 34.267481, "y": 40.429616},{"x": 23.295876, "y": 37.573993},{"x": 13.226046, "y": 40.129025},{"x": 16.983445, "y": 29.307716},{"x": 28.706532, "y": 20.590548},{"x": 38.325472, "y": 18.636701},{"x": 44.487607, "y": 23.746764},{"x": 43.28524, "y": 19.538476},{"x": 53.655663, "y": 22.544396},{"x": 63.124309, "y": 28.255642},{"x": 70.639108, "y": 34.868664},{"x": 69.587035, "y": 41.78228},{"x": 72.292363, "y": 38.475769},{"x": 75.298283, "y": 50.499446},{"x": 70.037922, "y": 57.713654},{"x": 75.74917, "y": 55.459214},{"x": 74.24621, "y": 67.783484},{"x": 67.032004, "y": 70.639108},{"x": 70.939699, "y": 72.893546},{"x": 64.476973, "y": 77.703018},{"x": 55.008327, "y": 76.200057},{"x": 61.170462, "y": 58.014245},{"x": 57.563358, "y": 41.78228},{"x": 44.718394, "y": 30.605675},{"x": 26.143947, "y": 30.356657},{"x": 43.842402, "y": 32.966392},{"x": 54.85803, "y": 43.134944},{"x": 57.713654, "y": 59.817798},{"x": 51.401223, "y": 75.448577},{"x": 38.475769, "y": 86.57048}],
[{"x": 18.491902, "y": 90.759107},{"x": 25.080971, "y": 74.817813},{"x": 20.829959, "y": 67.378542},{"x": 22.742914, "y": 56.75101},{"x": 26.993926, "y": 62.064777},{"x": 26.568825, "y": 47.823886},{"x": 35.921052, "y": 34.858298},{"x": 37.408907, "y": 48.674088},{"x": 42.510121, "y": 29.119432},{"x": 56.113358, "y": 18.917004},{"x": 52.287449, "y": 28.694332},{"x": 65.890686, "y": 14.453441},{"x": 78.643724, "y": 11.477732},{"x": 84.80769, "y": 12.540486},{"x": 86.295546, "y": 21.892712},{"x": 75.668014, "y": 39.534411},{"x": 54.200405, "y": 55.475708},{"x": 60.364371, "y": 56.75101},{"x": 43.997974, "y": 67.591092},{"x": 48.886638, "y": 68.441294},{"x": 37.196357, "y": 77.36842},{"x": 29.119432, "y": 77.155869},{"x": 36.346152, "y": 60.576922},{"x": 56.113358, "y": 36.558703},{"x": 72.479755, "y": 22.317813},{"x": 53.350201, "y": 36.558703},{"x": 35.07085, "y": 58.663966}],
[{"x": 10.220126, "y": 79.205978},{"x": 14.578709, "y": 67.182301},{"x": 29.758603, "y": 50.349152},{"x": 47.493528, "y": 42.684056},{"x": 72.674739, "y": 40.844037},{"x": 47.042638, "y": 39.227249},{"x": 29.458009, "y": 47.042638},{"x": 18.185813, "y": 59.366909},{"x": 18.937293, "y": 48.545599},{"x": 26.301795, "y": 38.475769},{"x": 27.203572, "y": 43.435537},{"x": 31.562153, "y": 34.868664},{"x": 53.805957, "y": 24.197652},{"x": 49.898262, "y": 30.660379},{"x": 61.471053, "y": 24.798835},{"x": 76.049763, "y": 29.608306},{"x": 88.374031, "y": 41.78228},{"x": 80.101496, "y": 40.605699},{"x": 88.092971, "y": 57.655823},{"x": 67.933779, "y": 52.302998},{"x": 75.298281, "y": 57.863949},{"x": 60.332772, "y": 58.641217},{"x": 43.886424, "y": 53.505367},{"x": 42.984647, "y": 60.869869},{"x": 33.065114, "y": 55.008327},{"x": 32.313634, "y": 63.274603},{"x": 26.151499, "y": 61.320756},{"x": 18.336109, "y": 67.933781},{"x": 14.127821, "y": 77.552721}],
[{"x": 24.549595, "y": 95.541496},{"x": 47.079958, "y": 55.369433},{"x": 66.528338, "y": 30.075909},{"x": 51.756071, "y": 45.910931},{"x": 31.457489, "y": 76.19939},{"x": 29.863359, "y": 62.277325},{"x": 33.26417, "y": 66.528338},{"x": 34.433198, "y": 56.857286},{"x": 39.446796, "y": 49.367721},{"x": 53.881578, "y": 35.602225},{"x": 65.465585, "y": 19.44838},{"x": 71.108472, "y": 17.291064},{"x": 68.027329, "y": 15.376964},{"x": 71.585531, "y": 8.1102623},{"x": 72.801711, "y": 3.800124},{"x": 77.623208, "y": 12.225916},{"x": 80.245407, "y": 21.511631},{"x": 81.088054, "y": 35.177124},{"x": 79.615714, "y": 43.052226},{"x": 74.866606, "y": 41.335235},{"x": 78.537447, "y": 47.930162},{"x": 70.247975, "y": 57.601214},{"x": 58.876517, "y": 62.596153},{"x": 68.866395, "y": 62.914979},{"x": 59.939271, "y": 72.479756},{"x": 50.693319, "y": 75.455464},{"x": 54.625504, "y": 77.474695},{"x": 48.461538, "y": 81.300605},{"x": 35.389674, "y": 80.131578},{"x": 29.650809, "y": 93.734815}]
]`)

/*
async function loadFeatherData() {
	featherDatas = [
		await loadPointJson("./assets/feather1.json"),
		await loadPointJson("./assets/feather2.json"),
		await loadPointJson("./assets/feather3.json"),
		await loadPointJson("./assets/feather4.json"),
		await loadPointJson("./assets/feather5.json"),
		await loadPointJson("./assets/feather6.json")
	];

}

*/



var featherLastPosThird = Math.floor(Math.random() * 3)

var featherQueue = []
function getFeatherData() {
	let target;
	do {
		target = Math.floor(Math.random() * featherDatas.length);
	} while (featherQueue.includes(target));
	if (featherQueue.length >= 4) {
		featherQueue.pop(0)
	}
	featherQueue.push(target)
	featherLastPosThird = (featherLastPosThird + 1) % 3
	return featherDatas[target]
}



const pointSize = emToPixels(document.body, 0.33)


const feather = document.createElement("canvas")
feather.classList.add("feather")
var ctx = feather.getContext("2d")


//loadPointJson("./assets/square.json", ctx, new Vec(100, 100), 1,0, pointSize, defaultLineWidth + 1, "#FFFFFF")
//loadPointJson("./assets/octagon.json", ctx, new Vec(500, 100), 1,0, pointSize, defaultLineWidth + 1, "#FFFFFF")
//loadPointJson("./assets/circle.json", ctx, new Vec(200, 500), 1,0, pointSize, defaultLineWidth + 1, "#FFFFFF")
//loadPointJson("./assets/feather1.json", ctx, new Vec(200, 300), 4, 0, pointSize, defaultLineWidth + 1, "#FFFFFF", 0)
//loadPointJson("./assets/feather2.json", ctx, new Vec(1000, 0), 4, 20, pointSize, defaultLineWidth + 1, "#FFFFFF", 1)
//loadPointJson("./assets/feather3.json", ctx, new Vec(500, 500), 4, 20, pointSize, defaultLineWidth + 1, "#FFFFFF", 0)
//loadPointJson("./assets/feather4.json", ctx, new Vec(800, 300), 4, 20, pointSize, defaultLineWidth + 1, "#FFFFFF", 0)
//loadPointJson("./assets/feather5.json", ctx, new Vec(1100, 500), 4, 20, pointSize, defaultLineWidth + 1, "#FFFFFF", 0)
//loadPointJson("./assets/feather6.json", ctx, new Vec(1400, 300), 4, 20, pointSize, defaultLineWidth + 1, "#FFFFFF", 0)
//
function spawnFeather() {
	if (!featherDatas[1]) {
		return false
	}
	var width = window.innerWidth
	var margin = width * 1 / 20
	var third = (width - (2 * margin)) / 3
	var x = (Math.random() * third) + (third * (featherLastPosThird)) + margin
	var point = parsePointJson(getFeatherData(), ctx, new Vec(x, 0), featherScale, Math.random() * 360, pointSize, defaultLineWidth, "#FFFFFF", 1)
	point.moveAll(new Vec(0, point.getLowestPoint() * 1.2)) // don't look at this too much, i'm too lazy to remove my recvursive algorithm, so i'm just stealing ur cpu
	return point
}


feather.width = window.innerWidth;
feather.height = window.innerHeight;

drawCanvas = function() {

	feather.width = window.innerWidth;
	feather.height = window.innerHeight;
	for (const point of trackedObjects) {
		point.draw()
	}
}

var featherSpawnTime
var featherDensity = 0.005
function setFeatherSpawnTime() {
	featherSpawnTime = (100 / feather.height) / featherDensity;
	if (feather.width > feather.height) {
		featherSpawnTime /= 2 // this sucks 
	}
}
setFeatherSpawnTime()
console.log(featherSpawnTime)
var elapsed
var onScreenTime = 0
var lastSpawnTime = 0
function doFrame(ms) {
	time = ms / 1000
	if (elapsed == null) {
		elapsed = 0
	}
	dt = (time - elapsed) * worldspeed
	dt = Math.min(dt, 0.1)
	onScreenTime += dt
	var dt_display = document.getElementById("dt-display");
	if (dt_display)
		dt_display.textContent = "Delte time: " + dt;
	elapsed = time

	if (featherDatas && onScreenTime > lastSpawnTime + featherSpawnTime) {
		spawnFeather()
		lastSpawnTime = onScreenTime
	}

	for (const point of trackedObjects) {
		point.simulate(dt)
		console.log(point.pos.y)
	}
	trackedObjects = trackedObjects.filter(point => point.pos.y <= feather.height + 100 * featherScale);
	// aa what am i even doing
	drawCanvas()

	requestAnimationFrame(doFrame)
}

requestAnimationFrame(doFrame)

function updateMousePos(event) {
	mousepos.x = event.clientX ?? event.touches[0].clientX;
	mousepos.y = event.clientY ?? event.touches[0].clientY;
	mousepos.x = clamp(0, mousepos.x, feather.width)
	mousepos.y = clamp(0, mousepos.y, feather.height)
}


document.ontouchstart = function(event) {
	mouseRegistered = true;
	updateMousePos(event);
};

document.onmouseover = function() {
	mouseRegistered = true;
}

document.ontouchmove = function(event) {
	updateMousePos(event);
};

document.onmousemove = function(event) {
	updateMousePos(event);
};

document.ontouchend = function() {
	mouseRegistered = false;
};
document.onmouseout = function() {
	mouseRegistered = false;
}

window.onresize = function() {
	setFeatherSpawnTime()
}


document.body.appendChild(feather)

let i = 1;

while (true) {
	let timeoffset = featherSpawnTime * i;
	spawnFeather().simulateJustGravity(timeoffset);
	if (timeoffset > feather.height / gravity) {
		break;
	}
	i++;
}
