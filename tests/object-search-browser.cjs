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
      {id:"search-yesterday",name:"Berlin Mitte",lat:52.52,lng:13.4,layerId:"layer-1",note:"",url:"",createdAt:y,updatedAt:today}
     ];
     // Repeated legacy records with one ID must not inflate the visible marker count.
     state.pins.push(...Array.from({length:6},()=>({...state.pins[0]})));
     state.areas=[{id:"search-area",name:"Karlsruhe Testgebiet",layerId:"layer-1",kind:"area",createdAt:today,
      geometry:{type:"Polygon",coordinates:[[[8.4,49],[8.41,49],[8.41,49.01],[8.4,49]]]},note:"",url:""}];
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
    // Exact screenshot regression: Safari can transiently clamp menu height.
    // When there is enough visible space, a new real resize must restore
    // the full seven-row list, never leave an empty white strip.
    if(width<=768){
      const recovered=await page.evaluate(()=>{
        const menu=document.querySelector("#searchTypeMenu");
        const screenHeight=Math.max(560,Math.min(innerHeight,720));
        Object.defineProperty(window,"visualViewport",{configurable:true,value:{
          offsetTop:0,offsetLeft:0,width:innerWidth,height:screenHeight
        }});
        menu.style.maxHeight="0px";
        window.dispatchEvent(new Event("resize"));
        const m=menu.getBoundingClientRect();
        const last=menu.querySelector(".search-type-choice:last-child").getBoundingClientRect();
        return {height:m.height,scroll:menu.scrollHeight,client:menu.clientHeight,
          lastBottom:last.bottom,menuBottom:m.bottom,
          free:screenHeight-document.querySelector("#searchForm").getBoundingClientRect().bottom};
      });
      assert.ok(recovered.free>350,"screenshot regression precondition: ample room");
      assert.ok(recovered.height>300&&recovered.client>=recovered.scroll-2,
        "a collapsed strip must recover when viewport has room: "+JSON.stringify(recovered));
      assert.ok(recovered.lastBottom<=recovered.menuBottom+1,
        "seven full choices must become visible again");
      await page.evaluate(()=>{delete window.visualViewport;window.dispatchEvent(new Event("resize"));});
      await assertSingleColumn("recovered menu "+width);
    }
    // Exercise the REAL positioning code with an iOS-style visualViewport.
    // Simply adding keyboard-constrained CSS is not a geometry regression test.
    if(width<=768){
      const simulatedHeight=Math.min(height-150,450);
      const geometry=await page.evaluate(visibleHeight=>{
        Object.defineProperty(window,"visualViewport",{configurable:true,value:{
          offsetTop:0,offsetLeft:0,width:innerWidth,height:visibleHeight
        }});
        window.dispatchEvent(new Event("resize"));
        const menu=document.querySelector("#searchTypeMenu");
        const field=document.querySelector("#searchForm");
        const m=menu.getBoundingClientRect(),f=field.getBoundingClientRect();
        return {position:getComputedStyle(menu).position,
          keyboard:menu.classList.contains("keyboard-constrained"),
          top:m.top,bottom:m.bottom,height:m.height,
          fieldBottom:f.bottom,scrollHeight:menu.scrollHeight,
          clientHeight:menu.clientHeight};
      },simulatedHeight);
      assert.equal(geometry.position,"fixed","keyboard menu must escape app clipping");
      assert.equal(geometry.keyboard,true,"real resize must activate keyboard layout");
      await assertSingleColumn("keyboard viewport "+width);
      assert.ok(geometry.top>=geometry.fieldBottom+7,
        "search chooser must remain below search field: "+JSON.stringify(geometry));
      assert.ok(geometry.bottom<=simulatedHeight+1,
        "keyboard menu must fit the actual visible viewport: "+JSON.stringify(geometry));
      assert.ok(geometry.height>=150,
        "do not collapse menu when the visible viewport has room: "+JSON.stringify(geometry));
      await page.locator('.search-type-choice[data-search-type="objects"]').scrollIntoViewIfNeeded();
      const bounds=await page.locator("#searchTypeMenu").boundingBox();
      const item=await page.locator('.search-type-choice[data-search-type="objects"]').boundingBox();
      assert.ok(bounds&&item&&item.y>=bounds.y-1&&item.y+item.height<=bounds.y+bounds.height+1,
        "last menu item must be accessible by internal scrolling");
      await page.evaluate(()=>{
        delete window.visualViewport;
        window.dispatchEvent(new Event("resize"));
      });
      await assertSingleColumn("restored viewport "+width);
    }
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
    assert.equal(await page.locator(".pin-marker").count(),1,"search retrieves hidden pin");
    assert.equal(await page.locator("#searchInput").inputValue(),"Karlsruhe");
    assert.equal(await page.locator(".p2m-object-search-spotlight circle").count()>0,true,
      "spotlight must illuminate saved marker and geometry labels");
    assert.equal(await page.locator(".p2m-object-search-spotlight").evaluate(el=>getComputedStyle(el).pointerEvents),"none");
    assert.equal(await page.locator("#searchButton").evaluate(el=>getComputedStyle(el,"::before").backgroundColor),"rgb(201, 47, 57)");
    assert.equal(await page.locator("#searchButton svg").evaluate(el=>getComputedStyle(el).color),"rgb(255, 255, 255)");
    assert.equal(await page.locator("#searchInput").evaluate(el=>document.activeElement===el),false,"keyboard dismissed");
    const options=page.locator(".object-search-kind");
    assert.equal(await options.inputValue(),"all","all objects selected by default");
    const checks=page.locator(".object-search-flags input");
    assert.equal(await checks.count(),4);
    assert.deepEqual(await checks.evaluateAll(els=>els.map(e=>e.checked)),[true,true,true,true]);
    assert.equal(await page.locator(".object-search-results").innerText(),"1 Pins · 1 Flächen · 0 Gewässer");
    const layout=await page.evaluate(()=>{
      const el=document.querySelector("#searchTypeMenu");
      const b=el.getBoundingClientRect(),opts=document.querySelector(".object-search-options");
      const selector=opts.querySelector("select").getBoundingClientRect();
      const flags=opts.querySelector(".object-search-flags").getBoundingClientRect();
      const exit=opts.querySelector(".object-search-exit").getBoundingClientRect();
      return {box:{left:b.left,right:b.right,top:b.top,bottom:b.bottom},
        selector:{top:selector.top,bottom:selector.bottom,right:selector.right},
        flags:{top:flags.top,bottom:flags.bottom,right:flags.right},
        exit:{left:exit.left,top:exit.top,width:exit.width,height:exit.height},
        flagRows:[...opts.querySelectorAll(".object-search-flags label")].map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}),
        selectorMiddle:(selector.top+selector.bottom)/2,exitMiddle:(exit.top+exit.bottom)/2,
        flagClipped:opts.querySelector(".object-search-flags").scrollWidth>opts.querySelector(".object-search-flags").clientWidth+1,
        width:innerWidth,height:innerHeight};
    });
    assert.ok(layout.box.left>=0&&layout.box.right<=width+1&&layout.box.bottom<=height+1,
      "compact chooser fits viewport "+JSON.stringify(layout));
    assert.ok(layout.selector.bottom<=layout.flags.top+2,"options remain two ordered rows");
    assert.ok(layout.exit.left>=layout.selector.right-2,"exit at right of dropdown");
    assert.ok(Math.abs(layout.exit.width-layout.exit.height)<2&&layout.exit.width>=40,
      "exit must be circular touch target: "+JSON.stringify(layout));
    assert.ok(Math.abs(layout.exitMiddle-layout.selectorMiddle)<2,
      "right X and dropdown must share horizontal center");
    assert.equal(layout.flagRows.length,4,"four flags in a single row");
    assert.ok(layout.flagRows.every(r=>Math.abs(r.top-layout.flagRows[0].top)<2),
      "checkboxes must remain on the same horizontal row");
    assert.equal(layout.flagClipped,false,"checkbox row must not overflow at iPhone width");
    assert.equal(await page.locator(".object-search-hidden-flag").innerText(),"Ausgeblendete");
    assert.equal(await page.locator(".object-search-exit svg").count(),1);
    assert.equal(await page.locator(".object-search-exit").evaluate(el=>getComputedStyle(el).backgroundColor),
      "rgb(201, 47, 57)");
    // Changing any option re-runs the search immediately, with no Apply button.
    await options.selectOption("rivers");
    assert.equal(await page.locator(".object-search-results").innerText(),"0 Pins · 0 Flächen · 0 Gewässer");
    assert.equal(await page.locator(".pin-marker").count(),0,"type change filters immediately");
    await options.selectOption("pins");
    assert.equal(await page.locator(".object-search-results").innerText(),"1 Pins · 0 Flächen · 0 Gewässer");
    assert.equal(await page.locator(".pin-marker").count(),1,"type change refreshes immediately");
    await checks.nth(0).uncheck();
    assert.equal(await page.locator(".pin-marker").count(),1,"unchecking track refreshes without losing normal pin");
    await checks.nth(1).uncheck();
    await checks.nth(2).uncheck();
    assert.equal(await page.locator(".pin-marker").count(),1);
    await checks.nth(3).uncheck();
    assert.equal(await page.locator(".pin-marker").count(),0,"hidden-only pin removed instantly");
    assert.equal(await page.locator(".object-search-results").innerText(),"0 Pins · 0 Flächen · 0 Gewässer");
    await checks.nth(3).check();
    assert.equal(await page.locator(".pin-marker").count(),1,"hidden-only pin included again");
    // Editing while filtered restores the normal choices before the next saved-object search.
    await page.locator("#searchInput").click();
    assert.equal(await page.locator("#searchInput").evaluate(el=>document.activeElement===el),true);
    assert.equal(await page.locator(".search-type-choice:visible").count(),7);
    assert.equal(await page.locator(".object-search-options:visible").count(),0);
    await page.locator("#searchInput").fill("Karlsruhe");
    assert.equal(await page.locator(".search-type-choice:visible").count(),7);
    await page.locator('.search-type-choice[data-search-type="objects"]').click();
    assert.equal(await page.locator(".pin-marker").count(),1);
    await page.locator(".object-search-exit").click();
    assert.equal(await page.locator("#searchTypeMenu").isHidden(),true,"right X closes chooser");
    assert.equal(await page.locator(".p2m-object-search-spotlight").isHidden(),true,"spotlight removed after search");
    assert.equal(await page.locator(".pin-marker").count(),0,"right X restores hidden layer");
    assert.ok(!await page.locator("body").evaluate(el=>el.classList.contains("object-search-mode")));
    await page.keyboard.press("Meta+f");
    assert.equal(await page.locator("#searchInput").evaluate(el=>document.activeElement===el),true,
      "Cmd+F must activate the application search field");
    assert.equal(await page.locator(".search-type-choice:visible").count(),7);
    await page.locator("#searchInput").fill("Karlsruhe");
    await page.locator('.search-type-choice[data-search-type="objects"]').click();
    assert.equal(await page.locator(".pin-marker").count(),1);
    await page.locator("#searchClear").click();
    assert.equal(await page.locator("#searchTypeMenu").isHidden(),true,"small capsule X exits too");
    assert.equal(await page.locator(".pin-marker").count(),0);
    assert.ok(!await page.locator("body").evaluate(el=>el.classList.contains("object-search-mode")));
    await page.locator("#searchInput").fill("Karlsruhe");
    await page.locator('.search-type-choice[data-search-type="objects"]').click();
    await options.focus();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#searchTypeMenu").isHidden(),true,"Escape closes search dialog");
    assert.equal(await page.locator("body").evaluate(el=>el.classList.contains("object-search-mode")),false,
      "Escape exits object-filter mode");
    assert.equal(await page.locator("#searchInput").evaluate(el=>document.activeElement===el),true,
      "Escape leaves keyboard focus in search input");
    assert.equal(await page.locator("#searchInput").inputValue(),"","Escape clears old query");
    assert.equal(await page.locator(".pin-marker").count(),0,"Escape restores original map display");
    await page.keyboard.type("Karlsruhe");
    assert.equal(await page.locator("#searchInput").inputValue(),"Karlsruhe","type immediately after Escape");
    assert.equal(await page.locator(".search-type-choice:visible").count(),7,"typing opens normal chooser");
    await page.locator('.search-type-choice[data-search-type="objects"]').click();
    await page.locator("#settingsButton").click();
    assert.equal(await page.locator("#searchTypeMenu").isHidden(),true,"opening settings closes search chooser");
    assert.equal(await page.locator("#settingsPanel").isVisible(),true,"newly opened dialog remains visible");
    // A previous search must never prevent opening and using Pin's layer and URL dialogs.
    await page.reload({waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>document.documentElement.dataset.pin2mapReady==="true",null,{timeout:30000});
    await page.locator("#searchInput").fill("Karlsruhe");
    await page.locator('.search-type-choice[data-search-type="objects"]').click();
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
    console.log("PASS first-tap focus, 7th search choice, duplicate ID counts, Cmd+F, mobile controls:",width);
   }finally{await context.close();}
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
