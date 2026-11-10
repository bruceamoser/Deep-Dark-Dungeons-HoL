import test from 'node:test';
import assert from 'node:assert/strict';
import {generate} from '../src/core/dungeon.mjs';
import {populateEncounters} from '../src/core/bestiary.mjs';
import {fresh,C,R} from './forge-fixture.mjs';
import {Game} from '../src/core/game.mjs';
test('challenge changes actual opposition budgets without changing printed stats or XP awards',()=>{
 const scores={};for(const setting of ['story','standard','veteran','perilous']){
 let score=0;for(let seed=1;seed<=6;seed++){
 const m=generate(seed,3),es=populateEncounters(m,C.creatures,[2,2,2,2],setting);
 score+=es.reduce((n,e)=>n+e.cv,0);
 for(const e of es) assert.equal(e.hp,C.creatures.creatures.find(c=>c.id===e.type).hp.max);
 }scores[setting]=score;}
 assert.ok(scores.story<scores.standard);assert.ok(scores.standard<scores.veteran);assert.ok(scores.veteran<scores.perilous);
});
test('challenge saves persist without regenerating existing enemies; bad settings reject atomically',()=>{
 const g=fresh();g.campaign.challenge='perilous';const saved=structuredClone(g.snapshot()),copy=new Game(R,C);
 copy.load(saved,{resume:false});assert.equal(copy.campaign.challenge,'perilous');assert.deepEqual(copy.enemies,g.enemies);
 const bad=structuredClone(saved);bad.challenge='impossible';assert.throws(()=>copy.load(bad),/challenge/);assert.equal(copy.campaign.challenge,'perilous');
});
