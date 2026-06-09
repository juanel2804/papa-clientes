import { spawn } from "node:child_process";

const commands = [
  {
    name: "api",
    command: process.execPath,
    args: ["src/server.js"],
    cwd: new URL("../backend/", import.meta.url),
  },
  {
    name: "web",
    command: process.execPath,
    args: ["server.js"],
    cwd: new URL("../frontend/", import.meta.url),
  },
];

const children = commands.map((item) => {
  const child = spawn(item.command, item.args, {
    cwd: item.cwd,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[${item.name}] ${chunk}`);
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[${item.name}] ${chunk}`);
  });

  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      process.exitCode = code;
    }
  });

  return child;
});

function stop() {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
}

process.on("SIGINT", () => {
  stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stop();
  process.exit(0);
});
