#!/usr/bin/env node
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {TREE_HELPERS,TREE_FRAGMENT} from '../../src/tree-materials.ts';
import {verifyTreeMaterials} from '../../test/tree-materials.browser.mjs';
const directory=resolve(process.argv[2]??'artifacts/tree-materials');
await mkdir(directory,{recursive:true});
const probe=resolve(directory,'tree-material-probe.js');
await writeFile(probe,`async page=>{const verify=${verifyTreeMaterials.toString()};return verify(page,${JSON.stringify({helpers:TREE_HELPERS,fragment:TREE_FRAGMENT})});}\n`);
console.log(JSON.stringify({probe,instruction:'Run with an owned headless Playwright CLI session, then close all owned processes. Regenerate after shader changes. Native map images still require visual inspection.'}));
