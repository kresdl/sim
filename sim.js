'use strict';

// **stdin**
// Grid width (UInt16LE), 
// Grid height (UInt16LE), 
// Start X (UInt16LE), 
// Start Y (UInt16LE), 
// ...commands

// **stdout**
// X (Int16LE)
// Y (Int16LE)

// Commands (UInt8):
// 1: 1 step forward
// 2: 1 step Back
// 3: Turn right
// 4: Turn left
// 0: End

// If borders were crossed X=-1 and Y=-1 are returned.

const stream = require('stream'),
	{ Transform } = stream,
	pipeline = require('util')
		.promisify(stream.pipeline);

class Parse extends Transform {
	constructor() {
		super({ readableObjectMode : true });
	}

	_transform(buf, enc, cb) {
		const { length } = buf,
			headerSize = 4 << 1;
	
		if (length <= headerSize || buf.readUInt8(length - 1))
			return cb(Error('Invalid input format'));

		const [width, height, x, y] = [...Array(4)]
			.map((e, i) => buf.readUInt16LE(i << 1)),

			commands = [...Array(length - headerSize - 1)]
				.map((e, i) => buf.readUInt8(headerSize + i));
		
		cb(null, { width, height, x, y, commands });
	}
}

class Simulate extends Transform {
	constructor() {
		super({ 
			readableObjectMode : true,
			writableObjectMode : true
		});
	}

	_transform({ width, height, x, y, commands }, enc, cb) {
		const fail = [-1, -1];

		try {
			const sim = new Sim(width, height, x, y, 0);

			cb(null,
				x < width 
				&& y < height 
				&& x >= 0 
				&& y >= 0
				&& commands.every(sim.op.bind(sim))
				? [sim.x, sim.y]
				: fail
			);
		} catch (e) {
			cb(null, fail);
		}
	}		
}

class Serialize extends Transform {
	constructor() {
		super({ writableObjectMode: true });
	}

	_transform([x, y], enc, cb) {
		const buf = Buffer.alloc(4);
		buf.writeInt16LE(x);
		buf.writeInt16LE(y, 2);
		cb(null, buf);	
	}		
}

class Sim {
	constructor(width, height, x, y, orientation) {
		Object.assign(this, {
			width, height, x, y, orientation
		});

		if (!this.test()) {
			throw Error('Invalid position');
		}
	}

	op(com) { 
		const alt = [
			() => this.move(1),
			() => this.move(-1),
			() => this.turn(1),
			() => this.turn(-1)
		];
		
		return alt[com - 1]();
	}

	test() {
		const { x, y } = this;
		return x >= 0 
			&& x < this.width 
			&& y >= 0 
			&& y < this.height;
	}

	move(dir) {
		const vmat = [[0, -1], [1, 0], [0, 1], [-1, 0]],
			[xdir, ydir] = vmat[this.orientation];

		this.x += dir * xdir;
		this.y += dir * ydir;
		return this.test();
	}

	turn(dir) {
		const t = this.orientation + dir;
		this.orientation = t < 0 ? 3 : t % 4;
		return true;
	}
}

const { stdin, stdout, stderr } = process,
	parse = new Parse(),
	simulate = new Simulate(),
	serialize = new Serialize();

pipeline(stdin, parse, simulate, serialize, stdout)
	.catch(e => stderr.write(e.stack));
	