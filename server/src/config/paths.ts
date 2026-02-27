import path from 'path';

// Путь относительно скомпилированного файла (dist/config/paths.js → server root)
const serverRoot = path.join(__dirname, '..', '..');

export const mapsDir = path.join(serverRoot, 'data', 'maps');
