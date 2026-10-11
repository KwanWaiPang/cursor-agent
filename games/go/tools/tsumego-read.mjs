/**
 * Read tasuki/tsumego ascii diagrams.
 * Books are public domain; the files have positions only, no solutions.
 * https://github.com/tasuki/tsumego
 */
import { readFileSync } from "node:fs";
import { BLACK } from "../js/engine.js";

export function parseTasukiText(text, book) {
  const problems = [];
  let label = null;
  let rows = [];
  const flush = () => {
    if (!label || !rows.length) {
      label = null;
      rows = [];
      return;
    }
    const black = [];
    const white = [];
    let overflow = false;
    rows.forEach((row, y) => {
      if (y > 18) overflow = true;
      for (let x = 0; x < row.length; x += 1) {
        if (x > 18) overflow = true;
        const ch = row[x];
        if (ch === "x" || ch === "X") black.push([x, y]);
        else if (ch === "o" || ch === "O") white.push([x, y]);
      }
    });
    const saved = label;
    label = null;
    rows = [];
    if (overflow || !black.length || !white.length) return;
    const section = /^(\d+)/.exec(saved)?.[1] || "";
    problems.push({
      book,
      label: saved,
      section,
      size: 19,
      toPlay: BLACK,
      black,
      white,
      stones: black.length + white.length,
    });
  };
  for (const line of String(text || "").split(/\r?\n/)) {
    if (line.startsWith("#")) continue;
    const header = /^problem\s+(\S+)/.exec(line);
    if (header) {
      flush();
      label = header[1];
      continue;
    }
    if (!label) continue;
    if (!line.trim()) {
      if (rows.length) flush();
      continue;
    }
    rows.push(line.replace(/\s+$/u, ""));
  }
  flush();
  return problems;
}

export function parseTasukiFile(file, book) {
  return parseTasukiText(readFileSync(file, "utf8"), book);
}
