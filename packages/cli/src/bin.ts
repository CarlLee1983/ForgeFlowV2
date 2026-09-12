#!/usr/bin/env node

import { readFileSync } from "node:fs";

const manifestUrl = new URL("../package.json", import.meta.url);
const manifest = JSON.parse(readFileSync(manifestUrl, "utf8")) as {
  version?: unknown;
};

if (typeof manifest.version !== "string") {
  throw new Error("The ForgeFlow CLI package manifest has no version.");
}

const help = `ForgeFlow CLI v${manifest.version}

Usage:
  forgeflow [command]

Commands:
  help, --help       Show this help
  version, --version Print the CLI version

Migration commands are unavailable.
`;
const unavailable =
  "forgeflow: command unavailable; migration commands are not yet available. Run forgeflow --help.\n";
const args = process.argv.slice(2);

if (
  args.length === 0 ||
  (args.length === 1 && (args[0] === "help" || args[0] === "--help"))
) {
  process.stdout.write(help);
} else if (
  args.length === 1 &&
  (args[0] === "version" || args[0] === "--version")
) {
  process.stdout.write(`${manifest.version}\n`);
} else {
  process.stderr.write(unavailable);
  process.exitCode = 2;
}
