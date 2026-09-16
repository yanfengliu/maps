/**
 * harness: tools/visual/sweep.spec.ts owns world/control acceptance. This isolated
 * fixture loads the shipping agent renderer and real exported assets to inspect
 * shader deformation, orientation, wheel phase and LOD before city integration.
 * Its six actors do not establish population, simulation or performance gates.
 */
import { AmbientLight, Color, DirectionalLight, Mesh, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, Scene, WebGLRenderer } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createAgentRenderer } from "../../src/agents/render/agents.js";
import type { AgentPoseBuffers, AgentPoseSnapshot, VehiclePoseBuffers } from "../../src/world/agent-poses.js";
import { WORLD_STYLES, worldStyle } from "../../src/world/styles.js";
import { createStylePicker } from "../../src/ui/style-picker.js";

const snapshot = (): AgentPoseSnapshot => ({ position: new Float32Array(9), supportNormal: new Float32Array([0,1,0,0,1,0,0,1,0]), yaw: new Float32Array(3), travelledMetres: new Float64Array(3), generation: new Uint32Array(3) });
const population = (): AgentPoseBuffers => ({ count: 3, previous: snapshot(), current: snapshot(), active: new Uint8Array([1,1,1]), speedMps: new Float32Array([1.1,1.1,1.1]), scale: new Float32Array([1,1,1]), variant: new Uint8Array([0,1,2]) });
const vehiclePopulation = (): VehiclePoseBuffers => ({ ...population(), previous: { ...snapshot(), wheelOffsets: new Float32Array(12), frontSteeringRadians: new Float32Array(3) }, current: { ...snapshot(), wheelOffsets: new Float32Array(12), frontSteeringRadians: new Float32Array(3) } });
const poses = { pedestrians: population(), vehicles: vehiclePopulation() };
const scene = new Scene();
scene.background = new Color(0xbac7d3);
scene.add(new AmbientLight(0xffffff,1.8));
const sun = new DirectionalLight(0xffefdb,3.2);
sun.position.set(-6,10,7);
scene.add(sun);
const floor = new Mesh(new PlaneGeometry(180,180),new MeshStandardMaterial({color:0x929a99,roughness:1}));
floor.rotation.x=-Math.PI/2;
floor.position.y=-.006;
scene.add(floor);
const camera = new PerspectiveCamera(45,innerWidth/innerHeight,.05,300);
const renderer = new WebGLRenderer({antialias:true});
renderer.setPixelRatio(1);
renderer.setSize(innerWidth,innerHeight);
document.body.append(renderer.domElement);
const controls = new OrbitControls(camera,renderer.domElement);
controls.enableDamping=false;
const panel=document.createElement("div");
panel.style.cssText="position:fixed;top:12px;left:12px;padding:12px;background:#fffffff0;font:14px system-ui;border-radius:8px;display:flex;gap:8px;align-items:center";
panel.innerHTML='<label>Subject <select aria-label="Subject"><option>Pedestrians</option><option>Vehicles</option></select></label><label>View <select aria-label="View"><option>Near</option><option>Medium</option><option>Far</option></select></label><button type="button">Step motion</button><output id="status">Loading assets</output>';
document.body.append(panel);
const subject=panel.querySelector<HTMLSelectElement>('[aria-label="Subject"]')!;
const view=panel.querySelector<HTMLSelectElement>('[aria-label="View"]')!;
const status=panel.querySelector<HTMLOutputElement>("output")!;
let time=0;
const agents=await createAgentRenderer(poses,worldStyle("satellite"));
scene.add(agents.group);
const picker=createStylePicker({styles:WORLD_STYLES,initialStyle:"satellite",onChange:(id)=>{agents.setStyle(worldStyle(id));draw();}});
document.body.append(picker.element);

function poseFixture(): void {
  const vehicle=subject.value==="Vehicles";
  for(const [kind,population] of Object.entries(poses)) for(let slot=0;slot<3;slot++) {
    const car=kind==="vehicles";
    population.active[slot]=Number(car===vehicle);
    population.current.position[slot*3]=(slot-1)*(car?5.5:1.15);
    population.current.position[slot*3+2]=car?(slot===2?-3:0)+time:time*1.1;
    population.current.travelledMetres[slot]=car?time:time*1.1;
    population.previous.position.set(population.current.position);
    population.previous.travelledMetres.set(population.current.travelledMetres);
  }
}
function draw(): void {
  poseFixture();
  agents.update(1,camera,time);
  renderer.render(scene,camera);
  status.value=`Ready: ${agents.renderedPedestrians} people, ${agents.renderedVehicles} vehicles; ${time.toFixed(3)}s`;
  document.body.dataset["ready"]="true";
}
function frame(): void {
  const distance=subject.value==="Vehicles"?22:({Near:4.5,Medium:30,Far:90}[view.value]??4.5);
  camera.position.set(distance*.12,subject.value==="Vehicles"?6:1.65,distance);
  controls.target.set(0,subject.value==="Vehicles"?1.3:.9,0);
  controls.update();
  draw();
}
subject.addEventListener("change",()=>{time=0;frame();});
view.addEventListener("change",frame);
panel.querySelector("button")!.addEventListener("click",()=>{time+=.125;draw();});
controls.addEventListener("change",draw);
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);draw();});
addEventListener("pagehide",()=>{picker.dispose();controls.dispose();agents.dispose();floor.geometry.dispose();(floor.material as MeshStandardMaterial).dispose();renderer.dispose();renderer.forceContextLoss();});
frame();
