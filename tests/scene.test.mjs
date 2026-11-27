import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createArtifact} from '../dist/scene.js';
for(let i=0;i<3;i++)test(`artifact ${i}: valid nonempty 3D geometry and separate silhouette`,()=>{const a=createArtifact(i,new THREE.MeshStandardMaterial(),new THREE.MeshStandardMaterial()),bounds=new THREE.Box3().setFromObject(a);assert.ok(bounds.max.y>3&&bounds.max.y<6);assert.ok(bounds.max.x-bounds.min.x>1);let vertices=0;a.traverse(m=>{if(!m.isMesh)return;const p=m.geometry.attributes.position;assert.ok(p.count>0);for(const n of p.array)assert.ok(Number.isFinite(n));vertices+=p.count;});assert.ok(vertices>1000);if(i===2)assert.equal(a.userData.orbits.length,3);});
