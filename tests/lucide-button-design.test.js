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
  for(const name of ["search","refresh-cw","settings","layers","info","plus","minus","scan","x","check","trash","map-pin-off"]){
    const icon=Icons.svg(name,documentStub());
    assert.equal(icon.name,"svg");
    assert.equal(icon.attributes.viewBox,"0 0 24 24");
    assert.equal(icon.attributes["stroke-width"],"2");
    assert.equal(icon.attributes["aria-hidden"],"true");
    assert.ok(icon.children.length>0,"Empty icon: "+name);
  }
  assert.throws(()=>Icons.svg("unsupported",documentStub()),RangeError);
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
    layersButton:"layers",labelsToggle:"info",confirmMove:"check",cancelMove:"x"
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

test("pin dialog name replaces heading and red delete button uses official white Lucide icon",()=>{
  const html=read("index.html"),css=read("styles.css");
  const pinSection=html.match(/<section id="pinPanel"[\s\S]*?<\/section>/)?.[0]||"";
  assert.ok(pinSection);
  assert.ok(!pinSection.includes("<h2>Pin bearbeiten</h2>"));
  assert.match(pinSection,/<div class="panel-head pin-editor-head"><button id="deletePin"[^>]*data-pin-icon="map-pin-off"[^>]*aria-label="Pin löschen"><\/button><label[^>]*for="pinName"/,
    "Small red delete icon comes BEFORE the name input");
  assert.match(pinSection,/<input id="pinName"[^>]*aria-label="Pin-Name"/);
  assert.match(pinSection,/<div class="pin-actions">[\s\S]*?<button id="closePin"[^>]*data-close="pinPanel"[^>]*>OK<\/button><\/div>/,
    "Bottom-right OK closes pin dialog; it does not perform deletion");
  assert.equal((pinSection.match(/id="deletePin"/g)||[]).length,1);
  assert.match(css,/\.pin-panel\{--p2m-pin-dialog-action-size:32px\}/);
  const deleteStyles=css.match(/\.pin-panel \.pin-editor-head #deletePin\.p2m-icon-control\s*\{([^}]+)\}/)?.[1]||"";
  const okStyles=css.match(/\.pin-panel \.pin-actions #closePin\.pin-ok-button\s*\{([^}]+)\}/)?.[1]||"";
  for(const styles of [deleteStyles,okStyles]){
    assert.ok(styles.includes("width:var(--p2m-pin-dialog-action-size)!important"));
    assert.ok(styles.includes("height:var(--p2m-pin-dialog-action-size)!important"));
    assert.ok(styles.includes("flex:0 0 var(--p2m-pin-dialog-action-size)!important"));
  }
  assert.match(okStyles,/background:#c9eecb!important/);
  assert.match(css,/\.pin-panel \.pin-editor-head #pinName\s*\{/);
  const icon=Icons.svg("map-pin-off",documentStub());
  assert.equal(icon.children.length,5);
  assert.equal(icon.attributes.stroke,"currentColor");
});

test("all four pin-dialog buttons use one shared 32px size token",()=>{
  const html=read("index.html"),css=read("styles.css");
  const section=html.split('<section id="pinPanel"')[1]?.split("</section>")[0]||"";
  for(const id of ["movePin","deletePin","closePin","showPinLayer"]){
    assert.ok(section.includes('id="'+id+'"'),"Missing pin-dialog button: "+id);
  }
  assert.ok(section.includes('id="showPinLayer" type="button" data-pin-icon="eye"'));
  assert.ok(css.includes(".pin-panel{--p2m-pin-dialog-action-size:32px}"));
  const start=css.indexOf("#pinPanel button:is(#movePin,#deletePin,#closePin,#showPinLayer){");
  assert.ok(start>=0);
  const shared=css.slice(start,css.indexOf("}",start));
  for(const property of ["width","height","min-width","min-height","max-width","max-height"]){
    assert.ok(shared.includes(property+":var(--p2m-pin-dialog-action-size)!important"),property);
  }
  assert.ok(css.includes("#pinPanel #movePin .p2m-relocate-icon{width:28px!important;height:19px!important}"));
});

test("refresh is a separate circular map control at 35% screen height",()=>{
  const html=read("index.html"),css=read("styles.css"),app=read("app.js");
  const header=html.match(/<header class="topbar">([\s\S]*?)<\/header>/)?.[1]||"";
  assert.ok(!header.includes('id="refreshButton"'),"Refresh must not be inside search header");
  const map=html.indexOf('<main id="map"');
  const button=html.indexOf('id="refreshButton"');
  assert.ok(button>map,"Refresh button must be a separate map overlay");
  assert.match(html,/<button id="refreshButton"[^>]*data-pin-icon="refresh-cw"[^>]*class="refresh-map-button"/);
  const styles=css.match(/#refreshButton\.refresh-map-button\.p2m-icon-control\s*\{([^}]+)\}/)?.[1]||"";
  assert.ok(styles.includes("position:fixed!important"));
  assert.ok(styles.includes("left:12px!important"));
  assert.ok(styles.includes("top:35dvh!important"));
  assert.ok(styles.includes("border-radius:50%!important"));
  assert.ok(styles.includes("width:42px!important;height:42px!important"));
  assert.ok(css.includes("body.pin-open #refreshButton.refresh-map-button{display:none!important}"));
  assert.ok(app.includes('$(\"refreshButton\").addEventListener("click"'),
    "Existing service-worker update handler must remain unchanged");
});

test("info control is left of centered Layers with matching bottom alignment",()=>{
  const html=read("index.html"),css=read("styles.css");
  for(const id of ["layersButton","labelsToggle"]){
    assert.ok(html.includes('id="'+id+'"'));
  }
  const rule=css.match(/#app #labelsToggle\.labels-toggle\s*\{([^}]+)\}/)?.[1]||"";
  assert.ok(rule.includes("left:calc(50% - var(--p2m-map-circle-size) / 2 - 8px - var(--p2m-map-circle-size))!important"));
  assert.ok(rule.includes("bottom:calc(10px + env(safe-area-inset-bottom,0px))!important"));
  const layers=css.match(/#app #layersButton\.layers-bottom-button\s*\{([^}]+)\}/)?.[1]||"";
  assert.ok(layers.includes("left:50%!important"));
  assert.ok(layers.includes("transform:translateX(-50%)!important"));
  assert.ok(css.includes("body.pin-open #app button:is(#refreshButton,#layersButton,#labelsToggle)"));
});
test("every free map and header circular button uses one 42px diameter",()=>{
  const css=read("styles.css");
  const rule=css.match(/#app button:is\(#searchButton,#settingsButton,#refreshButton,#layersButton,#labelsToggle\),\s*#app button\.pin-zoom-button\.p2m-icon-control\s*\{([^}]+)\}/)?.[1]||"";
  assert.ok(css.includes(":root{--p2m-map-circle-size:42px}"));
  for(const prop of ["width","height","min-width","min-height","max-width","max-height"]){
    assert.ok(rule.includes(prop+":var(--p2m-map-circle-size)!important"),prop+" should use shared size");
  }
  assert.ok(rule.includes("border-radius:50%!important"));
  assert.ok(css.includes("#app .topbar{\n  height:52px!important"));
  assert.ok(css.includes("bottom:calc(9px + env(safe-area-inset-bottom,0px))!important"),"Both bottom buttons align in mobile mode");
  assert.ok(css.includes(".pin-panel{--p2m-pin-dialog-action-size:32px}"),"Editor buttons keep their separate size");
});

test("three equal-size zoom controls are docked bottom-left without touching dialog controls",()=>{
  const css=read("styles.css"),map=read("map-adapter-leaflet.js");
  assert.ok(map.includes('L.control({position:"bottomleft"})'),
    "Zoom controls must be a bottom-left Leaflet control");
  assert.ok(!map.includes('L.control({position:"topleft"})'),
    "Obsolete top-left placement must be absent");
  assert.match(map,/add\("\+","Vergrößern"/);
  assert.match(map,/add\("−","Verkleinern"/);
  assert.match(map,/add\("◎","Alle sichtbaren Pins anzeigen"/);
  assert.ok(css.includes("#map .leaflet-bottom.leaflet-left .pin-zoom-buttons{"));
  assert.ok(css.includes("margin:0 0 calc(10px + env(safe-area-inset-bottom,0px)) 10px!important"));
  assert.ok(css.includes("margin-bottom:calc(9px + env(safe-area-inset-bottom,0px))!important"));
  assert.ok(css.includes("#app button.pin-zoom-button.p2m-icon-control"),
    "Zoom controls retain the shared 42px size token");
});
