"use strict";
/* Search chooser: one compact creation chooser and an independent persisted-in-memory
 * object-search mode. No project data, persistence or Leaflet APIs here. */
(function(root){
 const CHOICES=Object.freeze([
  {id:"pin",label:"Pin",shortcut:"p",icon:"map-pin"},
  {id:"gps",label:"GPS-Location",shortcut:"l",icon:"locate-fixed"},
  {id:"area",label:"Gebiet",shortcut:"g",asset:"region.svg"},
  {id:"lake",label:"See",shortcut:"e",asset:"lake.svg"},
  {id:"river",label:"Fluss",shortcut:"f",asset:"river.svg"},
  {id:"plate",label:"Kennzeichen",shortcut:"k",icon:"car"},
  {id:"objects",label:"Markierungen Suchen",shortcut:"s",icon:"scan-search"}
 ]);
 class SearchTypeMenu{
  constructor({document:doc,getElement,icons,onChoose,onSearch=()=>{},onExit=()=>{},onBeforeOpen=()=>{},onEdit=()=>{}}){
   this.doc=doc;this.el=getElement;this.icons=icons;
   this.onChoose=onChoose;this.onSearch=onSearch;this.onExit=onExit;this.onBeforeOpen=onBeforeOpen;this.onEdit=onEdit;
   this.menu=this.el("searchTypeMenu");this.button=this.el("searchButton");
   this.input=this.el("searchInput");this.form=this.el("searchForm");
   this.app=this.el("app");
   if(!this.menu||!this.button||!this.input||!this.form||!this.app)
    throw new TypeError("Search chooser elements required");
   this.app.append(this.menu);
   this.viewportConstrained=false;
   this.open=false;this.active=0;this.searchMode=false;

  }
  makeElement(tag,cls,text){
   const el=this.doc.createElement(tag);
   if(cls)el.className=cls;if(text)el.textContent=text;
   return el;
  }
  buildCreation(){
   const list=this.makeElement("div","search-creation-choices");
   const hint=this.makeElement("div","search-creation-scroll-hint","Weitere Optionen ↓");
   hint.setAttribute("aria-hidden","true");list.append(hint);
   CHOICES.forEach((choice,i)=>{
    if(choice.id==="objects")list.append(this.makeElement("hr","search-creation-divider"));
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
   // Predecessor-style compact control: two option rows, shared exit button.
   const section=this.makeElement("section","object-search-options");
   const results=this.makeElement("div","object-search-results");
   results.setAttribute("role","status");results.setAttribute("aria-live","polite");
   results.textContent="0 Pins · 0 Flächen · 0 Gewässer";
   section.append(results);
   const controls=this.makeElement("div","object-search-compact-controls");
   const selector=this.doc.createElement("select");
   selector.className="object-search-kind";selector.setAttribute("aria-label","Suchbereich auswählen");
   for(const [id,label] of [
    ["all","Pins, Flächen, Flüsse, Text"],
    ["pins","Nur Pins"],["areas","Nur Flächen und Seen"],
    ["rivers","Nur Flüsse"],["texts","Nur Text"]
   ]){
    const option=this.doc.createElement("option");option.value=id;option.textContent=label;
    selector.append(option);
   }
   selector.addEventListener("change",()=>this.execute());
   controls.append(selector);
   const flags=this.makeElement("div","object-search-flags");
   for(const [id,label] of [["track","Mit Track"],["link","Mit Link"],["note","Mit Notiz"]]){
    const field=this.makeCheck(id,label,true);
    field.querySelector("input").addEventListener("change",()=>this.execute());
    flags.append(field);
   }
   const hidden=this.makeCheck("hidden","Ausgeblendete",true);
   hidden.classList.add("object-search-hidden-flag");
   hidden.querySelector("input").addEventListener("change",()=>this.execute());
   flags.append(hidden);
   controls.append(flags);section.append(controls);
   const end=this.makeElement("button","object-search-exit");
   end.type="button";end.dataset.searchAction="end";
   end.setAttribute("aria-label","Suche beenden");end.title="Suche beenden";
   end.append(this.icons.svg("x",this.doc));
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
   // Close competing panels BEFORE native pointer focus so iOS can type on the first tap.
   this.input.addEventListener("pointerdown",()=>{
    if(!this.open){this.onBeforeOpen();this.preparedOpen=true;}
    this.returnToCreation();
   },{capture:true});
   this.input.addEventListener("focus",()=>{
    if(this.suppressOpenOnFocus){this.suppressOpenOnFocus=false;return;}
    this.returnToCreation();
    this.show();
   });
   this.input.addEventListener("click",()=>this.show());
   this.input.addEventListener("input",()=>{
    this.returnToCreation();
    if(!this.open)this.show();
   });
   this.doc.addEventListener("keydown",event=>{
    if(event.isComposing||event.altKey||!(event.metaKey||event.ctrlKey)||String(event.key).toLowerCase()!=="f")return;
    event.preventDefault();event.stopPropagation();
    this.focusInput();
   },true);
   this.button.addEventListener("click",e=>{
    e.preventDefault();e.stopPropagation();
    this.input.blur();
    // The magnifier opens the creation chooser; saved-object filtering is an explicit choice.
    if(this.searchMode)this.execute();
    else this.show();
   });
   this.doc.addEventListener("pointerdown",e=>{
    if(this.open&&!this.menu.contains(e.target)&&!this.form.contains(e.target))this.close();
   });
   this.doc.addEventListener("keydown",e=>{
    if(!this.open||e.altKey||e.ctrlKey||e.metaKey||e.isComposing)return;
    const inInput=e.target===this.input,inMenu=this.menu.contains(e.target);
    const key=String(e.key||"").toLowerCase();
    // Escape belongs to the visible chooser, even if focus fell back to <body>
    // after the trigger button blurred while closing another floating dialog.
    if(key==="escape"){
     e.preventDefault();e.stopPropagation();
     if(this.searchMode)this.finishAndFocus();
     else this.close();
     return;
    }
    if(!inInput&&!inMenu&&e.target!==this.button)return;
    if(this.searchMode){
     if(key==="enter"&&inInput){e.preventDefault();this.input.blur();this.execute();}
     return;
    }
    if(key==="enter"&&inInput){this.close();return;}
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
   return {kind:this.searchPanel.querySelector(".object-search-kind")?.value||"all",
    includeTrack:checked("track"),includeLink:checked("link"),includeNote:checked("note"),includeHidden:checked("hidden")};
  }
  setResults(matches=[]){
   let pins=0,areas=0,waters=0;
   for(const match of matches){
    if(match.type==="pins")pins++;
    else if(match.type==="areas")areas++;
    else if(match.type==="lakes"||match.type==="rivers")waters++;
   }
   const results=this.searchPanel?.querySelector(".object-search-results");
   if(results)results.textContent=pins+" Pins · "+areas+" Flächen · "+waters+" Gewässer";
  }
  returnToCreation(){
   if(!this.searchMode)return;
   this.searchMode=false;
   this.creation.classList.remove("hidden");this.searchPanel.classList.add("hidden");
   this.menu.classList.remove("object-search-mode");
   this.onEdit();
  }
  focusInput(){
   // This path also handles hardware Cmd+F / Ctrl+F without losing focus to overlay cleanup.
   this.returnToCreation();
   if(!this.open){this.onBeforeOpen();this.preparedOpen=true;}
   this.input.focus({preventScroll:true});
   this.input.select();
   this.show();
  }
  execute(){
   this.input.blur();
   this.show();
   this.onSearch({...this.searchOptions(),created:"any"});
  }
  enterSearchMode(){
   this.searchMode=true;this.creation.classList.add("hidden");
   this.searchPanel.classList.remove("hidden");
   this.menu.classList.add("object-search-mode");
   this.button.setAttribute("aria-label","Gespeicherte Objekte suchen");
   this.button.title="Gespeicherte Objekte suchen";
   this.show();this.position();
  }
  finishAndFocus(){
   // The focus event must not reopen the creation choices after Escape.
   this.exitSearchMode();
   this.onExit();
   this.suppressOpenOnFocus=true;
   this.input.focus({preventScroll:true});
  }
  exitSearchMode(){
   this.searchMode=false;
   this.creation.classList.remove("hidden");this.searchPanel.classList.add("hidden");
   this.menu.classList.remove("object-search-mode");this.close();
   this.button.setAttribute("aria-label","Gespeicherte Objekte suchen");
   this.button.title="Gespeicherte Objekte suchen";
  }
  position(){
   const rect=this.form.getBoundingClientRect(),appRect=this.app.getBoundingClientRect();
   const viewport=this.doc.defaultView?.visualViewport;
   const visibleBottom=viewport?viewport.offsetTop+viewport.height:appRect.height;
   const keyboardShown=Boolean(viewport&&this.doc.defaultView.innerHeight-viewport.height>120);
   this.viewportConstrained=keyboardShown;
   this.menu.classList.toggle("keyboard-constrained",keyboardShown);
   const width=this.menu.offsetWidth||340;
   const desired=rect.left-appRect.left+(rect.width-width)/2;
   this.menu.style.left=Math.max(8,Math.min(desired,appRect.width-width-8))+"px";
   const below=rect.bottom-appRect.top+9;
   const available=Math.max(44,visibleBottom-below-12);
   this.menu.style.top=Math.max(8,below)+"px";
   this.menu.style.maxHeight=available+"px";
   this.menu.style.overflowY="auto";
   // Keep the seventh option discoverable when iOS keyboard reduces viewport.
   this.menu.dataset.scrollable=String(this.menu.scrollHeight>this.menu.clientHeight+1);
   this.menu.setAttribute("aria-description",keyboardShown?
    "Liste scrollbar. Nach unten wischen für weitere Optionen.":"");
  }
  highlight(index){
   if(Number.isInteger(index))this.active=(index+CHOICES.length)%CHOICES.length;
   [...this.creation.querySelectorAll(".search-type-choice")].forEach((b,i)=>{
    const selected=Number.isInteger(index)&&i===this.active;
    b.classList.toggle("is-selected",selected);b.setAttribute("aria-current",String(selected));
   });
  }
  show(){
   if(!this.open){
    const focused=this.doc.activeElement===this.input;
    if(!this.preparedOpen)this.onBeforeOpen();
    this.preparedOpen=false;
    // Closing competing dialogs may move focus. Preserve normal Enter-to-place-search.
    this.open=true;
    this.menu.classList.remove("hidden");
    if(focused&&this.doc.activeElement!==this.input)this.input.focus({preventScroll:true});
   }
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
   this.close();
   if(choice.id==="objects"){
    this.enterSearchMode();this.execute();return;
   }
   this.onChoose(choice.id);
  }
 }
 SearchTypeMenu.CHOICES=CHOICES;
 root.Pin2MapSearchTypeMenu=SearchTypeMenu;
 if(typeof module!=="undefined"&&module.exports)module.exports={SearchTypeMenu,CHOICES};
})(typeof window!=="undefined"?window:globalThis);
