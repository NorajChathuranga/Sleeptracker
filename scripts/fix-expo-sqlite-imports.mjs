import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

const patches = [
  {
    file: 'node_modules/expo-sqlite/build/index.js',
    replacements: [
      ["'./SQLiteDatabase'", "'./SQLiteDatabase.js'"],
      ["'./SQLiteStatement'", "'./SQLiteStatement.js'"],
      ["'./hooks'", "'./hooks.js'"],
    ],
  },
  {
    file: 'node_modules/expo-sqlite/build/hooks.js',
    replacements: [
      ["'./ExpoSQLiteNext'", "'./ExpoSQLiteNext.js'"],
      ["'./SQLiteDatabase'", "'./SQLiteDatabase.js'"],
    ],
  },
  {
    file: 'node_modules/expo-sqlite/build/SQLiteDatabase.js',
    replacements: [
      ["'./ExpoSQLiteNext'", "'./ExpoSQLiteNext.js'"],
      ["'./SQLiteStatement'", "'./SQLiteStatement.js'"],
    ],
  },
  {
    file: 'node_modules/expo-sqlite/build/SQLiteStatement.js',
    replacements: [["'./paramUtils'", "'./paramUtils.js'"]],
  },
  {
    file: 'node_modules/expo-sqlite/build/legacy/index.js',
    replacements: [
      ["'./SQLite'", "'./SQLite.js'"],
      ["'./SQLite.types'", "'./SQLite.types.js'"],
    ],
  },
  {
    file: 'node_modules/expo-sqlite/tsconfig.json',
    replacements: [
      [
        '"expo-module-scripts/tsconfig.base"',
        '"../expo/tsconfig.base.json"',
      ],
    ],
  },
];

let applied = 0;

for (const patch of patches) {
  const filePath = path.join(projectRoot, patch.file);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const [from, to] of patch.replacements) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    applied += 1;
  }
}

if (applied > 0) {
  console.log(`[postinstall] patched expo-sqlite import paths in ${applied} file(s)`);
} else {
  console.log('[postinstall] no expo-sqlite patch changes needed');
}
