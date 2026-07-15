const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const htmlPath = path.join(
  __dirname,
  "..",
  "Xcode",
  "Shared",
  "Assets",
  "SMILES_viewer.html"
);

function loadSMILESHelpers() {
  const html = fs.readFileSync(htmlPath, "utf8");
  const match = html.match(
    /<script id="quicklookprotein-smiles-viewer-script">([\s\S]*?)<\/script>/
  );

  assert(match, "SMILES viewer script with testable helpers was not found");

  const sandbox = {
    module: { exports: {} },
  };

  vm.runInNewContext(match[1], sandbox, { filename: "SMILES_viewer.html" });
  return sandbox.module.exports;
}

function run() {
  const {
    splitSMILESLines,
    normalizeDepictBaseURL,
    depictURLForLine,
    titleFromSMILESLine,
  } = loadSMILESHelpers();

  const sample = [
    "c1ccncc1 pyridine",
    "",
    "  c1cc[nH]c1 pyrrole  ",
    "\t",
    "O=c1cccc[nH]1 2-pyridone",
  ].join("\n");

  assert.deepStrictEqual(Array.from(splitSMILESLines(sample)), [
    "c1ccncc1 pyridine",
    "c1cc[nH]c1 pyrrole",
    "O=c1cccc[nH]1 2-pyridone",
  ]);

  assert.strictEqual(
    normalizeDepictBaseURL("http://localhost:8081"),
    "http://localhost:8081/depict"
  );
  assert.strictEqual(
    normalizeDepictBaseURL("http://localhost:8081/depict/"),
    "http://localhost:8081/depict"
  );
  assert.strictEqual(
    normalizeDepictBaseURL(""),
    "https://www.simolecule.com/cdkdepict/depict"
  );

  const url = new URL(
    depictURLForLine("c1ccncc1 pyridine", "http://localhost:8081")
  );

  assert.strictEqual(url.origin + url.pathname, "http://localhost:8081/depict/bot/png");
  assert.strictEqual(url.searchParams.get("smi"), "c1ccncc1 pyridine");
  assert.strictEqual(url.searchParams.get("hdisp"), "P");
  assert.strictEqual(url.searchParams.get("abbr"), "off");
  assert.strictEqual(url.searchParams.get("annotate"), "none");
  assert.strictEqual(url.searchParams.get("zoom"), "1.3");

  assert.strictEqual(titleFromSMILESLine("c1ccncc1 pyridine"), "pyridine");
  assert.strictEqual(titleFromSMILESLine("CCO"), "Molecule");
}

run();
