/** Playwright CLI probe. Caller owns the browser/server and provides an existing
 * output directory. Real controls only; the frozen observer is read, never set.
 * Screenshots still require comparison by a reviewer against primary sources. */
export async function verifyRealism(page,{directory}) {
 await page.setViewportSize({width:1600,height:1100});await page.emulateMedia({reducedMotion:'reduce'});
 const state=()=>page.evaluate(()=>({camera:window.__bayMap.camera,details:window.__bayMap.details,errors:window.__bayMap.errors}));
 const ready=()=>page.waitForFunction(()=>window.__bayMap?.details?.ready,null,{timeout:45000});
 const search=page.getByRole('combobox',{name:'Search places'}),records=[];
 const face=async target=>{const current=(await state()).camera.bearing,delta=((target-current+540)%360)-180;if(Math.abs(delta)<.1)return;const b=await page.getByRole('button',{name:'Face north',exact:true}).boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+delta/1.2,y,{steps:24});await page.mouse.up();await page.waitForTimeout(250);};
 const capture=async slug=>{await ready();await page.waitForTimeout(450);const s=await state();if(s.errors.length||s.details.error)throw new Error(slug+' '+JSON.stringify(s));await page.screenshot({path:directory+'/'+slug+'.png'});records.push({slug,...s});};
 const go=async name=>{await search.fill(name);await page.getByRole('option').first().click();await ready();await page.waitForTimeout(500);};
 await ready();await capture('stanford-start');
 const cases=[['Stanford Stadium','stadium-exterior',45,1],['Mechanical Engineering Administration','engineering',-28,1],['Braun Music Center','braun',-28,1],['Roth Way Garage','roth',-28,1],['Hoover Pavilion Garage','hoover-garage',140,0],['Mechanical Engineering Laboratory','merl',-28,1],['Sapp Center','sapp',-28,0],['Varian Physics','varian',-28,0]];
 for(const [name,slug,bearing,zoom] of cases){
  await go(name);await face(bearing);for(let i=0;i<zoom;i++)await page.getByRole('button',{name:'Zoom in',exact:true}).click();
  const close=page.getByRole('button',{name:'Close place details',exact:true});if(await close.isVisible())await close.click();
  await capture(slug);
  if(['stadium-exterior','engineering','roth'].includes(slug)){await face(bearing+137);await capture(slug+'-opposite');}
 }
 // Seeded angles make broad spot checks repeatable without only reviewing
 // the exact flattering views used while authoring the model.
 let seed=20261108;for(const name of ['Roble Hall','Bing Wing','Hoover Tower']){seed=(1664525*seed+1013904223)>>>0;await go(name);await face(seed%360-180);await capture('sample-'+name.toLowerCase().replaceAll(' ','-'));}
 await go('Roth Way Garage');
 const start=await page.evaluate(()=>performance.now());await page.keyboard.down('d');await page.waitForTimeout(900);await page.keyboard.up('d');await page.waitForTimeout(250);
 const motion=await page.evaluate(start=>{const gl=document.querySelector('canvas').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return {frames:window.__bayMap.rendering.motionFrames.filter(t=>t>=start),gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unknown'};},start);
 await page.getByRole('button',{name:'Explore Memorial Church',exact:true}).click();await page.waitForTimeout(500);await page.getByRole('button',{name:'Explore the interior',exact:true}).click();await ready();
 await page.getByRole('button',{name:'Organs',exact:true}).click();await capture('church-organs');
 const before=(await state()).camera.center;await page.keyboard.down('w');await page.waitForTimeout(180);await page.keyboard.up('w');if(JSON.stringify(before)===JSON.stringify((await state()).camera.center))throw new Error('Church WASD failed');
 await page.getByRole('checkbox',{name:'Show ceiling structure'}).check();await capture('church-ceiling');
 // Exercise graphics loss through a temporary actual control, never camera APIs.
 await page.evaluate(()=>{const b=document.createElement('button');b.id='qa-recovery';b.textContent='Test graphics recovery';Object.assign(b.style,{position:'fixed',top:'130px',left:'24px',zIndex:100});b.onclick=()=>{const e=document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context');e.loseContext();setTimeout(()=>e.restoreContext(),400);};document.body.append(b);});
 try{await page.getByRole('button',{name:'Test graphics recovery',exact:true}).click();await page.waitForTimeout(1000);await ready();}finally{await page.locator('#qa-recovery').evaluate(e=>e.remove());}
 await capture('church-recovered');
 await go('Roth Way Garage');await capture('garage-after-interior');
 await page.setViewportSize({width:390,height:844});await go('Roth Way Garage');await capture('phone-garage');
 await page.getByRole('button',{name:'World overview',exact:true}).click();await page.waitForTimeout(600);await page.screenshot({path:directory+'/phone-globe.png'});
 if((await state()).camera.zoom>3)throw new Error('World did not reach globe');
 return {records,motion};
}
