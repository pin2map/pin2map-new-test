"use strict";
/* Presentation only. Every confirmation and edit stays INSIDE the favorites
 * panel; no native modal, no data/Leaflet/IndexedDB access. */
(function(root){
  class MapFavoritesPanel{
    constructor({document:doc,getElement,icons,onOpen,onAdd,onReplace,onRemove,onRemoveAll,onRename,onChoose,suggestName,capacity=100,getSearch=()=>"",onSearchChange=()=>{}}){
      this.doc=doc;this.el=getElement;this.icons=icons;
      this.onOpen=onOpen;this.onAdd=onAdd;this.onReplace=onReplace;
      this.onRemove=onRemove;this.onRemoveAll=onRemoveAll;this.onRename=onRename;this.onChoose=onChoose;
      this.suggestName=suggestName;this.capacity=capacity;
      this.open=false;this.mode=null;this.index=null;this.values=[];
      // Search is a per-device UI preference, never part of synced favorites.
      this.onSearchChange=onSearchChange;
      this.searchText=String(getSearch()||"");
      const search=this.el("favoritesSearch");
      search.value=this.searchText;
      search.addEventListener("focus",()=>this.keepEditorVisible());
      search.addEventListener("blur",()=>this.doc.defaultView?.setTimeout(()=>this.keepEditorVisible(),90));
      search.addEventListener("input",()=>{
        this.searchText=search.value;
        this.onSearchChange(this.searchText);
        this.mode=null;this.index=null;
        this.render();
        this.el("favoritesList").scrollTop=0;
      });
      this.el("favoritesSearchClear").addEventListener("click",()=>{
        if(!this.searchText)return;
        this.searchText="";search.value="";
        this.onSearchChange("");
        this.mode=null;this.index=null;
        this.render();
        this.el("favoritesList").scrollTop=0;
        search.focus({preventScroll:true});
      });
      // iOS Safari shrinks its visual viewport above the on-screen keyboard.
      // Keep the active inline editor inside that visible region.
      this.viewport=this.doc.defaultView?.visualViewport||null;
      this.onViewportChange=()=>this.keepEditorVisible();
      this.viewport?.addEventListener("resize",this.onViewportChange);
      this.viewport?.addEventListener("scroll",this.onViewportChange);
    }
    button(icon,title,action,className=""){
      const button=this.doc.createElement("button");
      button.type="button";button.className=className;
      button.title=title;button.setAttribute("aria-label",title);
      if(icon)this.icons.mount(button,icon);
      button.addEventListener("click",action);
      return button;
    }
    labeledButton(label,action,kind=""){
      const b=this.button(null,label,action,"favorite-action"+(kind?" favorite-action-"+kind+" "+kind:""));
      b.textContent=label;return b;
    }
    start(mode,index=null){
      this.mode=mode;this.index=index;this.render();
    }
    show(values){
      this.values=values;this.mode=null;this.index=null;this.open=true;
      this.el("favoritesSearch").value=this.searchText;
      this.el("favoritesPanel").classList.remove("hidden","search-focused");
      this.doc.body.classList.add("favorites-open");
      this.el("favoritesButton").setAttribute("aria-expanded","true");
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
      this.el("favoritesButton").setAttribute("aria-label","Kartenfavoriten öffnen");
      const panel=this.el("favoritesPanel");
      panel.classList.remove("is-editing","search-focused");
      panel.style.removeProperty("--p2m-favorites-keyboard-top");
      panel.style.removeProperty("--p2m-favorites-keyboard-height");
    }
    toggle(values){this.open?this.close():this.show(values);}
    keepEditorVisible(){
      if(!this.open)return;
      const searchFocused=this.doc.activeElement===this.el("favoritesSearch");
      const editorActive=["new","rename","replace"].includes(this.mode);
      const panel=this.el("favoritesPanel");
      panel.classList.toggle("search-focused",searchFocused);
      if(!searchFocused&&!editorActive){
        panel.classList.remove("is-editing");
        panel.style.removeProperty("--p2m-favorites-keyboard-top");
        panel.style.removeProperty("--p2m-favorites-keyboard-height");
        return;
      }
      panel.classList.add("is-editing");
      const vv=this.viewport;
      if(vv){
        panel.style.setProperty("--p2m-favorites-keyboard-top",Math.max(5,Math.round(vv.offsetTop+6))+"px");
        panel.style.setProperty("--p2m-favorites-keyboard-height",Math.max(120,Math.round(vv.height-12))+"px");
      }
      const list=this.el("favoritesList");
      if(searchFocused&&!editorActive)return;
      const editor=list.querySelector(".favorite-confirm");
      if(!editor)return;
      // Scroll the panel's OWN list, not the page or Leaflet map.
      const a=list.getBoundingClientRect(),b=editor.getBoundingClientRect();
      if(b.height>a.height-8)list.scrollTop+=b.top-a.top-6;
      else if(b.bottom>a.bottom-5)list.scrollTop+=b.bottom-a.bottom+8;
      else if(b.top<a.top+5)list.scrollTop+=b.top-a.top-8;
    }
    editor(mode,index){
      const isNew=mode==="new",isRename=mode==="rename";
      const isDelete=mode==="delete"||mode==="deleteAll";
      const isDeleteAll=mode==="deleteAll";
      const target=this.doc.createElement("section");
      target.className="favorite-confirm"+(isDelete?" favorite-confirm-danger":"");
      const title=this.doc.createElement("p");
      title.textContent=isNew?"Neue Ansicht als Favorit speichern?":
        isRename?"Favorit umbenennen?":
        isDeleteAll?"Wirklich alle "+this.values.length+" Favoriten löschen?":
        isDelete?"Favorit wirklich löschen?":
        "Favorit durch die aktuelle Ansicht ersetzen?";
      target.append(title);
      if(isDeleteAll){
        const warning=this.doc.createElement("p");
        warning.textContent="Alle gespeicherten Favoriten werden unwiderruflich entfernt.";
        target.append(warning);
      }
      let input=null;
      if(!isDelete){
        const label=this.doc.createElement("label");
        label.textContent="Name des Favoriten";
        input=this.doc.createElement("input");
        input.type="text";input.className="favorite-name-input";
        input.maxLength=120;input.setAttribute("aria-label","Favoritenname");
        // A replacement keeps the saved favorite's title by default. Only
        // new favorites should derive a suggestion from the current map center.
        input.value=isRename||mode==="replace"?
          (this.values[index]?.name||""):
          (this.suggestName?.()||"Unbekannt");
        label.append(input);target.append(label);
      }
      const actions=this.doc.createElement("div");
      actions.className="favorite-confirm-actions";
      actions.append(this.labeledButton("Abbrechen",()=>this.start(null)));
      const label=isNew?"Speichern":isRename?"Umbenennen":
        isDeleteAll?"Alle löschen":isDelete?"Löschen":"Ersetzen";
      const confirm=this.labeledButton(label,()=>{
        if(!isDelete&&!input.value.trim()){input.focus();return;}
        const name=input?.value.trim();
        this.mode=null;this.index=null;
        if(isNew)this.onAdd(name);
        else if(isRename)this.onRename(index,name);
        else if(isDeleteAll)this.onRemoveAll?.();
        else if(isDelete)this.onRemove(index);
        else this.onReplace(index,name);
      },isDelete?"danger":"primary");
      actions.append(confirm);target.append(actions);
      if(input)input.addEventListener("keydown",event=>{
        if(event.key==="Enter"){event.preventDefault();confirm.click();}
      });
      return {target,focus:input||actions.lastChild};
    }
    render(values=this.values){
      this.values=values;
      const list=this.el("favoritesList");
      const oldScroll=list.scrollTop;
      list.replaceChildren();
      const add=this.el("favoritesAdd");
      const clear=this.el("favoritesSearchClear");
      clear.disabled=!this.searchText.length;
      const query=this.searchText.trim().toLocaleLowerCase("de-DE");
      const matches=values.map((item,index)=>({item,index}))
        .filter(({item})=>{
          if(!query)return true;
          const name=(item.name||"Unbenannt").toLocaleLowerCase("de-DE");
          const date=new Date(item.savedAt);
          const shownDate=Number.isNaN(date.getTime())?"":date.toLocaleString("de-DE",{
            year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"
          }).toLocaleLowerCase("de-DE");
          return name.includes(query)||shownDate.includes(query);
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
        const row=this.doc.createElement("div");row.className="favorite-row";
        // Name, date and empty row area all open the saved view.
        // ONLY the dedicated square-pen control starts renaming.
        row.addEventListener("click",event=>{
          if(!event.target.closest("button"))this.onChoose(index);
        });
        const replace=this.button("plus","Favorit durch aktuelle Ansicht ersetzen",
          ()=>this.start("replace",index),"favorite-icon");
        const details=this.doc.createElement("div");details.className="favorite-details";
        const name=this.labeledButton(item.name||"Unbenannt",()=>this.onChoose(index),"favorite-name");
        name.title="Favoritenansicht öffnen";
        name.setAttribute("aria-label","Favoritenansicht "+(item.name||"Unbenannt")+" öffnen");
        const when=this.doc.createElement("small");when.className="favorite-date";
        const date=new Date(item.savedAt);
        when.textContent=Number.isNaN(date.getTime())?"Unbekanntes Datum":
          date.toLocaleString("de-DE",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});
        details.append(name,when);
        const edit=this.button("square-pen","Favorit umbenennen",
          ()=>this.start("rename",index),"favorite-icon favorite-edit");
        const remove=this.button("star-off","Favorit löschen",
          ()=>this.start("delete",index),"favorite-icon favorite-remove");
        row.append(replace,details,edit,remove);list.append(row);
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
      const panel=this.el("favoritesPanel");
      panel.classList.toggle("is-editing",
        !!pendingFocus||this.doc.activeElement===this.el("favoritesSearch"));
      if(pendingFocus){
        this.keepEditorVisible();
        pendingFocus.focus({preventScroll:true});
        this.keepEditorVisible();
        if(this.mode==="delete"||this.mode==="deleteAll"){
          // Destructive confirmations do NOT open a keyboard. Retain the
          // normal panel and footer, but show the confirmation in the
          // list's own scrollport, even at the bottom of 100 favorites.
          const confirm=list.querySelector(".favorite-confirm");
          if(confirm){
            const port=list.getBoundingClientRect(),rect=confirm.getBoundingClientRect();
            if(rect.bottom>port.bottom)list.scrollTop+=rect.bottom-port.bottom+8;
            if(rect.top<port.top)list.scrollTop+=rect.top-port.top-8;
          }
        }
        // Safari adjusts the visualViewport after input.focus().
        this.doc.defaultView?.setTimeout(()=>this.keepEditorVisible(),180);
      }else{
        this.keepEditorVisible();
      }
    }
  }
  root.Pin2MapMapFavoritesPanel=MapFavoritesPanel;
  if(typeof module!=="undefined"&&module.exports)module.exports=MapFavoritesPanel;
})(typeof window!=="undefined"?window:globalThis);
