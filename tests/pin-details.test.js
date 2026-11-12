"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const PinDetails=require("../ui/pin-details.js");
const ops=require("../application/pin-operations.js");
const domain=require("../domain/project-model.js");
function fixture(){
 const events={},elements={};
 for(const id of ["pinPanel","pinNotesBlock","pinUrlBlock","pinNotes","pinUrl","pinUrlButton","pinUrlSave","pinUrlOpen","pinWikipedia","pinWeather","pinWeatherBlock","pinDetailTitle","pinGpxActions"]){
  const el={value:"",disabled:false,attrs:{},classes:new Set(id==="pinUrlBlock"?["hidden"]:[]),
   addEventListener(name,handler){(events[id]??={})[name]=handler;},
   setAttribute(k,v){this.attrs[k]=v;},
   setCustomValidity(){},reportValidity(){},
   classList:{toggle(name,enabled){if(enabled)this.el.classes.add(name);else this.el.classes.delete(name);},contains(name){return this.el.classes.has(name);}}};
  el.classList.el=el;elements[id]=el;
 }
 let notes=[],urls=[],wiki=0,layout=0;
 const controller=new PinDetails({getElement:id=>elements[id],document:{activeElement:null},
  onNote:value=>notes.push(value),onUrl:value=>urls.push(value),onWikipedia:()=>wiki++,onLayout:()=>layout++});
 controller.bind();
 const fire=(id,kind="click",value)=>{if(value!==undefined)elements[id].value=value;events[id][kind]({target:elements[id]});};
 return {controller,elements,fire,notes,urls,get wiki(){return wiki},get layout(){return layout}};
}
test("notes are edited inline without a replacement textarea or save dialog",()=>{
 const f=fixture();f.controller.render({id:"p",note:"Alt",url:""});
 assert.equal(f.elements.pinNotes.value,"Alt");
 f.fire("pinNotes","input","Zeile 1\nZeile 2");
 assert.deepEqual(f.notes,["Zeile 1\nZeile 2"]);
 f.controller.render({id:"p",note:"Zeile 1\nZeile 2",url:""});
 assert.equal(f.elements.pinNotes.value,"Zeile 1\nZeile 2");
});
test("URL popup overlays unchanged notes, button toggles draft and save commits",()=>{
 const f=fixture();f.controller.render({id:"p",note:"",url:"https://example.com"});
 f.fire("pinUrlButton");assert.equal(f.elements.pinNotesBlock.classes.has("hidden"),false);
 assert.equal(f.elements.pinUrlBlock.classes.has("hidden"),false);
 assert.equal(f.elements.pinUrlOpen.disabled,false);
 f.fire("pinUrl","input","not-a-valid-url");
 assert.equal(f.elements.pinUrlOpen.disabled,true);
 f.fire("pinUrlButton");assert.equal(f.elements.pinUrl.value,"https://example.com");
 assert.deepEqual(f.urls,[]);
 f.fire("pinUrlButton");f.fire("pinUrl","input","https://openstreetmap.org");
 f.fire("pinUrlSave");
 assert.deepEqual(f.urls,["https://openstreetmap.org"]);
 assert.equal(f.elements.pinUrlBlock.classes.has("hidden"),true);
 f.fire("pinWikipedia");assert.equal(f.wiki,1);
});
test("details persist on existing pin without IndexedDB schema change",()=>{
 const project=domain.defaultProject();
 const p=ops.createPin(project,{id:"a",lat:48,lng:9}, {validatePosition:domain.position,cleanText:domain.cleanText});
 const created=p.createdAt;
 ops.updateDetails(project,"a",{note:"Mehrere\nZeilen",url:"https://example.org"},{now:()=>"2026-11-12T10:00:00Z"});
 assert.equal(p.note,"Mehrere\nZeilen");
 assert.equal(p.url,"https://example.org");
 assert.equal(p.createdAt,created);
 assert.equal(p.updatedAt,"2026-11-12T10:00:00Z");
 assert.equal(ops.updateDetails(project,"missing",{note:"ignored"}),null);
});
test("the full six-button footer, offline shell and safe iOS font contract exist",()=>{
 const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
 const html=read("index.html"),sw=read("sw.js"),css=read("styles.css");
 const section=html.split('<section id="pinPanel"')[1].split("</section>")[0];
 assert.ok(section.includes('id="pinNotes"'));
 assert.ok(section.includes('class="pin-navigation-row"'));
 assert.equal((section.match(/ disabled/g)||[]).length,7,"Five navigation placeholders plus two dormant GPX buttons");
 assert.ok(html.includes('id="pinUrlOpen"'));
 assert.ok(!html.includes('id="pinUrlCancel"'));
 assert.ok(html.includes('<textarea id="pinUrl" rows="3"'));
 assert.ok(html.includes('<legend>Pin-URL</legend>'));
 assert.ok(section.includes('id="pinWeather"'));
 assert.match(section,/id="pinWeather"[^>]*aria-pressed="false"/);
 assert.match(css,/#pinPanel \.pin-detail-region #pinNotes\{[^}]*height:145px/);
 assert.match(css,/@media\(max-width:700px\)\{\s*#pinPanel \.pin-detail-region #pinNotes\{font-size:16px/);
 assert.ok(css.includes("@media(hover:none) and (pointer:coarse)"),"iPhone landscape must retain 16px notes");
 assert.ok(sw.includes('"./ui/pin-details.js"'));
 assert.ok(html.indexOf('./ui/pin-details.js')<html.indexOf('./app.js'));
});
