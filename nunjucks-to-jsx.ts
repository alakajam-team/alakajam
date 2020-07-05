import * as fs from "fs-extra";
import * as path from "path";

const njkTemplatePath = resolveNjkTemplatePath(process.argv[2]);
convertToSomethingThatLooksLikeATsxTemplate(njkTemplatePath);

// ===================

function resolveNjkTemplatePath(rawPath: string) {
  if (!rawPath) {
    console.error("ERROR: HTML template path not set (eg. 'server/explore/games.html')");
    process.exit(1);
    return;
  }

  let njkTemplatePath = path.resolve(__dirname, rawPath);
  if (!njkTemplatePath.endsWith(".html")) {
    njkTemplatePath = njkTemplatePath + ".html";
  }
  return njkTemplatePath;
}

function convertToSomethingThatLooksLikeATsxTemplate(njkTemplatePath: string) {
  const tsxPath = njkTemplatePath.replace(/\.html$/g, ".template.tsx");
  if (fs.existsSync(tsxPath)) {
    console.error(`ERROR: ${tsxPath} already exists`);
    process.exit(1);
    return;
  }

  const njk = fs.readFileSync(njkTemplatePath).toString();
  const tsx = doConvert(njk);

  fs.writeFileSync(tsxPath, tsx);
  console.log(`Successfully created ${tsxPath}`)
}

function doConvert(html: string) {
  let out = html;

  // Detect base template
  let baseName = "base";
  out = replace(out, /{% extends "(.*)\.html" %}\r?\n/g, (foundBaseName) => {
    baseName = foundBaseName.replace(/\//g, "");
    return `import * as React from "preact";
import base from "server/base.template";
import { ifTrue } from "server/macros/jsx-utils";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
`
  });

  // Imports
  out = replace(out, /{% import "([^"]+).html" as ([^ ]+) .*%}/g, (path, name) => {
    return `import * as ${name} from "server/${path}";`;
  });

  // Render function
  out = replace(out, /{% block .+[bB]ody %}/g, () => {
    return `export default function render(context: CommonLocals) {
  const { path } = context;

  return ${baseName}(context,`;
  });

  // Expressions in attributes
  // (keep double braces for now)
  out = replace(out, /"\{\{(.+)\}\}"/g, (expression) => { // attributes
    return `{{${expression.trim()}}}`
  });

  // Inline if-elses
  out = replace(out, /\{\{ ?(.+) if (.+) else (.+) ?\}\}/g, (ifTrue, condition, ifFalse) => {
    return `{${condition} ? ${ifTrue} : ${ifFalse}}`
  });

  // Variables
  out = replace(out, /\{\{(.+)\}\}/g, (expression) => {
    return `{${expression.trim()}}`
  });

  // If blocks
  out = replace(out, /\{% ?if(.+)%\}/g, (expression) => {
    return `{ifTrue(${expression.trim()}, () =>`
  });
  out = replace(out, /\{% ?endif ?%\}/g, () => {
    return `)}`
  });

  // For blocks
  out = replace(out, /\{% ?for(.+) in (.+)%\}/g, (variable, array) => {
    return `{${array.trim()}.map(${variable} =>`
  });
  out = replace(out, /\{% ?endfor ?%\}/g, () => {
    return `)}`
  });

  // Render function end
  out = replace(out, /\r?\n{% endblock %}/g, () => {
    return `);
  }`
  });

  // Common functions
  out = replace(out, /(routeUrl|pictureUr|staticUrl)\(/g, (func) => {
    return `links.${func}(`;
  });

  // Operators
  out = replace(out, / or /g, () => {
    return " || ";
  });
  out = replace(out, / and /g, () => {
    return " && ";
  });
  out = replace(out, / not /g, () => {
    return " !";
  });

  return out;
}

function replace(source: string, regexp: RegExp, replacement: (...captures: string[]) => string | undefined) {
  let matches: RegExpExecArray;
  while ((matches = regexp.exec(source)) !== null) {
    const before = source.substr(0, matches.index);
    const after = source.substr(matches.index + matches[0].length, source.length);

    const captures = matches.slice(1);
    const replacementOutput = replacement(...captures) || "";
    source = before + replacementOutput + after;

    regexp.lastIndex = matches.index + replacementOutput.length;
  }
  return source;
}