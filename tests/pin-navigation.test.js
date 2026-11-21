"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const maps=require("../application/apple-maps-links.js");
const icons=require("../ui/lucide-icons.js");
const read=name=>fs.readFileSync(path.resolve(__dirname,"..",name),"utf8");
function stub(){
 return {createElementNS:(_ns,tag)=>({
  name:tag,attributes:{},children:[],
  setAttribute(k,v){this.attributes[k]=v;},append(child){this.children.push(child);}
 })};
}
test("Apple Maps uses WGS84 pin coordinates for directions and satellite view",()=>{
 const p={lat:48.7758461,lng:9.1829324};
 const d=new URL(maps.url("driving",p));
 assert.equal(d.hostname,"maps.apple.com");
 assert.equal(d.searchParams.get("daddr"),"48.775846,9.182932");
 assert.equal(d.searchParams.get("dirflg"),"d");
 assert.equal(d.searchParams.has("saddr"),false);
 const sat=new URL(maps.url("satellite",p));
 assert.equal(sat.searchParams.get("ll"),"48.775846,9.182932");
 assert.equal(sat.searchParams.get("t"),"k");
 assert.equal(sat.searchParams.has("daddr"),false);
 assert.throws(()=>maps.url("walking",p),RangeError);
 assert.throws(()=>maps.url("satellite",{lat:91,lng:0}),RangeError);
});
test("Pin copy and confirmation use exact bundled canonical Lucide glyphs",()=>{
 const p=icons.svg("map-pin-check",stub()),c=icons.svg("clipboard-check",stub());
 assert.deepEqual(p.children.map(el=>el.name),["path","circle","path"]);
 assert.deepEqual(c.children.map(el=>el.name),["rect","path","path"]);
 assert.equal(p.children[2].attributes.d,"m16 18 2 2 4-4");
 assert.equal(c.children[2].attributes.d,"m9 14 2 2 4-4");
 const html=read("index.html"),sw=read("sw.js"),ui=read("ui/pin-navigation.js");
 assert.match(html,/id="pinNavCopy"[^>]*data-pin-icon="map-pin-check"/);
 assert.match(html,/id="pinNavApple"[^>]*data-pin-icon="apple-brand"/);
 assert.match(ui,/setTimeout\(\(\)=>\{/);
 assert.match(ui,/\},1000\)/);
 assert.match(ui,/this\.writeText\(coordinates\)/);
 assert.match(ui,/this\.icons\.mount\(this\.button,"clipboard-check"\)/);
 assert.match(sw,/"\.\/application\/apple-maps-links\.js"/);
 assert.match(sw,/"\.\/ui\/pin-navigation\.js"/);
});
test("External Pin navigation is enabled but internal pin2map routing stays inactive",()=>{
 const html=read("index.html"),section=html.split('<section id="pinPanel"')[1].split("</section>")[0];
 const row=section.split('<div class="pin-navigation-row"')[1].split('<div id="pinGpxActions"')[0];
 assert.ok(row.includes('id="pinNavCopy"')&&row.includes('id="pinNavApple"'));
 assert.equal((row.match(/ disabled/g)||[]).length,3);
 assert.ok(!row.includes('id="pinNavCopy" disabled'));
 assert.ok(!row.includes('id="pinNavApple" disabled'));
 assert.match(read("styles.css"),/\.pin-apple-menu\.hidden\{display:none\}/);
});
