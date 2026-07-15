const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = path.resolve(__dirname, "..");
const viewerPath = path.join(repoRoot, "Xcode/Shared/Assets/3Dmol_viewer.html");
const viewerHTML = fs.readFileSync(viewerPath, "utf8");

function scriptForSDFData(sdfData) {
    const html = viewerHTML
        .replace("{PDB_DATA}", () => JSON.stringify(sdfData))
        .replaceAll("{DATA_FORMAT}", "sdf")
        .replaceAll("{ATOM_STYLE}", "stick")
        .replaceAll("{BG_COLOR}", "FFFFFF")
        .replaceAll("{BG_ALPHA}", "1")
        .replaceAll("{ROTATION_SPEED}", "0")
        .replaceAll("{ORIENT_TO_WIDEST_FACE}", "false");

    const scriptMatch = html.match(/<script id="quicklookprotein-viewer-script">([\s\S]*?)<\/script>/);
    assert(scriptMatch, "Expected viewer script tag to exist");
    return scriptMatch[1];
}

function renderModelDataFromScript(script) {
    let renderedModelData = null;
    const element = { style: {}, addEventListener() {} };

    const sandbox = {
        module: { exports: {} },
        document: {
            getElementById() {
                return element;
            }
        },
        $() {
            const argument = arguments[0];
            if (typeof argument === "function") {
                argument();
            }
            return {};
        },
        $3Dmol: {
            createViewer() {
                return {
                    clear() {},
                    setBackgroundColor() {},
                    addModel(modelData) {
                        renderedModelData = modelData;
                    },
                    setStyle() {},
                    addLabel() {},
                    zoomTo() {},
                    render() {},
                    spin() {}
                };
            }
        }
    };

    vm.runInNewContext(script, sandbox);
    return renderedModelData;
}

const sdfWithBackslashDigit = [
    "",
    "  Test",
    "",
    "  1  0  0  0  0            999 V2000",
    "    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0",
    "M  END",
    "> <SMILES>",
    "COC(=O)CCC1=C2NC(\\C=C3/N=C(/C=C4\\N\\C(=C/C5=N/C(=C\\2)/C)C)C",
    "",
    "$$$$"
].join("\n");

const renderedModelData = renderModelDataFromScript(scriptForSDFData(sdfWithBackslashDigit));
assert.strictEqual(
    renderedModelData,
    sdfWithBackslashDigit.replace(/\s+$/, ""),
    "SDF data containing backslash-digit text should survive JavaScript embedding unchanged"
);

console.log("SDF data embedding tests passed");
