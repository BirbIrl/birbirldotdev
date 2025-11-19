/** @type {import('./victor.js')} */ //curse you, lsp's
const Vec = Victor

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

const worldspeed = 2
const mouseStrength = 1
const mouseRange = emToPixels(document.body, 5)
const defaultLineWidth = emToPixels(document.body, 0.2)
const startingOpacity = 0.5
var mousepos = new Vec(0, 0)
var mouseRegistered = false

class Point {
	constructor(context, pos, radius, lineWidth, color) {
		this.context = context
		this.pos = pos
		this.boundPos = pos.clone()
		this.radius = radius
		this.lineWidth = lineWidth
		this.color = color
		this.strength = 1
	}
	appendChild(node) {
		this.child = node
		node.parent = this
		node.boundDiffFromParent = node.boundPos.clone().subtract(this.boundPos)
		return node
	}
	newChild(context, pos, radius, defaultLineWidth, color) {
		var child = new Point(context, pos, radius, defaultLineWidth, color)
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
		var effectStrength = (this.strength * worldspeed * dt) / 2
		variation.x = variation.x * effectStrength
		variation.y = variation.y * effectStrength
		this.pos = this.pos.subtract(variation)
		this.parent.pos = this.parent.pos.add(variation)
	}
	simulate(dt) {
		this.simulateJoints(dt)
		this.simulateMousePush(dt)
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
		ctx.strokeStyle = addAlpha(this.color, startingOpacity + integrity * 1.5);
		ctx.stroke();
		ctx.restore()
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

const pointSize = emToPixels(document.body, 0.33)

const feather = document.createElement("canvas")
feather.classList.add("feather")
var ctx = feather.getContext("2d")

var point1 = new Point(ctx, new Vec(100, 100), pointSize, defaultLineWidth, "#FFFFFF")
var point2 = point1.newChild(ctx, new Vec(100, 200), pointSize, defaultLineWidth, "#FFFFFF")
var point3 = point2.newChild(ctx, new Vec(200, 200), pointSize, defaultLineWidth, "#FFFFFF")
var point4 = point3.newChild(ctx, new Vec(200, 100), pointSize, defaultLineWidth, "#FFFFFF")

point4.end()





drawCanvas = function() {
	feather.width = window.innerWidth;
	feather.height = window.innerHeight;
	point1.draw()
}

var elapsed
function doFrame(ms) {
	time = ms / 1000
	if (elapsed == null) {
		elapsed = 0
	}
	dt = time - elapsed
	dt = Math.min(dt, 1)
	elapsed = time

	point1.simulate(dt)
	drawCanvas()

	requestAnimationFrame(doFrame)
}

requestAnimationFrame(doFrame)

function updateMousePos(event) {
	console.log(event)
	mousepos.x = event.clientX ?? event.touches[0].clientX;
	mousepos.y = event.clientY ?? event.touches[0].clientY;
	mousepos.x = clamp(0, mousepos.x, feather.width)
	mousepos.y = clamp(0, mousepos.y, feather.height)
}

document.onmousemove = function(event) {
	mouseRegistered = true;
	updateMousePos(event);
};

document.ontouchstart = function(event) {
	mouseRegistered = true;
	updateMousePos(event);
};

document.ontouchmove = function(event) {
	updateMousePos(event);
};

document.ontouchend = function() {
	mouseRegistered = false;
};
document.onmouseout = function() {
	mouseRegistered = false;
}



document.body.appendChild(feather)
