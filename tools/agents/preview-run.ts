/** harness: builds the actual agent renderer into an isolated artifact entry. */
import { build, preview } from "vite";
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root=resolve(import.meta.dirname,"../..");
const output=resolve(root,`artifacts/agents/candidates/shader-${Date.now()}`);
const buildDirectory=resolve(root,"artifacts/agents/shader-build");
await mkdir(output,{recursive:true});
await build({configFile:resolve(root,"vite.config.ts"),configLoader:"native",build:{outDir:buildDirectory,emptyOutDir:true,rollupOptions:{input:resolve(root,"tools/agents/preview.html")}}});
const server=await preview({configFile:resolve(root,"vite.config.ts"),configLoader:"native",build:{outDir:buildDirectory},preview:{host:"127.0.0.1",port:4319,strictPort:true}});
let browserServer: Awaited<ReturnType<typeof chromium.launchServer>>|undefined;
let browser: Awaited<ReturnType<typeof chromium.connect>>|undefined;
const errors:string[]=[];
const frames:{file:string;sha256:string}[]=[];
try {
  browserServer=await chromium.launchServer({headless:true,args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
  console.log(`Agent shader preview owns browser PID ${browserServer.process().pid}; server runs in Node PID ${process.pid}.`);
  browser=await chromium.connect(browserServer.wsEndpoint());
  const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
  try {
    const page=await context.newPage();
    page.on("pageerror",error=>errors.push(error.message));
    page.on("console",message=>{if(message.type()==="error")errors.push(message.text());});
    await page.goto("http://127.0.0.1:4319/tools/agents/preview.html");
    await page.waitForSelector('body[data-ready="true"]',{timeout:120000});
    for(const style of ["satellite","cartographic"]) {
      await page.getByLabel("World style").selectOption(style);
      for(const subject of ["Pedestrians","Vehicles"]) {
        await page.getByLabel("Subject").selectOption(subject);
        for(const view of subject==="Pedestrians"?["Near","Medium","Far"]:["Near"]) {
          await page.getByLabel("View").selectOption(view);
          const file=`${style}-${subject.toLowerCase()}-${view.toLowerCase()}.png`;
          const bytes=await page.screenshot({path:resolve(output,file)});
          frames.push({file,sha256:createHash("sha256").update(bytes).digest("hex")});
        }
        await page.getByLabel("View").selectOption("Near");
        for(let step=1;step<=4;step++) {
          await page.getByRole("button",{name:"Step motion"}).click();
          const file=`${style}-${subject.toLowerCase()}-motion-${step}.png`;
          const bytes=await page.screenshot({path:resolve(output,file)});
          frames.push({file,sha256:createHash("sha256").update(bytes).digest("hex")});
        }
      }
    }
  } finally {await context.close();}
  await writeFile(resolve(output,"manifest.json"),JSON.stringify({width:1280,height:720,frames,errors},null,2));
  console.log(`Agent shader preview captured ${frames.length} frames in ${output}; ${errors.length} browser errors.`);
  if(errors.length)throw new Error(errors.join("\n"));
} finally {
  const cleanup = await Promise.allSettled([
    browser?.close(), browserServer?.close(),
    new Promise<void>((done,fail)=>server.httpServer.close(error=>error?fail(error):done())),
  ]);
  const pid=browserServer?.process().pid;
  if(pid&&browserServer?.process().exitCode===null&&process.platform==="win32")spawnSync("taskkill",["/pid",String(pid),"/t","/f"],{windowsHide:true,stdio:"ignore"});
  const failures = cleanup.filter(result=>result.status==="rejected").map(result=>result.reason);
  if(failures.length)throw new AggregateError(failures,"Agent preview cleanup failed; every owned resource cleanup was attempted.");
}
