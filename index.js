'use strict';

// Grid navigation simulatation

const { stdout } = process,
	{ fork } = require('child_process'),
	{ readFileSync } = require('fs'),
	src = process.argv[2],
	sim = fork('./sim.js', { 
		stdio: ['pipe', 'pipe', 2, 'ipc'] 
	}),

	user = readFileSync(src, { encoding: 'utf8' })
		.trim()
		.split(/\s+/)
		.map(Number),

	buf = Buffer.alloc(user.length + 4);
	
for (let i = 0; i < 4; i++) {
	buf.writeUInt16LE(user[i], 2 * i);
}

buf.writeUInt8(user[4], 8);

for (let i = 0; i < user.length - 5; i++) {
	buf.writeUInt8(user[i + 5], i + 9);
}

sim.stdout.on('data', xy => {
	const x = xy.readInt16LE(),
		y = xy.readInt16LE(2);
	stdout.write(`x: ${x}\ny: ${y}\n`);
	process.exit();
});

sim.stdin.write(buf);