"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const vm=require("node:vm");
const fs=require("node:fs");
const path=require("node:path");

test("UI shell invokes browser timer functions with their owning global as receiver",()=>{
  const notice={textContent:"",classList:{
    hidden:true,
    add(){this.hidden=true;},
    remove(){this.hidden=false;}
  }};
  const browser={
    setTimeout(callback,delay){
      assert.equal(this,browser,"native setTimeout must keep its window receiver");
      assert.equal(delay,3500);
      browser.pending=callback;
      return 17;
    },
    clearTimeout(id){
      assert.equal(this,browser,"native clearTimeout must keep its window receiver");
      browser.cleared=id;
    }
  };
  browser.window=browser;
  const code=fs.readFileSync(path.join(__dirname,"../ui/shell.js"),"utf8");
  vm.runInNewContext(code,{window:browser});
  const shell=new browser.Pin2MapUIShell({getElement:()=>notice});
  shell.showNotice("Gespeichert");
  assert.equal(notice.textContent,"Gespeichert");
  assert.equal(notice.classList.hidden,false);
  assert.equal(typeof browser.pending,"function");
  shell.hideNotice();
  assert.equal(browser.cleared,17);
  assert.equal(notice.classList.hidden,true);
  shell.showNotice("Noch einmal");
  browser.pending();
  assert.equal(notice.classList.hidden,true);
  shell.dispose();
});
