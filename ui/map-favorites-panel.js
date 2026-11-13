"use strict";
/* In-panel confirmations, not viewport-centered native dialogs.
 * No project data mutations or persistence in this presentation module. */
(function(root){
  class MapFavoritesPanel{
    constructor({document:doc,getElement,icons,onOpen,onAdd,onReplace,onRemove,onChoose}){
      this.doc=doc;this.el=getElement;this.icons=icons;
      this.onOpen=onOpen;this.onAdd=onAdd;this.onReplace=onReplace;
      this.onRemove=onRemove;this.onChoose=onChoose;
      this.open=false;this.confirmation=null;this.values=[];
    }
    button(name,title,action,cls=""){
      const node=this.doc.createElement("button");node.type="button";
      node.className=cls;node.title=title;node.setAttribute("aria-label",title);
      this.icons.mount(node,name);
      node.addEventListener("click",action);return node;
    }
    show(values){
      this.values=values;
      this.confirmation=null;
      this.open=true;
      this.el("favoritesPanel").classList.remove("hidden");
      this.doc.body.classList.add("favorites-open");
      this.el("favoritesButton").setAttribute("aria-expanded","true");
      this.render();
      this.el("favoritesClose").focus({preventScroll:true});
      this.onOpen?.();
    }
    close(){
      this.confirmation=null;this.open=false;
      this.el("favoritesPanel").classList.add("hidden");
      this.doc.body.classList.remove("favorites-open");
      this.el("favoritesButton").setAttribute("aria-expanded","false");
    }
    toggle(values){this.open?this.close():this.show(values);}
    render(values=this.values){
      this.values=values;
      const target=this.el("favoritesList");
      const previousScroll=target.scrollTop;
      target.replaceChildren();
      const controls=this.el("favoritesAdd");
      controls.disabled=false; // At capacity the app shows a useful message and offers replacement.
      if(!values.length){
        const empty=this.doc.createElement("p");
        empty.className="favorites-empty";empty.textContent="Noch keine Favoriten gespeichert.";
        target.append(empty);
      }
      values.forEach((item,index)=>{
        const row=this.doc.createElement("div");row.className="favorite-row";
        const replace=this.button("star-plus","Favorit "+item.letter+" ersetzen",()=>{
          this.confirmation=index;this.render();
        },"favorite-icon");
        const select=this.doc.createElement("button");select.type="button";
        select.className="favorite-select";
        const label=this.doc.createElement("strong");label.textContent=item.letter;
        const when=this.doc.createElement("span");
        const date=new Date(item.savedAt);
        when.textContent=Number.isNaN(date.getTime())?"Unbekanntes Datum":
          date.toLocaleString("de-DE",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});
        select.append(label,when);
        select.addEventListener("click",()=>this.onChoose(index));
        const remove=this.button("star-off","Favorit "+item.letter+" entfernen",()=>{
          this.onRemove(index);
        },"favorite-icon");
        row.append(replace,select,remove);
        target.append(row);
        if(this.confirmation===index){
          const confirm=this.doc.createElement("div");confirm.className="favorite-confirm";
          const prompt=this.doc.createElement("p");
          prompt.textContent="Favorit "+item.letter+" durch die aktuelle Ansicht ersetzen?";
          const actions=this.doc.createElement("div");actions.className="favorite-confirm-actions";
          const cancel=this.doc.createElement("button");cancel.type="button";
          cancel.textContent="Abbrechen";cancel.addEventListener("click",()=>{this.confirmation=null;this.render();});
          const yes=this.doc.createElement("button");yes.type="button";
          yes.textContent="Ersetzen";yes.addEventListener("click",()=>{this.confirmation=null;this.onReplace(index);});
          actions.append(cancel,yes);confirm.append(prompt,actions);target.append(confirm);
          cancel.focus({preventScroll:true});
        }
      });
      target.scrollTop=previousScroll;
      if(this.confirmation!==null)
        target.querySelector(".favorite-confirm")?.scrollIntoView?.({block:"nearest"});
    }
  }
  root.Pin2MapMapFavoritesPanel=MapFavoritesPanel;
  if(typeof module!=="undefined"&&module.exports)module.exports=MapFavoritesPanel;
})(typeof window!=="undefined"?window:globalThis);
