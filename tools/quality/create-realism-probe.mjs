#!/usr/bin/env node
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {verifyRealism} from '../../test/realism.browser.mjs';
const root=resolve(process.argv[2]??'artifacts/realism-audit');
const directory=resolve(root,'playwright'),probe=resolve(root,'probe.js');
await mkdir(directory,{recursive:true});
await writeFile(probe,`async page=>{const verifyRealism=${verifyRealism.toString()};return verifyRealism(page,${JSON.stringify({directory})});}\n`);
console.log(JSON.stringify({probe,directory,workingDirectory:dirname(probe),instruction:'Use this probe with a task-owned headless Playwright CLI session against the production preview. Close the browser, daemon and server in finally cleanup.'},null,2));
