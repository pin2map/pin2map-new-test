"use strict";
/* Focus-driven search chooser. Search execution is delegated to onChoose. */
(function(root){
  const CHOICES=Object.freeze([
    {id:"pin",label:"Pin",shortcut:null,icon:"map-pin"},
    {id:"gps",label:"GPS-Standort",shortcut:"p",icon:"locate-fixed"},
    {id:"area",label:"Gebiet",shortcut:"g",asset:"region.svg"},
    {id:"lake",label:"See",shortcut:"s",asset:"lake.svg"},
    {id:"river",label:"Fluss",shortcut:"f",asset:"river.svg"}
  ]);
  class SearchTypeMenu{
    constructor({document:doc,getElement,icons,onChoose}){
      this.doc=doc;this.el=getElement;this.icons=icons;this.onChoose=onChoose;
      this.menu=this.el("searchTypeMenu");this.button=this.el("searchButton");
      this.input=this.el("searchInput");this.form=this.el("searchForm");
      this.app=this.el("app");
      if(!this.menu||!this.button||!this.input||!this.form||!this.app)
        throw new TypeError("Search chooser elements required");
      // The capsule clips its children; render the popup above the map in #app.
      this.app.append(this.menu);
      this.open=false;this.active=0;
    }
    bind(){
      if(this.bound)return;
      this.menu.replaceChildren();
      CHOICES.forEach((choice,i)=>{
        const button=this.doc.createElement("button");
        button.type="button";button.className="search-type-choice";
        button.setAttribute("role","menuitem");
        button.dataset.searchType=choice.id;
        if(choice.icon)button.append(this.icons.svg(choice.icon,this.doc));
        else{
          const icon=this.doc.createElement("img");
          icon.className="search-type-icon";icon.alt="";
          icon.setAttribute("aria-hidden","true");
          icon.src="./assets/"+choice.asset;
          button.append(icon);
        }
        const label=this.doc.createElement("span");
        const initial=this.doc.createElement(choice.shortcut?"strong":"span");
        initial.textContent=choice.label[0];
        const rest=this.doc.createTextNode(choice.label.slice(1));
        label.append(initial,rest);
        button.append(label);
        button.addEventListener("click",()=>this.choose(i));
        // Hover must not set keyboard selection.
        this.menu.append(button);
      });
      this.button.setAttribute("aria-haspopup","menu");
      this.button.setAttribute("aria-controls","searchTypeMenu");
      this.button.setAttribute("aria-expanded","false");
      this.input.setAttribute("aria-controls","searchTypeMenu");
      this.input.setAttribute("aria-haspopup","menu");
      this.input.setAttribute("aria-expanded","false");
      this.input.addEventListener("focus",()=>this.show());
      // Typing after Escape must restore the chooser even if input stayed focused.
      this.input.addEventListener("input",()=>{if(!this.open)this.show();});
      this.button.addEventListener("click",e=>{
        e.preventDefault();e.stopPropagation();this.toggle();
      });
      // Do not dismiss when pointer interaction remains inside the search capsule.
      this.doc.addEventListener("pointerdown",e=>{
        if(this.open&&!this.menu.contains(e.target)&&!this.form.contains(e.target))
          this.close();
      });
      this.doc.addEventListener("keydown",e=>{
        if(!this.open||e.altKey||e.ctrlKey||e.metaKey||e.isComposing)return;
        const key=String(e.key||"").toLowerCase();
        const inInput=e.target===this.input;
        const inMenu=this.menu.contains(e.target);
        if(!inInput&&!inMenu)return;
        if(key==="escape"){
          e.preventDefault();this.close();
          if(inMenu)this.input.focus({preventScroll:true});
          return;
        }
        if(key==="tab"&&inInput&&!e.shiftKey){
          e.preventDefault();this.highlight(0);
          this.menu.children[0].focus({preventScroll:true});
          return;
        }
        if(key==="arrowdown"||key==="arrowup"){
          e.preventDefault();
          this.highlight(inInput||!this.menu.querySelector(".is-selected")?
            (key==="arrowdown"?0:CHOICES.length-1):
            this.active+(key==="arrowdown"?1:-1));
          this.menu.children[this.active].focus({preventScroll:true});
          return;
        }
        if(key==="enter"){
          e.preventDefault();e.stopPropagation();this.choose(this.active);return;
        }
        // Text typed into the input must remain text, not become a shortcut.
        if(inMenu){
          const index=CHOICES.findIndex(choice=>choice.shortcut===key);
          if(index>=0){e.preventDefault();e.stopPropagation();this.choose(index);}
        }
      },true);
      this.doc.defaultView?.addEventListener("resize",()=>{if(this.open)this.position();});
      this.bound=true;
    }
    position(){
      const rect=this.form.getBoundingClientRect();
      const appRect=this.app.getBoundingClientRect();
      const width=this.menu.offsetWidth||265;
      const height=this.menu.offsetHeight||200;
      const desired=rect.left-appRect.left+(rect.width-width)/2;
      this.menu.style.left=Math.max(8,Math.min(desired,appRect.width-width-8))+"px";
      const below=rect.bottom-appRect.top+9;
      this.menu.style.top=Math.max(8,Math.min(below,appRect.height-height-8))+"px";
    }
    highlight(index){
      const selected=Number.isInteger(index);
      if(selected)this.active=(index+CHOICES.length)%CHOICES.length;
      [...this.menu.children].forEach((b,i)=>{
        b.classList.toggle("is-selected",selected&&i===this.active);
        b.setAttribute("aria-current",selected&&i===this.active?"true":"false");
      });
    }
    show(){
      if(this.open)return;
      this.open=true;this.menu.classList.remove("hidden");
      this.button.setAttribute("aria-expanded","true");
      this.input.setAttribute("aria-expanded","true");
      this.active=0;this.highlight(null);this.position();
    }
    close(){
      this.open=false;this.menu.classList.add("hidden");
      this.button.setAttribute("aria-expanded","false");
      this.input.setAttribute("aria-expanded","false");
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
