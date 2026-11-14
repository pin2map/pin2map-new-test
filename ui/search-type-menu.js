"use strict";
/* Search mode chooser. Presentation-only; no provider or map calls.
 * Legacy shortcuts P/F/S/U are active only while the menu is open.
 */
(function(root){
  const CHOICES=Object.freeze([
    {id:"pin",label:"Pin",shortcut:"p",icon:"map-pin-plus-inside"},
    {id:"area",label:"Fläche",shortcut:"f",icon:"vector-polygon"},
    {id:"lake",label:"See",shortcut:"s",icon:"waves-horizontal"},
    {id:"river",label:"Fluss",shortcut:"u",icon:"spline"}
  ]);
  class SearchTypeMenu{
    constructor({document:doc,getElement,icons,onChoose}){
      this.doc=doc;this.el=getElement;this.icons=icons;this.onChoose=onChoose;
      this.menu=this.el("searchTypeMenu");this.button=this.el("searchButton");
      if(!this.menu||!this.button)throw new TypeError("Search menu elements required");
      this.open=false;this.active=0;
    }
    bind(){
      if(this.bound)return;
      this.menu.replaceChildren();
      CHOICES.forEach((choice,i)=>{
        const button=this.doc.createElement("button");
        button.type="button";button.className="search-type-choice";
        button.setAttribute("role","menuitem");button.dataset.searchType=choice.id;
        button.append(this.icons.svg(choice.icon,this.doc));
        const label=this.doc.createElement("span");label.textContent=choice.label;
        const hint=this.doc.createElement("kbd");hint.textContent=choice.shortcut.toUpperCase();
        button.append(label,hint);
        button.addEventListener("click",()=>this.choose(i));
        button.addEventListener("mouseenter",()=>this.highlight(i));
        this.menu.append(button);
      });
      this.button.setAttribute("aria-haspopup","menu");
      this.button.setAttribute("aria-controls","searchTypeMenu");
      this.button.setAttribute("aria-expanded","false");
      this.button.addEventListener("click",this.onClick=e=>{
        e.preventDefault();e.stopPropagation();this.toggle();
      });
      this.doc.addEventListener("pointerdown",this.onOutside=e=>{
        if(this.open&&!this.menu.contains(e.target)&&e.target!==this.button)
          this.close();
      });
      this.doc.addEventListener("keydown",this.onKey=e=>{
        if(!this.open||e.altKey||e.ctrlKey||e.metaKey||e.isComposing)return;
        const key=String(e.key||"").toLowerCase();
        if(key==="escape"||key==="tab"){
          this.close();
          if(key==="escape"){e.preventDefault();this.button.focus({preventScroll:true});}
          return;
        }
        if(key==="arrowdown"||key==="arrowup"){
          e.preventDefault();this.highlight(this.active+(key==="arrowdown"?1:-1));
          this.menu.children[this.active].focus({preventScroll:true});return;
        }
        if(key==="enter"||key===" "){
          if(e.target!==this.el("searchInput")){
            e.preventDefault();this.choose(this.active);
          }
          return;
        }
        const index=CHOICES.findIndex(c=>c.shortcut===key);
        if(index>=0){e.preventDefault();e.stopPropagation();this.choose(index);}
      },true);
      this.bound=true;
    }
    highlight(index){
      this.active=(index+CHOICES.length)%CHOICES.length;
      [...this.menu.children].forEach((b,i)=>b.classList.toggle("is-selected",i===this.active));
    }
    show(){
      this.open=true;this.menu.classList.remove("hidden");
      this.button.setAttribute("aria-expanded","true");this.highlight(0);
    }
    close(){
      this.open=false;this.menu.classList.add("hidden");
      this.button.setAttribute("aria-expanded","false");
    }
    toggle(){this.open?this.close():this.show();}
    choose(index){
      const choice=CHOICES[index];this.close();
      this.onChoose(choice.id);
    }
  }
  root.Pin2MapSearchTypeMenu=SearchTypeMenu;
  if(typeof module!=="undefined"&&module.exports)module.exports={SearchTypeMenu,CHOICES};
})(typeof window!=="undefined"?window:globalThis);
