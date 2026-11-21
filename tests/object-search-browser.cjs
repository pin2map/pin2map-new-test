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
    assert.equal(await page.locator("#objectSearchCount").innerText(),
      "0 Pins · 0 Flächen · 0 Gewässer");
    const captionGeometry=await page.locator("#objectSearchCount").evaluate(el=>{
      const r=el.getBoundingClientRect(),form=document.querySelector("#searchForm"),
        f=form.getBoundingClientRect();
      return {top:r.top,bottom:r.bottom,height:r.height,formTop:f.top,
        overflow:getComputedStyle(form).overflow};
    });
    assert.equal(captionGeometry.overflow,"visible","counter may not be clipped");
    assert.ok(captionGeometry.height>=10&&captionGeometry.top<captionGeometry.formTop&&
      captionGeometry.bottom>captionGeometry.formTop,
      "counter must straddle the upper border: "+JSON.stringify(captionGeometry));
    assert.equal(await page.locator("#searchInput").evaluate(el=>document.activeElement===el),false);
    const checks=page.locator(".object-search-flags input");
    assert.equal(await checks.count(),3);
    assert.deepEqual(await page.locator(".object-search-flags label").allInnerTexts(),
      ["Mit Track","Mit Link","Mit Notiz"]);
    const kind=page.locator(".object-search-kind");
    assert.equal(await kind.inputValue(),"all");
    const hidden=page.locator('[data-search-flag="hidden"]');
    await hidden.check();
    assert.equal(await page.locator("#objectSearchCount").innerText(),"2 Pins · 1 Fläche · 0 Gewässer");
    assert.equal(await page.locator(".pin-marker").count(),2,
      "two distinct pins render despite repeated legacy stored records");
    await page.locator("#searchInput").fill("Karlsruher");
    assert.equal(await page.locator("#objectSearchCount").innerText(),
      "0 Pins · 0 Flächen · 0 Gewässer",
      "each text edit re-runs the active search without Enter");
    await page.locator("#searchInput").fill("Karlsruhe");
    assert.equal(await page.locator("#objectSearchCount").innerText(),
      "2 Pins · 1 Fläche · 0 Gewässer",
      "deleting a suffix restores earlier results immediately");
    await kind.selectOption("pins");
    assert.equal(await page.locator("#objectSearchCount").innerText(),"2 Pins · 0 Flächen · 0 Gewässer");
    assert.equal(await page.locator(".pin-marker").count(),2,
      "nonmatching existing objects remain visible");
    await page.locator("#searchInput").fill("");
    await checks.nth(2).check();
    assert.equal(await page.locator("#objectSearchCount").innerText(),"1 Pin · 0 Flächen · 0 Gewässer",
      "empty query and Mit Notiz finds all noted pins");
    await checks.nth(0).check();
    assert.equal(await page.locator("#objectSearchCount").innerText(),"1 Pin · 0 Flächen · 0 Gewässer",
      "Mit Track and Mit Notiz must both hold");
    await checks.nth(1).check();
    assert.equal(await page.locator("#objectSearchCount").innerText(),"1 Pin · 0 Flächen · 0 Gewässer",
      "all three conditions must hold");
    await hidden.uncheck();
    assert.equal(await page.locator("#objectSearchCount").innerText(),"0 Pins · 0 Flächen · 0 Gewässer",
      "hidden matches excluded while nonmatching visible markers stay");
    await hidden.check();
    await checks.nth(0).uncheck();await checks.nth(1).uncheck();await checks.nth(2).uncheck();
    await page.locator("#searchInput").fill("Karlsruhe");
    await kind.selectOption("all");
    assert.equal(await page.locator("#objectSearchCount").innerText(),"2 Pins · 1 Fläche · 0 Gewässer");
    await page.keyboard.press("Meta+f");
    assert.equal(await page.locator("body").evaluate(el=>el.classList.contains("object-search-mode")),true,
      "hardware Find must not end search");
    assert.equal(await page.locator("#searchInput").evaluate(el=>document.activeElement===el),true,
      "hardware Find focuses the existing search field");
    const layout=await page.locator(".object-search-options").evaluate(panel=>{
      const row=panel.querySelector(".object-search-toprow").getBoundingClientRect();
      const flags=[...panel.querySelectorAll(".object-search-flags label")].map(x=>x.getBoundingClientRect());
      const p=panel.getBoundingClientRect();
      return {sameLine:flags.every(r=>Math.abs(r.top-flags[0].top)<2),
        inBounds:flags.every(r=>r.left>=p.left-1&&r.right<=p.right+1),
        rowWidth:row.width,overflow:panel.scrollWidth>panel.clientWidth+1};
    });
    assert.ok(layout.sameLine&&layout.inBounds&&!layout.overflow,
      "compact controls must fit 320px and wider without clipping: "+JSON.stringify(layout));
    await page.waitForTimeout(300);
    const viewportBeforeExit=await page.locator("#map .leaflet-map-pane").evaluate(el=>el.style.transform);
    const before=await page.locator("#searchClear").boundingBox();
    await page.locator("#searchClear").click();
    await page.waitForTimeout(300);
    assert.equal(await page.locator("#map .leaflet-map-pane").evaluate(el=>el.style.transform),
      viewportBeforeExit,"red X must not restore the pre-search viewport");
    assert.equal(await page.locator("#searchInput").inputValue(),"Karlsruhe","red X preserves query");
    assert.equal(await page.locator(".search-type-choice:visible").count(),7,
      "red X returns to standard choices");
    assert.equal(await page.locator(".object-search-options:visible").count(),0);
    assert.equal(await page.locator(".pin-marker").count(),0,"red X restores normal layer visibility");
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
    await hidden.check();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("body").evaluate(el=>el.classList.contains("object-search-mode")),true);
    assert.equal(await page.locator("#searchInput").inputValue(),"Karlsruhe","Escape keeps query");
    await page.locator("#searchInput").click();
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
    assert.equal(await page.locator(".pin-marker").count(),2,
      "all matched and contextual markers remain visible with chooser closed");
    // A matching marker can legitimately sit beneath fixed map chrome after
    // fitting distant search results. Pan the map normally to bring the marker
    // into the usable centre; never force-click through an unrelated control.
    const matchingPin=page.locator(".pin-marker").first();
    const markerCanReceiveClick=()=>matchingPin.evaluate(el=>{
      const r=el.getBoundingClientRect(),x=(r.left+r.right)/2,y=(r.top+r.bottom)/2;
      const hit=document.elementFromPoint(x,y),owner=el.closest(".leaflet-marker-icon");
      return !!(hit&&(hit===el||el.contains(hit)||
        (owner&&hit.closest(".leaflet-marker-icon")===owner)));
    });
    if(!await markerCanReceiveClick()){
      const iconRect=await matchingPin.boundingBox();
      const centerX=mapBounds.x+mapBounds.width*.5;
      const centerY=mapBounds.y+mapBounds.height*.55;
      const dx=centerX-(iconRect.x+iconRect.width/2);
      const dy=centerY-(iconRect.y+iconRect.height/2);
      await page.mouse.move(centerX,centerY);
      await page.mouse.down();
      await page.mouse.move(centerX+dx,centerY+dy,{steps:18});
      await page.mouse.up();
      await page.waitForTimeout(320);
    }
    assert.equal(await markerCanReceiveClick(),true,
      "search marker must be reachable by a real click after panning");
    await matchingPin.click();
    await page.locator("#pinPanel").waitFor({state:"visible"});
    assert.equal(await page.locator("body").evaluate(el=>el.classList.contains("object-search-mode")),true,
      "opening a matching pin editor must preserve search mode");
    assert.equal(await page.locator("#searchClear").getAttribute("aria-label"),
      "Markierungssuche verlassen","only red X ends search");
    assert.equal(await page.locator("body").evaluate(el=>el.classList.contains("object-search-active")),true,
      "spotlight remains active behind the editor");
    assert.match(await page.locator("#pinName").inputValue(),/Karlsruhe/,
      "a matching named pin was opened for live edit regression");
    await page.locator("#pinName").fill("Anderer Name");
    await page.waitForFunction(()=>document.querySelector("#objectSearchCount")?.textContent?.startsWith("1 Pin"));
    assert.equal(await page.locator("#objectSearchCount").innerText(),
      "1 Pin · 1 Fläche · 0 Gewässer",
      "edited pin immediately leaves an active search when it ceases to match");
    await page.locator("#pinName").fill("Karlsruhe Bahnhof");
    await page.waitForFunction(()=>document.querySelector("#objectSearchCount")?.textContent?.startsWith("2 Pins"));
    assert.equal(await page.locator("#objectSearchCount").innerText(),
      "2 Pins · 1 Fläche · 0 Gewässer",
      "edited pin immediately rejoins an active search when it matches again");
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
    console.log("PASS v295 search scope, AND filters, contextual markers, dialogs:",width);
   }finally{await context.close();}
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
