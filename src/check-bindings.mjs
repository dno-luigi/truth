// Fails when wrangler.jsonc stops matching the code it deploys.
//
// This checks the config against the artifact itself rather than against a hand-maintained
// inventory, because the inventory kept drifting from the code. It is deliberately
// path-agnostic: `main` can be repointed or a patch promoted without touching this file.
//
// The failure it exists to catch: code reads env.PROXY, config binds only AI-PROXY, the
// binding resolves to undefined, requestCandidateFromProxy throws, and resolve answers a
// 200 `miss` for every input. Nothing looks broken. So: every env name the code dereferences
// must have a binding.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('..', import.meta.url);

// wrangler.jsonc is JSONC: strip // and /* */ comments, but not the ones inside strings.
function stripJsonc(src) {
  let out = '';
  let inStr = false, inLine = false, inBlock = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (inLine) {
      if (c === '\n') { inLine = false; out += c; }
      continue;
    }
    if (inBlock) {
      if (c === '*' && n === '/') { inBlock = false; i++; }
      continue;
    }
    if (inStr) {
      out += c;
      if (c === '\\') { out += src[++i] ?? ''; continue; }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; out += c; continue; }
    if (c === '/' && n === '/') { inLine = true; i++; continue; }
    if (c === '/' && n === '*') { inBlock = true; i++; continue; }
    out += c;
  }
  return out;
}

const problems = [];
const notes = [];
const fail = (msg) => problems.push(msg);

const config = JSON.parse(stripJsonc(readFileSync(new URL('wrangler.jsonc', root), 'utf8')));

// --- what is deployed -------------------------------------------------------------------
if (!config.main) {
  fail('main: unset — wrangler cannot find an entry point (AGENTS.md: it must name current/index.js)');
  report();
}
if (config.no_bundle !== true) {
  fail('no_bundle: must be true, otherwise the recorded bytes are replaced by a re-bundle');
}

let source = '';
try {
  source = readFileSync(new URL(config.main, root), 'utf8');
} catch {
  fail(`main: ${config.main} does not exist (a rename or an unpromoted patch will do this)`);
  report();
}
if (config.main !== 'current/index.js') {
  notes.push(`main is ${config.main}; AGENTS.md wants the stable current/index.js`);
}

// --- what the code asks for ---------------------------------------------------------------
// Static property reads only. A computed name (env[something]) cannot be verified here.
const needed = new Set();
for (const m of source.matchAll(/(^|[^.\w])env\.([A-Za-z_][A-Za-z0-9_]*)/g)) needed.add(m[2]);
for (const m of source.matchAll(/this\.env\.([A-Za-z_][A-Za-z0-9_]*)/g)) needed.add(m[1]);
if (/env\[/.test(source)) fail('artifact reads env[...] dynamically — bindings cannot be verified statically');
if (needed.size === 0) fail('no env.* reads found in the artifact — wrong file?');

// --- what the config binds -----------------------------------------------------------------
const bound = new Map();
for (const b of config.services ?? []) bound.set(b.binding, 'service');
for (const b of config.kv_namespaces ?? []) bound.set(b.binding, 'kv_namespace');
for (const b of config.r2_buckets ?? []) bound.set(b.binding, 'r2_bucket');
for (const b of config.secrets_store_secrets ?? []) bound.set(b.binding, 'secrets_store_secret');
const doBindings = new Map();
for (const b of config.durable_objects?.bindings ?? []) { bound.set(b.name, 'durable_object'); doBindings.set(b.name, b.class_name); }
for (const b of config.unsafe?.bindings ?? []) {
  bound.set(b.name, b.type);
  if (b.type === 'durable_object_namespace') doBindings.set(b.name, b.class_name);
}

// Supplied at deploy time rather than declared in config.
const NOT_BINDINGS = new Set(['ADMIN_KEY']);

for (const name of [...needed].sort()) {
  if (!bound.has(name) && !NOT_BINDINGS.has(name)) {
    fail(`MISSING ${name}: the artifact reads env.${name} but wrangler.jsonc does not bind it`);
  }
}
for (const name of [...bound.keys()].sort()) {
  if (!needed.has(name)) notes.push(`unread binding: ${name} (${bound.get(name)}) — harmless, but no code uses it`);
}

// --- durable objects ------------------------------------------------------------------------
// A DO binding must name a class the artifact actually exports, or the namespace it points at
// is somebody else's object.
const exported = new Set();
for (const m of source.matchAll(/export\s*\{([^}]*)\}/g)) {
  for (const part of m[1].split(',')) {
    const name = part.trim().split(/\s+as\s+/)[0].trim();
    if (name) exported.add(name);
  }
}
for (const [binding, className] of doBindings) {
  if (!className) fail(`QC: binding ${binding} has no class_name`);
  else if (!exported.has(className)) {
    fail(`QC: binding ${binding} names class ${className}, which the artifact does not export (exports: ${[...exported].join(', ') || 'none'})`);
  }
}

// --- report --------------------------------------------------------------------------------
function report() {
  for (const n of notes) console.log(`note    ${n}`);
  if (problems.length) {
    for (const p of problems) console.log(p);
    console.log(`bindings DRIFT ${problems.length} problem(s) against ${config.main ?? '(no main)'}`);
    process.exit(1);
  }
  const sha = createHash('sha256').update(source).digest('hex');
  console.log(`bindings OK ${needed.size}/${needed.size} env names bound by ${config.main} (sha256 ${sha.slice(0, 8)})`);
  process.exit(0);
}

report();
