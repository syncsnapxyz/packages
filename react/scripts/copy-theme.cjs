const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
fs.mkdirSync(path.join(root, 'dist', 'styles'), { recursive: true });
fs.copyFileSync(
  path.join(root, 'src', 'styles', 'globals.css'),
  path.join(root, 'dist', 'styles', 'globals.css')
);

// For published package: only dist/ is included, so Tailwind must scan dist/*.js
// for class names. Replace the dev @source (ts/tsx) with the dist @source (js).
let theme = fs.readFileSync(
  path.join(root, 'src', 'styles', 'theme.css'),
  'utf8'
);
theme = theme.replace(/@source\s+["'].*["']\s*;/, '@source "./**/*.js";');
fs.writeFileSync(path.join(root, 'dist', 'theme.css'), theme);
