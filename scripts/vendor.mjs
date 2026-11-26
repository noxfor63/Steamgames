import {mkdir,copyFile} from 'node:fs/promises';
await mkdir(new URL('../dist/vendor/',import.meta.url),{recursive:true});
for(const file of ['three.module.js','three.core.js']) await copyFile(new URL(`../node_modules/three/build/${file}`,import.meta.url),new URL(`../dist/vendor/${file}`,import.meta.url));
await copyFile(new URL('../node_modules/three/LICENSE',import.meta.url),new URL('../dist/vendor/THREE-LICENSE.txt',import.meta.url));
