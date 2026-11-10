import {expect} from '@playwright/test';
import {settingsAction,waitForGame} from './ui-session.mjs';
export async function verifyChallenge(page){
 const saved=await page.evaluate(()=>structuredClone(window.__ddd.game.snapshot()));
 try{
  const before=await page.evaluate(()=>JSON.stringify(window.__ddd.game.enemies));
  await settingsAction(page,'Challenge');await page.locator('#challenge-level').selectOption('perilous');
  await expect(page.locator('#challenge-detail')).toContainText('Heavy opposition');
  await page.screenshot({path:'test-results/challenge-settings.png'});
  await page.locator('#save-challenge').click();
  expect(await page.evaluate(()=>JSON.stringify(window.__ddd.game.enemies))).toBe(before);
  await settingsAction(page,'Save');await page.reload();await waitForGame(page);
  expect(await page.evaluate(()=>window.__ddd.game.campaign.challenge)).toBe('perilous');
  await settingsAction(page,'Challenge');await expect(page.locator('#challenge-level')).toHaveValue('perilous');await page.keyboard.press('Escape');
  console.log('Challenge controls, preserved current enemies and save/reload passed.');
 }finally{await page.evaluate(saved=>{window.__ddd.game.load(saved,{resume:false});window.__ddd.game.emit('change');},saved);}
}
