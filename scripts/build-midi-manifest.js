#!/usr/bin/env node
/**
 * Generate a manifest of all MIDI files under assets/midi.
 * Outputs to assets/midi/manifest.json as an array of
 * { id, name, url, folder } objects (url relative to site root).
 */
const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..");
const midiRoot = path.join(projectRoot, "assets", "midi");
const outFile = path.join(midiRoot, "manifest.json");

const entries = [];

function walk(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
            walk(full);
        } else if (item.isFile()) {
            const ext = path.extname(item.name).toLowerCase();
            if (ext === ".mid" || ext === ".midi") {
                const relFromRoot = path.relative(projectRoot, full).split(path.sep).join("/");
                const relFromMidi = path.relative(midiRoot, full).split(path.sep).join("/");
                const folder = relFromMidi.includes("/") ? path.dirname(relFromMidi).split(path.sep).join("/") : "";
                entries.push({
                    id: relFromMidi.replace(/[^\w.-]/g, "_"),
                    name: item.name,
                    folder,
                    url: relFromRoot
                });
            }
        }
    }
}

if (!fs.existsSync(midiRoot)) {
    console.error("Cannot find assets/midi folder.");
    process.exit(1);
}

walk(midiRoot);
entries.sort((a, b) => a.url.localeCompare(b.url));
fs.writeFileSync(outFile, JSON.stringify(entries, null, 2));
console.log(`Wrote ${entries.length} entries to ${path.relative(projectRoot, outFile)}`);
