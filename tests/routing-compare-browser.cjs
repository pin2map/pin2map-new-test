const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{const base=process.env.PIN2MAP_TEST_URL||'https://pin2map.github.io/pin2map-new-test/preview/';
for(const [name,engine] of [['Chromium',chromium],['WebKit',webkit]]){
const browser=await engine.launch({headless:true,args:name==='Chromium'?['--no-sandbox']:[]});
try{const page=await browser.newPage({viewport:{width:name==='Chromium'?1200:390,height:820},acceptDownloads:true,serviceWorkers:'allow'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
// Regression: start from installed PWA context, where old /preview/ compare navigation
// could silently serve the normal app via the SW's navigation fallback.
await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForFunction(()=>navigator.serviceWorker?.controller?.scriptURL.includes('/preview/sw.js'),{timeout:90000});
assert.match(await page.evaluate(()=>navigator.serviceWorker.controller.scriptURL),/\/preview\/sw\.js/);
await page.goto(new URL('../route-lab/?smoke='+Date.now(),base).href,{waitUntil:'load',timeout:30000});
assert.equal(await page.evaluate(()=>navigator.serviceWorker.controller),null,'Standalone route lab must not be controlled by preview PWA SW');
assert.equal(await page.locator('header').innerText().then(x=>x.includes('Interner Routenvergleich')),true,'Must not accidentally show v330 map');

await page.waitForFunction(()=>window.Pin2MapRouteComparisonTest?.caseCount===12,{timeout:18000});
assert.equal(await page.locator('#case option').count(),12);
assert.equal(await page.locator('#routes input[type=radio]').count(),7);
assert.equal(await page.locator('#map.leaflet-container').count(),1);
assert.deepEqual(errors,[]);
await page.selectOption('#case',name==='Chromium'?'9':'10');
await page.locator('#go').click();
await page.waitForFunction(()=>!document.getElementById('go').disabled,{timeout:90000});
const loaded=await page.locator('#routes input[type=radio]:not([disabled])').count();
assert.ok(loaded>=5,'Expected core live route profiles for Stuttgart-Grenoble: '+name+' '+await page.locator('#status').innerText()+'; '+await page.locator('#routes').innerText());
assert.ok(await page.locator('#routes').innerText().then(t=>t.includes('Maut möglichst vermeiden')),'Toll control must be displayed');
await page.locator('#all').click();
assert.ok(await page.locator('#map .leaflet-interactive').count()>=loaded,'All available route lines must display');
await page.locator('#routes input[value="2"]').check();
await page.selectOption('#rating','umweg');await page.fill('#note','Testbewertung – unnötiger Umweg');
await page.locator('#save').click();
const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export').click()]);
assert.match(download.suggestedFilename(),/routenbewertungen\.json/);
const val=await download.createReadStream();let str='';for await(const chunk of val)str+=chunk.toString();
const json=JSON.parse(str);assert.equal(json.evaluations[0].rating,'umweg');assert.equal(json.evaluations[0].variant,2);
assert.deepEqual(errors,[]);console.log('PASS '+name+' installed-PWA isolation, published map, live Stuttgart-Grenoble routes, overlay, evaluation and JSON export');
await page.close()}finally{await browser.close()}
}
})().catch(e=>{console.error(e.stack);process.exitCode=1});