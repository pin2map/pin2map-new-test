"use strict";
/* Search chooser: one compact creation chooser and an independent persisted-in-memory
 * object-search mode. No project data, persistence or Leaflet APIs here. */
(function(root){
 const CHOICES=Object.freeze([
  {id:"pin",label:"Pin",shortcut:"p",icon:"map-pin"},
  {id:"gps",label:"GPS-Location",shortcut:"l",icon:"locate-fixed"},
  {id:"area",label:"Gebiet",shortcut:"g",asset:"region.svg"},
  {id:"lake",label:"See",shortcut:"s",asset:"lake.svg"},
  {id:"river",label:"Fluss",shortcut:"f",asset:"river.svg"},
  {id:"plate",label:"Kennzeichen",shortcut:"k",icon:"car"}
 ]);
 class SearchTypeMenu{
  constructor({document:doc,getElement,icons,onChoose,onSearch=()=>{},onExit=()=>{}}){
   this.doc=doc;this.el=getElement;this.icons=icons;
   this.onChoose=onChoose;this.onSearch=onSearch;this.onExit=onExit;
   this.menu=this.el("searchTypeMenu");this.button=this.el("searchButton");
   this.input=this.el("searchInput");this.form=this.el("searchForm");
   this.app=this.el("app");
   if(!this.menu||!this.button||!this.input||!this.form||!this.app)
    throw new TypeError("Search chooser elements required");
   this.app.append(this.menu);
   this.open=false;this.active=0;this.searchMode=false;
   this.created="any";this.dateField="createdAt";this.fixedDate="";
  }
  makeElement(tag,cls,text){
   const el=this.doc.createElement(tag);
   if(cls)el.className=cls;if(text)el.textContent=text;
   return el;
  }
  buildCreation(){
   const list=this.makeElement("div","search-creation-choices");
   CHOICES.forEach((choice,i)=>{
    const button=this.makeElement("button","search-type-choice");
    button.type="button";button.setAttribute("role","menuitem");
    button.dataset.searchType=choice.id;
    if(choice.icon)button.append(this.icons.svg(choice.icon,this.doc));
    else{
     const icon=this.makeElement("img","search-type-icon");
     icon.alt="";icon.setAttribute("aria-hidden","true");
     icon.src="./assets/"+choice.asset;button.append(icon);
    }
    const label=this.makeElement("span");
    const j=choice.label.toLowerCase().indexOf(choice.shortcut);
    if(j<0)throw Error("Search shortcut not in visible label: "+choice.id);
    label.append(this.doc.createTextNode(choice.label.slice(0,j)));
    const key=this.makeElement("strong",null,choice.label[j]);
    label.append(key,this.doc.createTextNode(choice.label.slice(j+1)));
    button.append(label);
    button.addEventListener("click",()=>this.choose(i));
    list.append(button);
   });
   return list;
  }
  makeCheck(id,label,checked){
   const field=this.makeElement("label","object-search-check");
   const input=this.doc.createElement("input");
   input.type="checkbox";input.dataset.searchFlag=id;input.checked=checked;
   field.append(input,this.doc.createTextNode(label));
   return field;
  }
  buildSearch(){
   const section=this.makeElement("section","object-search-options");
   const title=this.makeElement("div","object-search-heading","Suchoptionen:");
   section.append(title);
   const filters=this.makeElement("div","object-search-block object-search-filter-block");
   const types=this.makeElement("div","object-search-types");
   for(const [id,label,checked] of [
    ["pins","Pins",true],["areas","Gebiete",true],
    ["rivers","Flüsse",true],["texts","Text",true],
    ["track","Mit Track",false],["link","Mit Link",false],
    ["note","Mit Notiz",false]
   ])types.append(this.makeCheck(id,label,checked));
   filters.append(types);
   const again=this.makeElement("button","object-search-action","Erneut suchen");
   again.type="button";again.dataset.searchAction="again";
   again.addEventListener("click",()=>this.execute({created:"any"}));
   filters.append(again);section.append(filters);
   const dates=this.makeElement("div","object-search-block object-search-date-block");
   const row=this.makeElement("div","object-search-dates");
   for(const [id,label] of [["today","Heute"],["yesterday","Gestern"]]){
    const btn=this.makeElement("button","object-search-date",label);
    btn.type="button";btn.dataset.created=id;
    btn.addEventListener("click",()=>this.execute({created:id}));
    row.append(btn);
   }
   const picker=this.doc.createElement("input");
   picker.type="date";picker.className="object-search-picker";
   picker.setAttribute("aria-label","Suchdatum wählen");
   picker.addEventListener("change",()=>{if(picker.value)this.execute({created:"date",date:picker.value});});
   row.append(picker);dates.append(row);
   const dateTypes=this.makeElement("div","object-search-date-types");
   const created=this.makeCheck("createdAt","Erstellungs-Datum",true);
   const updated=this.makeCheck("updatedAt","Änderungs-Datum",false);
   const setField=id=>{
    this.dateField=id;created.querySelector("input").checked=id==="createdAt";
    updated.querySelector("input").checked=id==="updatedAt";
   };
   created.querySelector("input").addEventListener("change",()=>setField("createdAt"));
   updated.querySelector("input").addEventListener("change",()=>setField("updatedAt"));
   dateTypes.append(created,updated);dates.append(dateTypes);
   section.append(dates);
   const end=this.makeElement("button","object-search-end","Suche beenden");
   end.type="button";end.dataset.searchAction="end";
   end.addEventListener("click",()=>{this.exitSearchMode();this.onExit();});
   section.append(end);
   return section;
  }
  bind(){
   if(this.bound)return;
   this.creation=this.buildCreation();this.searchPanel=this.buildSearch();
   this.menu.replaceChildren(this.creation,this.searchPanel);
   this.searchPanel.classList.add("hidden");
   this.button.setAttribute("aria-haspopup","menu");
   this.button.setAttribute("aria-controls","searchTypeMenu");
   this.button.setAttribute("aria-expanded","false");
   this.input.setAttribute("aria-controls","searchTypeMenu");
   this.input.setAttribute("aria-haspopup","menu");
   this.input.setAttribute("aria-expanded","false");
   this.input.addEventListener("focus",()=>this.show());
   this.input.addEventListener("input",()=>{if(!this.open)this.show();});
   this.button.addEventListener("click",e=>{
    e.preventDefault();e.stopPropagation();
    this.input.blur(); // iOS keyboard must close before displaying search options.
    if(!this.searchMode)this.enterSearchMode();
    this.execute({created:"any"});
   });
   this.doc.addEventListener("pointerdown",e=>{
    if(this.open&&!this.menu.contains(e.target)&&!this.form.contains(e.target))this.close();
   });
   this.doc.addEventListener("keydown",e=>{
    if(!this.open||e.altKey||e.ctrlKey||e.metaKey||e.isComposing)return;
    const inInput=e.target===this.input,inMenu=this.menu.contains(e.target);
    if(!inInput&&!inMenu)return;
    const key=String(e.key||"").toLowerCase();
    if(key==="escape"){e.preventDefault();this.close();return;}
    if(this.searchMode){
     if(key==="enter"&&inInput){e.preventDefault();this.input.blur();this.execute({created:"any"});}
     return;
    }
    if(key==="tab"&&inInput&&!e.shiftKey){
     e.preventDefault();this.highlight(0);
     this.creation.querySelectorAll(".search-type-choice")[0].focus({preventScroll:true});
     return;
    }
    if(key==="arrowdown"||key==="arrowup"){
     e.preventDefault();this.highlight(inInput||!this.menu.querySelector(".is-selected")?
      (key==="arrowdown"?0:CHOICES.length-1):this.active+(key==="arrowdown"?1:-1));
     this.creation.querySelectorAll(".search-type-choice")[this.active].focus({preventScroll:true});
     return;
    }
    if(key==="enter"&&inMenu){e.preventDefault();this.choose(this.active);return;}
    if(inMenu){
     const i=CHOICES.findIndex(c=>c.shortcut===key);
     if(i>=0){e.preventDefault();this.choose(i);}
    }
   },true);
   const view=this.doc.defaultView;
   view?.addEventListener("resize",()=>{if(this.open)this.position();});
   view?.visualViewport?.addEventListener("resize",()=>{if(this.open)this.position();});
   this.bound=true;
  }
  searchOptions(){
   const checked=id=>!!this.searchPanel.querySelector('[data-search-flag="'+id+'"]')?.checked;
   return {pins:checked("pins"),areas:checked("areas"),rivers:checked("rivers"),
    texts:checked("texts"),track:checked("track"),link:checked("link"),note:checked("note"),
    dateField:this.dateField};
  }
  execute({created="any",date=""}={}){
   this.created=created;this.fixedDate=date;
   this.searchPanel.querySelectorAll("[data-created]").forEach(b=>
    b.classList.toggle("is-active",b.dataset.created===created));
   this.show();
   this.onSearch({...this.searchOptions(),created,date});
  }
  enterSearchMode(){
   this.searchMode=true;this.creation.classList.add("hidden");
   this.searchPanel.classList.remove("hidden");
   this.menu.classList.add("object-search-mode");
   this.button.setAttribute("aria-label","Gespeicherte Objekte suchen");
   this.button.title="Gespeicherte Objekte suchen";
   this.show();this.position();
  }
  exitSearchMode(){
   this.searchMode=false;this.created="any";this.fixedDate="";this.dateField="createdAt";
   this.creation.classList.remove("hidden");this.searchPanel.classList.add("hidden");
   this.menu.classList.remove("object-search-mode");this.close();
   this.button.setAttribute("aria-label","Gespeicherte Objekte suchen");
   this.button.title="Gespeicherte Objekte suchen";
  }
  position(){
   const rect=this.form.getBoundingClientRect(),appRect=this.app.getBoundingClientRect();
   const viewport=this.doc.defaultView?.visualViewport;
   const visibleBottom=viewport?viewport.offsetTop+viewport.height:appRect.height;
   const width=this.menu.offsetWidth||340,height=this.menu.offsetHeight||350;
   const desired=rect.left-appRect.left+(rect.width-width)/2;
   this.menu.style.left=Math.max(8,Math.min(desired,appRect.width-width-8))+"px";
   const below=rect.bottom-appRect.top+9;
   const available=Math.max(120,visibleBottom-below-12);
   this.menu.style.top=Math.max(8,below)+"px";
   this.menu.style.maxHeight=available+"px";
  }
  highlight(index){
   if(Number.isInteger(index))this.active=(index+CHOICES.length)%CHOICES.length;
   [...this.creation.querySelectorAll(".search-type-choice")].forEach((b,i)=>{
    const selected=Number.isInteger(index)&&i===this.active;
    b.classList.toggle("is-selected",selected);b.setAttribute("aria-current",String(selected));
   });
  }
  show(){
   this.open=true;this.menu.classList.remove("hidden");
   this.button.setAttribute("aria-expanded","true");
   this.input.setAttribute("aria-expanded","true");
   if(!this.searchMode){this.active=0;this.highlight(null);}
   this.position();
  }
  close(){
   this.open=false;this.menu.classList.add("hidden");
   this.button.setAttribute("aria-expanded","false");
   this.input.setAttribute("aria-expanded","false");
  }
  toggle(){this.open?this.close():this.show();}
  choose(index){
   const choice=CHOICES[index];if(!choice)return;
   this.close();this.onChoose(choice.id);
  }
 }
 SearchTypeMenu.CHOICES=CHOICES;
 root.Pin2MapSearchTypeMenu=SearchTypeMenu;
 if(typeof module!=="undefined"&&module.exports)module.exports={SearchTypeMenu,CHOICES};
})(typeof window!=="undefined"?window:globalThis);
