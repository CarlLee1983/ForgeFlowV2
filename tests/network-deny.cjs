const { syncBuiltinESMExports } = require("node:module");

const networkModules = [
  require("node:http"),
  require("node:https"),
  require("node:net"),
  require("node:tls"),
];

function denyNetwork() {
  throw new Error("TST015 network access is disabled after package acquisition");
}

for (const networkModule of networkModules) {
  if (typeof networkModule.connect === "function") networkModule.connect = denyNetwork;
  if (typeof networkModule.createConnection === "function") {
    networkModule.createConnection = denyNetwork;
  }
  if (typeof networkModule.get === "function") networkModule.get = denyNetwork;
  if (typeof networkModule.request === "function") networkModule.request = denyNetwork;
}

globalThis.fetch = denyNetwork;
syncBuiltinESMExports();
