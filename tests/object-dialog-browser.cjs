"use strict";
/* No user project data: isolated synthetic dialog instances in real Chromium.
 * Covers the four object types against the same source and published preview.
 */
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const base=process.env.PIN2MAP_TEST_URL||"http://127.0.0.1:8765/";
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PIN2MAP_CHROMIUM_EXECUTABLE?
  {executablePath:process.env.PIN2MAP_CHROMIUM_EXECUTABLE}:{})});
 try{
  const sizes=[{width:390,height:844},{width:820,height:1180},{width:1280,height:800}];
  const signatures=new Map();
  for(const viewport of sizes){
   const context=await browser.newContext({
    viewport,serviceWorkers:"block",
    hasTouch:viewport.width<=820,isMobile:viewport.width<=390
   });
   try{
    const page=await context.newPage();
    await page.goto(base,{waitUntil:"domcontentloaded",timeout:35000});
    await page.waitForFunction(()=>window.Pin2MapGeometryEditor&&window.Pin2MapPinNoteEditor&&
      window.Pin2MapObjectLayerPicker&&window.Pin2MapObjectUrlPopup&&
      window.Pin2MapObjectDeleteDialog&&window.Pin2MapObjectDialogCore&&
      window.Pin2MapSearchTypeMenu?.CHOICES,
      null,{timeout:15000});
    for(const type of ["area","lake","river"]){
     if(type!=="area"){
      await page.reload({waitUntil:"domcontentloaded",timeout:35000});
      await page.waitForFunction(()=>window.Pin2MapGeometryEditor&&
        window.Pin2MapObjectLayerPicker&&window.Pin2MapObjectDialogCore);
     }
     const state=await page.evaluate(({type,viewport})=>{
      const updates=[],deletions=[],wikis=[];
      const item={id:"synthetic-"+type,name:type==="river"?"Testfluss":type==="lake"?"Testsee":"Testgebiet",
       layerId:"private",kind:type==="lake"?"lake":"area",note:"",url:""};
      const editor=new window.Pin2MapGeometryEditor({
       document,icons:window.Pin2MapIcons,
       onUpdate:(_type,_id,patch)=>{updates.push(patch);Object.assign(item,patch);return item;},
       onDelete:(_type,id)=>deletions.push(id),onWikipedia:n=>wikis.push(n)
      });
      const layers=[{id:"private",name:"Privat",color:"#326cc2",visible:true},
       {id:"hidden",name:"Ebene 1",color:"#e78525",visible:false},
       {id:"stations",name:"Bahnhöfe",color:"#10816a",visible:true}];
      editor.show(type==="river"?"river":"area",item,layers,{
       x:viewport.width*.5,y:viewport.height*.65});
      const desc=window.Pin2MapObjectDialogCore.descriptor(type);
      const symbol=editor.removeButton.querySelector("img,svg");
      const title=editor.legend.textContent;
      const notesVisible=getComputedStyle(editor.notesRow).display!=="none";
      const footer=[...editor.actions.children].map(x=>x.className);
      const panel=editor.panel.getBoundingClientRect();
      const panelStyle=getComputedStyle(editor.panel);
      const actionStyle=getComputedStyle(editor.layerButton);
      const noteStyle=getComputedStyle(editor.notesInput);
      const pinSurface=getComputedStyle(document.getElementById("pinPanel"));
      const surfaceParity=["backgroundColor","borderTopColor","borderTopWidth",
       "borderRadius","boxShadow","paddingTop","paddingRight","paddingBottom","paddingLeft"].every(
        property=>panelStyle[property]===pinSurface[property]);
      const surfaceDifferences=["backgroundColor","borderTopColor","borderTopWidth",
       "borderRadius","boxShadow","paddingTop","paddingRight","paddingBottom","paddingLeft"].filter(
        property=>panelStyle[property]!==pinSurface[property]).map(property=>({
        property,geometry:panelStyle[property],pin:pinSurface[property]}));
      const visualSignature={
       panelBackground:panelStyle.backgroundColor,
       panelBorderRadius:panelStyle.borderRadius,
       panelBoxShadow:panelStyle.boxShadow,
       actionRadius:actionStyle.borderRadius,
       actionWidth:editor.layerButton.getBoundingClientRect().width,
       actionHeight:editor.layerButton.getBoundingClientRect().height,
       noteBackground:noteStyle.backgroundColor,
       noteBorderRadius:noteStyle.borderRadius
      };
      editor.layerButton.click();
      const picker=editor.layerPicker;
      const before=picker.options.map(x=>!x.button.hidden);
      editor.layerButton.click();
      const closedOnSecondTap=!picker.open&&
        getComputedStyle(editor.layerMenu).display==="none"&&
        editor.layerButton.getAttribute("aria-expanded")==="false";
      editor.layerButton.click();
      const reopenedOnThirdTap=picker.open&&
        editor.layerButton.getAttribute("aria-expanded")==="true";
      const filterRemoved=picker.filterInput===null&&picker.clearButton===null&&
       !editor.layerMenu.querySelector(".pin-layer-filter");
      const after=picker.options.map(x=>!x.button.hidden);
      const afterRendered=picker.options.map(x=>getComputedStyle(x.button).display!=="none");
      const menu=editor.layerMenu.getBoundingClientRect();
      const menuHeight=menu.height;
      const firstRow=picker.options[0].button.getBoundingClientRect();
      const optionsVisibleInViewport=picker.options.filter(x=>{
        const r=x.button.getBoundingClientRect();
        return r.height>=30&&r.top>=menu.top+1&&r.bottom<=menu.bottom+1;
      }).length;
      const pickerScrollHeight=editor.layerMenu.scrollHeight;
      const pickerClientHeight=editor.layerMenu.clientHeight;
      picker.options[2].button.click();
      const selected=item.layerId;
      editor.linkButton.click();
      const url=editor.urlPopup.getBoundingClientRect();
      const header=editor.header.getBoundingClientRect();
      const actions=editor.actions.getBoundingClientRect();
      const legend=editor.urlLegend.textContent;
      const legendAlign=getComputedStyle(editor.urlLegend).textAlign;
      editor.urlInput.value="https://example.org/test-"+type;
      editor.urlInput.dispatchEvent(new Event("input",{bubbles:true}));
      const canOpen=!editor.urlOpen.disabled;
      editor.urlSave.click();
      const storedUrl=item.url;
      editor.expandButton.click();
      const openedNote=editor.noteEditor.open;
      const viaFocusSupported=typeof editor.notesInput.focus==="function";
      const noteArea=editor.notesInput.getBoundingClientRect();
      const noteBg=getComputedStyle(editor.notesInput).backgroundColor;
      const notePanel=editor.noteNodes.pinMobileNoteEditor.getBoundingClientRect();
      const noteText=editor.noteNodes.pinNoteEditorText.getBoundingClientRect();
      const noteStyles=getComputedStyle(editor.noteNodes.pinNoteEditorText);
      const noteDoneColor=getComputedStyle(editor.noteNodes.pinNoteEditorDone).backgroundColor;
      const noteViewport={width:innerWidth,height:innerHeight};
      editor.noteNodes.pinNoteEditorText.value="Mehrzeilige Notiz";
      editor.noteNodes.pinNoteEditorText.dispatchEvent(new Event("input",{bubbles:true}));
      editor.noteNodes.pinNoteEditorDone.click();
      const storedNote=item.note;
      editor.removeButton.click();
      const deleteOpen=editor.deleteDialog.open;
      const question=editor.deleteDialog.querySelector("h2").textContent;
      const overlay=editor.deleteDialog.getBoundingClientRect();
      editor.removeButton.click();
      const deleteClosed=!editor.deleteDialog.open;
      const buttons=[editor.removeButton,editor.layerButton,editor.linkButton,
       editor.wikiButton,editor.okButton].filter(Boolean).map(el=>{
        const box=el.getBoundingClientRect();
        return {width:box.width,height:box.height};
      });
      editor.panel.setAttribute("data-test-object-panel","true");
      editor.layerMenu.setAttribute("data-test-object-layer-menu","true");
      editor.noteNodes.pinMobileNoteEditor.setAttribute("data-test-object-note-editor","true");
      window.__p2mDialogFixture={editor,item,layers,type};
      editor.close();
      return {type,title,desc,symbol:desc.asset?symbol?.getAttribute("src"):symbol?.tagName,
       notesVisible,footer,visualSignature,surfaceParity,surfaceDifferences,panel:{left:panel.left,right:panel.right},
       before,after,filterRemoved,closedOnSecondTap,reopenedOnThirdTap,
       afterRendered,noteBg,noteDoneColor,
       notePanel:{width:notePanel.width,height:notePanel.height},
       noteText:{width:noteText.width,height:noteText.height},
       noteStyles:{fontSize:noteStyles.fontSize,backgroundColor:noteStyles.backgroundColor},
       noteViewport,
       menu:{left:menu.left,right:menu.right,top:menu.top,bottom:menu.bottom,
        height:menuHeight,firstRowHeight:firstRow.height,
        optionsVisibleInViewport,pickerScrollHeight,pickerClientHeight},
       selected,url:{left:url.left,right:url.right,top:url.top,bottom:url.bottom},
       headerBottom:header.bottom,actionsTop:actions.top,legend,legendAlign,canOpen,
       storedUrl,openedNote,viaFocusSupported,storedNote,deleteOpen,deleteClosed,question,
       overlay:{top:overlay.top,bottom:overlay.bottom},buttons,updates:updates.length,
       deletions:deletions.length};
     },{type,viewport});
     assert.equal(state.title,windowName(type),JSON.stringify(state));
     assert.equal(state.notesVisible,true,JSON.stringify(state));
     assert.ok(state.surfaceParity,"Object surface differs from Pin reference: "+
      JSON.stringify({type,viewport,delta:state.surfaceDifferences}));
     // Identical visual owner across Area, Lake and River. Compare real CSS,
     // rather than assuming a shared class name proves visual parity.
     const key=viewport.width+"x"+viewport.height;
     if(!signatures.has(key))signatures.set(key,state.visualSignature);
     else assert.deepEqual(state.visualSignature,signatures.get(key),
       "Geometry object Look-and-Feel must not drift by object type: "+JSON.stringify({type,viewport,state}));
     assert.ok(Math.abs(state.visualSignature.actionWidth-state.visualSignature.actionHeight)<=1.5,
       "All shared round action controls must really be round");
     if(state.desc.asset)assert.equal(state.symbol,"./assets/"+state.desc.asset);
     assert.deepEqual(state.before,[true,true,true],JSON.stringify(state));
     assert.equal(state.closedOnSecondTap,true,JSON.stringify(state));
     assert.equal(state.reopenedOnThirdTap,true,JSON.stringify(state));
     assert.equal(state.filterRemoved,true,JSON.stringify(state));
     assert.deepEqual(state.after,[true,true,true],JSON.stringify(state));
     assert.deepEqual(state.afterRendered,[true,true,true],JSON.stringify(state));
     assert.equal(state.noteBg,"rgb(255, 255, 255)",JSON.stringify(state));
     assert.equal(state.noteStyles.fontSize,"16px",JSON.stringify(state));
     assert.ok(state.noteText.width>state.noteViewport.width*.5&&
       state.noteText.height>=70,JSON.stringify(state));
     assert.equal(state.noteDoneColor,"rgb(201, 238, 203)",JSON.stringify(state));
     if(state.noteViewport.width<=390)assert.ok(
       Math.abs(state.notePanel.width-state.noteViewport.width)<=1,
       JSON.stringify(state));
     assert.equal(state.selected,"stations");
     assert.ok(state.menu.height>=90,"Geometry layer menu may not collapse to the filter only: "+JSON.stringify(state));
     assert.ok(state.menu.optionsVisibleInViewport>=1,
       "At least one actual selectable layer must be fully visible: "+JSON.stringify(state));
     assert.ok(state.menu.pickerScrollHeight<=state.menu.pickerClientHeight+2||
       state.menu.pickerClientHeight>=90,
       "Overflowing geometry menu must reserve a useful scrolling viewport: "+JSON.stringify(state));
     assert.ok(state.menu.left>=state.panel.left-2&&state.menu.right<=state.panel.right+2,
       JSON.stringify(state));
     assert.ok(state.menu.bottom<=state.actionsTop-7+1,JSON.stringify(state));
     assert.ok(state.menu.top>=state.headerBottom+7-1,"Title obscured: "+JSON.stringify(state));
     assert.ok(state.url.left>=state.panel.left-2&&state.url.right<=state.panel.right+2,
       JSON.stringify(state));
     assert.ok(state.url.bottom<=state.actionsTop+2,JSON.stringify(state));
     assert.ok(state.url.top>=state.headerBottom-2,JSON.stringify(state));
     assert.equal(state.legendAlign,"left");
     assert.equal(state.canOpen,true);
     assert.equal(state.storedUrl,"https://example.org/test-"+type);
     assert.equal(state.openedNote,true);
     assert.equal(state.storedNote,"Mehrzeilige Notiz");
     assert.equal(state.deleteOpen,true);
     assert.equal(state.deleteClosed,true);
     assert.match(state.question,/wirklich löschen\?/);
     assert.equal(state.deletions,0);
     for(const button of state.buttons)assert.ok(Math.abs(button.width-button.height)<1.5,
       JSON.stringify({type,viewport,button}));
     // End-to-end pointer/touch interaction instead of DOM .click() mock:
     // the original bug was hidden by an assertion on button.hidden while
     // author CSS continued to render the button.
     await page.evaluate(()=>{
      const {editor,item,layers,type}=window.__p2mDialogFixture;
      editor.show(type==="river"?"river":"area",item,layers,
       {x:innerWidth*.5,y:innerHeight*.65});
     });
     const layerButton=page.locator("[data-test-object-panel] .geometry-layer");
     await layerButton.click();
     assert.equal(await page.locator("[data-test-object-layer-menu]").isVisible(),true);
     assert.equal(await page.locator("[data-test-object-layer-menu] .pin-layer-filter").count(),0);
     const visible=await page.locator("[data-test-object-layer-menu] .pin-layer-option:visible").allTextContents();
     assert.equal(visible.length,3,JSON.stringify({type,viewport,visible}));
     await layerButton.click();
     assert.equal(await page.locator("[data-test-object-layer-menu]").isHidden(),true,
       "Layer button must toggle OFF on actual pointer click");
     await layerButton.click();
     assert.equal(await page.locator("[data-test-object-layer-menu]").isVisible(),true,
       "Layer button must toggle ON again");
     assert.equal(await page.locator("[data-test-object-layer-menu] .pin-layer-option:visible").count(),3,
       "Direct selector always shows all layers");
     await layerButton.click();
     const notes=page.locator("[data-test-object-panel] .object-editor-notes-input");
     await notes.click();
     const mobileEditor=page.locator("[data-test-object-note-editor]");
     if(viewport.width<=820){
      assert.equal(await mobileEditor.isVisible(),true,
       "Mobile/touch notes must open editor on field focus");
      const rect=await mobileEditor.boundingBox();
      if(viewport.width<=390)assert.ok(Math.abs(rect.width-viewport.width)<=1.5,
        "Mobile note editor must occupy visual viewport width");
      await page.locator("[data-test-object-note-editor] .pin-note-editor-actions button:last-child").click();
      assert.equal(await mobileEditor.isHidden(),true);
     }else{
      assert.equal(await mobileEditor.isHidden(),true,
       "Desktop note textarea must remain inline until expanded");
      await page.locator("[data-test-object-panel] .object-editor-expand").click();
      assert.equal(await mobileEditor.isVisible(),true,
       "Explicit expand button must open desktop note window");
      await page.locator("[data-test-object-note-editor] .pin-note-editor-actions button:last-child").click();
     }
     await page.evaluate(()=>window.__p2mDialogFixture.editor.close());
     // Regression from real iPhone screenshot: more than ten layers
     // must NOT reduce geometry popup to just the sticky filter field.
     await page.evaluate(({type,viewport})=>{
      const fixture=window.__p2mDialogFixture,editor=fixture.editor;
      const many=Array.from({length:12},(_,i)=>({
       id:"many-"+i,name:"Lange Gebietsebene "+i,color:"#326cc2",visible:true
      }));
      editor.show(type==="river"?"river":"area",fixture.item,many,
       {x:viewport.width*.5,y:viewport.height*.65});
     },{type,viewport});
     await layerButton.click();
     const expanded=await page.locator("[data-test-object-layer-menu]").evaluate(menu=>{
      const r=menu.getBoundingClientRect(),p=window.__p2mDialogFixture.editor.panel.getBoundingClientRect();
      const option=menu.querySelector(".pin-layer-option");
       const h=window.__p2mDialogFixture.editor.header.getBoundingClientRect(),
        f=window.__p2mDialogFixture.editor.actions.getBoundingClientRect();
      return {width:r.width,height:r.height,panelWidth:p.width,top:r.top,bottom:r.bottom,
       headerBottom:h.bottom,footerTop:f.top,
       panelTop:p.top,panelBottom:p.bottom,visibleOptions:[...menu.querySelectorAll(".pin-layer-option")].length,
       optionHeight:option?.getBoundingClientRect().height||0,
       scrollHeight:menu.scrollHeight,clientHeight:menu.clientHeight};
     });
     assert.ok(expanded.width>=expanded.panelWidth-25,
      "Restore chooser width to dialog width: "+JSON.stringify({type,viewport,expanded}));
     assert.ok(expanded.height>=90,
      "With twelve layers popup must show real selectable rows: "+JSON.stringify({type,viewport,expanded}));
     assert.ok(expanded.top>=expanded.headerBottom+7-1&&
       expanded.bottom<=expanded.footerTop-7+1&&
       expanded.bottom<=Math.min(viewport.height,expanded.panelBottom)+2,
      "Expanded chooser stays inside dialog and viewport: "+JSON.stringify({type,viewport,expanded}));
     assert.equal(expanded.visibleOptions,12);
     assert.ok(expanded.optionHeight>=38);
     await page.locator("[data-test-object-layer-menu] .pin-layer-option").last().click();
     assert.equal(await page.locator("[data-test-object-layer-menu]").isHidden(),true);
     await page.evaluate(()=>window.__p2mDialogFixture.editor.close());
     console.log("PASS shared REAL interaction",type,viewport.width+"x"+viewport.height);
     console.log("PASS shared object dialog",type,viewport.width+"x"+viewport.height);
    }
   }finally{await context.close();}
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
function windowName(type){return type==="area"?"Flächenname":type==="lake"?"Seename":"Flussname";}
