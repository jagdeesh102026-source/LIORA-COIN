const fs = require("fs");
const path = require("path");
const Module = require("module");
const ts = require("../../apps/web/node_modules/typescript");

if (!require.extensions[".ts"]) {
  require.extensions[".ts"] = function (module, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    }).outputText;
    module._compile(compiled, filename);
  };
}

if (!require.extensions[".tsx"]) {
  require.extensions[".tsx"] = function (module, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
      },
    }).outputText;
    module._compile(compiled, filename);
  };
}

// Ensure Node module resolution finds apps/web/node_modules (for viem, lucide-react, etc.)
const webNodeModules = path.resolve(__dirname, "../../apps/web/node_modules");
const origNodeModulePaths = Module._nodeModulePaths;
Module._nodeModulePaths = function (from) {
  const paths = origNodeModulePaths.call(this, from);
  if (!paths.includes(webNodeModules)) {
    paths.push(webNodeModules);
  }
  return paths;
};

// Resolve Next.js path aliases (@/* -> apps/web/src/*)
const webSrc = path.resolve(__dirname, "../../apps/web/src");
const origResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    const mapped = path.resolve(webSrc, request.slice(2));
    return origResolveFilename.call(this, mapped, parent, isMain, options);
  }
  return origResolveFilename.call(this, request, parent, isMain, options);
};

module.exports = {
  tsLoaderActive: true,
};

