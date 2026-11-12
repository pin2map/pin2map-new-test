"use strict";
/* Mobile note editor. DOM-only; the host injects persistence and pin naming. */
(function(root){
  class PinNoteEditor{
    constructor({getElement,document:doc,onChange,onClose}){
      if(typeof getElement!=="function"||!doc||typeof onChange!=="function"||typeof onClose!=="function")
        throw new TypeError("Note editor ports required");
      this.el=getElement;this.document=doc;this.onChange=onChange;this.onClose=onClose;
      this.open=false;this.selection={start:0,end:0};
    }
    static insertAtSelection(value,{start,end},insert){
      const a=Math.max(0,Math.min(value.length,start)),b=Math.max(a,Math.min(value.length,end));
      return {text:value.slice(0,a)+insert+value.slice(b),caret:a+insert.length};
    }
    bind(){
      const field=this.el("pinNoteEditorText");
      field.addEventListener("input",()=>this.onChange(field.value));
      for(const event of ["keyup","click","select","touchend"])
        field.addEventListener(event,()=>this.captureSelection());
      this.el("pinNoteInsertDate").addEventListener("pointerdown",()=>this.captureSelection());
      this.el("pinNoteInsertTime").addEventListener("pointerdown",()=>this.captureSelection());
      this.el("pinNoteInsertDate").addEventListener("click",()=>this.insert("date"));
      this.el("pinNoteInsertTime").addEventListener("click",()=>this.insert("time"));
      this.el("pinNoteEditorDone").addEventListener("click",()=>this.close());
      this.document.addEventListener("keydown",event=>{
        if(this.open&&event.key==="Escape"){event.preventDefault();this.close();}
      });
    }
    captureSelection(){
      const field=this.el("pinNoteEditorText");
      if(Number.isInteger(field.selectionStart)&&Number.isInteger(field.selectionEnd))
        this.selection={start:field.selectionStart,end:field.selectionEnd};
    }
    insert(kind){
      const now=new Date();
      const insert=kind==="date"
        ?now.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"})
        :now.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});
      const field=this.el("pinNoteEditorText");
      const result=PinNoteEditor.insertAtSelection(field.value,this.selection,insert);
      field.value=result.text;
      field.focus();
      field.setSelectionRange(result.caret,result.caret);
      this.selection={start:result.caret,end:result.caret};
      this.onChange(result.text);
    }
    show({name="",note=""}={}){
      const field=this.el("pinNoteEditorText");
      this.el("pinNoteEditorTitle").textContent=String(name).trim()||"Pin Notizen";
      field.value=String(note);
      this.el("pinMobileNoteEditor").classList.remove("hidden");
      this.document.body.classList.add("pin-note-editor-open");
      this.open=true;
      this.selection={start:field.value.length,end:field.value.length};
      field.focus();
      field.setSelectionRange(this.selection.start,this.selection.end);
    }
    close(){
      if(!this.open)return;
      this.captureSelection();
      this.onChange(this.el("pinNoteEditorText").value);
      this.open=false;
      this.el("pinMobileNoteEditor").classList.add("hidden");
      this.document.body.classList.remove("pin-note-editor-open");
      this.onClose();
    }
  }
  root.Pin2MapPinNoteEditor=PinNoteEditor;
  if(typeof module!=="undefined"&&module.exports)module.exports=PinNoteEditor;
})(typeof window!=="undefined"?window:globalThis);
