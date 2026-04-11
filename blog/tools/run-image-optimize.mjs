import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const toolsDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(toolsDir);
const args = process.argv.slice(2);

function quoteCmdArg(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

let result;

if (process.platform === "win32") {
  const batchFile = join(toolsDir, "optimize-images.bat");
  const command = [quoteCmdArg(batchFile), ...args.map(quoteCmdArg)].join(" ");
  result = spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", command], {
    cwd: projectRoot,
    stdio: "inherit"
  });
} else {
  const shellScript = join(toolsDir, "optimize-images.sh");
  result = spawnSync("bash", [shellScript, ...args], {
    cwd: projectRoot,
    stdio: "inherit"
  });
}

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
