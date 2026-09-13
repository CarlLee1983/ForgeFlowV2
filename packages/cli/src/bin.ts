#!/usr/bin/env node

import { readFileSync } from "node:fs";

import { handoffHelp, renderHandoffHuman, runHandoffCheck } from "./handoff.js";
import { serializeResultEnvelope } from "./machine.js";
import { renderStoryHuman, runStoryCheck, storyHelp } from "./story.js";
import {
  renderVerificationHuman,
  runVerificationCheck,
  verificationHelp,
} from "./verification.js";

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
  handoff check      Check immutable Handoff evidence
  story check        Check the static Story contract
  verification check Resolve plans and check recorded results
  help, --help       Show this help
  version, --version Print the CLI version

Other migration commands are unavailable.
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
} else if (
  args.length === 3 &&
  args[0] === "handoff" &&
  args[1] === "check" &&
  args[2] === "--help"
) {
  process.stdout.write(handoffHelp);
} else if (
  args.length === 3 &&
  args[0] === "story" &&
  args[1] === "check" &&
  args[2] === "--help"
) {
  process.stdout.write(storyHelp);
} else if (args[0] === "story" && args[1] === "check") {
  const execution = await runStoryCheck(args.slice(2));
  if (execution.mode === "json") {
    process.stdout.write(serializeResultEnvelope(execution.result));
  } else {
    const rendered = renderStoryHuman(execution);
    process.stdout.write(rendered.stdout);
    process.stderr.write(rendered.stderr);
  }
  process.exitCode = execution.result.exit;
} else if (
  args.length === 3 &&
  args[0] === "verification" &&
  args[1] === "check" &&
  args[2] === "--help"
) {
  process.stdout.write(verificationHelp);
} else if (args[0] === "verification" && args[1] === "check") {
  const execution = await runVerificationCheck(args.slice(2));
  if (execution.mode === "json") {
    process.stdout.write(serializeResultEnvelope(execution.result));
  } else {
    const rendered = renderVerificationHuman(execution);
    process.stdout.write(rendered.stdout);
    process.stderr.write(rendered.stderr);
  }
  process.exitCode = execution.result.exit;
} else if (args[0] === "handoff" && args[1] === "check") {
  const execution = await runHandoffCheck(args.slice(2));
  if (execution.mode === "json") {
    process.stdout.write(serializeResultEnvelope(execution.evaluation.result));
  } else {
    const rendered = renderHandoffHuman(execution);
    process.stdout.write(rendered.stdout);
    process.stderr.write(rendered.stderr);
  }
  process.exitCode = execution.evaluation.result.exit;
} else {
  process.stderr.write(unavailable);
  process.exitCode = 2;
}
