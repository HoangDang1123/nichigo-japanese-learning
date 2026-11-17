#!/usr/bin/env node
// Generates .claude/skills/ from the canonical .agents/skills/ directory.
//
//   node scripts/sync-agent-skills.mjs            write generated copies
//   node scripts/sync-agent-skills.mjs --check    read-only; exit 1 if anything is out of sync
//   node scripts/sync-agent-skills.mjs --force    overwrite generated files that were edited by hand
//
// .agents/skills/ is the single source of truth. Generated files are tracked by a manifest of
// content hashes, so a hand edit of a generated file is detected and never overwritten silently.
// Plain Node, no dependencies; paths and line endings are normalised so it behaves the same on
// Windows (CRLF checkouts) and POSIX.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, rmdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = join(ROOT, ".agents", "skills");
const TARGET_DIR = join(ROOT, ".claude", "skills");
const MANIFEST = join(TARGET_DIR, ".agents-sync.json");
const MARKER =
  "<!-- GENERATED from .agents/skills by scripts/sync-agent-skills.mjs. Do not edit; edit the source and re-run the script. -->";
const TEXT_EXT = /\.(md|txt|json|ya?ml|mjs|js|ts|sh|py)$/i;

const args = new Set(process.argv.slice(2));
const unknown = [...args].filter((a) => !["--check", "--force"].includes(a));
if (unknown.length) fail(`Unknown option(s): ${unknown.join(", ")}\nUsage: sync-agent-skills.mjs [--check] [--force]`, 64);
const CHECK = args.has("--check");
const FORCE = args.has("--force");

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}
const posix = (p) => p.split(sep).join("/");
const sha = (buf) => createHash("sha256").update(buf).digest("hex");
const norm = (path, buf) => (TEXT_EXT.test(path) ? Buffer.from(buf.toString("utf8").replace(/\r\n/g, "\n"), "utf8") : buf);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out.sort();
}

function validateSkill(name, skillMd) {
  const text = skillMd.toString("utf8").replace(/\r\n/g, "\n");
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!match) return `${name}/SKILL.md: missing YAML frontmatter`;
  const front = match[1];
  const fmName = /^name:\s*(.+)$/m.exec(front)?.[1]?.trim();
  const desc = /^description:\s*(.+)$/m.exec(front)?.[1]?.trim();
  if (fmName !== name) return `${name}/SKILL.md: frontmatter name "${fmName}" must equal the directory name "${name}"`;
  if (!desc) return `${name}/SKILL.md: frontmatter description is required`;
  return null;
}

// ---- expected output -------------------------------------------------------------------------
if (!existsSync(SOURCE_DIR)) fail(`Missing source directory: ${relative(ROOT, SOURCE_DIR)}`);
const expected = new Map(); // "name/file" -> Buffer
const problems = [];
for (const entry of readdirSync(SOURCE_DIR, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const skillDir = join(SOURCE_DIR, entry.name);
  const skillMdPath = join(skillDir, "SKILL.md");
  if (!existsSync(skillMdPath)) continue; // not a skill directory
  const error = validateSkill(entry.name, readFileSync(skillMdPath));
  if (error) problems.push(error);
  for (const file of walk(skillDir)) {
    const key = posix(relative(SOURCE_DIR, file));
    let content = norm(file, readFileSync(file));
    if (key.endsWith("/SKILL.md") && key.split("/").length === 2) {
      const text = content.toString("utf8");
      content = Buffer.from(text.replace(/^(---\n[\s\S]*?\n---\n)/, `$1\n${MARKER}\n`), "utf8");
    }
    expected.set(key, content);
  }
}
if (problems.length) fail(`Invalid skills:\n  ${problems.join("\n  ")}`, 2);
if (expected.size === 0) fail("No skills found in .agents/skills", 2);

// ---- current state -----------------------------------------------------------------------------
let manifest = { files: {} };
if (existsSync(MANIFEST)) {
  try {
    manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
    manifest.files ??= {};
  } catch {
    fail(`Cannot parse ${relative(ROOT, MANIFEST)}; fix or delete it deliberately.`, 2);
  }
}
const targetPath = (key) => join(TARGET_DIR, ...key.split("/"));
const currentHash = (key) => {
  const p = targetPath(key);
  return existsSync(p) ? sha(norm(p, readFileSync(p))) : null;
};

const toWrite = [];
const toDelete = [];
const conflicts = [];
const drift = []; // differences reported by --check

for (const [key, content] of expected) {
  const want = sha(content);
  const have = currentHash(key);
  const recorded = manifest.files[key];
  if (have === want) {
    if (recorded !== want) drift.push(`manifest out of date for ${key}`);
    continue;
  }
  if (have === null) {
    drift.push(`missing: .claude/skills/${key}`);
    toWrite.push(key);
  } else if (recorded && have === recorded) {
    drift.push(`outdated: .claude/skills/${key}`);
    toWrite.push(key);
  } else {
    drift.push(`edited by hand or unmanaged: .claude/skills/${key}`);
    conflicts.push(key);
  }
}
for (const key of Object.keys(manifest.files)) {
  if (expected.has(key)) continue;
  const have = currentHash(key);
  if (have === null) continue;
  if (have === manifest.files[key]) {
    drift.push(`stale generated file: .claude/skills/${key}`);
    toDelete.push(key);
  } else {
    drift.push(`stale generated file with manual edits: .claude/skills/${key}`);
    conflicts.push(key);
  }
}

// ---- check mode ----------------------------------------------------------------------------------
if (CHECK) {
  if (drift.length === 0) {
    console.log(`OK: .claude/skills matches .agents/skills (${expected.size} files).`);
    process.exit(0);
  }
  console.error("Out of sync:\n  " + drift.join("\n  ") + "\nRun: node scripts/sync-agent-skills.mjs");
  process.exit(1);
}

// ---- sync mode -------------------------------------------------------------------------------------
if (conflicts.length && !FORCE) {
  console.error(
    "Refusing to overwrite files that differ from both the source and the last generated version:\n  " +
      conflicts.map((k) => `.claude/skills/${k}`).join("\n  ") +
      "\nMove the change into .agents/skills, or re-run with --force to overwrite the generated copy."
  );
  process.exit(2);
}
for (const key of [...toWrite, ...conflicts.filter((k) => expected.has(k))]) {
  const p = targetPath(key);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, expected.get(key));
}
for (const key of [...toDelete, ...conflicts.filter((k) => !expected.has(k))]) {
  rmSync(targetPath(key), { force: true });
  let dir = dirname(targetPath(key));
  while (dir !== TARGET_DIR && existsSync(dir) && readdirSync(dir).length === 0) {
    rmdirSync(dir);
    dir = dirname(dir);
  }
}
const files = {};
for (const key of [...expected.keys()].sort()) files[key] = sha(expected.get(key));
mkdirSync(TARGET_DIR, { recursive: true });
writeFileSync(
  MANIFEST,
  JSON.stringify({ generatedBy: "scripts/sync-agent-skills.mjs", source: ".agents/skills", files }, null, 2) + "\n"
);
console.log(
  `Synced ${expected.size} files (${toWrite.length + conflicts.length} written, ${toDelete.length} removed). ` +
    "Run with --check to verify."
);
