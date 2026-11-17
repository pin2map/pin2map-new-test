"use strict";
const assert=require("node:assert/strict");
const Core=require("../ui/object-dialog-core.js");
const rect=(left,top,width,height)=>({left,top,right:left+width,bottom:top+height,width,height});
const viewport={left:0,top:0,width:390,height:844};
const panel=rect(8,240,374,340),trigger=rect(50,540,40,40);
for(const count of [1,3,8,18,40]){
 const contained=Core.layerMenuLayout({panel,trigger,viewport,contained:true,visibleRows:count});
 assert.ok(contained.width>=350,"dialog width preserved");
 assert.ok(contained.height>=Math.min(210,70+43*count),"visible options do not collapse into filter");
 assert.ok(contained.top>=panel.top&&contained.top+contained.height<=panel.bottom,"contained in dialog");
 const pin=Core.layerMenuLayout({panel,trigger,viewport,contained:false,visibleRows:count});
 assert.ok(pin.height>=72&&pin.width>=350,"pin uses same full-width sizing");
}
const compact=Core.layerMenuLayout({panel:rect(8,10,304,310),
 trigger:rect(24,280,40,40),viewport:{left:0,top:0,width:320,height:700},
 contained:true,visibleRows:18});
assert.ok(compact.width>=275&&compact.height>=210,"320px WebKit-sized viewport");
const shifted=Core.layerMenuLayout({panel:rect(8,240,374,340),trigger,
 viewport:{left:0,top:160,width:390,height:520},contained:true,visibleRows:18});
assert.ok(shifted.height>=210,"visual viewport offset does not consume popup");
const code=require("node:fs").readFileSync(require("node:path").join(__dirname,"../ui/pin-layer-picker.js"),"utf8");
for(const viewportWidth of [320,375,390,820]){
 const width=Math.min(390,viewportWidth-24);
 const owner=rect(8,120,viewportWidth-16,420);
 const popup=Core.layerMenuLayout({panel:owner,trigger:rect(40,485,42,42),
  viewport:{left:0,top:0,width:viewportWidth,height:850},
  contained:true,visibleRows:18});
 assert.ok(popup.top>=owner.top-1&&popup.top+popup.height<=owner.bottom+1);
 assert.ok(popup.width<=owner.width&&popup.height>=210);
}
assert.ok(code.includes("Core.layerMenuLayout"),"single owner controls layout");
assert.ok(code.includes("this.withinPanel"),"Pin must use bounded overlay while keeping external portal");
assert.ok(!code.includes("const notesRoom")&&!code.includes("const menuWidth"),"no note/header-driven geometry");
assert.ok(code.includes("this.contained?")&&code.includes('doc.getElementById?.("app")'),
 "geometry uses the editor stacking root; Pin keeps its verified BODY portal");
console.log("Shared layer popup layout contract passed.");
