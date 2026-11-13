"use strict";
/* Presentation only. Every confirmation and edit stays INSIDE the favorites
 * panel; no native modal, no data/Leaflet/IndexedDB access. */
(function(root){
  class MapFavoritesPanel{
    constructor({document:doc,getElement,icons,onOpen,onAdd,onReplace,onRemove,onRename,onChoose,suggestName}){
      this.doc=doc;this.el=getElement;this.icons=icons;
      this.onOpen=onOpen;this.onAdd=onAdd;this.onReplace=onReplace;
      this.onRemove=onRemove;this.onRename=onRename;this.onChoose=onChoose;
      this.suggestName=suggestName;
      this.open=false;this.mode=null;this.index=null;this.values=[];
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
      this.el("favoritesPanel").classList.remove("hidden");
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
      panel.classList.remove("is-editing");
      panel.style.removeProperty("--p2m-favorites-keyboard-top");
      panel.style.removeProperty("--p2m-favorites-keyboard-height");
    }
    toggle(values){this.open?this.close():this.show(values);}
    keepEditorVisible(){
      if(!this.open||!this.mode||this.mode==="delete")return;
      const panel=this.el("favoritesPanel");
      const vv=this.viewport;
      if(vv){
        panel.style.setProperty("--p2m-favorites-keyboard-top",Math.max(5,Math.round(vv.offsetTop+6))+"px");
        panel.style.setProperty("--p2m-favorites-keyboard-height",Math.max(120,Math.round(vv.height-12))+"px");
      }
      const list=this.el("favoritesList"),editor=list.querySelector(".favorite-confirm");
      if(!editor)return;
      // Scroll the panel's OWN list, not the page or Leaflet map.
      const a=list.getBoundingClientRect(),b=editor.getBoundingClientRect();
      if(b.height>a.height-8)list.scrollTop+=b.top-a.top-6;
      else if(b.bottom>a.bottom-5)list.scrollTop+=b.bottom-a.bottom+8;
      else if(b.top<a.top+5)list.scrollTop+=b.top-a.top-8;
    }
    editor(mode,index){
      const isNew=mode==="new",isRename=mode==="rename",isDelete=mode==="delete";
      const target=this.doc.createElement("section");
      target.className="favorite-confirm"+(isDelete?" favorite-confirm-danger":"");
      const title=this.doc.createElement("p");
      const letter=isNew?String.fromCharCode(65+this.values.length):this.values[index]?.letter;
      title.textContent=isNew?"Neue Ansicht als Favorit "+letter+" speichern?":
        isRename?"Favorit "+letter+" umbenennen?":
        isDelete?"Favorit "+letter+" wirklich löschen?":
        "Favorit "+letter+" durch die aktuelle Ansicht ersetzen?";
      target.append(title);
      let input=null;
      if(!isDelete){
        const label=this.doc.createElement("label");
        label.textContent="Name des Favoriten";
        input=this.doc.createElement("input");
        input.type="text";input.className="favorite-name-input";
        input.maxLength=120;input.setAttribute("aria-label","Favoritenname");
        input.value=isRename?(this.values[index]?.name||""):
          (this.suggestName?.()||"Unbekannt");
        label.append(input);target.append(label);
      }
      const actions=this.doc.createElement("div");
      actions.className="favorite-confirm-actions";
      actions.append(this.labeledButton("Abbrechen",()=>this.start(null)));
      const label=isNew?"Speichern":isRename?"Umbenennen":isDelete?"Löschen":"Ersetzen";
      const confirm=this.labeledButton(label,()=>{
        if(!isDelete&&!input.value.trim()){input.focus();return;}
        const name=input?.value.trim();
        this.mode=null;this.index=null;
        if(isNew)this.onAdd(name);
        else if(isRename)this.onRename(index,name);
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
      // Capacity message remains actionable, including after 7 entries.
      add.disabled=false;
      if(!values.length){
        const empty=this.doc.createElement("p");empty.className="favorites-empty";
        empty.textContent="Noch keine Favoriten gespeichert.";list.append(empty);
      }
      let pendingFocus=null;
      values.forEach((item,index)=>{
        const row=this.doc.createElement("div");row.className="favorite-row";
        // Row/date chooses the view; the name is reserved for inline rename.
        row.addEventListener("click",event=>{
          if(!event.target.closest("button"))this.onChoose(index);
        });
        const replace=this.button("plus","Favorit "+item.letter+" durch aktuelle Ansicht ersetzen",
          ()=>this.start("replace",index),"favorite-icon");
        const open=this.button(null,"Ansicht "+item.letter+" öffnen",()=>this.onChoose(index),"favorite-open");
        open.textContent=item.letter;
        const details=this.doc.createElement("div");details.className="favorite-details";
        const name=this.labeledButton(item.name||"Unbenannt",()=>this.start("rename",index),"favorite-name");
        name.title="Favorit umbenennen";name.setAttribute("aria-label","Favorit "+item.letter+" umbenennen");
        const when=this.doc.createElement("small");when.className="favorite-date";
        const date=new Date(item.savedAt);
        when.textContent=Number.isNaN(date.getTime())?"Unbekanntes Datum":
          date.toLocaleString("de-DE",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});
        details.append(name,when);
        const edit=this.button("square-pen","Favorit "+item.letter+" ändern / umbenennen",
          ()=>this.start("rename",index),"favorite-icon favorite-edit");
        const remove=this.button("star-off","Favorit "+item.letter+" löschen",
          ()=>this.start("delete",index),"favorite-icon favorite-remove");
        row.append(replace,open,details,edit,remove);list.append(row);
        if(this.mode&&this.mode!=="new"&&this.index===index){
          const editor=this.editor(this.mode,index);
          list.append(editor.target);pendingFocus=editor.focus;
        }
      });
      if(this.mode==="new"){
        const editor=this.editor("new");
        list.append(editor.target);pendingFocus=editor.focus;
      }
      list.scrollTop=oldScroll;
      const panel=this.el("favoritesPanel");
      panel.classList.toggle("is-editing",!!pendingFocus);
      if(pendingFocus){
        this.keepEditorVisible();
        pendingFocus.focus({preventScroll:true});
        this.keepEditorVisible();
        // Safari adjusts the visualViewport after input.focus().
        this.doc.defaultView?.setTimeout(()=>this.keepEditorVisible(),180);
      }else{
        panel.style.removeProperty("--p2m-favorites-keyboard-top");
        panel.style.removeProperty("--p2m-favorites-keyboard-height");
      }
    }
  }
  root.Pin2MapMapFavoritesPanel=MapFavoritesPanel;
  if(typeof module!=="undefined"&&module.exports)module.exports=MapFavoritesPanel;
})(typeof window!=="undefined"?window:globalThis);
