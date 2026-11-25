// Checks the catalogs of every language against the French one, the source:
// English, the reference and fallback, must have every text; the others may
// lag behind, but never hold a text the source lacks, and every text keeps
// the arguments and tags of its source, or it would break once formatted.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE = "fr";
const COMPLETE = new Set(["fr", "en"]);
const dir = join(dirname(fileURLToPath(import.meta.url)), "../src/messages");

/** `{ "a": { "b": "…" } }` → `{ "a.b": "…" }`; arrays are one text per item. */
function flatten(node, prefix = "", out = {}) {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(value)) value.forEach((item, index) => (out[`${path}.${index}`] = item));
    else if (value && typeof value === "object") flatten(value, path, out);
    else out[path] = value;
  }
  return out;
}

/** The arguments of an ICU message, `{name}` and `{count, plural, …}` alike, without the text of its branches. */
function argumentsOf(message) {
  const names = new Set();
  let i = 0;

  function text(untilBrace) {
    while (i < message.length) {
      const char = message[i];
      if (char === "'" && "{}#".includes(message[i + 1] ?? "")) {
        i = message.indexOf("'", i + 1) + 1 || message.length;
      } else if (char === "{") {
        argument();
      } else if (char === "}" && untilBrace) {
        i++;
        return;
      } else {
        i++;
      }
    }
  }

  function token() {
    while (/\s/.test(message[i] ?? "")) i++;
    const start = i;
    while (i < message.length && !/[\s,{}]/.test(message[i])) i++;
    const value = message.slice(start, i);
    while (/\s/.test(message[i] ?? "")) i++;
    return value;
  }

  function argument() {
    i++;
    names.add(token());
    if (message[i] === "}") return void i++;
    i++;
    const type = token();
    if (["plural", "select", "selectordinal"].includes(type)) {
      i++;
      while (i < message.length && message[i] !== "}") {
        token();
        if (message[i] !== "{") throw new Error(`malformed branch in "${message}"`);
        i++;
        text(true);
        while (/\s/.test(message[i] ?? "")) i++;
      }
      i++;
    } else {
      for (let depth = 1; i < message.length && depth > 0; i++) {
        if (message[i] === "{") depth++;
        if (message[i] === "}") depth--;
      }
    }
  }

  text(false);
  for (const [, tag] of message.matchAll(/<(\w+)>/g)) names.add(`<${tag}>`);
  return [...names].sort().join(" ");
}

const catalogs = new Map();
for (const file of readdirSync(dir).filter((name) => name.endsWith(".json"))) {
  const [, base, locale] = file.match(/^(?:(.+)\.)?(\w+)\.json$/);
  const group = base ?? "messages";
  if (!catalogs.has(group)) catalogs.set(group, new Map());
  catalogs.get(group).set(locale, flatten(JSON.parse(readFileSync(join(dir, file), "utf8"))));
}

const errors = [];
const warnings = [];
for (const [group, locales] of catalogs) {
  const source = locales.get(SOURCE);
  if (!source) continue;
  for (const [locale, messages] of locales) {
    if (locale === SOURCE) continue;
    for (const key of Object.keys(source)) {
      if (!(key in messages)) (COMPLETE.has(locale) ? errors : warnings).push(`${group} ${locale}: missing ${key}`);
    }
    for (const [key, message] of Object.entries(messages)) {
      if (!(key in source)) {
        errors.push(`${group} ${locale}: ${key} is not in the source`);
        continue;
      }
      try {
        const expected = argumentsOf(source[key]);
        const actual = argumentsOf(message);
        if (expected !== actual) errors.push(`${group} ${locale}: ${key} has {${actual}}, the source {${expected}}`);
      } catch (error) {
        errors.push(`${group} ${locale}: ${key}: ${error.message}`);
      }
    }
  }
}

for (const warning of warnings) console.warn(`warning: ${warning}`);
for (const error of errors) console.error(`error: ${error}`);
if (errors.length > 0) process.exit(1);
console.log(`Messages: ${catalogs.size} catalogs checked, ${warnings.length} texts not translated yet.`);
