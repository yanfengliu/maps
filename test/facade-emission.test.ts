/** Bounds: three frozen source-visible panels and five observed blank wall/roof/fascia
 * negatives. Source eligibility, UV/plane/normal exclusion and shader wiring;
 * actual glow and surrounding photometry also require native browser inspection.
 * The complete-plugin UV guard cases require the cached data488 source tile
 * from data:scene; they never fetch it implicitly or skip a missing source.
 */
import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture, Float32BufferAttribute, ShaderLib } from "three";
import { emissionAt, emissionSourceForUrl, prepareEmissionEligibility, validateEmissionRegions } from "../src/scene/facade-emission.js";
import { FACADE_EMISSION_REGIONS } from "../src/scene/facade-emission-regions.js";
import { createFacadeStyle, patchTileMaterials } from "../src/scene/tile-materials.js";
import { worldStyle } from "../src/world/styles.js";
import { FacadeTexturePlugin, DEFAULT_FACADE_OPTIONS } from "../src/scene/facade-textures.js";

const fixture = JSON.parse(await readFile(new URL("./fixtures/facade-emission.json", import.meta.url), "utf8")) as {fixtures: {expected:string|null;tileUri:string;position:{x:number;y:number;z:number};normal:{x:number;y:number;z:number};uv:{x:number;y:number}}[]};
describe("photographic emission requires identified source panels", () => {
  it.each(["identity", "channel1", "flipY", "offset", "rotation", "repeat", "manual-matrix"])("checks original %s UV state through the complete tile plugin", async mode => {
    const region = FACADE_EMISSION_REGIONS[0];
    const source = new URL(`../data/scene/buildings/${region.tileUri}`, import.meta.url);
    let bytes: Buffer;
    try { bytes = await readFile(source); }
    catch (cause) { throw new Error(`Facade plugin gate needs cached ${source.pathname}; run npm run data:fetch then npm run data:scene before npm test. This source-bound test does not download or skip missing data.`, { cause }); }
    const plugin = new FacadeTexturePlugin({ ...DEFAULT_FACADE_OPTIONS, signageIntensity: { value: 1 }, style: createFacadeStyle(worldStyle("satellite")) });
    const root = new Group() as Group & { batchTable: { getDataFromId(id: number): Record<string, unknown> } };
    root.batchTable = { getDataFromId: () => ({ gml_id: region.gmlId }) };
    const geometry = new BoxGeometry();
    geometry.setAttribute("_batchid", new Float32BufferAttribute(new Float32Array(geometry.getAttribute("position").count), 1));
    const closed = vi.fn();
    const texture = new Texture({ width: 1, height: 1, close: closed } as never); texture.flipY = false;
    const material = new MeshStandardMaterial({ map: texture }); root.add(new Mesh(geometry, material));
    if (mode === "channel1") texture.channel = 1;
    if (mode === "flipY") texture.flipY = true;
    if (mode === "offset") texture.offset.set(.2, .3);
    if (mode === "rotation") texture.rotation = .5;
    if (mode === "repeat") texture.repeat.set(2, 1);
    if (mode === "manual-matrix") { texture.matrixAutoUpdate = false; texture.matrix.setUvTransform(.2, .3, 1, 1, 0, 0, 0); }
    // Only image decoding is synthetic. fetchData hashes the actual selected
    // tile bytes; the plugin's cache and processing path are not set directly.
    vi.stubGlobal("fetch", vi.fn(async () => new Response(Uint8Array.from(bytes))));
    vi.stubGlobal("OffscreenCanvas", class { getContext() { return { drawImage() {}, getImageData() { return { data: new Uint8ClampedArray([255, 255, 255, 255]) }; } }; } });
    try {
      await plugin.fetchData(`/scene/buildings/${region.tileUri}`, {});
      const processing = plugin.processTileModel(root, { content: { uri: region.tileUri } });
      if (mode === "identity") {
        await expect(processing).resolves.toBeUndefined();
        expect(material.map).not.toBe(texture);
        expect(geometry.getAttribute("mapsEmitterGroup").getX(0)).toBe(region.group);
        expect(plugin.stats().processed).toBe(1);
      } else {
        await expect(processing).rejects.toThrow(/UV0-orientation.*Re-audit/);
        expect(material.map).toBe(texture);
        expect(plugin.stats().processed).toBe(0);
        expect(closed).not.toHaveBeenCalled();
      }
    } finally {
      vi.unstubAllGlobals(); material.map?.dispose(); if (material.map !== texture) texture.dispose(); material.dispose(); geometry.dispose();
    }
  });
  it("does not intercept relative root tilesets or unrelated LOD requests", () => {
    const plugin = new FacadeTexturePlugin({...DEFAULT_FACADE_OPTIONS,signageIntensity:{value:1},style:createFacadeStyle(worldStyle("satellite"))});
    for (const url of ["/scene/buildings/tileset.json","data/other.b3dm","http://127.0.0.1:4319/scene/buildings/data/other.b3dm"]) expect(plugin.fetchData(url,{})).toBeNull();
    for (const prefix of ["/scene/", "http://127.0.0.1:4319/scene/"]) {
      expect(emissionSourceForUrl(`${prefix}buildings/data/data518.b3dm?cache=1`)?.tileSha256).toBe("5e611688344a50142147c0c60442c893dd8f3a45b10ee264067b0275bb4fa96b");
      expect(emissionSourceForUrl(`${prefix}buildings/data/data488.b3dm`)?.tileSha256).toBe("6960fa916ea7c4702f423ac8f52ab0cfe53963f3846624dbb1625887796ec8e1");
      expect(emissionSourceForUrl(`${prefix}buildings/data/data518-other.b3dm`)).toBeUndefined();
    }
  });
  it("admits three signs in four source views and rejects five observed blank surfaces", () => {
    expect(fixture.fixtures).toHaveLength(9);
    for (const sample of fixture.fixtures) {
      const matches = FACADE_EMISSION_REGIONS.filter(r => r.tileUri === sample.tileUri && emissionAt(r, [sample.position.x,sample.position.y,sample.position.z], [sample.normal.x,sample.normal.y,sample.normal.z], [sample.uv.x,sample.uv.y]) > 0).map(r => r.id);
      expect(matches).toEqual(sample.expected ? [sample.expected] : []);
    }
  });
  it("excludes neighbouring UVs, backs, roofs and a displaced same-colour surface", () => {
    for (const r of FACADE_EMISSION_REGIONS) {
      const uv: [number, number] = [r.uv.reduce((s,p)=>s+p[0],0)/4,r.uv.reduce((s,p)=>s+p[1],0)/4];
      expect(emissionAt(r,r.origin,r.normal,uv)).toBeGreaterThan(0);
      expect(emissionAt(r,r.origin,r.normal,[0.9,0.9])).toBe(0);
      expect(emissionAt(r,r.origin,[0,1,0],uv)).toBe(0);
      expect(emissionAt(r,r.origin,[-r.normal[0],-r.normal[1],-r.normal[2]],uv)).toBe(0);
      expect(emissionAt(r,[r.origin[0]+r.normal[0]*0.031,r.origin[1]+r.normal[1]*0.031,r.origin[2]+r.normal[2]*0.031],r.normal,uv)).toBe(0);
    }
  });
  it("rejects malformed source/polygon records with re-audit guidance", () => {
    const good = FACADE_EMISSION_REGIONS[0];
    for (const value of [null, [null], [1], [{}], [{...good,tileSha256:"bad"}], [{...good,normal:[0,0,0]}], [{...good,uv:[[0,0],[1,1],[0,1],[1,0]]}], [good,good]]) expect(()=>validateEmissionRegions(value)).toThrow(/Facade emission record.*Re-audit/);
    expect(()=>validateEmissionRegions([good,{...good,id:"second-panel-same-building",group:5}])).toThrow(/duplicate-building-binding/);
  });
  it("binds eligibility to GML identity and verified bytes, excluding another LOD with the same batch index", () => {
    const r = FACADE_EMISSION_REGIONS[0];
    const root = new Group() as Group & {batchTable:{getDataFromId(id:number):Record<string,unknown>}};
    root.batchTable = {getDataFromId:id=>({gml_id:id===7?r.gmlId:"bldg_unrelated"})};
    const geometry=new BoxGeometry(),material=new MeshStandardMaterial(),mesh=new Mesh(geometry,material);root.add(mesh);
    const ids = new Float32Array(geometry.getAttribute("position").count);ids.fill(7);ids[0]=8;geometry.setAttribute("_batchid",new Float32BufferAttribute(ids,1));
    try {
      expect(()=>prepareEmissionEligibility(root,r.tileUri,"0".repeat(64))).toThrow(/sha256/);
      prepareEmissionEligibility(root,r.tileUri,r.tileSha256);
      expect(geometry.getAttribute("mapsEmitterGroup").getX(0)).toBe(0);
      expect(geometry.getAttribute("mapsEmitterGroup").getX(1)).toBe(r.group);
      prepareEmissionEligibility(root,"data/another-lod.b3dm",undefined);
      expect(Array.from(geometry.getAttribute("mapsEmitterGroup").array).every(v=>v===0)).toBe(true);
      material.map=new Texture();material.map.flipY=true;
      expect(()=>prepareEmissionEligibility(root,r.tileUri,r.tileSha256)).toThrow(/UV0-orientation/);
    } finally {material.map?.dispose();geometry.dispose();material.dispose();}
  });
  it("the real StandardMaterial emissive term multiplies source eligibility", () => {
    const root=new Group(),material=new MeshStandardMaterial(),geometry=new BoxGeometry();material.map=new Texture();root.add(new Mesh(geometry,material));
    try {
      patchTileMaterials(root,{enabled:true,signageIntensity:{value:1},style:createFacadeStyle(worldStyle("satellite"))});
      const shader={uniforms:{},vertexShader:ShaderLib.standard.vertexShader,fragmentShader:ShaderLib.standard.fragmentShader};
      material.onBeforeCompile(shader as never,{} as never);
      expect(shader.fragmentShader).toContain("mapsPanelEmission(mapsWorld, mapsWorldNormal, mapsSourceUv, mapsSignGroup)");
      expect(shader.fragmentShader).toContain("mapsSignMask * mapsVertical * mapsPanel * mapsSignageIntensity");
      expect(shader.vertexShader).toContain("mapsSignGroup = mapsEmitterGroup");
    } finally {material.map.dispose();geometry.dispose();material.dispose();}
  });
});
