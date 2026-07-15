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
  "3Dmol_viewer.html"
);

function loadViewerHelpers() {
  const html = fs.readFileSync(htmlPath, "utf8");
  const match = html.match(
    /<script id="quicklookprotein-viewer-script">([\s\S]*?)<\/script>/
  );

  assert(match, "viewer script with testable helpers was not found");

  const sandbox = {
    module: { exports: {} },
    $: function () {},
    $3Dmol: {},
  };

  vm.runInNewContext(match[1], sandbox, { filename: "3Dmol_viewer.html" });
  return sandbox.module.exports;
}

function loadViewerTemplate() {
  return fs.readFileSync(htmlPath, "utf8");
}

function loadViewerWithMockedDOM(sdfData) {
  const html = fs.readFileSync(htmlPath, "utf8");
  const match = html.match(
    /<script id="quicklookprotein-viewer-script">([\s\S]*?)<\/script>/
  );

  assert(match, "viewer script with testable helpers was not found");

  const buttons = {
    previousModel: makeFakeElement(),
    nextModel: makeFakeElement(),
    modelCounter: makeFakeElement(),
  };

  const viewer = {
    addedModels: [],
    clearCount: 0,
    spinCalls: [],
    clear() {
      this.clearCount += 1;
    },
    setBackgroundColor(color, alpha) {
      this.backgroundColor = color;
      this.backgroundAlpha = alpha;
    },
    addModel(data, format) {
      this.addedModels.push({ data, format });
    },
    setStyle(style) {
      this.style = style;
    },
    addLabel() {},
    zoomTo() {
      this.zoomed = true;
    },
    render() {
      this.rendered = true;
    },
    spin(axis, speed) {
      this.spinCalls.push({ axis, speed });
    },
  };

  const sandbox = {
    module: { exports: {} },
    document: {
      getElementById(id) {
        return buttons[id];
      },
    },
    $: function (callbackOrSelector) {
      if (typeof callbackOrSelector === "function") {
        callbackOrSelector();
      }

      return { selector: callbackOrSelector };
    },
    $3Dmol: {
      createViewer() {
        return viewer;
      },
    },
  };

  const script = match[1]
    .replace("{PDB_DATA}", () => JSON.stringify(sdfData))
    .replaceAll("{DATA_FORMAT}", "sdf")
    .replaceAll("{ATOM_STYLE}", "Stick")
    .replaceAll("{BG_COLOR}", "000000")
    .replaceAll("{BG_ALPHA}", "0")
    .replaceAll("{ROTATION_SPEED}", "1")
    .replaceAll("{ORIENT_TO_WIDEST_FACE}", "false");

  vm.runInNewContext(script, sandbox, { filename: "3Dmol_viewer.html" });

  return { buttons, viewer };
}

function makeFakeElement() {
  return {
    listeners: {},
    style: {},
    textContent: "",
    addEventListener(eventName, listener) {
      this.listeners[eventName] = listener;
    },
    click() {
      this.listeners.click({
        stopPropagation() {},
      });
    },
  };
}

function run() {
  const html = loadViewerTemplate();
  const { splitSDFModels, formatModelCounter } = loadViewerHelpers();

  assert(
    html.includes(
      '<div style="height: 100vh; width: 100%; position: relative;" id="3dviewer">'
    ),
    "3Dmol viewer must keep its direct 100vh sizing so the canvas is not initialized at zero height"
  );
  assert(
    !html.includes('id="viewer-container"'),
    "3Dmol viewer should not be wrapped in a separate percentage-height container"
  );

  const multimodelSDF = [
    "model one",
    "  $$$$",
    "",
    "model two",
    "$$$$",
    "   ",
    "$$$$",
  ].join("\n");

  assert.deepStrictEqual(Array.from(splitSDFModels(multimodelSDF)), [
    "model one\n$$$$",
    "model two\n$$$$",
  ]);

  assert.deepStrictEqual(Array.from(splitSDFModels("single model\nM  END")), [
    "single model\nM  END",
  ]);

  const blankTitleSDF = "\n OpenBabel\n\n  1  0  0  0  0  0            999 V2000\nM  END\n$$$$";
  assert.strictEqual(
    splitSDFModels(blankTitleSDF)[0],
    blankTitleSDF,
    "SDF records with a blank title line must keep leading newlines so the molfile header does not shift"
  );

  assert.strictEqual(formatModelCounter(0, 2), "1 / 2");
  assert.strictEqual(formatModelCounter(4, 7), "5 / 7");

  const { buttons, viewer } = loadViewerWithMockedDOM(multimodelSDF);

  assert.strictEqual(buttons.previousModel.style.display, "flex");
  assert.strictEqual(buttons.nextModel.style.display, "flex");
  assert.strictEqual(buttons.modelCounter.textContent, "1 / 2");
  assert.strictEqual(viewer.addedModels.at(-1).data, "model one\n$$$$");

  buttons.nextModel.click();

  assert.strictEqual(buttons.modelCounter.textContent, "2 / 2");
  assert.strictEqual(viewer.addedModels.at(-1).data, "model two\n$$$$");

  buttons.nextModel.click();

  assert.strictEqual(buttons.modelCounter.textContent, "1 / 2");
  assert.strictEqual(viewer.addedModels.at(-1).data, "model one\n$$$$");
}

run();
