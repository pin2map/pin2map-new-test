const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{const base=process.env.PIN2MAP_TEST_URL||'https://pin2map.github.io/pin2map-new-test/preview/';
for(const [name,engine] of [['Chromium',chromium],['WebKit',webkit]]){
const browser=await engine.launch({headless:true,args:name==='Chromium'?['--no-sandbox']:[]});
try{const page=await browser.newPage({viewport:{width:name==='Chromium'?1200:390,height:820},acceptDownloads:true,serviceWorkers:'block'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(new URL('routing-compare.html?smoke='+Date.now(),base).href,{waitUntil:'load',timeout:30000});
await page.waitForFunction(()=>window.Pin2MapRouteComparisonTest?.caseCount===4,{timeout:18000});
assert.equal(await page.locator('#case option').count(),4);
assert.equal(await page.locator('#routes input[type=radio]').count(),4);
assert.equal(await page.locator('#map.leaflet-container').count(),1);
assert.deepEqual(errors,[]);
await page.selectOption('#case','3');
await page.locator('#go').click();
await page.waitForFunction(()=>!document.getElementById('go').disabled,{timeout:90000});
const loaded=await page.locator('#routes input[type=radio]:not([disabled])').count();
assert.equal(loaded,4,'All four live route variants must load on Stuttgart city comparison');
await page.locator('#all').click();
assert.equal(await page.locator('#map .leaflet-interactive').count()>=4,true,'All four route lines must display');
await page.locator('#routes input[value="2"]').check();
await page.selectOption('#rating','umweg');await page.fill('#note','Testbewertung – unnötiger Umweg');
await page.locator('#save').click();
const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export').click()]);
assert.match(download.suggestedFilename(),/routenbewertungen\.json/);
const val=await download.createReadStream();let str='';for await(const chunk of val)str+=chunk.toString();
const json=JSON.parse(str);assert.equal(json.evaluations[0].rating,'umweg');assert.equal(json.evaluations[0].variant,2);
assert.deepEqual(errors,[]);console.log('PASS '+name+' published map, four live routes, overlay, evaluation and JSON export');
await page.close()}finally{await browser.close()}
}
})().catch(e=>{console.error(e.stack);process.exitCode=1});