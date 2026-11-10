import test from 'node:test';
import assert from 'node:assert/strict';
import {arena,drafts,learn} from './forge-fixture.mjs';
function setup(node){
 const d=structuredClone(drafts[1]);d.progression.level=10;learn(d,node);const g=arena(d);
 Object.assign(g.active,{x:5,z:5});Object.assign(g.party[1],{x:8,z:5});
 g.enemies=[0,1,2].map((i)=>({id:`area-${i}`,name:`Target ${i}`,x:i===2?12:9,z:i===1?6:5,hp:100,maxHp:100,conditions:[],reactionUsed:true}));
 g.encounter=g.R.startEncounter([...g.party.map(h=>({id:h.id,side:'players'})),...g.enemies.map(e=>({id:e.id,side:'opposition'}))],[6,6,6]);
 return g;
}
for(const [power,node,status] of [
 ['power-barbed-arrow','marksmanship:2:0','bleeding'],
 ['power-forge-flaming-arrow','intersection:flaming-arrow','burning'],
 ['power-forge-thorn-arrow','intersection:thorn-arrow','slowed'],
])test(`${power} previews and hits clustered enemies, spares allies, spends action/ammo once`,()=>{
 const g=setup(node),h=g.active,ammo=g.supplyItem(h,'item-ammunition-bundle'),ally=g.party[1].survival.hp;
 let checks=0;g.checkSupply=()=>checks++;
 const p=g.powerPlan(power,{x:9,z:5});assert.equal(p.cells.length,9);assert.equal(p.recipients.length,2);assert.equal(g.encounter.current,null);
 g.useAbility(power,{x:9,z:5});assert.equal(g.budget.remaining.main,0);assert.equal(checks,1);
 assert.ok(g.enemies[0].hp<100);assert.ok(g.enemies[1].hp<100);assert.equal(g.enemies[2].hp,100);assert.equal(g.party[1].survival.hp,ally);
 assert.ok(g.enemies[0].conditions.some(c=>c.key===status));assert.ok(g.enemies[1].conditions.some(c=>c.key===status));
});
test('area arrows reject empty ammunition before spending',()=>{
 const g=setup('marksmanship:2:0'),ammo=g.supplyItem(g.active,'item-ammunition-bundle');g.active.supplies[ammo.instanceId]=0;
 assert.throws(()=>g.useAbility('power-barbed-arrow',{x:9,z:5}),/ammunition/);assert.equal(g.encounter.current,null);
});
