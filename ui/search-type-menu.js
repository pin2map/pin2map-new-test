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
   this.menu=this.el("searchTypeMenu");this.clear=this.el("searchClear");
   this.input=this.el("searchInput");this.form=this.el("searchForm");
   this.app=this.el("app");
   if(!this.menu||!this.clear||!this.input||!this.form||!this.app)
    throw new TypeError("Search chooser elements required");
   this.app.append(this.menu);
   this.open=false;this.active=0;this.searchMode=false;this.gpxOnly=false;

  }
  makeElement(tag,cls,text){
   const el=this.doc.createElement(tag);
   if(cls)el.className=cls;if(text)el.textContent=text;
   return el;
  }
  buildCreation(){
   const list=this.makeElement("div","search-creation-choices");
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
   const panel=this.makeElement("section","object-search-options");
   const results=this.makeElement("div","object-search-results","0 Pins · 0 Flächen · 0 Gewässer");
   results.setAttribute("role","status");results.setAttribute("aria-live","polite");
   const scope=this.makeElement("fieldset","object-search-scope");
   scope.append(this.makeElement("legend",null,"Suche erweitern auf"));
   const flags=this.makeElement("div","object-search-flags");
   for(const [id,label] of [
    ["notes","Notizen"],["urls","URLs"],["hidden","Ausgeblendete Objekte"]
   ]){
    const field=this.makeCheck(id,label,false);
    field.querySelector("input").addEventListener("change",()=>this.execute());
    flags.append(field);
   }
   scope.append(flags);
   const gpx=this.makeElement("button","object-search-gpx","Alle Pins mit GPX");
   gpx.type="button";gpx.dataset.searchAction="gpx";
   gpx.setAttribute("aria-pressed","false");
   gpx.addEventListener("click",()=>{
    this.gpxOnly=!this.gpxOnly;
    gpx.setAttribute("aria-pressed",String(this.gpxOnly));
    this.execute();
   });
   panel.append(results,scope,gpx);
   return panel;
  }
  bind(){
   if(this.bound)return;
   this.creation=this.buildCreation();this.searchPanel=this.buildSearch();
   this.menu.replaceChildren(this.creation,this.searchPanel);
   this.searchPanel.classList.add("hidden");
   this.input.setAttribute("aria-controls","searchTypeMenu");
   this.input.setAttribute("aria-haspopup","menu");
   this.input.setAttribute("aria-expanded","false");
   // Close competing panels BEFORE native pointer focus so iOS can type on the first tap.
   this.input.addEventListener("pointerdown",()=>{
    if(!this.open){this.onBeforeOpen();this.preparedOpen=true;}
   },{capture:true});
   this.input.addEventListener("focus",()=>{
    if(this.suppressOpenOnFocus){this.suppressOpenOnFocus=false;return;}
    this.show();
   });
   this.input.addEventListener("click",()=>this.show());
   this.input.addEventListener("input",()=>{
    if(!this.open)this.show();
    // SearchFormController owns live filtering when the input text changes.
   });
   this.doc.addEventListener("keydown",event=>{
    if(event.isComposing||event.altKey||!(event.metaKey||event.ctrlKey)||String(event.key).toLowerCase()!=="f")return;
    event.preventDefault();event.stopPropagation();
    this.focusInput();
   },true);
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
     // Visible place results own Escape until they have been dismissed.
     const placeResults=this.el("searchResults");
     if(!this.searchMode&&placeResults&&!placeResults.classList.contains("hidden"))return;
     e.preventDefault();e.stopPropagation();
     if(this.searchMode)this.finishAndFocus();
     else this.close();
     return;
    }
    if(!inInput&&!inMenu&&e.target!==this.clear)return;
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
   view?.visualViewport?.addEventListener("scroll",()=>{if(this.open)this.position();});
   this.bound=true;
  }
  searchOptions(){
   const checked=id=>!!this.searchPanel.querySelector('[data-search-flag="'+id+'"]')?.checked;
   return {notes:checked("notes"),urls:checked("urls"),
    includeHidden:checked("hidden"),gpxOnly:this.gpxOnly};
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
   this.clear.setAttribute("aria-label","Suchfeld leeren");
   this.clear.title="Suchfeld leeren";
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
   this.show();
   this.onSearch({...this.searchOptions(),created:"any"});
  }
  enterSearchMode(){
   this.searchMode=true;this.gpxOnly=false;
   this.clear.setAttribute("aria-label","Markierungssuche verlassen");
   this.clear.title="Markierungssuche verlassen";
   this.searchPanel.querySelector(".object-search-gpx").setAttribute("aria-pressed","false");
   this.input.blur();this.creation.classList.add("hidden");
   this.searchPanel.classList.remove("hidden");
   this.menu.classList.add("object-search-mode");
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
   this.clear.setAttribute("aria-label","Suchfeld leeren");
   this.clear.title="Suchfeld leeren";
   this.creation.classList.remove("hidden");this.searchPanel.classList.add("hidden");
   this.menu.classList.remove("object-search-mode");this.close();
  }
  // One viewport coordinate system for every device and keyboard state.
  // The menu always uses position:fixed. No detection of a virtual keyboard
  // or switching between app-relative and screen-relative positioning.
  static chooserLayout({form,visualViewport,innerWidth,innerHeight,menuWidth}){
   const leftEdge=visualViewport?.offsetLeft||0;
   const topEdge=visualViewport?.offsetTop||0;
   const rightEdge=leftEdge+(visualViewport?.width||innerWidth);
   const bottomEdge=topEdge+(visualViewport?.height||innerHeight);
   const inset=8,gap=9;
   const centered=form.left+form.width/2-menuWidth/2;
   const left=Math.max(leftEdge+inset,Math.min(centered,rightEdge-inset-menuWidth));
   const top=Math.max(topEdge+inset,form.bottom+gap);
   // Maximum available space, NOT the current/collapsed menu height.
   // CSS flex:0 0 auto keeps the seven choices at their approved natural size.
   return {left,top,maxHeight:Math.max(0,bottomEdge-inset-top)};
  }
  position(){
   const form=this.form.getBoundingClientRect(),view=this.doc.defaultView;
   const layout=SearchTypeMenu.chooserLayout({form,visualViewport:view?.visualViewport,
    innerWidth:view?.innerWidth||this.app.clientWidth,
    innerHeight:view?.innerHeight||this.app.clientHeight,
    menuWidth:this.menu.offsetWidth||340});
   this.menu.style.left=layout.left+"px";
   this.menu.style.top=layout.top+"px";
   this.menu.style.maxHeight=layout.maxHeight+"px";
   this.menu.style.overflowY="auto";
   const scrollable=this.menu.scrollHeight>this.menu.clientHeight+1;
   this.menu.dataset.scrollable=String(scrollable);
   this.menu.setAttribute("aria-description",scrollable?
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
   this.input.setAttribute("aria-expanded","true");
   if(!this.searchMode){this.active=0;this.highlight(null);}
   this.position();
  }
  close(){
   this.open=false;this.menu.classList.add("hidden");
   this.input.setAttribute("aria-expanded","false");
  }
  returnToStandardChoices(){this.exitSearchMode();this.show();}
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
