const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, "Xcode", "Shared", "Assets", "3Dmol_viewer.html");
const html = fs.readFileSync(htmlPath, "utf8");

const scriptMatch = html.match(/<script>[\s\S]*?\$\(function\(\) \{/);
assert(scriptMatch, "Expected 3Dmol_viewer.html to contain a script block before document ready");

const helperScript = scriptMatch[0]
  .replace(/^<script>/, "")
  .replace(/\$\(function\(\) \{$/, "");

const context = { console };
vm.createContext(context);
vm.runInContext(helperScript, context);

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

assert.strictEqual(
  typeof context.parseSDFFormalCharges,
  "function",
  "Expected parseSDFFormalCharges to be defined in 3Dmol_viewer.html"
);
assert.strictEqual(
  typeof context.addSDFFormalChargeLabels,
  "function",
  "Expected addSDFFormalChargeLabels to be defined in 3Dmol_viewer.html"
);

const userSamplePath = "/Users/ytao/research/aromaticity_checker/test_005-answer_A.sdf";
const userSample = fs.readFileSync(userSamplePath, "utf8");
const atomLineCharges = context.parseSDFFormalCharges(userSample);
assert.deepStrictEqual(
  plain(atomLineCharges.map(({ atomIndex, charge, text, elem }) => ({ atomIndex, charge, text, elem }))),
  [{ atomIndex: 7, charge: 1, text: "+1", elem: "N" }],
  "Expected V2000 atom-line charge code 3 to render as +1 on atom 8"
);

const mChgSample = `charged
  test          3D

  2  1  0  0  0  0  0  0  0  0999 V2000
    0.0000    0.0000    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0
    1.0000    0.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
M  CHG  2   1   1   2  -1
M  END
$$$$`;

const mChgCharges = context.parseSDFFormalCharges(mChgSample);
assert.deepStrictEqual(
  plain(mChgCharges.map(({ atomIndex, charge, text, elem }) => ({ atomIndex, charge, text, elem }))),
  [
    { atomIndex: 0, charge: 1, text: "+1", elem: "N" },
    { atomIndex: 1, charge: -1, text: "-1", elem: "O" },
  ],
  "Expected M  CHG records to override formal charge labels"
);

const labels = [];
context.addSDFFormalChargeLabels(
  {
    addLabel(text, options) {
      labels.push({ text, options });
    },
  },
  atomLineCharges
);

assert.strictEqual(labels.length, 1, "Expected one formal charge label");
assert.strictEqual(labels[0].text, "+1");
assert.deepStrictEqual(
  plain(labels[0].options.position),
  {
    x: atomLineCharges[0].x,
    y: atomLineCharges[0].y,
    z: atomLineCharges[0].z,
  },
  "Expected label to be centered on the charged atom"
);

console.log("SDF formal charge label tests passed");
