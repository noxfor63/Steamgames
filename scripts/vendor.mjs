import {mkdir,copyFile} from 'node:fs/promises';
const groups={environments:['RoomEnvironment'],postprocessing:['EffectComposer','Pass','RenderPass','ShaderPass','UnrealBloomPass','OutputPass','MaskPass'],shaders:['CopyShader','LuminosityHighPassShader','OutputShader']};
await mkdir(new URL('../dist/vendor/',import.meta.url),{recursive:true});
for(const file of ['three.module.js','three.core.js'])await copyFile(new URL(`../node_modules/three/build/${file}`,import.meta.url),new URL(`../dist/vendor/${file}`,import.meta.url));
for(const [folder,files]of Object.entries(groups)){await mkdir(new URL(`../dist/vendor/${folder}/`,import.meta.url),{recursive:true});for(const file of files)await copyFile(new URL(`../node_modules/three/examples/jsm/${folder}/${file}.js`,import.meta.url),new URL(`../dist/vendor/${folder}/${file}.js`,import.meta.url));}
await copyFile(new URL('../node_modules/three/LICENSE',import.meta.url),new URL('../dist/vendor/THREE-LICENSE.txt',import.meta.url));
