"use strict";
/* Real Chromium geometry & image evidence for the pin dialog.
 * Independent contexts prevent leftover map state from masking layout bugs.
 * Real iOS Safari keyboard acceptance remains a separate manual gate. */
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const fs=require("node:fs");
const base=process.env.PIN2MAP_TEST_URL||"http://127.0.0.1:8765/";
const cases=[
 {name:"iphone-narrow",width:320,height:568,button:42},
 {name:"iphone",width:375,height:667,button:42},
 {name:"ipad",width:768,height:1024,button:42}
];
const browserOptions=process.env.PIN2MAP_CHROMIUM_EXECUTABLE
 ?{executablePath:process.env.PIN2MAP_CHROMIUM_EXECUTABLE}:{};
async function metrics(page){
 return page.evaluate(()=>{
  const get=id=>document.getElementById(id);
  const rect=id=>{
   const b=get(id).getBoundingClientRect();
   return {x:b.left,y:b.top,right:b.right,bottom:b.bottom,width:b.width,height:b.height};
  };
  const footer=[...get("pinPanel").querySelectorAll(".pin-actions > button, .pin-actions > .pin-layer-picker > button")];
  const panel=get("pinPanel"),notes=get("pinNotes");
  const styles=getComputedStyle(panel);
  return {
   panel:rect("pinPanel"),name:rect("pinName"),
   navigation:rect("pinPanel"),
   details:rect("pinNotesBlock"),footer:rect("closePin"),
   routingRow:rect("pinPanel"),routingCount:get("pinPanel").querySelectorAll(".pin-navigation-buttons button").length,
   routingDisabled:[...get("pinPanel").querySelectorAll(".pin-navigation-buttons button")].every(b=>b.disabled),
   noteHeight:notes.getBoundingClientRect().height,
   noteFont:Number.parseFloat(getComputedStyle(notes).fontSize),
   nameFont:Number.parseFloat(getComputedStyle(get("pinName")).fontSize),
   overflowY:styles.overflowY,scrollHeight:panel.scrollHeight,clientHeight:panel.clientHeight,
   footerItems:footer.map(button=>{const b=button.getBoundingClientRect();return {
    id:button.id,x:b.left,y:b.top,right:b.right,width:b.width,height:b.height,
    radius:getComputedStyle(button).borderRadius,
    svgSize:button.querySelector("svg")?.getBoundingClientRect().width||0
   };}),
   weatherOpacity:getComputedStyle(get("pinWeather")).opacity,
   delete:rect("deletePin"),
   routingButtons:[...get("pinPanel").querySelectorAll(".pin-navigation-buttons button")].map(b=>{const r=b.getBoundingClientRect();return {width:r.width,height:r.height,disabled:b.disabled};}),
   markerCount:document.querySelectorAll(".pin-marker").length,
   visibleLabels:[...document.querySelectorAll("#map .leaflet-tooltip")].filter(e=>getComputedStyle(e).display!=="none"&&getComputedStyle(e).visibility!=="hidden").length,
   viewport:{width:innerWidth,height:innerHeight},
   documentScrollWidth:document.documentElement.scrollWidth,
   bodyScrollWidth:document.body.scrollWidth
  };
 });
}
(async()=>{
 const browser=await chromium.launch({headless:true,...browserOptions});
 fs.mkdirSync("pin-dialog-visual-artifacts",{recursive:true});
 try{
  for(const viewport of cases){
   const ctx=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},
    hasTouch:true,isMobile:true,deviceScaleFactor:1,serviceWorkers:"allow"});
   const page=await ctx.newPage();
   const errors=[];
   page.on("pageerror",e=>errors.push(e.message));
   try{
    await page.goto(base,{waitUntil:"domcontentloaded",timeout:30000});
    await page.waitForFunction(()=>!!window.L&&!!document.querySelector(".leaflet-container"),null,{timeout:20000});
    // Recreate the reported failure with MANY layers, not only the two
    // default ones. This project lives only in this isolated test context.
    await page.evaluate(async()=>{
      const store=await window.Pin2MapIndexedDBProjectStore.open();
      try{
        const project=(await store.loadProject())||window.Pin2MapProjectModel.defaultProject();
        const colors=["#e57b23","#8d61c4","#23866f","#c7507e","#d1a52a","#456ba1"];
        while(project.layers.length<8){
          const i=project.layers.length;
          project.layers.push({id:"visual-layer-"+i,name:"Beispiel-Ebene "+i,
            color:colors[(i-2)%colors.length],visible:i%3!==0});
        }
        // Synthetic layout-only GPX association: no track file is opened or imported.
        project.pins.push({id:"visual-reference-pin",lat:48.7758,lng:9.1829,
          name:"Referenz-Pin",layerId:"private",note:"Kontrolle",
          url:"obsidian://pin/referenz",gpxKey:"visual-only-gpx"});
        await store.saveProject(project);
      }finally{store.close();}
    });
    await page.reload({waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>!!window.L&&!!document.querySelector(".leaflet-container"));
    const at={x:Math.floor(viewport.width/2),y:Math.floor(viewport.height*.7)};
    await page.mouse.move(at.x,at.y);
    await page.mouse.down();
    await page.waitForTimeout(735);
    await page.mouse.up();
    await page.locator("#mapActionChooser").waitFor({state:"visible",timeout:15000});
    await page.locator('#mapActionChooser button[aria-label="Pin setzen"]').click();
    await page.locator("#pinPanel").waitFor({state:"visible",timeout:15000});
    await page.waitForTimeout(200);
    const m=await metrics(page);
    if(viewport.width<=375){
      // Regression for iPhone ping-pong: reopening an unchanged pin must not
      // alternately move the map just to satisfy impossible 12px side insets.
      // Keep the pin visible and verify both its position and panel bounds.
      const selectedMarker=page.locator(".leaflet-marker-icon.pin-icon").last();
      const pinCenter=async()=>{
        const box=await selectedMarker.boundingBox();
        return {x:box.x+box.width/2,y:box.y+box.height/2};
      };
      const stable=await pinCenter();
      for(let repeat=0;repeat<8;repeat++){
        await page.locator("#closePin").click();
        await page.locator("#pinPanel").waitFor({state:"hidden"});
        await selectedMarker.tap({force:true});
        await page.locator("#pinPanel").waitFor({state:"visible"});
        const current=await pinCenter(),box=await page.locator("#pinPanel").boundingBox();
        assert.ok(Math.abs(current.x-stable.x)<=1&&Math.abs(current.y-stable.y)<=1,
          "Same pin must not ping-pong after re-opening on "+viewport.name+
          ": "+JSON.stringify({repeat,stable,current}));
        assert.ok(box.x>=3&&box.x+box.width<=viewport.width-3&&
          box.y>=3&&box.y+box.height<=viewport.height-3,
          "Automatic iPhone dialog placement must stay on screen");
      }
      console.log("[visual] PASS repeated iPhone open/close without map ping-pong",viewport.name);
    }
    assert.equal(m.footerItems.length,6,JSON.stringify(m));
    assert.deepEqual(m.footerItems.map(item=>item.id),
     ["movePin","pinLayerTrigger","pinUrlButton","pinWikipedia","pinWeather","closePin"]);
    assert.ok(m.panel.x>=4&&m.panel.right<=viewport.width-4,JSON.stringify(m));
    assert.ok(m.panel.y>=4&&m.panel.bottom<=viewport.height-4,JSON.stringify(m));
    assert.ok(m.scrollHeight<=m.clientHeight+2,"Nested pin dialog scroll: "+JSON.stringify(m));
    assert.equal(await page.locator(".pin-meta-row").count(),0,"No visible timestamp row");
    const navRect=await page.locator("#pinPanel .pin-navigation-row").boundingBox();
    const nameRect=await page.locator("#pinPanel .pin-editor-head").boundingBox();
    assert.ok(navRect.y-nameRect.y-nameRect.height>=10,"Navigation must breathe above");
    assert.equal(m.routingCount,5,"Two external and three routing controls must be visible");
    assert.equal(m.routingDisabled,true,"All future navigation controls must stay inert");
    assert.ok(m.details.y>navRect.y+navRect.height,"Notes follow navigation");
    assert.ok(m.footer.y>m.details.y,"Footer must follow detail");
    assert.ok(Math.abs(m.noteHeight-145)<=1,JSON.stringify(m));
    assert.ok(Math.abs(m.delete.width-viewport.button)<=1&&Math.abs(m.delete.height-viewport.button)<=1,"Delete must match footer action diameter");
    for(const b of m.routingButtons)assert.ok(b.disabled&&Math.abs(b.width-viewport.button)<=1&&Math.abs(b.height-viewport.button)<=1,"Routing button size "+JSON.stringify(b));
    assert.ok(m.markerCount>=2,"Other pins remain rendered while dialog is open");
    const sectors=await page.locator(".pin-status-segments").evaluateAll(nodes=>
      nodes.map(n=>["note","url","gpx"].map(t=>
        n.querySelector(".pin-sector-"+t)?.getAttribute("fill"))));
    assert.ok(sectors.some(colors=>colors.join(",")==="#d94f55,#2979d1,#8f989f"),
      "A loaded test pin shows red note, blue URL, gray GPX inside its circle");
    assert.equal(await page.locator(".pin-status-column").count(),0,
      "Former external microbadges must be removed");
    const touchRects=await page.locator(".leaflet-marker-icon.pin-icon").evaluateAll(nodes=>
      nodes.map(n=>{const b=n.getBoundingClientRect();return {w:b.width,h:b.height};}));
    assert.ok(touchRects.some(r=>r.w>=52&&r.h>=56),
      "Compact pin retains the separately enlarged 52x56px tap target");
    const visiblePin=await page.locator(".pin-marker-shape").first().boundingBox();
    assert.ok(Math.abs(visiblePin.width-30)<=1&&Math.abs(visiblePin.height-40)<=1,
      "Visible droplet must return to the compact 30x40px proportions");
    const yellowHitbox=await page.locator(".leaflet-marker-icon.pin-icon").first().evaluate(el=>({
      color:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderTopStyle
    }));
    assert.equal(yellowHitbox.color,"rgba(255, 224, 0, 0.55)",
      "TEMPORARY v163: actual hitbox must be visibly yellow");
    assert.equal(yellowHitbox.border,"dashed");
    const labelHit=await page.locator("#map .leaflet-tooltip.address-label").first().evaluate(el=>({
      pointer:getComputedStyle(el).pointerEvents,
      nose:getComputedStyle(el,"::before").borderRightColor
    }));
    assert.equal(labelHit.pointer,"none","Name labels cannot swallow pin taps");
    assert.equal(labelHit.nose,"rgb(119, 119, 119)");

    assert.ok(m.visibleLabels>=1,"Pin name labels remain displayed with open dialog");
    assert.ok(m.noteFont>=16&&m.nameFont>=16,"Touch inputs must prevent iOS zoom: "+JSON.stringify(m));
    for(let i=0;i<m.footerItems.length;i++){
     const item=m.footerItems[i];
     assert.ok(Math.abs(item.width-viewport.button)<=1&&Math.abs(item.height-viewport.button)<=1,
      "Action size differs: "+JSON.stringify(item));
     assert.ok(item.x>=m.panel.x&&item.right<=m.panel.right,"Button outside panel: "+JSON.stringify(item));
     if(i)assert.ok(item.x>=m.footerItems[i-1].right-1,"Footer overlaps: "+JSON.stringify(m));
    }
    assert.equal(m.weatherOpacity,"1","Disabled weather icon remains clearly recognizable");
    assert.ok(m.documentScrollWidth<=viewport.width+2,"Unexpected horizontal document scroll");
    assert.equal(await page.locator("#pinGpxActions").isHidden(),true,
     "GPX controls are only visible when a real track association exists");
    // Pin-specific modal is anchored within the original panel, preserving
    // its identifying header and retaining all data after cancellation.
    await page.locator("#pinName").fill("Sicherheits-Testpin");
    assert.equal(await page.locator("#deletePin").getAttribute("aria-expanded"),"false");
    await page.locator("#deletePin").click();
    assert.equal(await page.locator("#deletePin").getAttribute("aria-expanded"),"true");
    const deleteTrigger=await page.locator("#deletePin").evaluate(el=>({
      background:getComputedStyle(el).backgroundColor,
      ink:getComputedStyle(el).color,
      border:getComputedStyle(el).borderTopColor,
      active:el.classList.contains("is-active"),
      dialogOpen:document.querySelector("#deleteDialog").open
    }));
    assert.deepEqual(deleteTrigger,{
      background:"rgb(23, 100, 191)",ink:"rgb(255, 255, 255)",
      border:"rgb(23, 100, 191)",active:true,dialogOpen:true
    },"ALL mobile/tablet internal subdialog triggers must turn blue while open");
    const deletion=await page.evaluate(()=>{
      const rect=s=>document.querySelector(s).getBoundingClientRect();
      const dialog=rect("#deleteDialog"),header=rect("#pinPanel .pin-editor-head");
      const panel=rect("#pinPanel");
      return {dialog:{left:dialog.left,top:dialog.top,right:dialog.right},
        headerBottom:header.bottom,panelLeft:panel.left,panelRight:panel.right,
        name:document.querySelector("#deletePinName").textContent};
    });
    assert.ok(Math.abs(deletion.dialog.left-deletion.panelLeft)<=1&&
      Math.abs(deletion.dialog.right-deletion.panelRight)<=1,"Delete confirmation spans original panel");
    assert.ok(deletion.dialog.top>=deletion.headerBottom-1,"Pin header stays visible");
    assert.equal(await page.locator("#deleteDialog").evaluate(el=>getComputedStyle(el).borderTopWidth),
      "0px","Delete overlay has no horizontal seam beneath the name");
    assert.equal(deletion.name,"Sicherheits-Testpin","Delete confirmation names selected pin");
    const surfaces=await page.evaluate(()=>({
      pin:getComputedStyle(document.querySelector("#pinPanel")).backgroundColor,
      deletion:getComputedStyle(document.querySelector("#deleteDialog")).backgroundColor
    }));
    assert.equal(surfaces.pin,surfaces.deletion,
      "Pin editor and its delete confirmation have exactly the same pale gray surface");
    assert.equal(surfaces.pin,"rgb(247, 248, 250)");
    const colorContract=await page.evaluate(()=>({
      root:getComputedStyle(document.documentElement).getPropertyValue("--p2m-pin-dialog-surface").trim(),
      dialogBackdrop:getComputedStyle(document.querySelector("#deleteDialog"),"::backdrop").backgroundColor
    }));
    assert.equal(colorContract.root,"#f7f8fa","Exact palette color, no second guessed delete gray");
    assert.equal(colorContract.dialogBackdrop,"rgba(0, 0, 0, 0)","Delete backdrop cannot tint panel surface");
    await page.screenshot({path:"pin-dialog-visual-artifacts/"+viewport.name+"-delete.png"});
    // On/off contract: the original visible header trigger must be tappable
    // while the confirmation is open (not inert behind a modal top layer).
    assert.equal(await page.locator("#deleteDialog").evaluate(el=>el.matches(":modal")),false);
    await page.locator("#deletePin").click();
    await page.waitForFunction(()=>!document.querySelector("#deleteDialog").open &&
      document.querySelector("#deletePin").getAttribute("aria-expanded")==="false");
    assert.equal(await page.locator("#pinName").inputValue(),"Sicherheits-Testpin");
    await page.locator("#deletePin").click();
    await page.locator("#deleteDialog").waitFor({state:"visible"});
    assert.equal(await page.locator("#deletePin").getAttribute("aria-expanded"),"true");
    await page.locator('#deleteDialog button[value="cancel"]').click();
    assert.equal(await page.locator("#deleteDialog").evaluate(el=>el.open),false);
    await page.waitForFunction(()=>document.querySelector("#deletePin").getAttribute("aria-expanded")==="false");
    assert.equal(await page.locator("#deletePin").evaluate(el=>el.classList.contains("is-active")),false,
      "Blue delete-trigger state must reset on Cancel");
    assert.equal(await page.locator("#pinName").inputValue(),"Sicherheits-Testpin");
    assert.equal(await page.locator("#pinWeather").isEnabled(),true);
    await page.locator("#pinWeather").click();
    assert.equal(await page.locator("#pinWeatherBlock").isVisible(),true);
    assert.equal(await page.locator("#pinWeather").evaluate(el=>getComputedStyle(el).backgroundColor),
      "rgb(23, 100, 191)","Weather internal view uses the same blue open state");
    const weatherHeight=await page.locator("#pinWeatherBlock").evaluate(el=>el.getBoundingClientRect().height);
    assert.ok(weatherHeight>=175,"Weather placeholder uses middle region");
    assert.equal(await page.locator("#pinPanel .pin-navigation-row").isHidden(),true,
      "Navigation is hidden ONLY while weather occupies the same middle region");
    const weatherPanel=await page.locator("#pinPanel").boundingBox();
    const weatherRegion=await page.locator("#pinPanel .pin-detail-region").boundingBox();
    assert.ok(Math.abs(weatherRegion.y-navRect.y)<=1,
      "Weather top border must match the original routing/navigation border");
    assert.ok(Math.abs(weatherPanel.height-m.panel.height)<=1,
      "Weather toggle must preserve exact outer dialog height");
    await page.waitForFunction(()=>document.getElementById("pinPanel").getBoundingClientRect().top>=0,null,{timeout:4000});
    assert.ok((await page.locator("#pinPanel").boundingBox()).y>=0,"Weather editor stays visible after map pan/layout frame");
    assert.equal(await page.locator("#pinNotesBlock").isHidden(),true);
    assert.equal(await page.locator("#pinWeather").getAttribute("aria-pressed"),"true");
    assert.equal(await page.locator("#pinWeather").evaluate(el=>
      getComputedStyle(el).backgroundColor),"rgb(23, 100, 191)");
    await page.screenshot({path:"pin-dialog-visual-artifacts/"+viewport.name+"-weather.png"});
    await page.locator("#pinWeather").click();
    const restoredPanel=await page.locator("#pinPanel").boundingBox();
    assert.ok(Math.abs(restoredPanel.height-m.panel.height)<=1,
      "Returning from weather must restore original panel height");
    assert.equal(await page.locator("#pinPanel .pin-navigation-row").isVisible(),true);
    assert.equal(await page.locator("#pinNotesBlock").isVisible(),true);
    await page.screenshot({path:"pin-dialog-visual-artifacts/"+viewport.name+"-notes.png"});
    await page.locator("#pinLayerTrigger").click();
    await page.locator("#pinLayerMenu").waitFor({state:"visible",timeout:5000});
    assert.equal(await page.locator("#pinLayerTrigger").evaluate(el=>getComputedStyle(el).backgroundColor),
      "rgb(23, 100, 191)","Layer internal menu uses the same blue open state");
    const pop=await page.evaluate(()=>{
     const menu=document.getElementById("pinLayerMenu"),b=menu.getBoundingClientRect();
     return {parent:menu.parentElement.tagName,x:b.left,y:b.top,right:b.right,bottom:b.bottom,
      scrollWidth:menu.scrollWidth,clientWidth:menu.clientWidth,
      scrollHeight:menu.scrollHeight,clientHeight:menu.clientHeight,
      items:menu.querySelectorAll(".pin-layer-option").length,
      bodyScrollWidth:document.body.scrollWidth};
    });
    assert.equal(pop.parent,"BODY","Layer list must escape scrolling pin panel");
    assert.ok(pop.x>=4&&pop.right<=viewport.width-4,JSON.stringify(pop));
    assert.ok(pop.y>=4&&pop.bottom<=viewport.height-4,JSON.stringify(pop));
    assert.ok(pop.scrollWidth<=pop.clientWidth+2,"Horizontal layer menu scrolling: "+JSON.stringify(pop));
    assert.equal(pop.items,8,"A long eight-layer list must remain accessible");
    assert.ok(pop.scrollHeight>pop.clientHeight,"Long layer list should scroll independently");
    assert.ok(pop.bodyScrollWidth<=viewport.width+2,"Menu causes horizontal page scrolling");
    await page.screenshot({path:"pin-dialog-visual-artifacts/"+viewport.name+"-layers.png"});
    await page.locator("#pinLayerMenu .pin-layer-option").last().click();
    assert.equal(await page.locator("#pinLayerMenu").isHidden(),true);
    await page.locator("#pinUrlButton").click();
    assert.equal(await page.locator("#pinUrlButton").evaluate(el=>getComputedStyle(el).backgroundColor),
      "rgb(23, 100, 191)","URL internal popup uses the same blue open state");
    assert.equal(await page.locator("#pinNotesBlock").isVisible(),true,"URL popup must not replace notes");
    assert.equal(await page.locator("#pinUrlBlock").isVisible(),true);
    const urlPopup=await page.locator("#pinUrlBlock").evaluate(el=>{
      const r=el.getBoundingClientRect();
      const actions=[...el.querySelectorAll(".pin-url-actions button")].map(b=>{const q=b.getBoundingClientRect();return {width:q.width,height:q.height};});
      return {parent:el.parentElement.tagName,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,actions};
    });
    assert.equal(urlPopup.parent,"BODY");
    const pinBox=await page.locator("#pinPanel").boundingBox();
    assert.ok(urlPopup.left>=pinBox.x+3&&urlPopup.right<=pinBox.x+pinBox.width-3,
      "Entire URL popup must fit horizontally inside pin panel");

    assert.ok(urlPopup.left>=4&&urlPopup.right<=viewport.width-4&&urlPopup.top>=4&&urlPopup.bottom<=viewport.height-4,JSON.stringify(urlPopup));
    assert.ok(Math.abs(urlPopup.left-(pinBox.x+10))<=2&&Math.abs(urlPopup.right-(pinBox.x+pinBox.width-10))<=2,
      "URL popup maintains symmetric 10px horizontal insets");
    assert.equal(urlPopup.actions.length,2,"Only OK and URL öffnen are shown");
    for(const item of urlPopup.actions)assert.ok(item.width>=52&&Math.abs(item.height-34)<=1,"Rectangular URL button "+JSON.stringify(item));
    assert.equal(await page.locator("#pinUrl").getAttribute("rows"),"3");
    assert.equal(await page.locator("#pinUrl").evaluate(el=>el.tagName),"TEXTAREA");
    assert.equal(await page.locator("#pinUrlBlock legend").textContent(),"Pin-URL");
    const urlFieldHeight=await page.locator("#pinUrl").evaluate(el=>el.getBoundingClientRect().height);
    assert.ok(urlFieldHeight>=80,"Expanded URL textarea has usable vertical space");
    assert.equal(await page.locator("#pinUrlCancel").count(),0);
    const initialTop=await page.locator("#pinUrlBlock").evaluate(el=>Number.parseFloat(el.style.top));
    await page.locator("#pinUrl").focus();
    await page.evaluate(()=>window.visualViewport?.dispatchEvent(new Event("resize")));
    const keyboardTop=await page.locator("#pinUrlBlock").evaluate(el=>Number.parseFloat(el.style.top));
    assert.ok(Math.abs(initialTop-keyboardTop)<=1,"Keyboard resize must not reposition URL popup");
    await page.screenshot({path:"pin-dialog-visual-artifacts/"+viewport.name+"-url.png"});
    await page.locator("#pinUrlButton").click();
    assert.equal(await page.locator("#pinNotesBlock").isVisible(),true);
    assert.equal(await page.locator("#pinUrlBlock").isHidden(),true);
    // On touch devices, the editor must have its own focused area and
    // bottom toolbar; timestamps insert at the captured caret, not the end.
    await page.locator("#pinNotes").click();
    assert.equal(await page.locator("#pinMobileNoteEditor").isVisible(),true);
    await page.locator("#pinNoteEditorText").fill("VorNach");
    await page.locator("#pinNoteEditorText").evaluate(el=>{el.focus();el.setSelectionRange(3,3);el.dispatchEvent(new Event("select"));});
    await page.locator("#pinNoteInsertDate").click();
    const text=await page.locator("#pinNoteEditorText").inputValue();
    assert.match(text,/^Vor\d{2}\.\d{2}\.\d{4}Nach$/);
    const toolbar=await page.locator("#pinNoteEditorDone").boundingBox();
    assert.ok(toolbar.y>=0&&toolbar.y+toolbar.height<=viewport.height+2,
      "Mobile editor toolbar is not below the visible screen");
    await page.screenshot({path:"pin-dialog-visual-artifacts/"+viewport.name+"-mobile-notes.png"});
    await page.locator("#pinNoteEditorDone").click();
    assert.equal(await page.locator("#pinMobileNoteEditor").isHidden(),true);
    assert.equal(await page.locator("#pinNotes").inputValue(),text);
    assert.ok(await page.locator(".pin-sector-note[fill=\"#d94f55\"]").count()>0,"Saved note colors the pin circle segment");
    await page.screenshot({path:"pin-dialog-visual-artifacts/"+viewport.name+"-note-indicator.png"});
    assert.deepEqual(errors,[],"Uncaught page error");
    console.log("[visual] PASS",viewport.name,JSON.stringify({panel:m.panel,notes:m.noteHeight,
     button:viewport.button,layerList:pop}));
   }finally{await ctx.close();}
  }
  // A real fine-pointer desktop context: the corner launcher is hidden on touch.
  const desktop=await browser.newContext({viewport:{width:1280,height:800},serviceWorkers:"allow"});
  try{
   const page=await desktop.newPage();
   const errors=[];
   page.on("pageerror",e=>errors.push(e.message));
   await page.goto(base,{waitUntil:"domcontentloaded",timeout:30000});
   await page.waitForFunction(()=>!!window.L&&!!document.querySelector(".leaflet-container"),null,{timeout:20000});
   await page.mouse.move(640,570);
   await page.mouse.down();
   await page.waitForTimeout(735);
   await page.mouse.up();
   await page.locator("#pinPanel").waitFor({state:"visible",timeout:15000});
   const positions=await page.evaluate(()=>{
    const rect=s=>document.querySelector(s).getBoundingClientRect();
    const field=rect("#pinPanel .pin-detail-region"),button=rect("#pinNotesExpand .p2m-lucide");
    const logo=document.querySelector("#pinWikipedia .pin-wikipedia-logo");
    const weather=document.querySelector("#pinWeather");
    return {fieldRight:field.right,fieldBottom:field.bottom,
      buttonRight:button.right,buttonBottom:button.bottom,
      logoComplete:logo?.complete,logoWidth:logo?.naturalWidth,
      deleteIcon:document.querySelector("#deletePin")?.getAttribute("data-pin-icon"),
      weatherStroke:getComputedStyle(weather.querySelector("svg")).strokeWidth};
   });
   assert.ok(Math.abs(positions.fieldRight-positions.buttonRight)<=1,
     "Desktop note glyph right edge must match fieldset frame: "+JSON.stringify(positions));
   assert.ok(Math.abs(positions.fieldBottom-positions.buttonBottom)<=1,
     "Desktop note glyph bottom edge must match fieldset frame: "+JSON.stringify(positions));
   const editorButton=await page.locator("#pinNotesExpand").evaluate(el=>{
     const c=getComputedStyle(el),r=el.getBoundingClientRect(),svg=el.querySelector("svg").getBoundingClientRect();
     return {width:r.width,height:r.height,svgWidth:svg.width,svgHeight:svg.height,
       background:c.backgroundColor,borderRadius:c.borderRadius,shadow:c.boxShadow,border:c.borderTopWidth};
   });
   assert.ok(Math.abs(editorButton.width-20)<=1&&Math.abs(editorButton.height-20)<=1,
     "Only the tiny SVG may form the editor button: "+JSON.stringify(editorButton));
   assert.equal(editorButton.background,"rgb(255, 255, 255)");
   assert.equal(editorButton.borderRadius,"0px");
   assert.equal(editorButton.shadow,"none");
   assert.equal(editorButton.border,"0px");
   assert.ok(positions.logoComplete&&positions.logoWidth>0,"User-provided Wikipedia SVG must load locally");
   assert.equal(positions.deleteIcon,"map-pin-off");
   assert.ok(Math.abs(Number.parseFloat(positions.weatherStroke)-1.45)<.01);
   // Custom two-pin artwork is already SVG. Its per-element presentation
   // colors must be overridable by the shared white-hover contract.
   await page.locator("#movePin").hover();
   const moveStrokes=await page.locator("#movePin .p2m-relocate-icon path, #movePin .p2m-relocate-icon circle")
    .evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).stroke));
   assert.ok(moveStrokes.length>=5&&moveStrokes.every(value=>value==="rgb(255, 255, 255)"),
     "Custom SVG lines must turn white on hover: "+JSON.stringify(moveStrokes));
   const tip=await page.locator("#pinDialogTip").evaluate(el=>({
     baseCover:getComputedStyle(el,"::before").backgroundColor,
     baseHeight:getComputedStyle(el,"::before").height
   }));
   assert.equal(tip.baseCover,"rgb(247, 248, 250)","Dialog tip matches the new pale-gray panel surface");
   assert.equal(tip.baseHeight,"3px");
   await page.locator("#pinWikipedia").hover();
   await page.screenshot({path:"pin-dialog-visual-artifacts/desktop-v165-notes.png"});
   await page.locator("#pinWeather").click();
   const weatherFrame=await page.locator("#pinPanel .pin-detail-region").evaluate(el=>{
    const c=getComputedStyle(el);return {display:c.display,top:c.borderTopStyle,topWidth:c.borderTopWidth};
   });
   assert.equal(weatherFrame.display,"block","Weather fieldset keeps native legend border rendering");
   assert.equal(weatherFrame.top,"solid");
   assert.equal(weatherFrame.topWidth,"1px");
   await page.screenshot({path:"pin-dialog-visual-artifacts/desktop-v165-weather.png"});
   // Fine-pointer desktop: blue state must override the default red AND
   // the gray :hover rule throughout the native modal's lifetime.
   await page.locator("#pinWeather").click();
   await page.locator("#deletePin").click();
   const desktopDelete=await page.locator("#deletePin").evaluate(el=>({
     expanded:el.getAttribute("aria-expanded"),
     background:getComputedStyle(el).backgroundColor,
     border:getComputedStyle(el).borderTopColor,
     ink:getComputedStyle(el).color
   }));
   assert.deepEqual(desktopDelete,{
     expanded:"true",background:"rgb(23, 100, 191)",
     border:"rgb(23, 100, 191)",ink:"rgb(255, 255, 255)"
   },"Desktop modal trigger must be BLUE, not red or hovered gray");
   await page.screenshot({path:"pin-dialog-visual-artifacts/desktop-v166-delete.png"});
   assert.equal(await page.locator("#deleteDialog").evaluate(el=>el.matches(":modal")),false);
   await page.locator("#deletePin").click();
   await page.waitForFunction(()=>!document.querySelector("#deleteDialog").open &&
     document.querySelector("#deletePin").getAttribute("aria-expanded")==="false");
   await page.locator("#deletePin").click();
   await page.locator("#deleteDialog").waitFor({state:"visible"});
   await page.keyboard.press("Escape");
   await page.waitForFunction(()=>document.querySelector("#deleteDialog").open===false&&
     document.querySelector("#deletePin").getAttribute("aria-expanded")==="false");
   assert.equal(await page.locator("#deletePin").getAttribute("aria-expanded"),"false");
   assert.equal(await page.locator("#deletePin").evaluate(el=>el.classList.contains("is-active")),false);
   assert.deepEqual(errors,[]);
   console.log("[visual] PASS desktop v166 toggle, button state, weather and note-corner geometry");
  }finally{await desktop.close();}
 }finally{await browser.close();}
})().catch(error=>{console.error("[visual] FAIL",error.stack||error);process.exitCode=1;});
