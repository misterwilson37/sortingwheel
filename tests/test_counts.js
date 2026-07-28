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

const cases={
  'healthy':            [['Accomodore','99'],['Callidus','85'],['Princeps','97'],['Vevaios','102']],
  'IMPORTRANGE broken': [['Accomodore','#REF!'],['Callidus','#REF!'],['Princeps','#REF!'],['Vevaios','#REF!']],
  'one #N/A':           [['Accomodore','99'],['Callidus','#N/A'],['Princeps','97'],['Vevaios','102']],
  'blank cell':         [['Accomodore','99'],['Callidus',''],['Princeps','97'],['Vevaios','102']],
  'missing rows':       [['Accomodore','99'],['Callidus','85']],
  'loading spinner':    [['Accomodore','Loading...'],['Callidus','Loading...'],['Princeps','97'],['Vevaios','102']],
};
(async()=>{
  for (const [label,rows] of Object.entries(cases)){
    w.sheetsRequest=async()=>({values:rows});
    const ok=await w.loadCounts();
    console.log(`${label.padEnd(20)} valid=${String(ok).padEnd(5)} counts=[${s.counts}]  ${ok?'':'-> '+s.countsProblem}`);
  }
  // does startSort refuse?
  console.log('\nBlocking check:');
  s.countsValid=false; s.countsProblem='Callidus (#REF!)';
  s.ceremonyPhase='input';
  w.document.getElementById('studentName').value='Test Student';
  w.sessionStorage.setItem('sortingWheel_token','t');
  w.sessionStorage.setItem('sortingWheel_tokenExpiry',String(Date.now()+600000));
  s.accessToken='t';
  await w.startSort();
  const err=w.document.getElementById('errorBanner').classList.contains('visible');
  console.log('  startSort with invalid counts -> blocked:', err?'YES':'*** NO, PROBLEM ***');
  console.log('  currentSort left null (no ceremony started):', s.currentSort===null?'yes':'*** no ***');
  console.log('\nOverall:', s.currentSort===null ? 'PASS' : '*** FAIL');
})();
