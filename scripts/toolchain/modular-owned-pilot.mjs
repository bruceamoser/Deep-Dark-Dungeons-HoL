// Private assembly fixture. Uses real Mason assembly/materials/clips, no saves.
// Does not promote candidates into the game or distribute licensed source assets.
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const out = process.env.FLD_PILOT_OUTPUT;
if (!out || !path.isAbsolute(out)) throw new Error('Set FLD_PILOT_OUTPUT to a private absolute directory');
const base = process.env.FLD_PILOT_URL ?? 'http://127.0.0.1:5197';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({headless:true,args:['--mute-audio','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  const page = await browser.newPage({viewport:{width:1600,height:900}});
  const errors=[]; page.on('pageerror', e=>errors.push(e.message));
  await page.route('**/__owned-head.glb', r=>r.fulfill({contentType:'model/gltf-binary',path:path.join(out,'goblin-head.glb')}));
  await page.route('**/__owned-pilot', r=>r.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><html><body style="margin:0;background:#172321;color:#e6dec4;font-family:Georgia,serif"><div style="position:absolute;top:28px;left:38px;z-index:2"><div style="letter-spacing:3px;color:#c9ae72;font:12px sans-serif">FOUR LANTERNS DEEP · ASSET WORKSHOP</div><h1 style="font-weight:normal;margin:10px 0">Owned assets · modular goblin fit test</h1><div id="phase" style="color:#a8bab5">Dungeon Mason body, equipment and animations · existing generated goblin head</div></div><div style="position:absolute;bottom:25px;left:38px;font:13px sans-serif;color:#a8bab5">Assembly experiment — not a production replacement. Original purchases preserved.</div></body></html>`}));
  await page.goto(`${base}/__owned-pilot`);
  const initial=await page.evaluate(async()=>{
    const compiled=await(await fetch('/src/view/mason-heroes.mjs')).text();
    const threeURL=compiled.match(/import \* as T from "([^"]+)"/)[1];
    const T=await import(threeURL);
    const {GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
    const {masonAppearance}=await import('/src/view/mason-heroes.mjs');
    const loader=new GLTFLoader();
    const [asset,headAsset]=await Promise.all([loader.loadAsync('/assets/licensed/dungeon-mason/hero.glb'),loader.loadAsync('/__owned-head.glb')]);
    const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1600,900);renderer.setPixelRatio(1);
    renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;document.body.append(renderer.domElement);
    const scene=new T.Scene();scene.background=new T.Color('#172321');
    scene.add(new T.HemisphereLight(0xd9e6f5,0x605442,2.0));
    const light=new T.DirectionalLight(0xffe5bd,3);light.position.set(-3,6,5);light.castShadow=true;
    light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-6,right:6,top:5,bottom:-5});light.shadow.bias=-.0002;scene.add(light);
    const fill=new T.DirectionalLight(0xa6d9fa,1.6);fill.position.set(4,3,-3);scene.add(fill);
    const camera=new T.OrthographicCamera(-4.6,4.6,2.59,-2.59,.1,50);camera.position.set(0,3.5,8);camera.lookAt(0,.85,0);
    const ground=new T.Mesh(new T.PlaneGeometry(30,30),new T.MeshStandardMaterial({color:0x233431,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.015;ground.receiveShadow=true;scene.add(ground);
    const specs=[
      {name:'Existing human',classId:'class-blade',kind:'sword',human:true},
      {name:'Goblin · sword & shield',classId:'class-blade',kind:'sword'},
      {name:'Goblin · two-handed gear',classId:'class-protector',kind:'spear'},
      {name:'Goblin · bow',classId:'class-shadow',kind:'bow'},
    ];
    const actors=[];
    for(const [i,s] of specs.entries()){
      const items=s.kind==='bow'?[{catalogId:'item-ordinary-ranged-weapon',carried:true,held:true,hands:2}]:[{catalogId:'item-ordinary-melee-weapon',carried:true,held:true,hands:s.kind==='spear'?2:1}];
      if(s.kind==='sword')items.push({catalogId:'item-ordinary-shield',carried:true,held:true});
      const hero={name:s.name,draft:{classId:s.classId,ancestryId:s.human?'ancestry-human':'ancestry-goblin',appearance:{skin:s.human?'#d4a27b':'#87ad36',mason:{headpiece:'none',hair:'none',brows:'none',twoHandType:'spear',twoHandVariant:'Spear01',shield:'Shield05'}}},preview:{inventory:{items}}};
      const {model,clips}=masonAppearance(asset,hero,new Map());
      model.updateMatrixWorld(true);
      if(!s.human){
        const original=model.getObjectByName('Head01_Male');
        const target=new T.Box3().setFromObject(original);const size=target.getSize(new T.Vector3());
        const replacement=headAsset.scene.clone(true);replacement.name='Goblin head attachment';
        const b=new T.Box3().setFromObject(replacement),hs=b.getSize(new T.Vector3());
        const scale=size.y*1.12/hs.y;replacement.scale.setScalar(scale);
        const center=b.getCenter(new T.Vector3()).multiplyScalar(scale);
        const dest=target.getCenter(new T.Vector3());
        replacement.position.copy(dest.sub(center));replacement.position.y-=size.y*.04;
        model.traverse(o=>{if(/^(Head0|Eye|Mouth|Eyebrow|Hair)/.test(o.name))o.visible=false;});
        // Attach in world rest space. Bone.attach preserves the fitted transform;
        // all body/gear bind matrices and authored animation tracks stay intact.
        scene.add(replacement);scene.updateMatrixWorld(true);
        model.getObjectByName('head').attach(replacement);
      }
      model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;for(const m of (Array.isArray(o.material)?o.material:[o.material]))m.roughness=.3;}});
      const root=new T.Group();root.add(model);root.position.x=(i-1.5)*2.15;root.rotation.y=.12;scene.add(root);
      const mixer=new T.AnimationMixer(model);actors.push({s,root,model,clips,mixer});
      const label=document.createElement('div');label.textContent=s.name;Object.assign(label.style,{position:'absolute',bottom:'138px',left:`${i*400}px`,width:'400px',textAlign:'center',font:'15px Georgia',color:'#ddc99c'});document.body.append(label);
    }
    function frame(phase,t){
      for(const a of actors){a.mixer.stopAllAction();
        const name=phase==='attack'?(a.s.kind==='bow'?'2H_Ranged_Shoot':'1H_Melee_Attack_Slice_Diagonal'):({idle:'Idle',walk:'Walking_A',hit:'Hit_A',death:'Death_A_Pose'}[phase]);
        const clip=a.clips.find(c=>c.name===name);if(!clip)throw Error(`Missing ${name}`);
        const action=a.mixer.clipAction(clip);action.reset().play();a.mixer.setTime(t*clip.duration);
      }
      scene.updateMatrixWorld(true);renderer.render(scene,camera);
      document.getElementById('phase').textContent=`${phase.toUpperCase()} · Dungeon Mason body, equipment and animation · fitted goblin head`;
    }
    window.pilot={frame,actors,renderer,scene,camera};frame('idle',.3);
    return actors.map(a=>({name:a.s.name,body:a.model.children.filter(c=>c.visible).map(c=>c.name),clips:a.clips.map(c=>c.name)}));
  });
  await page.screenshot({path:path.join(out,'owned-modular-lineup.png')});
  const frames=path.join(out,'frames');await fs.mkdir(frames,{recursive:true});
  let index=0;
  for(const phase of ['idle','walk','attack','hit','death']){
    for(let i=0;i<24;i++){
      await page.evaluate(({phase,t})=>window.pilot.frame(phase,t),{phase,t:i/24});
      await page.screenshot({path:path.join(frames,`${String(index++).padStart(4,'0')}.png`)});
    }
    await page.screenshot({path:path.join(out,`owned-modular-${phase}.png`)});
  }
  await fs.writeFile(path.join(out,'assembly-report.json'),JSON.stringify({status:'experimental assembly; inspection required',actors:initial,pageErrors:errors,frames:index,performance:'Not measured; software-rendered fixture'},null,2));
  if(errors.length)throw Error(errors.join('\n'));
  console.log(`Rendered ${index} frames to ${out}`);
}finally{await browser.close();}
