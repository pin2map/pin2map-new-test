"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const transfer=require("../application/project-transfer.js");
function base(){
  return {layers:[{id:"private",name:"Privat",color:"#808080",visible:true},
    {id:"work",name:"Arbeit",color:"#123456",visible:true}],
    pins:[{id:"pinA",lat:50.1,lng:8.7,name:"Frankfurt",layerId:"work",note:"Behalten"}],
    areas:[{id:"areaA",name:"Gebiet",layerId:"work",kind:"area",
      geometry:{type:"Polygon",coordinates:[[[8,50],[9,50],[9,51],[8,50]]]},note:"",url:""}],
    rivers:[{id:"riverA",name:"Fluss",layerId:"work",
      chains:[[[50,8],[51,9]]],note:"",url:""}],
    favorites:[{id:"fav1",name:"Favorit",lat:50,lng:8}],
    viewport:{lat:51,lng:9,zoom:8},allowGeocode:true,basemap:"street",
    geoCache:{q:{time:1,results:[]}},legacySources:[]};
}
test("full pin2map NEW round trip preserves all project collections, metadata, favorites and viewport",()=>{
  const state=base();
  const saved=transfer.encodeProject(state);
  const result=transfer.parseProject(saved,"archive.pin2map");
  assert.deepEqual(result.project,state);
  assert.equal(result.legacy,false);
  assert.equal(JSON.parse(saved).format,"pin2map-new");
});
test("merge preserves original data and remaps colliding IDs and layers",()=>{
  const one=base(),two=base();
  const merged=transfer.merge(one,two);
  assert.equal(merged.pins.length,2);
  assert.equal(merged.areas.length,2);
  assert.equal(merged.rivers.length,2);
  assert.equal(merged.favorites.length,2);
  assert.equal(merged.layers.length,3);
  assert.equal(new Set(merged.pins.map(p=>p.id)).size,2);
  assert.equal(new Set(merged.areas.map(p=>p.id)).size,2);
  assert.equal(merged.pins[0].layerId,"work");
  assert.notEqual(merged.pins[1].layerId,"work");
  assert.deepEqual(one,base());
});
test("legacy .pin2map reads coordinate lists, preserves unresolved names and raw sources",()=>{
  const file={format:"pin2map",version:1,
    list:"# 📍 [Red] Reise\n50.1122, 8.6821 (Frankfurt)\n@Schwarzwald (Gebiet)\nBerlin\n",
    cache:{source:"keep"},categoryVisibility:{Reise:false},rivers:[{name:"old",chains:[]}]};
  const result=transfer.parseProject("PIN2MAP\n"+JSON.stringify(file),"reise.pin2map");
  assert.equal(result.legacy,true);
  assert.equal(result.project.pins.length,1);
  assert.equal(result.project.pins[0].name,"Frankfurt");
  assert.equal(result.project.pins[0].lat,50.1122);
  assert.equal(result.project.layers[1].name,"Reise");
  assert.equal(result.project.layers[1].visible,false);
  assert.equal(result.unresolved,2);
  assert.deepEqual(result.project.legacySources[0].original,file);
  assert.deepEqual(transfer.parseProject(transfer.encodeProject(result.project)).project.legacySources[0].original,file);
});
test("never silently accept malformed or unsupported project files",()=>{
  assert.throws(()=>transfer.parseProject('{"x":true}'),/Unbekanntes/);
  assert.throws(()=>transfer.parseProject('not JSON'),/Ungültige/);
  const project=base();project.pins[0].lat=1234;
  assert.throws(()=>transfer.encodeProject(project),/Koordinaten/);
  const absent=base();absent.layers=absent.layers.filter(x=>x.id!=="private");
  assert.throws(()=>transfer.encodeProject(absent),/private Ebene/);
});
test("GPX export uses coordinates and escapes labels",()=>{
  const state=base();state.pins[0].name='A & <B>';
  const xml=transfer.encodeGpx(state);
  assert.match(xml,/<wpt lat="50.1" lon="8.7"><name>A &amp; &lt;B&gt;<\/name><\/wpt>/);
  assert.match(xml,/<trkpt lat="50" lon="8">/);
  assert.doesNotMatch(xml,/fav1|Gebiet/);
});
test("new GPX input contains strict waypoints and tracks",()=>{
  class Elem{
    constructor(tag,attrs={},children=[],text=""){
      this.tag=tag;this.attrs=attrs;this.children=children;
      this.textContent=text;this.localName=tag;
    }
    getAttribute(k){return this.attrs[k]??null;}
    getElementsByTagNameNS(ns,name){
      const descend=element=>element.children.flatMap(child=>
        [...(child.tag===name?[child]:[]),...descend(child)]);
      return descend(this);
    }
  }
  const root=new Elem("gpx",{},[
    new Elem("wpt",{lat:"49.1",lon:"8.4"},[new Elem("name",{},[],"Wegpunkt")]),
    new Elem("trk",{},[
      new Elem("name",{},[],"Weg"),
      new Elem("trkseg",{},[
        new Elem("trkpt",{lat:"49",lon:"8"}),
        new Elem("trkpt",{lat:"50",lon:"9"})
      ])
    ])
  ]);
  class Parser{
    parseFromString(){
      return {
        documentElement:root,
        getElementsByTagName:()=>[],
        getElementsByTagNameNS:(ns,name)=>root.getElementsByTagNameNS(ns,name)
      };
    }
  }
  const read=transfer.gpxRead("<gpx/>",Parser);
  assert.equal(read.project.pins.length,1);
  assert.equal(read.project.rivers.length,1);
  assert.equal(read.project.rivers[0].chains[0].length,2);
  assert.equal(read.project.pins[0].name,"Wegpunkt");
});

test("predecessor cache rehydrates named pins, polygons and drawn rivers offline",()=>{
  const polygon={type:"Polygon",coordinates:[[[8,50],[9,50],[9,51],[8,50]]]};
  const doc={format:"pin2map",version:1,
    list:"# 📍 [Red] Reise\\nFrankfurt (Stadt)\\n@Spessart (Wald)\\nBlaue Donau\\n",
    cache:{
      "Frankfurt (Stadt)":{kind:"pin",lat:50.11,lon:8.68,note:"Notiz",
        pinUrl:"https://example.org",createdAt:"2025-12-01"},
      "@Spessart (Wald)":{kind:"area",geometry:polygon}
    },
    rivers:[{name:"Donau",chains:[[[48.1,11.1],[48.2,11.2]]]}]};
  // Use actual predecessor list newlines.
  doc.list=doc.list.replaceAll("\\n","\n");
  const result=transfer.parseProject(JSON.stringify(doc),"reise.pin2map");
  assert.equal(result.project.pins.length,1);
  assert.equal(result.project.pins[0].name,"Stadt");
  assert.equal(result.project.pins[0].note,"Notiz");
  assert.equal(result.project.areas.length,1);
  assert.deepEqual(result.project.areas[0].geometry,polygon);
  assert.equal(result.project.rivers.length,1);
  assert.equal(result.project.rivers[0].name,"Donau");
  assert.equal(result.unresolved,1);
});
