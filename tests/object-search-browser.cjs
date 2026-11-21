"use strict";
/* v275 live gate: predecessor-style compact object-search and immediate filtering. */
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const base=process.env.PIN2MAP_TEST_URL||
 "https://pin2map.github.io/pin2map-new-test/preview/";
(async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.PIN2MAP_CHROMIUM_EXECUTABLE||undefined,args:["--no-sandbox"]});
 try{
  for(const width of [320,375,390,768,1280]){
   const height=width===320?568:width===375?667:width===390?844:width===768?1024:800;
   const context=await browser.newContext({viewport:{width,height},serviceWorkers:"block"});
   const page=await context.newPage(),errors=[];
   page.on("pageerror",err=>errors.push(err.message));
   try{
    await page.goto(base,{waitUntil:"domcontentloaded",timeout:35000});
    await page.waitForFunction(()=>document.documentElement.dataset.pin2mapReady==="true",null,{timeout:30000});
    await page.evaluate(async()=>{
     const dbName=location.pathname.includes("/preview/")?"pin2map-new-preview-v1":"pin2map-new-v1";
     const state=window.Pin2MapProjectModel.defaultProject();
     state.layers[1].visible=false;
     // Keep the test marker in the unobstructed map centre when the original
     // viewport is restored after search; never force-click through map buttons.
     state.viewport={lat:49.01,lng:8.405,zoom:8};
     const d=new Date(),y=new Date(d.getFullYear(),d.getMonth(),d.getDate()-1,12).toISOString();
     const today=new Date(d.getFullYear(),d.getMonth(),d.getDate(),12).toISOString();
     state.pins=[
      {id:"search-today",name:"Karlsruhe Bahnhof",lat:49.01,lng:8.405,layerId:"layer-1",note:"",url:"",createdAt:today,updatedAt:today},
      {id:"search-yesterday",name:"Berlin Mitte",lat:52.52,lng:13.4,layerId:"layer-1",note:"Notizprobe",url:"https://example.com/karlsruhe",createdAt:y,updatedAt:today,gpxAttachment:{filename:"tour.gpx",chains:[[[52.52,13.4],[52.53,13.41]]]}}
     ];
     // Repeated legacy records with one ID must not inflate the visible marker count.
     state.pins.push(...Array.from({length:6},()=>({...state.pins[0]})));
     state.areas=[{id:"search-area",name:"Karlsruhe Testgebiet",layerId:"layer-1",kind:"area",createdAt:today,
      geometry:{type:"Polygon",coordinates:[[[8.4,49],[8.41,49],[8.41,49.01],[8.4,49]]]},note:"Notizprobe",url:""}];
     const db=await new Promise((resolve,reject)=>{
      const req=indexedDB.open(dbName,1);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
     });
     await new Promise((resolve,reject)=>{
      const tx=db.transaction("kv","readwrite");
      tx.objectStore("kv").put(state,"appState");tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
     });db.close();
    });
    await page.reload({waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>document.documentElement.dataset.pin2mapReady==="true",null,{timeout:30000});
    assert.equal(await page.locator(".pin-marker").count(),0,"hidden layer baseline");
    await page.locator("#searchInput").click();
    assert.equal(await page.locator("#searchInput").evaluate(el=>document.activeElement===el),true,
      "first tap must retain focus for typing");
    await page.keyboard.type("Karlsruhe");
    assert.equal(await page.locator("#searchInput").inputValue(),"Karlsruhe");
    await page.locator("#searchTypeMenu").waitFor({state:"visible"});
    assert.equal(await page.locator(".search-type-choice:visible").count(),7,"six creation choices plus saved marker search");
    const assertSingleColumn=async label=>{
      const layout=await page.locator("#searchTypeMenu").evaluate(menu=>{
        const choices=[...menu.querySelectorAll(".search-type-choice")].map(el=>{
          const r=el.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom};
        });
        const list=menu.querySelector(".search-creation-choices"),style=getComputedStyle(list);
        return {display:style.display,direction:style.flexDirection,choices,
          hint:!!menu.querySelector(".search-creation-scroll-hint")};
      });
      assert.equal(layout.display,"flex",label+" must be a flex list");
      assert.equal(layout.direction,"column",label+" must be one column");
      assert.equal(layout.hint,false,label+" must not insert an unapproved compact bar");
      assert.equal(layout.choices.length,7,label+" must show all seven entries");
      assert.ok(layout.choices.every(r=>Math.abs(r.left-layout.choices[0].left)<2),
        label+" every choice must start at the same x coordinate: "+JSON.stringify(layout));
      assert.ok(layout.choices.every((r,i)=>i===0||r.top>=layout.choices[i-1].bottom-1),
        label+" choices may never form two columns or overlap");
    };
    await assertSingleColumn("standard viewport "+width);
    const full=await page.locator("#searchTypeMenu").evaluate(menu=>{
      const m=menu.getBoundingClientRect(),s=document.querySelector("#searchForm").getBoundingClientRect();
      const last=menu.querySelector(".search-type-choice:last-child").getBoundingClientRect();
      return {menu:{left:m.left,right:m.right,top:m.top,bottom:m.bottom},
        search:{left:s.left,right:s.right,bottom:s.bottom},
        lastBottom:last.bottom,scroll:menu.scrollHeight,client:menu.clientHeight};
    });
    assert.ok(Math.abs((full.menu.left+full.menu.right-full.search.left-full.search.right)/2)<9,
      "dialog horizontally centered under search: "+JSON.stringify(full));
    assert.ok(full.menu.top>=full.search.bottom+7,"dialog immediately under search");
    assert.ok(full.menu.bottom<=height+1,"menu fits visible viewport");
    if(height-full.search.bottom>full.scroll+20){
      assert.ok(full.client>=full.scroll-2,"all seven choices visible when there is room");
      assert.ok(full.lastBottom<=full.menu.bottom+1,"last choice must be fully visible");
    }
    // Layout contract is also exercised in dedicated Chromium + WebKit
    // tests with a truly constrained visualViewport and keyboard transitions.
    assert.equal(await page.locator(".object-search-options:visible").count(),0,"specialized options are not yet visible");
    const launcherPriority=await page.evaluate(()=>{
     const button=document.querySelector("#basemapButton"),b=button.getBoundingClientRect();
     const menu=document.querySelector("#searchTypeMenu"),m=menu.getBoundingClientRect();
     const x=(b.left+b.right)/2,y=(b.top+b.bottom)/2;
     const overlap=x>=m.left&&x<=m.right&&y>=m.top&&y<=m.bottom;
     const hit=document.elementFromPoint(x,y);
     return {overlap,isMenu:!!hit?.closest("#searchTypeMenu"),isButton:!!hit?.closest("#basemapButton")};
    });
    assert.equal(launcherPriority.overlap?launcherPriority.isMenu:launcherPriority.isButton,true,
      "open dialog must never be under a map launcher");
    await page.locator('.search-type-choice[data-search-type="objects"]').click();
    assert.equal(await page.locator(".search-type-choice:visible").count(),0,"creation options replaced");
    assert.equal(await page.locator(".object-search-options:visible").count(),1);
    assert.equal(await page.locator("#searchButton").count(),0,"magnifier is removed");
    assert.equal(await page.locator("#searchInput").inputValue(),"Karlsruhe");
    assert.equal(await page.locator(".pin-marker").count(),0,
      "hidden-layer matches excluded until checkbox enabled");
    assert.equal(await page.locator(".object-search-results").innerText(),
      "0 Pins · 0 Flächen · 0 Gewässer");
    assert.equal(await page.locator("#searchInput").evaluate(el=>document.activeElement===el),false);
    const checks=page.locator(".object-search-flags input");
    assert.equal(await checks.count(),3,"exactly three extension options");
    assert.deepEqual(await checks.evaluateAll(els=>els.map(el=>el.checked)),[false,false,false]);
    assert.deepEqual(await page.locator(".object-search-flags label").allInnerTexts(),
      ["Notizen","URLs","Ausgeblendete Objekte"]);
    assert.equal(await page.locator(".object-search-scope legend").innerText(),"Suche erweitern auf");
    const layout=await page.locator(".object-search-scope").evaluate(scope=>{
      const r=scope.getBoundingClientRect(),labels=[...scope.querySelectorAll("label")].map(el=>{
       const b=el.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom};
      });
      return {bounds:{left:r.left,right:r.right},labels,
       overflow:scope.scrollWidth>scope.clientWidth+1};
    });
    assert.ok(layout.labels.every(x=>Math.abs(x.top-layout.labels[0].top)<2),
      "three options must stay on one row: "+JSON.stringify(layout));
    assert.ok(layout.labels.every(x=>x.left>=layout.bounds.left-1&&x.right<=layout.bounds.right+1),
      "all option labels visible: "+JSON.stringify(layout));
    assert.equal(layout.overflow,false,"option fieldset must not overflow");
    assert.equal(await page.locator("#searchClear span").evaluate(el=>getComputedStyle(el).backgroundColor),
      "rgb(201, 47, 57)","small X turns red");
    await checks.nth(2).check();
    assert.equal(await page.locator(".pin-marker").count(),1,"hidden pin appears immediately");
    assert.equal(await page.locator(".object-search-results").innerText(),
      "1 Pins · 1 Flächen · 0 Gewässer");
    await checks.nth(1).check();
    assert.equal(await page.locator(".pin-marker").count(),2,"URL match adds second pin");
    await checks.nth(1).uncheck();
    assert.equal(await page.locator(".pin-marker").count(),1);
    await checks.nth(0).check();
    await page.locator("#searchInput").fill("Notizprobe");
    assert.equal(await page.locator(".pin-marker").count(),1,"pin notes match immediately");
    assert.equal(await page.locator(".object-search-results").innerText(),
      "1 Pins · 1 Flächen · 0 Gewässer","area notes matched");
    await checks.nth(0).uncheck();
    assert.equal(await page.locator(".pin-marker").count(),0,"disabling notes excludes note-only hits");
    await page.locator("#searchInput").fill("Karlsruhe");
    const gpx=page.locator(".object-search-gpx");
    await gpx.click();
    assert.equal(await gpx.getAttribute("aria-pressed"),"true");
    assert.equal(await page.locator(".pin-marker").count(),1,
      "GPX search ignores query while including hidden layer");
    await checks.nth(2).uncheck();
    assert.equal(await page.locator(".pin-marker").count(),0,
      "GPX search respects hidden checkbox");
    await checks.nth(2).check();
    assert.equal(await page.locator(".pin-marker").count(),1);
    await gpx.click();
    assert.equal(await page.locator(".pin-marker").count(),1,"GPX mode toggles back to text search");
    const before=await page.locator("#searchClear").boundingBox();
    await page.locator("#searchClear").click();
    assert.equal(await page.locator("#searchInput").inputValue(),"Karlsruhe","red X preserves query");
    assert.equal(await page.locator(".search-type-choice:visible").count(),7,
      "red X returns to standard choices");
    assert.equal(await page.locator(".object-search-options:visible").count(),0);
    assert.equal(await page.locator(".pin-marker").count(),0,"red X restores normal map");
    assert.equal(await page.locator("#searchClear span").evaluate(el=>getComputedStyle(el).backgroundColor),
      "rgb(111, 115, 120)","X turns gray again");
    const after=await page.locator("#searchClear").boundingBox();
    assert.ok(Math.abs(before.width-after.width)<1&&Math.abs(before.height-after.height)<1,
      "X does not change dimensions");
    await page.locator("#searchClear").click();
    assert.equal(await page.locator("#searchInput").inputValue(),"","gray X clears field");
    await page.keyboard.press("Meta+f");
    assert.equal(await page.locator("#searchInput").evaluate(el=>document.activeElement===el),true);
    await page.locator("#searchInput").fill("Karlsruhe");
    await page.locator('.search-type-choice[data-search-type="objects"]').click();
    await checks.nth(2).check();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("body").evaluate(el=>el.classList.contains("object-search-mode")),false);
    assert.equal(await page.locator("#searchInput").inputValue(),"","Escape clears query");
    await page.locator("#searchInput").fill("Karlsruhe");
    await page.locator('.search-type-choice[data-search-type="objects"]').click();
    await page.locator("#settingsButton").click();
    assert.equal(await page.locator("#searchTypeMenu").isHidden(),true,"opening settings closes search chooser");
    assert.equal(await page.locator("#settingsPanel").isVisible(),true,"newly opened dialog remains visible");
    // A previous search must never prevent opening and using Pin's layer and URL dialogs.
    await page.reload({waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>document.documentElement.dataset.pin2mapReady==="true",null,{timeout:30000});
    await page.locator("#searchInput").fill("Karlsruhe");
    await page.locator('.search-type-choice[data-search-type="objects"]').click();
    await page.locator('[data-search-flag="hidden"]').check();
    // A tap outside the dialog closes only the chooser. Matching markers
    // stay visible and are fitted to the map; only then can they be clicked.
    const mapBounds=await page.locator("#map").boundingBox();
    await page.locator("#map").click({position:{
      x:Math.round(mapBounds.width*.82),y:Math.round(mapBounds.height*.7)
    }});
    assert.equal(await page.locator("#searchTypeMenu").isHidden(),true,
      "outside tap closes the search chooser");
    assert.equal(await page.locator(".pin-marker").count(),1,
      "the matching hidden-layer pin remains visible with the chooser closed");
    await page.locator(".pin-marker").first().click();
    await page.locator("#pinPanel").waitFor({state:"visible"});
    await page.locator("#pinLayerTrigger").click();
    await page.locator("#pinLayerMenu").waitFor({state:"visible"});
    assert.ok(await page.locator("#pinLayerMenu .pin-layer-option").count()>=2,"layer choices available after search");
    const layerBox=await page.locator("#pinLayerMenu").boundingBox();
    assert.ok(layerBox.height>=40&&layerBox.width>=100,"layer chooser has usable dimensions");
    await page.locator("#pinLayerMenu .pin-layer-option").first().click();
    await page.locator("#pinUrlButton").click();
    await page.locator("#pinUrlBlock").waitFor({state:"visible"});
    const urlBox=await page.locator("#pinUrlBlock").boundingBox();
    assert.ok(urlBox.height>=140&&urlBox.width>=120,"URL editor remains a coherent panel");
    const actionsBox=await page.locator("#pinUrlBlock .pin-url-actions").boundingBox();
    const fieldBox=await page.locator("#pinUrlBlock .pin-url-field").boundingBox();
    const textBox=await page.locator("#pinUrl").boundingBox();
    assert.ok(fieldBox.y>=urlBox.y&&fieldBox.y+fieldBox.height<=urlBox.y+urlBox.height,
      "URL fieldset stays within popup");
    assert.ok(textBox.y>=fieldBox.y&&textBox.y+textBox.height<=fieldBox.y+fieldBox.height+2,
      "URL textarea stays within fieldset");
    assert.ok(fieldBox.y+fieldBox.height<=actionsBox.y+2,"URL buttons do not overlay input/fieldset");
    assert.ok(actionsBox.y+actionsBox.height<=urlBox.y+urlBox.height+2,"URL actions fit inside popup");
    assert.equal(await page.locator("#pinUrlBlock").evaluate(el=>getComputedStyle(el).backgroundColor),
      "rgb(255, 255, 255)","URL popup is opaque");
    assert.deepEqual(errors,[],width+" browser errors");
    console.log("PASS v294 search field, 3 flags, GPX, dialogs and mobile controls:",width);
   }finally{await context.close();}
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
