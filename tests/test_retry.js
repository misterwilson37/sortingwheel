const path=require('path');
const DIR=path.join(__dirname,'..')+path.sep;
const {JSDOM}=require('jsdom'); const fs=require('fs'); const vm=require('vm');
const html=fs.readFileSync(DIR+'index.html','utf8');
const js=/<script>\n([\s\S]*)\n<\/script>/.exec(html)[1];
const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://sortingwheel.misterwilson.org/',pretendToBeVisual:true});
const w=dom.window;
w.firebase={initializeApp(){},auth(){return{onAuthStateChanged(){},getRedirectResult(){return Promise.resolve(null)},signOut(){}}},storage(){return{ref(){}}}};
w.firebase.auth.GoogleAuthProvider=function(){this.addScope=()=>{}};
w.FIREBASE_CONFIG={}; w.confetti=()=>{};
const __ctx = dom.getInternalVMContext();
vm.runInContext(fs.readFileSync(DIR+'animations.js','utf8'), __ctx);
vm.runInContext(js+'\n;globalThis.state = state;', __ctx);
const s=w.state;
s.houses=['Accomodore','Callidus','Princeps','Vevaios'].map(n=>({name:n}));
s.sheetId='x';
const good=[['Accomodore','99'],['Callidus','85'],['Princeps','97'],['Vevaios','102']];
const loading=[['Accomodore','Loading...'],['Callidus','Loading...'],['Princeps','Loading...'],['Vevaios','Loading...']];
const ref=[['Accomodore','#REF!'],['Callidus','#REF!'],['Princeps','#REF!'],['Vevaios','#REF!']];

(async()=>{
  console.log("1. Healthy read");
  w.sheetsRequest=async()=>({values:good});
  console.log("   valid:",await w.loadCounts(),"counts:",s.counts.join('/'));

  console.log("\n2. Transient 'Loading...' then recovers  <- the IMPORTRANGE case");
  let n=0;
  w.sheetsRequest=async()=>({values: (++n===1)?loading:good});
  const t0=Date.now();
  const ok=await w.loadCounts();
  console.log("   valid:",ok,"counts:",s.counts.join('/'),`(recovered after ${Date.now()-t0}ms, ${n} reads)`);
  console.log("   ",ok?"PASS - station keeps working":"*** FAIL - would have stalled ***");

  console.log("\n3. Genuinely broken link (#REF! both times)");
  w.sheetsRequest=async()=>({values:ref});
  const bad=await w.loadCounts();
  console.log("   valid:",bad,"problem:",s.countsProblem);
  console.log("   ",!bad?"PASS - correctly blocks":"*** FAIL ***");

  console.log("\n4. startSort refuses on broken counts");
  s.ceremonyPhase='input';
  w.document.getElementById('studentName').value='Test Student';
  s.accessToken='t';
  w.sessionStorage.setItem('sortingWheel_tokenExpiry',String(Date.now()+600000));
  await w.startSort();
  console.log("   blocked:", w.document.getElementById('errorBanner').classList.contains('visible')?'YES':'*** NO ***',
              "| currentSort:", s.currentSort===null?'null (good)':'*** set ***');

  console.log("\n5. Recovery via refresh, then sorting works again");
  w.sheetsRequest=async()=>({values:good});
  await w.loadCounts();
  s.sortMode='target'; s.targetPerHouse=141;
  console.log("   valid:",s.countsValid,"| odds:",w.currentProbabilities().map(x=>(x*100).toFixed(1)+'%').join(' '));
})();
