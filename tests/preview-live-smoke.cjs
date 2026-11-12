"use strict";
/* Test the published preview, not only the source checkout.
   A blank map in an otherwise visible UI must fail deployment validation. */
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const base=(process.env.PIN2MAP_LIVE_PREVIEW||"").replace(/\/+$/,"")+"/";
if(!/^https:\/\//.test(base))throw Error("Set PIN2MAP_LIVE_PREVIEW");
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.PIN2MAP_CHROMIUM_EXECUTABLE?{executablePath:process.env.PIN2MAP_CHROMIUM_EXECUTABLE}:{})});
  try{
    // Approved reference covers phone, tablet and desktop. Each is checked
    // against the *published* app; tracking-query reload is checked on phone.
    const targets=[
      {name:"phone",viewport:{width:390,height:844},variant:""},
      {name:"phone-tracking-url",viewport:{width:390,height:844},variant:"?utm_source=chatgpt.com"},
      {name:"tablet",viewport:{width:820,height:1180},variant:""},
      {name:"desktop",viewport:{width:1280,height:800},variant:""}
    ];
    for(const {name,viewport,variant} of targets){
      const context=await browser.newContext({viewport,serviceWorkers:"allow"});
      try{
        const page=await context.newPage(),errors=[];
        page.on("pageerror",error=>errors.push(error.message));
        const url=base+variant;
        await page.goto(url,{waitUntil:"domcontentloaded",timeout:35000});
        await page.waitForFunction(()=>Boolean(window.L)&&
          document.querySelector("#map.leaflet-container")&&
          document.querySelectorAll(".pin-zoom-button").length===3,
          null,{timeout:22000});
        const loaded=await page.evaluate(()=>({
          leaflet:!!window.L,zoomButtons:document.querySelectorAll(".pin-zoom-button").length,
          map:!!document.querySelector("#map.leaflet-container")
        }));
        assert.equal(loaded.zoomButtons,3);
        assert.equal(loaded.map,true);
        assert.deepEqual(errors,[],"Browser JS errors: "+errors.join("; "));
        // Cross-platform search clear works without the browser-native X.
        const search=page.locator("#searchInput"),clear=page.locator("#searchClear");
        assert.equal(await clear.isHidden(),true);
        await search.fill("Stuttgart");
        assert.equal(await clear.isVisible(),true);
        await clear.click();
        assert.equal(await search.inputValue(),"");
        assert.equal(await clear.isHidden(),true);
        assert.equal(await page.locator("#searchResults").isHidden(),true);
        // Per-pin interactive info overlays live in Leaflet's marker pane;
        // the pin editor's existing body class must hide them, without
        // requiring project data or creating a real user pin.
        const upperPinOverlayContract=await page.evaluate(()=>{
          const pane=document.querySelector("#map .leaflet-marker-pane");
          const fake=document.createElement("div");
          fake.className="elevation-label-wrap";
          pane.appendChild(fake);
          const before=getComputedStyle(fake).display;
          document.body.classList.add("pin-open");
          const whileOpen=getComputedStyle(fake).display;
          document.body.classList.remove("pin-open");
          const after=getComputedStyle(fake).display;
          fake.remove();
          return {before,whileOpen,after};
        });
        assert.notEqual(upperPinOverlayContract.before,"none");
        assert.equal(upperPinOverlayContract.whileOpen,"none",
          "Pin editor must hide clickable upper-pin label controls");
        assert.notEqual(upperPinOverlayContract.after,"none");
        // Only the Esri tile imagery changes; no contrast control remains.
        const chooser=page.locator("#basemapButton");
        const mapMenu=page.locator("#basemapMenu");
        const ordered=await mapMenu.locator("[data-basemap]").evaluateAll(items=>
          items.map(item=>item.dataset.basemap));
        assert.deepEqual(ordered,["street","international","humanitarian","topo","satellite"]);
        assert.equal(await mapMenu.locator(".basemap-menu-title").count(),0);
        assert.equal(await mapMenu.locator('[data-basemap="street"]').textContent(),"Standard");
        assert.equal(await mapMenu.locator("hr.basemap-satellite-divider").count(),2);
        await chooser.click();
        assert.equal(await chooser.getAttribute("aria-expanded"),"true");
        assert.equal(await chooser.evaluate(el=>getComputedStyle(el).backgroundColor),"rgb(23, 100, 191)");
        assert.equal(await chooser.evaluate(el=>getComputedStyle(el).color),"rgb(255, 255, 255)");
        await mapMenu.locator('[data-basemap="satellite"]').click();
        await chooser.click();
        const sun=mapMenu.locator("#satelliteBrightness");
        const reset=mapMenu.locator("#satelliteReset");
        assert.equal(await sun.isEnabled(),true);
        assert.equal(await mapMenu.locator("#satelliteContrast").count(),0);
        assert.equal(await mapMenu.locator('.basemap-slider-icon[data-pin-icon="sun-medium"] svg').count(),1);
        await sun.evaluate(el=>{
          el.value="165";el.dispatchEvent(new Event("input",{bubbles:true}));
          el.dispatchEvent(new Event("change",{bubbles:true}));
        });
        assert.equal(await mapMenu.isVisible(),true);
        const liveFilter=await page.evaluate(()=>{
          const img=document.querySelector('.leaflet-tile-pane img[src*="World_Imagery"]');
          return {tile:img?.closest(".leaflet-layer")?.style.filter,
            markers:getComputedStyle(document.querySelector(".leaflet-marker-pane")).filter};
        });
        assert.equal(liveFilter.tile,"brightness(1.65)",JSON.stringify(liveFilter));
        assert.equal(liveFilter.markers,"none");
        await mapMenu.locator('[data-basemap="street"]').click();
        const cleanFilter=await page.evaluate(()=>{
          const img=document.querySelector('.leaflet-tile-pane img[src*="tile.openstreetmap.org"]');
          return img?.closest(".leaflet-layer")?.style.filter;
        });
        assert.ok(!cleanFilter,"Street map must be untouched: "+cleanFilter);
        await chooser.click();
        assert.equal(await sun.isDisabled(),true);
        assert.equal(await reset.isDisabled(),true);
        const disabledLabel=await mapMenu.locator(".basemap-satellite-slider").first().evaluate(el=>({
          color:getComputedStyle(el).color,
          iconOpacity:getComputedStyle(el.querySelector(".basemap-slider-icon")).opacity
        }));
        assert.equal(disabledLabel.color,"rgb(156, 167, 179)");
        assert.equal(disabledLabel.iconOpacity,"0.48");
        await mapMenu.locator('[data-basemap="satellite"]').click();
        await chooser.click();
        assert.equal(await reset.isEnabled(),true);
        assert.equal(await reset.getAttribute("aria-label"),"Helligkeit auf 120 % zurücksetzen");
    assert.equal((await reset.innerText()).trim(),"Standard");
        await reset.click();
        assert.equal(await mapMenu.isVisible(),true);
        assert.equal(await reset.isDisabled(),true);
        assert.equal(await sun.inputValue(),"120");
        const defaultFilter=await page.evaluate(()=>{
          const img=document.querySelector('.leaflet-tile-pane img[src*="World_Imagery"]');
          return img?.closest(".leaflet-layer")?.style.filter;
        });
        assert.equal(defaultFilter,"brightness(1.2)");
        // Published geocoder contract: the number of pin results is not
        // device-dependent and the old 8-hit cache is revalidated with consent.
        const limitContract=await page.evaluate(async()=>{
          let requestedLimit=null,calls=0;
          const geocoder=new window.Pin2MapNominatimGeocoder({
            fetchImpl:async url=>{
              requestedLimit=Number(new URL(url).searchParams.get("limit"));
              calls++;
              return {ok:true,json:async()=>Array.from({length:25},(_,i)=>({
                lat:String(48+i/1000),lon:"9"
              }))};
            },language:"de"
          });
          const service=new window.Pin2MapPlaceSearchService({
            geocoder,domain:window.Pin2MapPlaceSearch,now:()=>200000000
          });
          const state={geoCache:{stuttgart:{time:200000000,
            results:Array.from({length:8},(_,i)=>({lat:String(i),lon:"8"}))}}};
          const oldOffline=await service.search("Stuttgart",{state,allowed:false});
          const updated=await service.search("Stuttgart",{state,allowed:true});
          const onlineAgain=await service.search("Stuttgart",{state,allowed:true});
          return {requestedLimit,calls,offlineLength:oldOffline.results.length,
            updatedLength:updated.results.length,cachedLength:onlineAgain.results.length,
            marker:state.geoCache.stuttgart.requestLimit};
        });
        assert.deepEqual(limitContract,{requestedLimit:25,calls:1,offlineLength:8,
          updatedLength:25,cachedLength:25,marker:25},
          "Published pin-search count/cache contract: "+JSON.stringify(limitContract));
        // The published search-to-pin port must not name a house-number pin "49".
        // All ports are fakes; this does not create or persist user pins.
        const pinNameContract=await page.evaluate(()=>{
          const address={name:"49",
            display_name:"49, Bilser Str., Hamburg, Deutschland",
            address:{road:"Bilser Str.",house_number:"49",city:"Hamburg"},
            lat:"53.55",lon:"10"};
          const domain=window.Pin2MapPlaceSearch;
          let captured=null;
          const transfer=new window.Pin2MapSearchPinTransfer({
            searchView:{hide:()=>{},message:()=>{}},
            titleOf:domain.pinName,
            addPin:(lat,lng,name)=>{captured={lat,lng,name};return {id:"synthetic"};},
            mapPort:{getViewport:()=>({zoom:13}),setView:()=>{}},
            onLayout:()=>{},isPrivateLayerVisible:()=>false,
            onRenderMarkers:()=>{}
          });
          transfer.choose(address);
          return {listTitle:domain.title(address),pinName:captured?.name,
            lat:captured?.lat,lng:captured?.lng};
        });
        assert.deepEqual(pinNameContract,{listTitle:"49",
          pinName:"Bilser Str. 49",lat:53.55,lng:10},
          "Published search must transfer street and house number into pin name");
        // Live acceptance of the search-results UI, not just a successful map start.
        // Use a local view instance: no geocoder requests or persisted pin changes.
        const searchContract=await page.evaluate(()=>{
          const host=document.getElementById("searchResults");
          const view=new window.Pin2MapSearchResultsView({
            container:host,document,
            onChoose:()=>{},titleOf:r=>r.name,detailOf:r=>r.detail
          });
          view.show([{name:"Stuttgart",detail:"Deutschland"},{name:"Stuttgart",detail:"USA"}]);
          const outer=document.querySelector(".topbar").getBoundingClientRect();
          const list=host.getBoundingClientRect();
          const bottom=document.getElementById("basemapButton").getBoundingClientRect();
          const first=host.querySelector(".result").getBoundingClientRect();
          const result={
            outer:{x:outer.x,width:outer.width,bottom:outer.bottom},
            list:{x:list.x,width:list.width,top:list.top,bottom:list.bottom},
            bottomEdge:bottom.bottom,firstTop:first.top,
            frameBorder:getComputedStyle(host).borderTopWidth,
            hasHeader:!!host.querySelector(".results-head"),
            footerLast:host.lastElementChild?.classList.contains("results-footer"),
            cancelText:host.querySelector(".results-footer button")?.textContent,
            count:host.querySelectorAll(".result").length
          };
          view.hide();
          return result;
        });
        assert.equal(searchContract.hasHeader,false,"Published search list must not show old gray header");
        assert.equal(searchContract.footerLast,true,"Published cancel must be last in results");
        assert.equal(searchContract.cancelText,"Abbrechen");
        assert.equal(searchContract.count,2);
        assert.ok(Math.abs(searchContract.outer.width-searchContract.list.width)<=3,
          "Published framed chooser matches outer search width: "+JSON.stringify(searchContract));
        assert.ok(Math.abs(searchContract.outer.x-searchContract.list.x)<=3,
          "Published framed chooser centers under outer search: "+JSON.stringify(searchContract));
        assert.ok(Math.abs(searchContract.list.top-searchContract.outer.bottom-8)<=3,
          "Framed chooser begins below the outer search block: "+JSON.stringify(searchContract));
        assert.ok(searchContract.firstTop>=searchContract.outer.bottom+8,
          "First result is inset below the outer block: "+JSON.stringify(searchContract));
        assert.ok(searchContract.list.bottom<=searchContract.bottomEdge+2,
          "Published chooser must not extend below bottommost buttons: "+JSON.stringify(searchContract));
        assert.equal(searchContract.frameBorder,"1px");

        // The published build must preserve predecessor place metadata and
        // keep Cancel visible while ONLY the hit rows scroll.
        const legacyResults=await page.evaluate(()=>{
          const host=document.getElementById("searchResults"),domain=window.Pin2MapPlaceSearch;
          const view=new window.Pin2MapSearchResultsView({
            container:host,document,onChoose:()=>{},
            titleOf:domain.title,detailOf:domain.detail,kindOf:domain.kind,
            duplicateCoordinates:domain.duplicateCoordinates
          });
          view.show(Array.from({length:32},(_,i)=>({
            name:"Springfield",display_name:"Springfield, USA",
            addresstype:"city",class:i%2?"boundary":"place",
            osm_type:i%2?"relation":"node",lat:String(39+i/100),lon:"-89"
          })));
          const items=host.querySelector(".results-items"),footer=host.querySelector(".results-footer");
          const top=footer.getBoundingClientRect().top;
          const types=[...items.querySelectorAll(".result-kind")].slice(0,2).map(x=>x.textContent);
          const coordinates=items.querySelector(".result-coordinates")?.textContent;
          items.scrollTop=items.scrollHeight;
          const after=footer.getBoundingClientRect().top;
          return {canScroll:items.scrollHeight>items.clientHeight,footerStatic:Math.abs(top-after)<=1,
            footerVisible:footer.getBoundingClientRect().bottom<=host.getBoundingClientRect().bottom+2,
            types,coordinates};
        });
        assert.equal(legacyResults.canScroll,true,JSON.stringify(legacyResults));
        assert.equal(legacyResults.footerStatic,true,JSON.stringify(legacyResults));
        assert.equal(legacyResults.footerVisible,true,JSON.stringify(legacyResults));
        assert.deepEqual(legacyResults.types,["● Stadt · Ortsmittelpunkt","▧ Stadt · Gebiet"]);
        assert.match(legacyResults.coordinates,/Position: 39/);
        await page.locator("#searchInput").fill("Stuttgart");
        assert.equal(await page.locator("#searchResults").isHidden(),true,
          "Published search input edit must hide current result list");
        await page.locator("#searchInput").press("Enter");
        assert.equal(await page.locator("#searchResults").isVisible(),true,
          "Explicit Enter must reopen search feedback");
        await page.locator("#searchInput").fill("");
        assert.equal(await page.locator("#searchResults").isHidden(),true);

        // Actual published keyboard behavior uses the predecessor's key contract.
        await page.evaluate(()=>{
          window.__liveSearchChoice=null;
          new window.Pin2MapSearchResultsView({
            container:document.getElementById("searchResults"),document,
            onChoose:r=>{window.__liveSearchChoice=r.name;},
            titleOf:r=>r.name,detailOf:r=>r.name
          }).show([{name:"First"},{name:"Second"},{name:"Third"}]);
        });
        await page.keyboard.press("ArrowDown");
        assert.equal(await page.locator("#searchResults .result").nth(1).evaluate(el=>el===document.activeElement),true);
        await page.keyboard.press("ArrowUp");
        assert.equal(await page.locator("#searchResults .result").first().evaluate(el=>el===document.activeElement),true);
        await page.keyboard.press("Enter");
        assert.equal(await page.evaluate(()=>window.__liveSearchChoice),"First");
        await page.keyboard.press("Escape");
        assert.equal(await page.locator("#searchResults").isHidden(),true);

        // Verify actual rendered mobile layout, not just CSS source rules.
        const geometry=await page.evaluate(()=>{
          const rect=id=>{
            const node=document.getElementById(id);
            const box=node.getBoundingClientRect();
            return {x:box.x,y:box.y,right:box.right,bottom:box.bottom,
                    width:box.width,height:box.height};
          };
          const attribution=document.querySelector(".leaflet-control-attribution");
          const a=attribution?.getBoundingClientRect();
          return {
            settings:rect("settingsButton"),layers:rect("layersButton"),
            search:rect("searchForm"),info:rect("labelsToggle"),
            basemap:rect("basemapButton"),
            attribution:a?{x:a.x,y:a.y,right:a.right,bottom:a.bottom,
              width:a.width,height:a.height,visible:getComputedStyle(attribution).display!=="none"}:null,
            window:{width:innerWidth,height:innerHeight}
          };
        });
        assert.ok(Math.abs(geometry.settings.y-geometry.layers.y)<=2,
          "Settings and Layers must share the top baseline: "+JSON.stringify(geometry));
        assert.ok(geometry.settings.right<=geometry.search.x+2,
          "Search must not overlap Settings: "+JSON.stringify(geometry));
        assert.ok(geometry.search.right<=geometry.layers.x+2,
          "Search must not overlap Layers: "+JSON.stringify(geometry));
        assert.ok(Math.abs(geometry.info.x-geometry.basemap.x)<=2,
          "Info and Map must be stacked at the same right position");
        assert.ok(geometry.info.bottom<=geometry.basemap.y-4,
          "Info must sit above Map, without overlap");
        assert.ok(geometry.attribution?.visible&&geometry.attribution.height>0,
          "Leaflet/OSM attribution must remain visible: "+JSON.stringify(geometry));
        assert.ok(geometry.attribution.bottom<=geometry.window.height+3,
          "Attribution must not fall below viewport: "+JSON.stringify(geometry));
        assert.ok(geometry.attribution.y>=geometry.basemap.bottom-5,
          "Attribution must remain below bottom map controls: "+JSON.stringify(geometry));
        await page.locator("#layersButton").click();
        await assert.equal(await page.locator("#layersPanel").isVisible(),true);
        const panelPosition=await page.evaluate(()=>{
          const panel=document.getElementById("layersPanel").getBoundingClientRect();
          const button=document.getElementById("layersButton").getBoundingClientRect();
          return {panelY:panel.y,buttonBottom:button.bottom,
                  panelRight:panel.right,buttonRight:button.right};
        });
        assert.ok(panelPosition.panelY>=panelPosition.buttonBottom,
          "Layers panel must open below its trigger");
        assert.ok(Math.abs(panelPosition.panelRight-panelPosition.buttonRight)<=2,
          "Layers panel must align to the trigger's right edge");
        await page.locator("#layersButton").click();
        assert.equal(await page.locator("#layersPanel").isVisible(),false);

        const sw=await page.evaluate(async()=>{
          const registration=await navigator.serviceWorker.ready;
          return !!registration.active;
        });
        assert.equal(sw,true);
        await page.reload({waitUntil:"domcontentloaded"});
        await page.waitForFunction(()=>Boolean(window.L)&&
          document.querySelector("#map.leaflet-container")&&
          document.querySelectorAll(".pin-zoom-button").length===3,
          null,{timeout:22000});
        assert.deepEqual(errors,[],"Errors after reload: "+errors.join("; "));
        console.log("PASS live map startup, controls, attribution and reload:",name,url);
      }finally{await context.close();}
    }
  }finally{await browser.close();}
})().catch(error=>{console.error("Live map startup FAIL:",error);process.exitCode=1;});
