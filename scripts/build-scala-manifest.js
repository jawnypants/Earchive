#!/usr/bin/env node
/**
 * Generate a manifest of all Scala tuning files under assets/Scala Archive.
 * Outputs to assets/scala-manifest.json as an array of
 * { name, path, folder } objects where path is relative to project root.
 */
const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..");
const scalaRoot = path.join(projectRoot, "assets", "Scala Archive");
const outFile = path.join(projectRoot, "assets", "scala-manifest.json");

const entries = [];

function walk(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
            walk(full);
        } else if (item.isFile()) {
            const ext = path.extname(item.name).toLowerCase();
            if (ext === ".scl" || ext === ".kbm") {
                const relFromRoot = path.relative(projectRoot, full).split(path.sep).join("/");
                const relFromScala = path.relative(scalaRoot, full).split(path.sep).join("/");
                const folder = relFromScala.includes("/") ? path.dirname(relFromScala).split(path.sep).join("/") : "";
                entries.push({
                    name: path.basename(item.name, ext),
                    path: relFromRoot,
                    folder
                });
            }
        }
    }
}

if (!fs.existsSync(scalaRoot)) {
    console.error("Cannot find assets/Scala Archive folder.");
    process.exit(1);
}

walk(scalaRoot);
entries.sort((a, b) => a.path.localeCompare(b.path));
fs.writeFileSync(outFile, JSON.stringify(entries, null, 2));
console.log(`Wrote ${entries.length} entries to ${path.relative(projectRoot, outFile)}`);
