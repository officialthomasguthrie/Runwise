/**
 * Fix misplaced lucide-react imports that were inserted inside multi-line import blocks.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

function getAllTsxFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      if (!['node_modules', '.next', '.git'].includes(entry)) {
        getAllTsxFiles(fullPath, files);
      }
    } else if (['.tsx', '.ts'].includes(extname(entry))) {
      files.push(fullPath);
    }
  }
  return files;
}

const srcDir = join(process.cwd(), 'src');
const files = getAllTsxFiles(srcDir);
let fixed = 0;

for (const file of files) {
  let content = readFileSync(file, 'utf-8');
  
  // Check if there's a misplaced lucide import (lucide line sandwiched inside a multi-line import)
  // Pattern: "import {\nimport { ... } from "lucide-react";\n  SomeThing,"
  const lucideLineRegex = /^(import \{ [^}]+ \} from "lucide-react";)$/m;
  const lucideMatch = content.match(lucideLineRegex);
  if (!lucideMatch) continue;
  
  const lucideLine = lucideMatch[1];
  
  // Check if this line is preceded by "import {" (meaning it's inside a multi-line block)
  const lines = content.split('\n');
  let lucideLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === lucideLine.trim()) {
      lucideLineIdx = i;
      break;
    }
  }
  
  if (lucideLineIdx === -1) continue;
  
  // Check if the line before it is an opening "import {" (start of multi-line import)
  const prevLine = lines[lucideLineIdx - 1]?.trim();
  if (!prevLine?.startsWith('import {') || prevLine?.endsWith('}')) continue;
  
  // This lucide import is misplaced: remove it from where it is
  lines.splice(lucideLineIdx, 1);
  
  // Find the correct position: right before the first import statement (not "use client")
  // or after "use client" and blank lines
  let insertIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '"use client";' || lines[i].trim() === "'use client';") {
      insertIdx = i + 1;
    } else if (lines[i].trim() === '') {
      if (insertIdx > 0) insertIdx = i + 1; // skip blanks after "use client"
    } else if (lines[i].startsWith('import ')) {
      // Insert right before the first real import
      insertIdx = i;
      break;
    }
  }
  
  lines.splice(insertIdx, 0, lucideLine);
  
  const newContent = lines.join('\n');
  writeFileSync(file, newContent, 'utf-8');
  console.log(`✓ Fixed: ${file.replace(process.cwd(), '')}`);
  fixed++;
}

console.log(`\nFixed ${fixed} files.`);
