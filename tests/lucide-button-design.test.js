"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const Icons=require("../ui/lucide-icons.js");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");

function documentStub(){
  return {
    createElementNS(namespace,name){
      assert.equal(namespace,"http://www.w3.org/2000/svg");
      return {name,attributes:{},children:[],
        setAttribute(key,value){this.attributes[key]=value;},
        append(node){this.children.push(node);}
      };
    }
  };
}
test("all selected control icons are available as offline Lucide SVG geometry",()=>{
  for(const name of ["search","refresh-cw","settings","map","layers","tags","tags-off","message-circle-exclamation-point","message-circle-exclamation-point-off","info","plus","minus","scan","x","check","trash","map-pin-off"]){
    const icon=Icons.svg(name,documentStub());
    assert.equal(icon.name,"svg");
    assert.equal(icon.attributes.viewBox,"0 0 24 24");
    assert.equal(icon.attributes["stroke-width"],"2");
    assert.equal(icon.attributes["aria-hidden"],"true");
    assert.ok(icon.children.length>0,"Empty icon: "+name);
  }
  assert.throws(()=>Icons.svg("unsupported",documentStub()),RangeError);
});
test("time zone chooser and value labels use exact bundled Lucide geometries",()=>{
  const html=read("index.html"),css=read("styles.css");
  const catalog={
    "rotate-cw-clock":["M12 7v5l4 2","M16 8h5V3","m21 8-2.3-2.3A9.7 9.7 0 0012 3a9 9 0 109 9"],
    "rotate-ccw-clock":["M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8","M3 3v5h5","M12 7v5l4 2"],
    "clock-check":["M21.95 13a10 10 0 1 0-8.685 8.92","M12 6v6l4 2","m16 19 2 2 4-4"]
  };
  for(const [iconName,paths] of Object.entries(catalog)){
    const svg=Icons.svg(iconName,documentStub());
    assert.deepEqual(svg.children.map(item=>item.attributes.d),paths,iconName);
  }
  assert.match(html,/<button[^>]*data-pin-info-mode="zone"[^>]*><span data-pin-icon="rotate-cw-clock"><\/span><span>Zeitzone<\/span><\/button>/);
  const menu=html.split('<section id="pinInfoMenu"')[1].split("</section>")[0];
  assert.ok(menu.indexOf('data-pin-info-mode="zone"')>menu.indexOf('id="pinInfoSunPeriod"'));
  assert.ok(menu.indexOf('data-pin-info-mode="zone"')>=0,"Zone remains selectable");
  assert.ok(!menu.includes('class="pin-info-credit"'),"Sources no longer belong in info menu");
  assert.ok(html.includes('id="settingsPinInfoSources"'),"Sources belong in existing Settings");
  assert.match(css,/#map \.elevation-label \.p2m-zone-information svg/);
});

test("information icon retains exact Lucide shape and adds one rising slash only when Off",()=>{
  const enabled=Icons.svg("message-circle-exclamation-point",documentStub());
  const disabled=Icons.svg("message-circle-exclamation-point-off",documentStub());
  assert.equal(enabled.children.length,3);
  assert.equal(disabled.children.length,4);
  assert.deepEqual(disabled.children.slice(0,3).map(node=>({name:node.name,attributes:node.attributes})),
    enabled.children.map(node=>({name:node.name,attributes:node.attributes})));
  assert.equal(disabled.children[3].attributes.d,"M2 22 22 2");
  const html=read("index.html");
  assert.match(html,/<button id="pinInfoButton" data-pin-icon="message-circle-exclamation-point-off"/);
});

test("crossed tags state retains exact icon geometry and draws one diagonal slash",()=>{
  const normal=Icons.svg("tags",documentStub());
  const crossed=Icons.svg("tags-off",documentStub());
  assert.equal(normal.children.length,3);
  assert.equal(crossed.children.length,4);
  assert.deepEqual(crossed.children.slice(0,3).map(n=>({name:n.name,attributes:n.attributes})),
    normal.children.map(n=>({name:n.name,attributes:n.attributes})));
  assert.equal(crossed.children[3].name,"path");
  assert.equal(crossed.children[3].attributes.d,"M2 22 22 2");
});

test("mount replaces fallback character without changing accessible button labeling",()=>{
  const element={dataset:{},ownerDocument:documentStub(),children:[],
    classList:{add(name){this.value=name;}},
    replaceChildren(...nodes){this.children=nodes;}
  };
  Icons.mount(element,"x");
  assert.equal(element.dataset.pinIcon,"x");
  assert.equal(element.children[0].name,"svg");
  assert.equal(element.classList.value,"p2m-icon-control");
});
test("all icon controls use central circular styling and remain offline",()=>{
  const html=read("index.html"),css=read("styles.css"),sw=read("sw.js");
  for(const [id,name] of Object.entries({
    searchButton:"search",refreshButton:"refresh-cw",settingsButton:"settings",
    layersButton:"layers",labelsToggle:"tags",confirmMove:"check",cancelMove:"x"
  })){
    const tag=html.match(new RegExp("<button[^>]*id=\""+id+"\"[^>]*>"));
    assert.ok(tag,"Missing button: "+id);
    assert.ok(tag[0].includes('data-pin-icon="'+name+'"'),"Wrong Lucide name for "+id);
  }
  assert.match(css,/button\.p2m-icon-control\s*\{/);
  assert.match(css,/border-radius:50%!important/);
  assert.match(css,/--p2m-button-bg:#fff/);
  assert.match(css,/--p2m-button-border:#c2c9d1/);
  assert.match(sw,/\.\/ui\/lucide-icons\.js/);
  assert.ok(html.includes('src="./ui/lucide-icons.js"'));
  assert.ok(!html.includes('https://unpkg.com/lucide'));
});


test("pin relocate composite renders two colored pins and dashed neutral connector",()=>{
  const svg=Icons.svg("pin-relocate",documentStub());
  assert.equal(svg.attributes.viewBox,"0 0 36 24");
  assert.equal(svg.attributes["aria-hidden"],"true");
  const paths=svg.children.filter(n=>n.name==="path");
  const circles=svg.children.filter(n=>n.name==="circle");
  assert.equal(paths.length,3);
  assert.equal(circles.length,2);
  assert.equal(paths[0].attributes.stroke,"#78838c");
  assert.equal(paths[0].attributes["stroke-dasharray"],"2 3");
  assert.equal(paths[1].attributes.stroke,"#cf3444");
  assert.equal(paths[2].attributes.stroke,"#16864f");
  const html=read("index.html"),css=read("styles.css");
  assert.match(html,/<button id="movePin"[^>]*data-pin-icon="pin-relocate"[^>]*aria-label="Pin verschieben"/);
  assert.match(css,/#movePin\.p2m-icon-control\s*\{/);
  assert.match(css,/#movePin \.p2m-relocate-icon\s*\{/);
  assert.match(html,/<button id="movePin"[^>]*><\/button>/,
    "Relocation button must have no visible text, even before SVG mounting");
});


test("framed pin editor contains inert routing and an independent URL popup",()=>{
 const html=read("index.html"),css=read("styles.css");
 const section=html.match(/<section id="pinPanel"[\s\S]*?<\/section>/)?.[0]||"";
 assert.match(section,/id="deletePin"[^>]*data-pin-icon="map-pin-off"/);
 assert.doesNotMatch(section,/id="cancelPin"/);
 for(const title of ["Pin Name","Navi extern","pin2map Routing","Pin Notizen"])
   assert.ok(section.includes("<legend"+(title==="Pin Notizen"?" id=\"pinDetailTitle\"":"")+">"+title+"</legend>"),"Frame legend: "+title);
 const placeholder=section.match(/<div class="pin-navigation-row"[\s\S]*?<\/div>\s*<\/fieldset>\s*<\/div>/)?.[0]||"";
 assert.equal((placeholder.match(/ disabled/g)||[]).length,5);
 assert.ok(!section.includes('id="pinCreated"')&&!section.includes('id="pinUpdated"'));
 const popup=html.slice(html.indexOf('<div id="pinUrlBlock"'));
 assert.match(popup,/class="pin-url-popup hidden"/);
 for(const id of ["pinUrlSave","pinUrlOpen"])assert.ok(popup.includes('id="'+id+'"'));
 const ids=["movePin","pinLayerTrigger","pinUrlButton","pinWikipedia","pinWeather","closePin"];
 let last=-1;
 for(const id of ids){const index=section.indexOf('id="'+id+'"');assert.ok(index>last,id);last=index;}
 for(const name of ["layers-arrow-down","link-2","save-check","external-link","thermometer-snowflake","arrow-up-right","circle-dot","apple-brand"]){
   const svg=Icons.svg(name,documentStub());assert.ok(svg.children.length,name);
 }
 // The wanted link-2 is the horizontal three-part glyph, not diagonal Link.
 assert.equal(Icons.svg("link-2",documentStub()).children.length,3);
 assert.ok(section.includes('class="pin-nav-apple" data-pin-icon="apple-brand"'));
 assert.ok(section.includes('class="pin-wikipedia-logo" src="./assets/wikipedia-social.svg"'));
 assert.doesNotMatch(section,/|ⓦ/,"No private-use or nonportable circled font glyphs");

 const action=css.match(/#pinUrlBlock \.pin-url-actions button\{([^}]+)\}/)?.[1]||"";
 assert.match(action,/min-width:52px/);
 assert.match(css,/#pinPanel \.pin-detail-region #pinNotes\{[^}]*height:145px/);
});
test("refresh is a separate circular map control at 35% screen height",()=>{
  const html=read("index.html"),css=read("styles.css"),app=read("app.js");
  const header=html.match(/<header class="topbar">([\s\S]*?)<\/header>/)?.[1]||"";
  assert.ok(!header.includes('id="refreshButton"'));
  assert.ok(html.indexOf('id="refreshButton"')>html.indexOf('<main id="map"'));
  assert.match(html,/<button id="refreshButton"[^>]*data-pin-icon="refresh-cw"[^>]*class="refresh-map-button"/);
  const styles=css.match(/#refreshButton\.refresh-map-button\.p2m-icon-control\s*\{([^}]+)\}/)?.[1]||"";
  assert.ok(styles.includes("position:fixed!important"));
  assert.ok(styles.includes("left:12px!important"));
  assert.ok(styles.includes("top:35dvh!important"));
  assert.ok(styles.includes("background:#fff!important"));
  assert.ok(!/(?:^|;)\s*(?:width|height|border-radius)\s*:/.test(styles),"Refresh dimensions are shared");
  const owner=css.match(/#app button:is\(#settingsButton,#refreshButton,#layersButton,#labelsToggle,#basemapButton\),\s*#app button\.pin-zoom-button\.p2m-icon-control\{([^}]+)\}/)?.[1]||"";
  assert.ok(owner.includes("width:var(--p2m-map-circle-size)!important"));
  assert.ok(owner.includes("height:var(--p2m-map-circle-size)!important"));
  assert.ok(owner.includes("border-radius:50%!important"));
  assert.ok(css.includes("body.pin-open #refreshButton.refresh-map-button{display:none!important}"));
  assert.ok(app.includes('$("refreshButton").addEventListener("click"'));
});


test("Layers occupies the upper-right corner while Info stays above the lower-right map picker",()=>{
  const html=read("index.html"),css=read("styles.css");
  for(const id of ["layersButton","labelsToggle","basemapButton"]){
    assert.ok(html.includes('id="'+id+'"'));
  }
  const layerAt=css.lastIndexOf("#app #layersButton.layers-bottom-button{");
  assert.ok(layerAt>=0);
  const layers=css.slice(layerAt,css.indexOf("}",layerAt));
  assert.ok(layers.includes("left:auto!important"));
  assert.ok(layers.includes("right:var(--p2m-top-corner-inset)!important"));
  const info=css.match(/#app #labelsToggle\.labels-toggle\s*\{([^}]+)\}/)?.[1]||"";
  assert.ok(info.includes("left:auto!important"));
  assert.ok(info.includes("right:var(--p2m-top-corner-inset)!important"));
  assert.ok(info.includes("bottom:calc(var(--p2m-bottom-control-baseline) + var(--p2m-map-circle-size) + 8px)!important"));
  assert.ok(css.includes("#app #basemapButton.basemap-map-button.p2m-icon-control"));
  assert.ok(css.includes("bottom:var(--p2m-bottom-control-baseline)!important"));
  assert.ok(css.includes("body.pin-open #app button:is(#settingsButton,#refreshButton,#layersButton,#labelsToggle,#basemapButton,#pinInfoButton)"),
    "Focused pin editor must hide every map control including Pin-Info");
  assert.ok(!css.includes("body.pin-open #map .elevation-label-wrap{display:none"),
    "Pin info labels must remain visible while editing");
});


test("standalone map controls share 42px; search ring and editor actions stay separate",()=>{
  const css=read("styles.css");
  const rule=css.match(/#app button:is\(#settingsButton,#refreshButton,#layersButton,#labelsToggle,#basemapButton\),\s*#app button\.pin-zoom-button\.p2m-icon-control\s*\{([^}]+)\}/)?.[1]||"";
  assert.match(css,/--p2m-map-circle-size:42px/);
  for(const prop of ["width","height","min-width","min-height","max-width","max-height"]){
    assert.ok(rule.includes(prop+":var(--p2m-map-circle-size)!important"),prop);
  }
  assert.ok(rule.includes("border-radius:50%!important"));
  assert.ok(css.includes("#app .topbar{\n  height:52px!important"));
  assert.ok(!rule.includes("#searchButton"),"Search action must not inherit the map size contract");
  assert.match(css,/--p2m-search-tap-size:42px/);
  assert.match(css,/--p2m-search-ring-size:30px/);
  assert.ok(css.includes(":root{--p2m-pin-dialog-action-size:42px}"));
});


test("three equal-size zoom controls dock bottom-left above attribution",()=>{
  const css=read("styles.css"),map=read("map-adapter-leaflet.js");
  assert.ok(map.includes('L.control({position:"bottomleft"})'));
  assert.ok(!map.includes('L.control({position:"topleft"})'));
  assert.match(map,/add\("\+","Vergrößern"/);
  assert.match(map,/add\("−","Verkleinern"/);
  assert.match(map,/add\("◎","Alle sichtbaren Pins anzeigen"/);
  assert.ok(css.includes("#map .leaflet-bottom.leaflet-left .pin-zoom-buttons{"));
  assert.ok(css.includes("margin:0 0 0 10px!important"));
  assert.ok(css.includes("margin-bottom:var(--p2m-bottom-control-baseline)!important"));
  assert.ok(css.includes("--p2m-bottom-control-baseline:max("));
  assert.ok(css.includes("#app button.pin-zoom-button.p2m-icon-control"));
});


test("settings and Layers flank search above while map picker stays bottom-right",()=>{
  const html=read("index.html"),css=read("styles.css"),app=read("app.js");
  const head=html.match(/<header class="topbar">([\s\S]*?)<\/header>/)?.[1]||"";
  const settings=html.match(/<button id="settingsButton"[^>]*>/)?.[0]||"";
  assert.ok(settings.includes('class="settings-map-button"'));
  assert.ok(!head.includes('id="settingsButton"'));
  assert.ok(html.indexOf('id="settingsButton"')>html.indexOf('<main id="map"'));
  assert.ok(css.includes("#app #settingsButton.settings-map-button.p2m-icon-control"));
  assert.ok(css.includes("top:calc(var(--p2m-top-corner-offset) + env(safe-area-inset-top,0px))!important"));
  assert.ok(css.includes("left:var(--p2m-top-search-clearance)!important"));
  assert.ok(css.includes("right:var(--p2m-top-search-clearance)!important"));
  const menu=html.match(/<section id="basemapMenu"[\s\S]*?<\/section>/)?.[0]||"";
  assert.ok(!menu.includes('class="basemap-menu-title"'));
  assert.deepEqual([...menu.matchAll(/data-basemap="([^"]+)"/g)].map(match=>match[1]),
    ["street","international","humanitarian","topo","satellite"]);
  assert.ok(menu.indexOf('class="basemap-satellite-divider"')<
    menu.indexOf('data-basemap="satellite"'));
  assert.ok(menu.indexOf('data-basemap="topo"')<
    menu.indexOf('class="basemap-satellite-divider"'));
  assert.ok(menu.indexOf('data-basemap="satellite"')<menu.indexOf('id="satelliteBrightness"'));
  assert.ok(menu.indexOf('id="satelliteBrightness"')<menu.indexOf('id="esriReliefToggle"'));
  assert.ok(!menu.includes('id="satelliteContrast"'));
  assert.ok(html.includes('id="basemapButton" data-pin-icon="map"'));
  const settingsPanel=html.match(/<aside id="settingsPanel"[\s\S]*?<\/aside>/)?.[0]||"";
  assert.ok(!settingsPanel.includes("Kartendarstellung"));
  assert.ok(!html.includes('id="basemapSelect"'));
  assert.ok(css.includes("#app #basemapButton.basemap-map-button.p2m-icon-control"));
  assert.ok(css.includes("bottom:var(--p2m-bottom-control-baseline)!important"));
  assert.ok(css.includes("#app #basemapMenu.basemap-menu"));
  const basemapUI=read("ui/basemap-menu.js");
  assert.ok(basemapUI.includes('querySelectorAll("#basemapMenu [data-basemap]")'));
  assert.ok(basemapUI.includes('event.key==="Escape"'));
  assert.ok(basemapUI.includes('this.button.setAttribute("aria-expanded"'));
  assert.ok(app.includes("new window.Pin2MapBasemapMenu"));
  assert.ok(app.includes("state.basemap=value;setTileLayer();save()"));
  assert.ok(app.includes("basemapMenu.bind()"));
  assert.ok(html.indexOf('./ui/basemap-menu.js')<html.indexOf('./app.js'));
  assert.ok(css.includes("body.pin-open #app #basemapMenu"));
  const common=css.match(/#app button:is\(#settingsButton,#refreshButton,#layersButton,#labelsToggle,#basemapButton\),[\s\S]*?\}/)?.[0]||"";
  assert.ok(common.includes("width:var(--p2m-map-circle-size)!important"));
});

test("Leaflet and OSM attribution is horizontally centered at the screen bottom",()=>{
  const css=read("styles.css");
  const rule=css.match(/#map \.leaflet-bottom\.leaflet-right\s*\{([^}]+)\}/)?.[1]||"";
  assert.ok(rule.includes("left:50%!important"));
  assert.ok(rule.includes("right:auto!important"));
  assert.ok(rule.includes("bottom:env(safe-area-inset-bottom,0px)!important"));
  assert.ok(rule.includes("transform:translateX(-50%)!important"));
  const attribution=css.match(/#map \.leaflet-bottom\.leaflet-right \.leaflet-control-attribution\s*\{([^}]+)\}/)?.[1]||"";
  assert.ok(attribution.includes("text-align:center"));
  assert.ok(attribution.includes("margin:0!important"));
  assert.ok(!rule.includes("58px"),"Attribution must no longer float above map button");
});

test("iPhone only: fixed viewport without obsolete bottom-position overrides",()=>{
  const css=read("styles.css");
  const start=css.indexOf("/* iPhone viewport corrections (2026-11-10).");
  const end=css.indexOf("/* BOTTOM MAP CONTROL BASELINE",start);
  assert.ok(start>=0&&end>start);
  const section=css.slice(start,end);
  assert.ok(section.includes("@media (max-width:430px) and (hover:none) and (pointer:coarse)"));
  assert.ok(section.includes("overflow:hidden!important"));
  assert.ok(section.includes("overscroll-behavior:none!important"));
  assert.ok(section.includes("backdrop-filter:none!important"));
  assert.ok(!section.includes("bottom:calc(2px"),"No iPhone-specific button offset");
});
test("predecessor-safe baseline keeps all lower controls clear of the footer",()=>{
  const css=read("styles.css"),start=css.indexOf("/* BOTTOM MAP CONTROL BASELINE");
  assert.ok(start>=0);
  const rule=css.slice(start);
  assert.ok(rule.includes("--p2m-bottom-attribution-height:12px"));
  assert.ok(rule.includes("--p2m-bottom-credit-gap:6px"));
  assert.ok(rule.includes("--p2m-bottom-control-baseline:max("));
  assert.ok(rule.includes("env(safe-area-inset-bottom,0px)"));
  for(const selector of [
    "#app #layersButton.layers-bottom-button",
    "#app #labelsToggle.labels-toggle",
    "#app #basemapButton.basemap-map-button.p2m-icon-control",
    "#map .leaflet-bottom.leaflet-left .pin-zoom-buttons"
  ])assert.ok(rule.includes(selector),"Shared baseline: "+selector);
  assert.ok(rule.includes("bottom:var(--p2m-bottom-control-baseline)!important"));
  assert.ok(rule.includes("margin-bottom:var(--p2m-bottom-control-baseline)!important"));
  assert.ok(rule.includes("bottom:calc(var(--p2m-bottom-control-baseline) + 50px)!important"));
  assert.ok(rule.includes("line-height:var(--p2m-bottom-attribution-height)!important"));
  assert.ok(rule.includes("bottom:0!important"));
});
