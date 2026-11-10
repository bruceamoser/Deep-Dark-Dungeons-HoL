import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,C,R} from './forge-fixture.mjs';
import {Game} from '../src/core/game.mjs';
import {xpForLevel,legacyXPForLevel,levelForXP} from '../src/core/experience.mjs';
test('new curve reaches approved depth targets under measured typical exploration',()=>{
 for(const [xp,level] of [[9579,1],[10000,2],[32380,2],[32500,3],[85784,4]]) assert.equal(levelForXP(xp),level);
 for(let n=2;n<30;n++) assert.ok(xpForLevel(n+1)-xpForLevel(n)>xpForLevel(n)-xpForLevel(n-1));
});
test('legacy migration preserves earned level and fractional progress across party/reserve/fallen and is idempotent',()=>{
 const g=fresh(),saved=structuredClone(g.snapshot());saved.xpCurve=2;
 for(const h of saved.party){h.earnedLevel=12;h.xp=legacyXPForLevel(12)+Math.floor((legacyXPForLevel(13)-legacyXPForLevel(12))*.4);}
 const reserve=structuredClone(saved.party[0]);reserve.heroId='legacy-reserve';saved.reserve=[reserve];
 const dead=structuredClone(saved.party[1]);dead.heroId='legacy-dead';dead.survival.status='dead';dead.survival.hp=0;
 saved.fallenHeroes=[{heroId:dead.heroId,hero:dead,depth:3,expedition:1,cause:'test'}];
 const copy=new Game(R,C);copy.load(saved,{resume:false});
 for(const h of [...copy.party,...copy.campaign.reserve,copy.campaign.fallenHeroes[0].hero]){
 assert.equal(h.earnedLevel,12);assert.equal(levelForXP(h.xp),12);
 const fraction=(h.xp-xpForLevel(12))/(xpForLevel(13)-xpForLevel(12));assert.ok(Math.abs(fraction-.4)<.001);
 }
 const second=new Game(R,C);second.load(structuredClone(copy.snapshot()),{resume:false});assert.deepEqual(second.party.map(h=>h.xp),copy.party.map(h=>h.xp));
});
