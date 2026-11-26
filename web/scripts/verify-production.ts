import { spawn, type ChildProcess } from "node:child_process";

const port = Number(process.env.VIBELEADS_VERIFY_PORT ?? "3100");
const baseUrl = `http://127.0.0.1:${port}`;
const env = {
  ...process.env,
  PORT: String(port),
  VIBELEADS_BASE_URL: process.env.VIBELEADS_BASE_URL ?? baseUrl,
};

let server: ChildProcess | null = null;

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${cmd} ${args.join(" ")} exited with ${signal ?? `code ${code}`}`,
        ),
      );
    });
  });
}

async function waitForServer(): Promise<void> {
  // Readiness probe: the landing page is static and has no DB dependency,
  // so it returns 200 as soon as the server is up (unlike an API route
  // that could 500 on the CI placeholder env).
  const readyUrl = `${env.VIBELEADS_BASE_URL.replace(/\/$/, "")}/`;
  let lastError = "";

  for (let i = 1; i <= 45; i += 1) {
    try {
      const res = await fetch(readyUrl);
      if (res.ok) {
        console.log(`Server ready at ${env.VIBELEADS_BASE_URL} after ${i}s`);
        return;
      }
      lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Server did not become ready: ${lastError}`);
}

function stopServer(): void {
  if (!server || server.killed) return;
  server.kill("SIGTERM");
}

async function main(): Promise<void> {
  await run("pnpm", ["build"]);

  server = spawn("pnpm", ["exec", "next", "start", "-p", String(port)], {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
  });

  process.once("exit", stopServer);
  process.once("SIGINT", () => {
    stopServer();
    process.exit(130);
  });
  process.once("SIGTERM", () => {
    stopServer();
    process.exit(143);
  });

  await waitForServer();
  await smokeTest();
}

/**
 * Minimal post-build smoke: confirm the public outreach surface serves.
 * The old MCP / OpenAPI / strategy suites were removed along with the
 * lead-gen endpoints they exercised.
 */
async function smokeTest(): Promise<void> {
  const base = env.VIBELEADS_BASE_URL.replace(/\/$/, "");
  const routes = [
    "/",
    "/connect",
    "/workspace",
    "/demo/outreach",
    "/login",
    "/why-vibeleads",
  ];
  for (const path of routes) {
    const res = await fetch(`${base}${path}`);
    if (!res.ok) {
      throw new Error(`Smoke failed: GET ${path} → HTTP ${res.status}`);
    }
    console.log(`✓ GET ${path} → ${res.status}`);
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(stopServer);
