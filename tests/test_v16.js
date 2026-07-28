const path=require('path');
const DIR=path.join(__dirname,'..')+path.sep;
const {JSDOM}=require('jsdom'); const fs=require('fs'); const vm=require('vm');
const html=fs.readFileSync(DIR+'index.html','utf8');
const js=/<script>\n([\s\S]*)\n<\/script>/.exec(html)[1];
const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://sortingwheel.misterwilson.org/',pretendToBeVisual:true});
const w=dom.window;
// stub the externals the script touches at load time
w.firebase={initializeApp(){},auth(){return{onAuthStateChanged(){},getRedirectResult(){return Promise.resolve(null)},signOut(){}}},storage(){return{ref(){}}}};
w.firebase.auth.GoogleAuthProvider=function(){this.addScope=()=>{}};
w.FIREBASE_CONFIG={};
w.confetti=()=>{};
// `const state` is lexically scoped, not a window property, so export it.
const __ctx = dom.getInternalVMContext();
vm.runInContext(fs.readFileSync(DIR+'animations.js','utf8'), __ctx);
vm.runInContext(js + '\n;globalThis.state = state;', __ctx);

const s=w.state;
// ---- CONFIG PARSER TEST -------------------------------------------------
console.log("=== Config parser: settings rows below the houses ===");
const fakeRows=[
  ['Key','Value'],['school_name','Ellis Middle School'],['school_colors','#003366,#FFFFFF'],
  ['school_logo_url',''],['school_logo_bg','#ffffff'],['balance_setting','50'],
  ['---HOUSES---','---'],['House Name','House Color','Logo URL'],
  ['Accomodore','#DEDEDE',''],['Callidus','#6B7B8D',''],['Princeps','#4B9CD3',''],['Vevaios','#2C2C2C',''],
  ['sort_mode','target'],['expected_incoming','181'],['target_per_house','141'],
];
w.__rows=fakeRows;
// re-run the parser logic against fakeRows by monkeypatching sheetsRequest
w.sheetsRequest=async()=>({values:fakeRows});
w.loadConfig().then(()=>{
  console.log("houses parsed:", s.houses.map(h=>h.name).join(', '), "  (expect exactly 4)");
  console.log("sortMode:", s.sortMode, " expectedIncoming:", s.expectedIncoming, " targetPerHouse:", s.targetPerHouse);
  console.log("configKeyRows:", JSON.stringify(s.configKeyRows), " (expect sort_mode:13, expected_incoming:14)");
  const pass = s.houses.length===4 && s.sortMode==='target' && s.expectedIncoming===181
            && s.configKeyRows.sort_mode===13 && s.configKeyRows.expected_incoming===14 && s.targetPerHouse===141;
  console.log(pass?"PASS":"*** FAIL ***");

  // ---- BACKWARDS COMPAT: sheet with no new keys ----
  const oldRows=fakeRows.slice(0,12);
  w.sheetsRequest=async()=>({values:oldRows});
  return w.loadConfig();
}).then(()=>{
  console.log("\n=== Backwards compat: sheet with no new keys ===");
  console.log("houses:",s.houses.length,"sortMode:",s.sortMode,"expectedIncoming:",s.expectedIncoming);
  console.log((s.houses.length===4 && s.sortMode==='slider' && s.expectedIncoming===0)?"PASS":"*** FAIL ***");

  // ---- ALGORITHM TEST with real Ellis numbers ----
  console.log("\n=== Live algorithm, real Ellis baseline ===");
  s.houses=[{name:'Accomodore'},{name:'Callidus'},{name:'Princeps'},{name:'Vevaios'}];
  s.counts=[99,85,97,102];
  s.sortMode='target'; s.expectedIncoming=181; s.targetPerHouse=(99+85+97+102+181)/4;
  let p=w.currentProbabilities();
  console.log("target-mode odds:", p.map(x=>(x*100).toFixed(1)+'%').join('  '));
  console.log("sums to 1:", Math.abs(p.reduce((a,b)=>a+b,0)-1)<1e-9 ? "yes":"NO");

  // full simulated registration through the REAL shipped code
  const runs=[];
  for(let tr=0;tr<2000;tr++){
    s.counts=[99,85,97,102]; const seq=[];
    for(let i=0;i<181;i++){ const idx=w.weightedSelect(); s.counts[idx]++; seq.push(idx); }
    let best=1,cur=1;
    for(let i=1;i<seq.length;i++){cur=seq[i]===seq[i-1]?cur+1:1;if(cur>best)best=cur;}
    runs.push({spread:Math.max(...s.counts)-Math.min(...s.counts),run:best,final:s.counts.slice()});
  }
  const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
  console.log("final school gap  avg:",avg(runs.map(r=>r.spread)).toFixed(2),
              " max:",Math.max(...runs.map(r=>r.spread)));
  console.log("longest streak    avg:",avg(runs.map(r=>r.run)).toFixed(1),
              " max:",Math.max(...runs.map(r=>r.run)));
  console.log("example final totals:",runs[0].final.join(' / '));

  // ---- OVERSHOOT FALLBACK: more students than expected ----
  console.log("\n=== Overshoot: 181 expected but 220 show up ===");
  s.counts=[99,85,97,102]; s.targetPerHouse=(383+181)/4;
  for(let i=0;i<220;i++){ const idx=w.weightedSelect(); s.counts[idx]++; }
  console.log("final:",s.counts.join(' / '),"gap:",Math.max(...s.counts)-Math.min(...s.counts));
  console.log(Math.max(...s.counts)-Math.min(...s.counts)<=6?"PASS (stays level)":"*** FAIL ***");

  // ---- expectedIncoming 0 must fall back to slider ----
  console.log("\n=== Guard: target mode with no class size ===");
  s.counts=[99,85,97,102]; s.expectedIncoming=0; s.targetPerHouse=0;
  const q=w.currentProbabilities();
  const blended=w.calculateBlendedProbabilities(50);
  console.log("falls back to slider:", JSON.stringify(q.map(x=>x.toFixed(4)))===JSON.stringify(blended.map(x=>x.toFixed(4)))?"PASS":"*** FAIL ***");
}).catch(e=>console.error("ERROR",e));

