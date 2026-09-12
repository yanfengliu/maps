/** Bounds: actual headless HTTP for the new network mount and asset MIME types, plus the existing full-body Range and traversal contracts. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import type { Connect, ViteDevServer } from "vite";
import { serveSceneData } from "../tools/vite/serve-scene-data.ts";

describe("network and agent asset serving",()=>{
  let server:Server,base:string,root:string;
  beforeAll(async()=>{
    const artifacts=resolve("artifacts");await mkdir(artifacts,{recursive:true});root=await mkdtemp(join(artifacts,"network-serving-"));
    await mkdir(join(root,"data/network"),{recursive:true});await mkdir(join(root,"data/scene/agents"),{recursive:true});
    await writeFile(join(root,"data/network/network.json"),'{"version":1}');
    for(const ext of ["glb","bin","png","webp","jpg","jpeg"])await writeFile(join(root,`data/scene/agents/example.${ext}`),"asset");
    const plugin=serveSceneData(root);let middleware:Connect.NextHandleFunction|undefined;
    const hook=plugin.configureServer as (server:ViteDevServer)=>void;
    hook({middlewares:{use:(value:Connect.NextHandleFunction)=>{middleware=value;}}} as unknown as ViteDevServer);
    server=createServer((req,res)=>middleware!(req,res,()=>{res.statusCode=404;res.end("fallback");}));
    await new Promise<void>((resolve)=>server.listen(0,"127.0.0.1",resolve));
    const address=server.address();if(!address||typeof address==="string")throw new Error("Test HTTP server has no TCP address.");base=`http://127.0.0.1:${address.port}`;
  });
  afterAll(async()=>{
    if(server){server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close((error)=>error?reject(error):resolve()));}
    if(root){const artifacts=resolve("artifacts");if(!resolve(root).startsWith(artifacts+sep))throw new Error("Refused cleanup outside task artifact root.");await rm(root,{recursive:true,force:true});}
  });
  it("serves the network independently and names the build command on a missing file",async()=>{
    const response=await fetch(`${base}/network/network.json`);expect(response.status).toBe(200);expect(response.headers.get("content-type")).toContain("application/json");expect(await response.json()).toEqual({version:1});
    const missing=await fetch(`${base}/network/missing.json`);expect(missing.status).toBe(404);expect(await missing.text()).toContain("npm run data:network");
  });
  it.each([["glb","model/gltf-binary"],["bin","application/octet-stream"],["png","image/png"],["webp","image/webp"],["jpg","image/jpeg"],["jpeg","image/jpeg"]])("serves %s as %s",async(ext,mime)=>{
    const response=await fetch(`${base}/scene/agents/example.${ext}`);expect(response.headers.get("content-type")).toBe(mime);expect(await response.text()).toBe("asset");
  });
  it("refuses encoded traversal and keeps the existing full-body response to Range",async()=>{
    const traversal=await fetch(`${base}/network/..%2f..%2fpackage.json`);expect(traversal.status).toBe(403);
    const range=await fetch(`${base}/network/network.json`,{headers:{Range:"bytes=0-3"}});expect(range.status).toBe(200);expect(await range.text()).toBe('{"version":1}');
  });
});
