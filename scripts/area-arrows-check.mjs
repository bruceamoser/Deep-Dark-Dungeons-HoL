import {expect} from '@playwright/test';
import {drafts,learn} from '../tests/forge-fixture.mjs';
export async function verifyAreaArrows(page){
 const saved=await page.evaluate(()=>structuredClone(window.__ddd.game.snapshot()));
 const draft=structuredClone(drafts[1]);draft.progression.level=10;learn(draft,'marksmanship:2:0');
 try{
 await page.evaluate(d=>{
  const {game:g,scene:s}=window.__ddd;g.pause();g.paths.clear();g.selected=0;g.party[0]=g.hero(d,0);g.mode='combat';g.busy=false;g.pendingDefense=g.pendingProvocation=null;g.woundNotices=[];
  g.map={...g.map,tiles:{},obstacles:{},zones:[],chests:[],rooms:[],lights:[{x:8,z:6,radius:20}],start:{x:1,z:1},exit:{x:14,z:14}};
  for(let x=0;x<16;x++)for(let z=0;z<16;z++)g.map.tiles[`${x},${z}`]={x,z};g.seen=Object.fromEntries(Object.keys(g.map.tiles).map(k=>[k,true]));
  g.party.forEach((h,i)=>Object.assign(h,{x:i?2:5,z:5+i,conditions:[]}));Object.assign(g.party[1],{x:8,z:5});
  g.enemies=[0,1].map(i=>({id:`volley-${i}`,type:'creature-road-bandit',name:`Volley target ${i}`,x:9,z:5+i,hp:100,maxHp:100,conditions:[],reactionUsed:true}));
  g.encounter=g.R.startEncounter([...g.party.map(h=>({id:h.id,side:'players'})),...g.enemies.map(e=>({id:e.id,side:'opposition'}))],[6,6,6]);g.budgets={};g.dice=(n=3)=>Array(n).fill(6);g.supplyDie=()=>1;const ammo=g.supplyItem(g.active,'item-ammunition-bundle');g.active.supplies[ammo.instanceId]=4;
  g.emit('floor');g.emit('change');s.zoom=19;s.resize();s.focusOn({x:8,z:5});
 },draft);
 await page.waitForFunction(()=>window.__ddd.scene.focus.distanceTo(window.__ddd.scene.targetFocus)<.001);
 const before=await page.evaluate(()=>({supplies:{...window.__ddd.game.active.supplies},hp:window.__ddd.game.party[1].survival.hp}));
 await page.getByRole('button',{name:'Actions',exact:false}).click();await page.locator('[data-card="power-barbed-arrow"]').click();
 const p=await page.evaluate(()=>{const s=window.__ddd.scene,v=s.camera.position.clone().set(9*2.4,0,5*2.4).project(s.camera);return {x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2};});
 await page.mouse.move(p.x,p.y);await expect(page.locator('#power-target-hint')).toContainText('Volley target 0');await expect(page.locator('#power-target-hint')).toContainText('Volley target 1');
 await page.screenshot({path:'test-results/area-arrows-preview.png'});
 await page.keyboard.press('Escape');expect(await page.evaluate(()=>window.__ddd.game.active.supplies)).toEqual(before.supplies);expect(await page.evaluate(()=>window.__ddd.game.encounter.current)).toBeNull();
 await page.getByRole('button',{name:'Actions',exact:false}).click();await page.locator('[data-card="power-barbed-arrow"]').click();const current=await page.evaluate(()=>{const s=window.__ddd.scene,v=s.camera.position.clone().set(9*2.4,0,5*2.4).project(s.camera);return{x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2};});
 await page.mouse.click(current.x,current.y);

 await expect.poll(()=>page.evaluate(()=>window.__ddd.game.enemies.every(e=>e.hp<100&&e.conditions.some(c=>c.key==='bleeding'))),{timeout:10000}).toBe(true);
 expect(await page.evaluate(()=>window.__ddd.game.supplyItem(window.__ddd.game.active,'item-ammunition-bundle'))).toBeFalsy();
 expect(await page.evaluate(()=>window.__ddd.game.party[1].survival.hp)).toBe(before.hp);expect(await page.evaluate(()=>window.__ddd.game.budget.remaining.main)).toBe(0);
 console.log('Area arrow pointer preview, free cancellation, two-enemy hit, ally safety and action/ammo resolution passed.');
 }finally{while(await page.locator('.supply-alert button').count()) await page.locator('.supply-alert button').click();if(await page.evaluate(()=>!!window.__ddd.selectedAction || document.querySelector('#modal-root').children.length>0)) await page.keyboard.press('Escape');await page.evaluate(saved=>{const g=window.__ddd.game;delete g.dice;delete g.supplyDie;g.load(saved,{resume:false});g.emit('floor');g.emit('change');},saved);}
}
