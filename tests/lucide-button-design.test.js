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
  for(const name of ["search","refresh-cw","settings","layers","info","plus","minus","scan","x","check","trash"]){
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
