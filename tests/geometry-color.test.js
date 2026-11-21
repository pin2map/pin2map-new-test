"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const features=require("../domain/project-features.js");
const status=require("../ui/object-status.js");
test("geometry color overrides are opt-in and do not mutate any layer",()=>{
 const project={layers:[{id:"private",color:"#E64294"}],areas:[],rivers:[]};
 const geometry={type:"Polygon",coordinates:[[[8,49],[9,49],[9,50],[8,49]]]};
 const area=features.createArea(project,{id:"a",name:"A",geometry});
 const lake=features.createArea(project,{id:"l",name:"L",kind:"lake",geometry});
 const river=features.createRiver(project,{id:"r",name:"R",chains:[[[49,8],[50,9]]]}, "private");
 assert.equal(area.color,undefined);assert.equal(lake.color,undefined);assert.equal(river.color,undefined);
 for(const [type,id] of [["area","a"],["area","l"],["river","r"]])
  features.change(project,type,id,{color:"#ac34e0"});
 assert.equal(area.color,"#AC34E0");
 assert.equal(lake.color,"#AC34E0");
 assert.equal(river.color,"#AC34E0");
 assert.equal(project.layers[0].color,"#E64294");
 assert.throws(()=>features.change(project,"area","a",{color:"red"}),RangeError);
 assert.equal(area.color,"#AC34E0");
 features.change(project,"area","a",{color:null});
 assert.equal(area.color,undefined);
 assert.deepEqual(status.flags({note:"  ",url:"https://example.org"}),{note:false,url:true});
});
