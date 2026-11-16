"use strict";
/* Shared visual/interaction contract for the four editable map object dialogs.
 * Type identity is read from the SEARCH chooser, never duplicated here.
 * No project mutation, maps, networking or storage in this module. */
(function(root){
 const OK_LABEL="OK";
 class ObjectDialogCore{
  static get okLabel(){return OK_LABEL;}
  static descriptor(type){
   const id=type==="lake"?"lake":type==="river"?"river":type==="area"?"area":"pin";
   const choices=root.Pin2MapSearchTypeMenu?.CHOICES||[];
   const choice=choices.find(x=>x.id===id);
   if(!choice)throw new Error("Missing canonical search symbol for "+id);
   return {id,label:choice.label,icon:choice.icon||null,asset:choice.asset||null};
  }
  static objectType(type){return type==="area"?"Fläche":type==="lake"?"See":type==="river"?"Fluss":"Pin";}
  static setOpened(button,open){
   if(!button)return;
   button.setAttribute("aria-expanded",String(Boolean(open)));
   button.classList.toggle("is-active",Boolean(open));
  }
  static configureOk(button){
   if(!button)return;
   button.textContent=OK_LABEL;
   button.classList.add("object-dialog-ok");
   button.setAttribute("aria-label","Dialog schließen");
  }
  static configureSurface(panel,header,notes,footer){
   panel.classList.add("object-editor");
   header?.classList.add("object-editor-head");
   notes?.classList.add("object-editor-notes");
   footer?.classList.add("object-editor-actions");
  }
  static mountDeleteSymbol(button,type,doc,icons){
   const choice=this.descriptor(type);
   button.replaceChildren();
   button.classList.add("object-delete-trigger");
   const holder=doc.createElement("span");
   holder.className="object-delete-art";
   if(choice.asset){
    const image=doc.createElement("img");image.src="./assets/"+choice.asset;
    image.alt="";image.setAttribute("aria-hidden","true");
    holder.append(image);
   }else holder.append(icons.svg(choice.icon,doc));
   button.append(holder);
   button.setAttribute("aria-label",this.objectType(type)+" löschen");
   button.setAttribute("title",this.objectType(type)+" löschen");
   button.setAttribute("aria-haspopup","dialog");
   button.setAttribute("aria-expanded","false");
  }
  static makeNotes(doc,{type,value="",onChange,onExpand}){
   const note=doc.createElement("fieldset");note.className="object-editor-notes";
   const legend=doc.createElement("legend");
   legend.className="object-editor-notes-legend";
   const input=doc.createElement("textarea");
   input.className="object-editor-notes-input";
   input.rows=7;input.placeholder="Notiz eingeben …";
   const expand=doc.createElement("button");expand.type="button";
   expand.className="object-editor-expand";
   expand.setAttribute("aria-label","Notizeditor vergrößern");
   expand.setAttribute("title","Notizeditor vergrößern");
   expand.append(root.Pin2MapIcons.svg("square-chevron-right",doc));
   if(onChange)input.addEventListener("input",()=>onChange(input.value));
   if(onExpand)expand.addEventListener("click",onExpand);
   note.append(legend,input,expand);
   this.configureNotes({legend,input,type,value});
   return {note,legend,input,expand};
  }
  static configureNotes({legend,input,type,value}){
   legend.textContent=this.objectType(type)+" Notizen";
   if(value!==undefined)input.value=String(value??"");
  }
  static createFooter(doc,buttons){
   const footer=doc.createElement("div");footer.className="object-editor-actions";
   for(const button of buttons)if(button)footer.append(button);
   return footer;
  }
  static configureName({legend,input,type,name}){
   legend.textContent=this.objectType(type)+" Name";
   if(name!==undefined)input.value=String(name??"");
  }
  static configureUrlLegend(legend,type){
   legend.textContent=this.objectType(type)+"-URL";
   legend.classList.add("object-url-title");
  }
  static normalizedUrl(raw){
   try{
    const value=String(raw||"").trim();if(!value)return null;
    const url=new URL(value),scheme=url.protocol.toLowerCase();
    if(["javascript:","data:","vbscript:","file:","blob:","about:"].includes(scheme))return null;
    return /^[a-z][a-z0-9+.-]*:$/.test(scheme)?url.href:null;
   }catch{return null;}
  }
  static positionPopup({panel,header,footer,popup,doc,kind="url",keyboardAnchor=null}){
   const win=doc.defaultView,vv=win?.visualViewport;
   if(!win)return;
   const p=panel.getBoundingClientRect(),h=header.getBoundingClientRect();
   const f=footer.getBoundingClientRect();
   const viewLeft=vv?.offsetLeft||0,viewTop=vv?.offsetTop||0;
   const width=vv?.width||win.innerWidth,height=vv?.height||win.innerHeight;
   const gap=8,margin=12,inset=10;
   const popupWidth=Math.min(kind==="layer"?260:Math.max(180,p.width-inset*2),
     Math.max(100,p.width-inset*2),width-margin*2);
   popup.style.width=popupWidth+"px";
   popup.style.left=Math.max(viewLeft+margin,
     Math.min(kind==="layer"?p.left+(p.width-popupWidth)/2:p.left+inset,
       viewLeft+width-popupWidth-margin))+"px";
   const upper=Math.max(p.top+gap,h.bottom+gap,viewTop+gap);
   const bottom=Math.min(p.bottom-gap,f.top-gap,viewTop+height-margin);
   if(kind==="layer"){
    popup.style.maxHeight=Math.min(310,Math.max(45,bottom-upper))+"px";
    popup.style.top=upper+"px";
    return;
   }
   const desired=keyboardAnchor?
     keyboardAnchor.top+viewTop-keyboardAnchor.visualOffsetTop:upper;
   const popupTop=Math.max(viewTop+gap,Math.min(desired,bottom-100));
   popup.style.top=popupTop+"px";
   popup.style.height=Math.max(100,Math.min(320,bottom-popupTop))+"px";
  }
 }
 root.Pin2MapObjectDialogCore=ObjectDialogCore;
 if(typeof module!=="undefined"&&module.exports)module.exports=ObjectDialogCore;
})(typeof window!=="undefined"?window:globalThis);
