import { createHash } from "node:crypto";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";

const [statePath, logPath, coreTarballPath, cliTarballPath, coreManifestPath, cliManifestPath, failureMode = "none"] =
  process.argv.slice(2);

if (
  !statePath ||
  !logPath ||
  !coreTarballPath ||
  !cliTarballPath ||
  !coreManifestPath ||
  !cliManifestPath
) {
  throw new Error("npm registry fixture arguments are incomplete");
}

const packageFixtures = new Map();
for (const [name, tarballPath, manifestPath] of [
  ["@praxisbound/core", coreTarballPath, coreManifestPath],
  ["@praxisbound/cli", cliTarballPath, cliManifestPath],
]) {
  const tarball = readFileSync(tarballPath);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  packageFixtures.set(name, { manifest, tarball });
}

function digest(algorithm, value, encoding) {
  return createHash(algorithm).update(value).digest(encoding);
}

function json(response, status, value) {
  const body = Buffer.from(`${JSON.stringify(value)}\n`);
  response.writeHead(status, {
    "content-length": body.length,
    "content-type": "application/json",
  });
  response.end(body);
}

const server = createServer((request, response) => {
  const rawPath = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
  const path = decodeURIComponent(rawPath);
  const authorization = request.headers.authorization !== undefined;
  appendFileSync(
    logPath,
    `${JSON.stringify({ method: request.method, path, authorization })}\n`,
  );

  if (authorization) {
    json(response, 401, { error: "authorization is forbidden in this fixture" });
    return;
  }

  for (const [name, fixture] of packageFixtures) {
    const basename = `${name.slice(name.indexOf("/") + 1)}-${fixture.manifest.version}.tgz`;
    const tarballPathname = `/${name}/-/${basename}`;
    if (path === `/${name}`) {
      const tarballUrl = `http://127.0.0.1:${server.address().port}${tarballPathname}`;
      let integrity = `sha512-${digest("sha512", fixture.tarball, "base64")}`;
      let shasum = digest("sha1", fixture.tarball, "hex");
      if (name === "@praxisbound/cli" && failureMode === "bad-integrity") {
        integrity = `sha512-${Buffer.alloc(64).toString("base64")}`;
      }
      if (name === "@praxisbound/cli" && failureMode === "bad-shasum") {
        integrity = undefined;
        shasum = "0".repeat(40);
      }
      json(response, 200, {
        name,
        "dist-tags": { latest: fixture.manifest.version },
        versions: {
          [fixture.manifest.version]: {
            ...fixture.manifest,
            _id: `${name}@${fixture.manifest.version}`,
            dist: { integrity, shasum, tarball: tarballUrl },
          },
        },
      });
      return;
    }
    if (path === tarballPathname) {
      const body =
        name === "@praxisbound/cli" && failureMode === "corrupt-tarball"
          ? Buffer.concat([fixture.tarball, Buffer.from("corrupt")])
          : fixture.tarball;
      response.writeHead(200, {
        "content-length": body.length,
        "content-type": "application/octet-stream",
      });
      response.end(body);
      return;
    }
  }

  json(response, 404, { error: "fixture route not found" });
});

server.listen(0, "127.0.0.1", () => {
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("npm registry fixture did not bind a TCP port");
  }
  writeFileSync(
    statePath,
    `${JSON.stringify({ registry: `http://127.0.0.1:${address.port}/` })}\n`,
  );
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
