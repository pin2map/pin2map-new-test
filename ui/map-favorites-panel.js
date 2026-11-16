"use strict";
/* Presentation only. Every confirmation and edit stays INSIDE the favorites
 * panel; no native modal, no data/Leaflet/IndexedDB access. */
(function(root){
  const Core=root.Pin2MapListDialogCore||
    (typeof require==="function"?require("./list-dialog-core.js"):null);
  class MapFavoritesPanel extends Core{
    constructor({document:doc,getElement,icons,onOpen,onAdd,onReplace,onRemove,onRemoveAll,onRename,onChoose,onReorder=()=>{},suggestName,capacity=100,getSearch=()=>"",onSearchChange=()=>{}}){
      super({document:doc,getElement,icons,panelId:"favoritesPanel",
        listId:"favoritesList",searchId:"favoritesSearch",
        clearId:"favoritesSearchClear",getSearch,onSearchChange});
      this.onOpen=onOpen;this.onAdd=onAdd;this.onReplace=onReplace;
      this.onRemove=onRemove;this.onRemoveAll=onRemoveAll;
      this.onRename=onRename;this.onChoose=onChoose;this.onReorder=onReorder;
      this.suggestName=suggestName;this.capacity=capacity;
      this.bindFilter();
    }
    show(values){
      this.values=values;this.mode=null;this.index=null;this.open=true;
      this.el("favoritesSearch").value=this.searchText;
      this.el("favoritesPanel").classList.remove("hidden","search-focused");
      this.doc.body.classList.add("favorites-open");
      this.el("favoritesButton").setAttribute("aria-expanded","true");
      this.el("favoritesButton").setAttribute("aria-pressed","true");
      this.el("favoritesButton").setAttribute("aria-label","Kartenfavoriten schließen");
      this.render();
      this.onOpen?.();
      this.el("favoritesClose").focus({preventScroll:true});
    }
    close(){
      this.open=false;this.mode=null;this.index=null;
      this.el("favoritesPanel").classList.add("hidden");
      this.doc.body.classList.remove("favorites-open");
      this.el("favoritesButton").setAttribute("aria-expanded","false");
      this.el("favoritesButton").setAttribute("aria-pressed","false");
      this.el("favoritesButton").setAttribute("aria-label","Kartenfavoriten öffnen");
      const panel=this.el("favoritesPanel");
      panel.classList.remove("is-editing","search-focused");
      panel.style.removeProperty("--p2m-favorites-keyboard-top");
      panel.style.removeProperty("--p2m-favorites-keyboard-height");
    }
    toggle(values){this.open?this.close():this.show(values);}
    editor(mode,index){
      const isNew=mode==="new",isRename=mode==="rename";
      const isDelete=mode==="delete",isDeleteAll=mode==="deleteAll";
      const title=isNew?"Neue Ansicht als Favorit speichern?":
       isRename?"Favorit umbenennen?":
       isDeleteAll?"Wirklich alle "+this.values.length+" Favoriten löschen?":
       isDelete?"Favorit wirklich löschen?":
       "Favorit durch die aktuelle Ansicht ersetzen?";
      return this.actionEditor({
       mode,index,title,nameLabel:"Name des Favoriten",
       nameValue:isRename||mode==="replace"?
        (this.values[index]?.name||""):(this.suggestName?.()||"Unbekannt"),
       confirmLabel:isNew?"Speichern":isRename?"Umbenennen":
        isDeleteAll?"Alle löschen":isDelete?"Löschen":"Ersetzen",
       warning:isDeleteAll?"Alle gespeicherten Favoriten werden unwiderruflich entfernt.":"",
       onConfirm:name=>{
        if(isNew)this.onAdd(name);
        else if(isRename)this.onRename(index,name);
        else if(isDeleteAll)this.onRemoveAll?.();
        else if(isDelete)this.onRemove(index);
        else this.onReplace(index,name);
       }
      });
    }
    render(values=this.values){
      this.values=values;
      const list=this.el("favoritesList");
      const oldScroll=list.scrollTop;
      this.bulkSizeObserver?.disconnect();
      this.bulkSizeObserver=null;
      list.replaceChildren();
      const add=this.el("favoritesAdd");
      const clear=this.el("favoritesSearchClear");
      this.configureFilter();
      const query=this.searchText.trim().toLocaleLowerCase("de-DE");
      const matches=Core.search(values,query,item=>{
       const date=new Date(item.savedAt);
       const shownDate=Number.isNaN(date.getTime())?"":date.toLocaleString("de-DE",{
        year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"
       });
       return (item.name||"Unbenannt")+" "+shownDate;
      });
      add.disabled=values.length>=this.capacity;
      add.title=add.disabled?"Maximale Anzahl von "+this.capacity+" Favoriten erreicht – vorhandenen Favoriten ersetzen":"Neue Ansicht hinzufügen";
      if(!matches.length){
        const empty=this.doc.createElement("p");empty.className="favorites-empty";
        empty.textContent=values.length?"Keine passenden Favoriten gefunden.":"Noch keine Favoriten gespeichert.";
        list.append(empty);
      }
      let pendingFocus=null;
      matches.forEach(({item,index})=>{
        const replace=this.button("plus","Favorit durch aktuelle Ansicht ersetzen",
          ()=>this.start("replace",index),"favorite-icon");
        const edit=this.button("square-pen","Favorit umbenennen",
          ()=>this.start("rename",index),"favorite-icon favorite-edit");
        const remove=this.button("trash","Favorit löschen",
          ()=>this.start("delete",index),"favorite-icon favorite-remove");
        const date=new Date(item.savedAt);
        const detail=Number.isNaN(date.getTime())?"Unbekanntes Datum":
          date.toLocaleString("de-DE",{
            year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"
          });
        const row=this.row({name:item.name||"Unbenannt",detail,
          onChoose:()=>this.onChoose(index),extra:replace,edit,remove,
          selectedMode:this.mode,selectedIndex:index,itemId:String(index)});
        list.append(row);
        if(this.mode&&this.mode!=="new"&&this.index===index){
          const editor=this.editor(this.mode,index);
          list.append(editor.target);pendingFocus=editor.focus;
        }
      });
      // Only the standard, unfiltered list offers bulk deletion. Search
      // mode must never expose an action that destroys invisible favorites.
      // The button remains at the scrollable list's end, never in the footer.
      if(values.length&&!query){
        const removeAll=this.button(null,"Alle Favoriten löschen",
          ()=>this.start("deleteAll"),"favorite-delete-all");
        removeAll.textContent="Alle Favoriten löschen";
        list.append(removeAll);
        // Exactly mirror the actual last favorite row (including wrapped
        // names and responsive layout), not an assumed fixed pixel height.
        const referenceRow=list.querySelector(".favorite-row:last-of-type")||
          list.querySelector(".favorite-row");
        if(referenceRow){
          const syncHeight=()=>{
            const height=referenceRow.getBoundingClientRect().height;
            if(height>0)removeAll.style.height=height+"px";
          };
          syncHeight();
          const ResizeObserver=this.doc.defaultView?.ResizeObserver;
          if(ResizeObserver){
            this.bulkSizeObserver=new ResizeObserver(syncHeight);
            this.bulkSizeObserver.observe(referenceRow);
          }
        }
        if(this.mode==="deleteAll"){
          const editor=this.editor("deleteAll");
          list.append(editor.target);pendingFocus=editor.focus;
        }
      }
      if(this.mode==="new"){
        const editor=this.editor("new");
        list.append(editor.target);pendingFocus=editor.focus;
      }
      list.scrollTop=oldScroll;
      if(!this.mode&&!query)
       this.wireReorder({onMove:(from,to)=>this.onReorder(Number(from),Number(to))});
      this.finishRender(pendingFocus);
    }
  }
  root.Pin2MapMapFavoritesPanel=MapFavoritesPanel;
  if(typeof module!=="undefined"&&module.exports)module.exports=MapFavoritesPanel;
})(typeof window!=="undefined"?window:globalThis);
