"use strict";
const assert=require("node:assert/strict");
const Core=require("../ui/object-dialog-core.js");
const rect=(left,top,width,height)=>({left,top,right:left+width,bottom:top+height,width,height});
const viewport={left:0,top:0,width:390,height:844};
const panel=rect(8,240,374,340),trigger=rect(50,540,40,40);
for(const count of [1,3,8,18,40]){
 const contained=Core.layerMenuLayout({panel,trigger,viewport,contained:true,visibleRows:count});
 assert.ok(contained.width>=350,"dialog width preserved");
 assert.ok(contained.height>=Math.min(210,14+43*count),"visible options do not collapse into filter");
 assert.ok(contained.top>=panel.top&&contained.top+contained.height<=panel.bottom,"contained in dialog");
 const pin=Core.layerMenuLayout({panel,trigger,viewport,contained:false,visibleRows:count});
 assert.ok(pin.height>=57&&pin.width>=350,"pin uses same full-width sizing");
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
assert.ok(code.includes("this.contained?")&&code.includes("this.el(this.panelId):doc.body"),
 "geometry popup must be a non-flow child of its owner; Pin retains BODY portal");
console.log("Shared layer popup layout contract passed.");

for(const viewportWidth of [320,375,390,820,1280]){
 const panel=rect(8,140,Math.min(390,viewportWidth-16),490);
 const header=rect(8,150,panel.width,82);
 const footer=rect(8,555,panel.width,65);
 const trigger=rect(24,568,42,42);
 for(const count of [1,3,8,18,40]){
  const m=Core.layerMenuLayout({panel,header,footer,trigger,
   viewport:{left:0,top:0,width:viewportWidth,height:850},
   visibleRows:count,contained:true});
  assert.ok(m.top+m.height<=footer.top-8+0.01,
   "Popup must end above footer: "+JSON.stringify({viewportWidth,count,m}));
  assert.ok(m.height>=Math.min(140,14+43*count),"At least matching filter and option room");
 }
}

for(const width of [320,375,390,820,1280]){
 const w=Math.min(390,width-16);
 const p=rect(8,80,w,340),h=rect(8,90,w,70),f=rect(8,356,w,60);
 for(const count of [1,4,18,40]){
  const r=Core.layerMenuLayout({panel:p,header:h,footer:f,
   trigger:rect(24,368,42,42),
   viewport:{left:0,top:0,width,height:900},
   visibleRows:count,contained:true});
  assert.ok(r.top>=h.bottom+8-0.01,"Must preserve title row");
  assert.ok(r.top+r.height<=f.top-8+0.01,"Must preserve footer");
  assert.ok(r.height>=50,"Must show actual layer choices");
 }
}

for(const viewportWidth of [320,390,820,1280]){
 const pw=Math.min(390,viewportWidth-16);
 const owner=rect(8,180,pw,450),header=rect(8,190,pw,76),footer=rect(8,556,pw,58);
 for(const count of [1,2,5,18]){
  const r=Core.layerMenuLayout({panel:owner,header,footer,trigger:footer,
   viewport:{left:0,top:0,width:viewportWidth,height:1000},
   contained:true,visibleRows:count});
  assert.ok(Math.abs(r.top+r.height-(footer.top-8))<0.01,
   "All object choosers must grow UP from the footer, even with few layers");
  assert.ok(r.top>=header.bottom+8);
 }
}
