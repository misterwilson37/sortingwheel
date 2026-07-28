const path=require('path');
const DIR=path.join(__dirname,'..')+path.sep;
const {JSDOM}=require('jsdom'); const fs=require('fs'); const vm=require('vm');
const dir=DIR;
const html=fs.readFileSync(dir+'index.html','utf8');
const animjs=fs.readFileSync(dir+'animations.js','utf8');
const inline=/<script>\n([\s\S]*)\n<\/script>/.exec(html)[1];

const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://sortingwheel.misterwilson.org/',pretendToBeVisual:true});
const w=dom.window;
w.firebase={initializeApp(){},auth(){return{onAuthStateChanged(){},getRedirectResult(){return Promise.resolve(null)},signOut(){}}},storage(){return{ref(){}}}};
w.firebase.auth.GoogleAuthProvider=function(){this.addScope=()=>{}};
w.FIREBASE_CONFIG={}; w.confetti=()=>{};
// canvas stub
const stubCtx=new Proxy({},{get:(t,p)=>{ if(p==='canvas')return{width:800,height:600}; if(p==='measureText')return()=>({width:10}); if(p==='createLinearGradient'||p==='createRadialGradient')return()=>({addColorStop(){}}); return ()=>{}; }});
w.HTMLCanvasElement.prototype.getContext=()=>stubCtx;

const ctx=dom.getInternalVMContext();
vm.runInContext(animjs, ctx);                       // animations.js first
console.log('animations.js loaded, factory present:', typeof w.createSortingWheelAnimations);
vm.runInContext(inline+'\n;globalThis.state=state;globalThis.animations=animations;globalThis.spinRoller=spinRoller;globalThis.ANIMATION_META=ANIMATION_META;globalThis.buildRollerStrip=buildRollerStrip;', ctx);
const s=w.state;
console.log('inline script ran. wiring ->',
  'ANIMATION_META keys:', Object.keys(w.ANIMATION_META||{}).length,
  '| animations:', Object.keys(w.animations||{}).length,
  '| spinRoller:', typeof w.spinRoller,
  '| buildRollerStrip:', typeof w.buildRollerStrip);

s.houses=[
 {name:'Accomodore',color:'#DEDEDE',logoUrl:null},
 {name:'Callidus',  color:'#6B7B8D',logoUrl:null},
 {name:'Princeps',  color:'#4B9CD3',logoUrl:null},
 {name:'Vevaios',   color:'#2C2C2C',logoUrl:null},
];

// speed up: make setTimeout fire fast so animations complete
const realST=w.setTimeout;
w.setTimeout=(fn,ms)=>realST(fn, Math.min(ms||0, 5));

(async()=>{
  const keys=Object.keys(w.animations);
  console.log('\nInvoking each animation with target index 1 (Callidus):');
  let fails=0;
  for(const k of keys){
    try{
      const p=w.animations[k](1);
      if(!(p instanceof Promise) && !(p&&typeof p.then==='function')) throw new Error('did not return a Promise');
      await p;
      console.log(`  ${k.padEnd(11)} resolved OK`);
    }catch(e){ fails++; console.log(`  ${k.padEnd(11)} *** THREW: ${e.message}`); }
  }
  try{
    await w.spinRoller(1);
    console.log(`  ${'roller'.padEnd(11)} resolved OK`);
  }catch(e){ fails++; console.log(`  ${'roller'.padEnd(11)} *** THREW: ${e.message}`); }

  console.log('\ngetHouses injection check — animations read houses through the factory:');
  s.houses=[{name:'OnlyOne',color:'#ff0000',logoUrl:null},{name:'Two',color:'#00ff00',logoUrl:null}];
  try{ await w.animations.shields(0); console.log('  2-house config OK (no hardcoded 4)'); }
  catch(e){ fails++; console.log('  *** 2-house config threw:',e.message); }

  console.log(fails===0 ? '\nALL ANIMATIONS PASS' : `\n*** ${fails} FAILURE(S) ***`);
})();
