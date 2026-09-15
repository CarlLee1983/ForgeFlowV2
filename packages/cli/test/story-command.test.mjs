import assert from "node:assert/strict";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { constants } from "node:fs";
import test from "node:test";

import { validateResultEnvelope } from "@praxisbound/core";

import {
  createNodeStoryReader,
  renderStoryHuman,
  runStoryCheck,
} from "../dist/story.js";

const story = `# Story: TST-901 Fixture

## Classification

* Security sensitive: no
* Baseline conformance: no
`;
const acceptance =
  "# Acceptance Criteria\n\n## Happy Path\n\n* AC-001: Fixture.\n";

async function workspace(build) {
  const root = await mkdtemp(join(tmpdir(), "story-command-"));
  try {
    await build(root);
    return await Promise.resolve(root);
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}

async function withFixture(build, run) {
  const root = await workspace(build);
  try {
    return await run(root, createNodeStoryReader(undefined, root));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function writeStory(root, name, source = story, criteria = acceptance) {
  const directory = join(root, "specs", "stories", name);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "story.md"), source);
  await writeFile(join(directory, "acceptance.md"), criteria);
  return `specs/stories/${name}`;
}

test("TST007-AC-001: a complete Story reports the documented output and exit 0", async () => {
  await withFixture(
    async (root) => {
      await writeStory(root, "TST-901-case");
    },
    async (_root, reader) => {
      const execution = await runStoryCheck(
        ["specs/stories/TST-901-case"],
        reader,
      );

      assert.equal(execution.outcome, "STORY_CONTRACT_OK");
      assert.equal(execution.checked, 1);
      assert.equal(execution.result.exit, 0);
      assert.deepEqual(validateResultEnvelope(execution.result), {
        ok: true,
        value: execution.result,
      });

      const rendered = renderStoryHuman(execution);
      assert.equal(
        rendered.stdout,
        [
          "PraxisBound Story Contract Check",
          "",
          "INFO  specs/stories/TST-901-case: Story ID TST-901",
          "PASS  specs/stories/TST-901-case: classification security=no baseline=no",
          "",
          "Result: STORY_CONTRACT_OK",
          "Stories checked: 1",
          "",
          "Next:",
          "Static Story structure only. Run make verify and human review.",
          "",
        ].join("\n"),
      );
      assert.equal(rendered.stderr, "");
    },
  );
});

test("TST007-AC-001: JSON mode writes exactly one canonical envelope", async () => {
  await withFixture(
    async (root) => {
      await writeStory(root, "TST-901-case");
    },
    async (_root, reader) => {
      const execution = await runStoryCheck(
        ["--json", "specs/stories/TST-901-case"],
        reader,
      );

      assert.equal(execution.mode, "json");
      assert.deepEqual(validateResultEnvelope(execution.result), {
        ok: true,
        value: execution.result,
      });
      assert.equal(execution.result.subject, "story");
      assert.deepEqual(execution.result.issues, []);
    },
  );
});

test("TST008-AC-001/003: readiness is opt-in and reports its selected result", async () => {
  const readyStory = `# Story: TST-901 Fixture

## Goal

Check minimum Story content.

## Scope

* Check this fixture.

## Classification

* Security sensitive: no
* Baseline conformance: no
`;
  const readyAcceptance = `# Acceptance Criteria

## Happy Path

* [ ] AC-001: The fixture is ready.

## Acceptance Evidence

| AC | Method | Evidence | Fixture / precondition | Expected observation |
| --- | --- | --- | --- | --- |
| \`AC-001\` | test | \`test\` | \`fixture\` | \`pass\` |
`;
  await withFixture(
    async (root) => {
      await writeStory(root, "TST-901-case", readyStory, readyAcceptance);
    },
    async (_root, reader) => {
      const defaultExecution = await runStoryCheck(
        ["specs/stories/TST-901-case"],
        reader,
      );
      const readyExecution = await runStoryCheck(
        ["--ready", "specs/stories/TST-901-case"],
        reader,
      );

      assert.equal(defaultExecution.outcome, "STORY_CONTRACT_OK");
      assert.equal(readyExecution.outcome, "STORY_READINESS_OK");
      assert.equal(readyExecution.result.exit, 0);
      assert.equal(
        renderStoryHuman(readyExecution).stdout,
        [
          "PraxisBound Story Contract Check",
          "",
          "INFO  specs/stories/TST-901-case: Story ID TST-901",
          "PASS  specs/stories/TST-901-case: classification security=no baseline=no",
          "",
          "Structure: STORY_CONTRACT_OK",
          "Result: STORY_READINESS_OK",
          "Stories checked: 1",
          "Minimum content only, not human-approved READY. Run make verify and human review.",
          "",
        ].join("\n"),
      );
    },
  );
});

test("TST007-AC-005: discovery is lexical and skips _template", async () => {
  await withFixture(
    async (root) => {
      await writeStory(root, "TST-903-third");
      await writeStory(root, "TST-901-first");
      await writeStory(root, "TST-902-second");
      await writeStory(root, "_template");
      await mkdir(join(root, "specs", "stories", ".hidden"), {
        recursive: true,
      });
    },
    async (_root, reader) => {
      const execution = await runStoryCheck([], reader);

      assert.deepEqual(
        execution.entries
          .filter((entry) => entry.kind === "story")
          .map((entry) => entry.label),
        [
          "specs/stories/TST-901-first",
          "specs/stories/TST-902-second",
          "specs/stories/TST-903-third",
        ],
      );
      assert.equal(execution.checked, 3);
    },
  );
});

test("TST007-AC-005: explicit subjects keep the given order", async () => {
  await withFixture(
    async (root) => {
      await writeStory(root, "TST-901-first");
      await writeStory(root, "TST-902-second");
    },
    async (_root, reader) => {
      const execution = await runStoryCheck(
        ["specs/stories/TST-902-second", "specs/stories/TST-901-first"],
        reader,
      );

      assert.deepEqual(
        execution.entries.map((entry) => entry.label),
        ["specs/stories/TST-902-second", "specs/stories/TST-901-first"],
      );
    },
  );
});

test("TST007-AC-005: a symlinked required Story file is an operational error", async () => {
  await withFixture(
    async (root) => {
      const directory = join(root, "specs", "stories", "TST-901-case");
      await mkdir(directory, { recursive: true });
      await writeFile(join(root, "elsewhere.md"), story);
      await symlink(join(root, "elsewhere.md"), join(directory, "story.md"));
      await writeFile(join(directory, "acceptance.md"), acceptance);
    },
    async (_root, reader) => {
      const execution = await runStoryCheck(
        ["specs/stories/TST-901-case"],
        reader,
      );

      assert.equal(execution.outcome, "ERROR");
      assert.equal(execution.result.exit, 2);
      assert.equal(execution.result.outcome, "configuration-error");
      assert.equal(
        renderStoryHuman(execution).stderr,
        "ERROR specs/stories/TST-901-case: required Story file is a symlink: specs/stories/TST-901-case/story.md\n",
      );
    },
  );
});

test("TST007-AC-005: a missing required Story file is an operational error", async () => {
  await withFixture(
    async (root) => {
      const directory = join(root, "specs", "stories", "TST-901-case");
      await mkdir(directory, { recursive: true });
      await writeFile(join(directory, "story.md"), story);
    },
    async (_root, reader) => {
      const execution = await runStoryCheck(
        ["specs/stories/TST-901-case"],
        reader,
      );

      assert.equal(execution.outcome, "ERROR");
      assert.equal(execution.result.exit, 2);
      assert.match(
        renderStoryHuman(execution).stderr,
        /required Story file is missing or unreadable: specs\/stories\/TST-901-case\/acceptance\.md/,
      );
    },
  );
});

test("TST007-AC-005: a missing Story root and an unchecked run are operational errors", async () => {
  await withFixture(
    async () => undefined,
    async (_root, reader) => {
      const execution = await runStoryCheck([], reader);
      assert.equal(execution.outcome, "ERROR");
      assert.equal(execution.result.exit, 2);
      assert.equal(execution.checked, 0);
    },
  );

  await withFixture(
    async (root) => {
      await mkdir(join(root, "specs", "stories"), { recursive: true });
    },
    async (_root, reader) => {
      const execution = await runStoryCheck([], reader);
      assert.equal(execution.outcome, "ERROR");
      assert.equal(execution.result.exit, 2);
      assert.equal(
        renderStoryHuman(execution).stderr,
        "ERROR No Story directory was checked\n",
      );
    },
  );
});

test("TST007-AC-005: an unknown flag is a usage error", async () => {
  await withFixture(
    async (root) => {
      await writeStory(root, "TST-901-case");
    },
    async (_root, reader) => {
      for (const args of [["-x"], ["--ready", "-x"], ["--json", "-x"]]) {
        const execution = await runStoryCheck(args, reader);
        assert.equal(execution.outcome, "ERROR", args.join(" "));
        assert.equal(execution.result.outcome, "usage-error", args.join(" "));
        assert.equal(execution.result.exit, 2, args.join(" "));

        // The retained checker reports the usage error before the banner and
        // names its own invocation, so only the command name differs.
        const rendered = renderStoryHuman(execution);
        assert.equal(
          rendered.stdout,
          "\nResult: ERROR\nStories checked: 0\n",
          args.join(" "),
        );
        assert.equal(
          rendered.stderr,
          "ERROR Invalid arguments\n" +
            "Usage: praxisbound story check [--ready] [--json] [story-directory ...]\n" +
            "       praxisbound story check --help\n",
          args.join(" "),
        );
      }
    },
  );
});

test("PB001-AC-004: PraxisBound decision root is canonical and the legacy variable fails closed", async () => {
  const source = `# Story: TST-901 Fixture

## Classification

* Security sensitive: no
* Baseline conformance: no

## Architecture

* Decision: \`ADR-001\`
`;

  await withFixture(
    async (root) => {
      await writeStory(root, "TST-901-case", source);
      await mkdir(join(root, "elsewhere"), { recursive: true });
      await writeFile(
        join(root, "elsewhere", "ADR-001.md"),
        "# ADR-001\n\n* Status: accepted\n",
      );
    },
    async (root) => {
      const withoutRoot = await runStoryCheck(
        ["specs/stories/TST-901-case"],
        createNodeStoryReader(undefined, root, {}),
      );
      assert.deepEqual(
        withoutRoot.result.issues.map((issue) => issue.code),
        ["STORY_DECISION_MISSING"],
      );

      const withLegacyRoot = await runStoryCheck(
        ["specs/stories/TST-901-case"],
        createNodeStoryReader(undefined, root, {
          FORGEFLOW_DECISIONS_ROOT: join(root, "elsewhere"),
        }),
      );
      assert.deepEqual(
        withLegacyRoot.result.issues.map((issue) => issue.code),
        ["STORY_LEGACY_DECISIONS_ROOT"],
      );

      const withRoot = await runStoryCheck(
        ["specs/stories/TST-901-case"],
        createNodeStoryReader(undefined, root, {
          PRAXISBOUND_DECISIONS_ROOT: join(root, "elsewhere"),
        }),
      );
      assert.deepEqual(withRoot.result.issues, []);
      assert.equal(withRoot.outcome, "STORY_CONTRACT_OK");
    },
  );
});

test("TST007-AC-005: checking a Story writes nothing to the target", async () => {
  await withFixture(
    async (root) => {
      await writeStory(root, "TST-901-case");
    },
    async (root, reader) => {
      const directory = join(root, "specs", "stories", "TST-901-case");
      const before = await readdir(directory);
      const stats = Object.fromEntries(
        await Promise.all(
          before.map(async (name) => [
            name,
            (await lstat(join(directory, name))).mtimeMs,
          ]),
        ),
      );
      const contents = Object.fromEntries(
        await Promise.all(
          before.map(async (name) => [
            name,
            await readFile(join(directory, name), "utf8"),
          ]),
        ),
      );

      await runStoryCheck(["specs/stories/TST-901-case"], reader);

      assert.deepEqual(await readdir(directory), before);
      for (const name of before) {
        assert.equal(
          (await lstat(join(directory, name))).mtimeMs,
          stats[name],
          name,
        );
        assert.equal(
          await readFile(join(directory, name), "utf8"),
          contents[name],
          name,
        );
      }
    },
  );
});

test("TST007-AC-005: a required Story file is opened without following a link", async () => {
  const operations = [];
  const reader = createNodeStoryReader({
    async lstat() {
      operations.push(["lstat"]);
      return { size: 1, isFile: () => true, isSymbolicLink: () => false };
    },
    async open(path, flags) {
      operations.push(["open", flags]);
      return {
        async stat() {
          operations.push(["stat"]);
          // A path replaced between acquisition and use is refused.
          return { size: 0, isFile: () => false, isSymbolicLink: () => false };
        },
        async readFile() {
          operations.push(["read"]);
          throw new Error("a replaced non-regular path must not be read");
        },
        async close() {
          operations.push(["close"]);
        },
      };
    },
    async readdir() {
      throw new Error("this fixture does not discover");
    },
    async stat() {
      return { isDirectory: () => true };
    },
  });

  assert.deepEqual(await reader.readStoryFile("story.md"), {
    ok: false,
    reason: "unavailable",
  });
  assert.deepEqual(
    operations.map(([operation]) => operation),
    ["lstat", "open", "stat", "close"],
  );

  const [, flags] = operations.find(([operation]) => operation === "open");
  assert.equal(flags & constants.O_NOFOLLOW, constants.O_NOFOLLOW);
  assert.equal(flags & constants.O_WRONLY, 0);
  assert.equal(flags & constants.O_RDWR, 0);
});

test("TST007-AC-005: production Story modules contain no process or write API", async () => {
  const cliSources = new globalThis.URL("../src/", import.meta.url);
  for (const name of ["bin.ts", "story.ts", "source.ts"]) {
    const source = await readFile(new globalThis.URL(name, cliSources), "utf8");
    assert.doesNotMatch(source, /node:child_process/);
    assert.doesNotMatch(
      source,
      /\b(?:writeFile|appendFile|truncate|rename|unlink|rm|mkdir|cp)\b/,
    );
  }

  // Core stays free of every ambient dependency, not only of writes.
  const coreSources = new globalThis.URL("../../core/src/", import.meta.url);
  for (const name of [
    "story.ts",
    "story-governance.ts",
    "story-matrix.ts",
    "story-readiness.ts",
    "story-table.ts",
    "story-decision.ts",
    "story-literals.ts",
    "story-id.ts",
  ]) {
    const source = await readFile(
      new globalThis.URL(name, coreSources),
      "utf8",
    );
    assert.doesNotMatch(source, /node:(?:fs|child_process|os|path)/);
    // Ambient values are refused as expressions, not as English words in a
    // documentation comment.
    assert.doesNotMatch(source, /\bprocess\s*\./);
    assert.doesNotMatch(source, /\bnew\s+Date\b|\bDate\s*\./);
    assert.doesNotMatch(source, /\bMath\s*\.\s*random\b/);
  }
});
