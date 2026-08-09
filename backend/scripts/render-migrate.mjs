import net from 'node:net';
import { spawn } from 'node:child_process';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

const host = process.env.DB_HOST ?? 'localhost';
const port = Number(process.env.DB_PORT ?? 3306);
const maxAttempts = 60;

function canConnect() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const finish = (ready) => {
      socket.destroy();
      resolve(ready);
    };
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.setTimeout(2_000, () => finish(false));
  });
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
function runMigrations() {
  return new Promise((resolve) => {
    const child = spawn(npm, ['run', 'prisma:deploy'], { stdio: 'inherit', env: process.env });
    child.once('error', () => resolve(1));
    child.once('exit', (code) => resolve(code ?? 1));
  });
}

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  if (!await canConnect()) {
    await delay(2_000);
    continue;
  }
  if (await runMigrations() === 0) process.exit(0);
  if (attempt < maxAttempts) await delay(2_000);
}

throw new Error(`Não foi possível executar as migrations em ${host}:${port}.`);
