'use strict';

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
	
	header = user.slice(0, 4),
	commands = user.slice(4),

	data = Buffer.concat([
		header.reduce((buf, e, i) => {
			buf.writeUInt16LE(e, i << 1);
			return buf;
		}, Buffer.alloc(8)),

		commands.reduce((buf, e, i) => {
			buf.writeUInt8(e, i);
			return buf;
		}, Buffer.alloc(commands.length))
	]);

sim.stdout.on('data', xy => {
	const x = xy.readInt16LE(),
		y = xy.readInt16LE(2);
	stdout.write(`x: ${x}\ny: ${y}`);
	process.exit();
});

sim.stdin.write(data);