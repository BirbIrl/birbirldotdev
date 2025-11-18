/** @type {import('./victor.js')} */ //curse you, lsp's
const Vec = Victor
const worldspeed = 2

function emToPixels(element, em) {
	const elementFontSize = parseFloat(getComputedStyle(element).fontSize);
	return em * elementFontSize;
}
function addAlpha(color, opacity) {
	// coerce values so it is between 0 and 1.
	var _opacity = Math.round(Math.min(Math.max(opacity ?? 1, 0), 1) * 255);
	return color + _opacity.toString(16).toUpperCase();
}

class Point {
	constructor(context, pos, radius, color) {
		this.context = context
		this.pos = pos
		this.boundPos = pos.clone()
		this.radius = radius
		this.color = color
		this.strength = 1
	}
	appendChild(node) {
		this.child = node
		node.parent = this
		node.boundDiffFromParent = node.boundPos.clone().subtract(this.boundPos)
		return node
	}
	newChild(context, pos, radius, color) {
		var child = new Point(context, pos, radius, color)
		return this.appendChild(child)
	}
	getIntegrity() {
		var targetLength = this.child.boundDiffFromParent.length()
		var currentLength = this.pos.clone().subtract(this.child.pos).length()
		return (targetLength / currentLength) * this.strength
	}
	simulateJoints(dt) {
		//console.log(this.pos)
		//this.pos = this.pos.clone().add(this.boundDiffFromParent.clone().multiply(new Vec(this.getIntegrity(), this.getIntegrity())))
		//console.log(this.pos)
		var currDiffFromParent = this.pos.clone().subtract(this.parent.pos)
		var variation = currDiffFromParent.clone().subtract(this.boundDiffFromParent)
		variation.x = variation.x * (this.strength * worldspeed * dt / 1000)
		variation.y = variation.y * (this.strength * worldspeed * dt / 1000)
		console.log(this.pos)
		this.pos = this.pos.subtract(variation)
		console.log(this.pos)
	}
	simulate(dt) {
		this.simulateJoints(dt)
		if (this.end) {
			return true
		}
		this.child.simulate(dt)
	}
	drawLine() {
		var ctx = this.context
		ctx.save();
		ctx.beginPath();
		ctx.lineWidth = 2;
		ctx.moveTo(this.pos.x, this.pos.y)
		ctx.lineTo(this.child.pos.x, this.child.pos.y)
		var strength = this.getIntegrity()
		console.log(strength)
		ctx.strokeStyle = addAlpha(this.color, strength);
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

var point1 = new Point(ctx, new Vec(10, 10), pointSize, "#FFFFFF")
var point2 = point1.newChild(ctx, new Vec(10, 100), pointSize, "#FFFFFF")
var point3 = point2.newChild(ctx, new Vec(100, 100), pointSize, "#FFFFFF")
var point4 = point3.newChild(ctx, new Vec(100, 10), pointSize, "#FFFFFF")

point4.end()





drawCanvas = function() {
	feather.width = window.innerWidth;
	feather.height = window.innerHeight;
	point1.draw()
}

var elapsed
function doFrame(time) {
	if (elapsed == null) {
		elapsed = 0
	}
	dt = time - elapsed
	elapsed = time
	drawCanvas()

	point1.simulate(dt)
	console.log(dt)

	requestAnimationFrame(doFrame)
}

requestAnimationFrame(doFrame)

/*
window.onresize = drawCanvas;
*/
document.onmousemove = function(event) {
	var mousepos = new Vec(event.x, event.y)
	point1.pos = mousepos
}


document.body.appendChild(feather)
