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
  assert.match(css,/\.pin-panel\{--p2m-pin-dialog-action-size:36px\}/);
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
