import { readFileSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const root = dirname(fileURLToPath(import.meta.url));

function staticSpecifiers(source) {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const specs = [];
  const re = /\bimport\b/g;
  let match;
  while ((match = re.exec(text))) {
    const rest = text.slice(match.index + "import".length);
    if (/^\s*\(/.test(rest)) continue;
    const from = rest.match(/from\s*["']([^"']+)["']/);
    const bare = rest.match(/^\s*["']([^"']+)["']/);
    const spec = from?.[1] || bare?.[1];
    if (spec) specs.push(spec);
  }
  return specs;
}

function walk(file, seen = new Set()) {
  const abs = join(root, file);
  if (seen.has(abs)) return [];
  seen.add(abs);
  const text = readFileSync(abs, "utf8");
  const found = [normalize(file)];
  for (const spec of staticSpecifiers(text)) {
    if (!spec.startsWith(".")) continue;
    const next = spec.endsWith(".js") ? spec : `${spec}.js`;
    const rel = normalize(join(dirname(file), next));
    found.push(...walk(rel, seen));
  }
  return found;
}

const graph = walk("app.js").map((file) => relative(root, join(root, file)));
const heavy = graph.filter((file) => /(^|\/)(problems|kifu)\.js$/.test(file));
assert(heavy.length === 0, `app static graph pulled ${heavy.join(", ") || "a heavy module"}`);

const drill = readFileSync(join(root, "drill.js"), "utf8");
const kifuPlay = readFileSync(join(root, "kifu-play.js"), "utf8");
assert(/import\(\s*["']\.\/problems\.js["']\s*\)/.test(drill), "problems load with dynamic import");
assert(/import\(\s*["']\.\/kifu\.js["']\s*\)/.test(kifuPlay), "kifu loads with dynamic import");
assert(!staticSpecifiers(drill).includes("./problems.js"), "drill has no static problems import");
assert(!staticSpecifiers(kifuPlay).includes("./kifu.js"), "kifu player has no static kifu import");

console.log("lazy asset import test passed");
