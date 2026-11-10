"use strict";
/* Explicit PWA update controller. Never delete user data, and never navigate
   until the expected live Service Worker version is active and controlling
   the current page. Suitable for browser tabs and installed PWAs. */
(function(root){
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function versionOf(worker,Channel,timeoutMs=1200){
    if(!worker||worker.state!=="activated")return null;
    return new Promise(resolve=>{
      const channel=new Channel();
      let settled=false;
      const done=value=>{
        if(settled)return;
        settled=true;clearTimeout(timeout);
        channel.port1.close?.();resolve(value);
      };
      const timeout=setTimeout(()=>done(null),timeoutMs);
      channel.port1.onmessage=event=>done(event.data?.version||null);
      try{worker.postMessage({type:"GET_VERSION"},[channel.port2]);}
      catch(e){done(null);}
    });
  }
  function parseVersion(body){
    const match=body.match(/const CACHE=['"]([^'"]+)['"]/);
    if(!match)throw Error("Serverversion nicht lesbar");
    return match[1];
  }
  async function refresh({save,showNotice,button,env=root,timeoutMs=90000}){
    if(button.disabled)return false;
    button.disabled=true;button.setAttribute("aria-busy","true");
    const fail=(message,error)=>{
      button.disabled=false;button.removeAttribute("aria-busy");
      showNotice(message);
      if(error)console.warn("PWA refresh:",error);
      return false;
    };
    try{await save();}
    catch(e){return fail("Speichern fehlgeschlagen – Aktualisierung abgebrochen",e);}
    if(!env.navigator.onLine)return fail("Offline – Aktualisierung benötigt Internet");
    try{
      const targetWorker=new URL("./sw.js",env.location.href);
      const response=await env.fetch(targetWorker.href+"?refresh="+Date.now(),{
        cache:"no-store",headers:{"Cache-Control":"no-cache"}
      });
      if(!response.ok)throw Error("SW HTTP "+response.status);
      const expected=parseVersion(await response.text());
      showNotice("Aktualisierung wird geprüft …");
      const serviceWorker=env.navigator.serviceWorker;
      if(!serviceWorker)throw Error("Service Worker nicht verfügbar");
      const registration=await serviceWorker.register("./sw.js",{updateViaCache:"none"});
      await registration.update();
      // New worker precaches the entire shell. Installation may take
      // substantially longer than an ordinary browser request.
      const until=Date.now()+timeoutMs;
      let activeVersion=null,controlledVersion=null;
      while(Date.now()<until){
        if(registration.waiting)registration.waiting.postMessage({type:"SKIP_WAITING"});
        activeVersion=await versionOf(registration.active,env.MessageChannel);
        if(activeVersion===expected){
          controlledVersion=await versionOf(serviceWorker.controller,env.MessageChannel);
          if(controlledVersion===expected)break;
        }
        if(registration.installing?.state==="redundant"){
          throw Error("Installation des neuen Offline-Pakets fehlgeschlagen");
        }
        await pause(350);
      }
      if(activeVersion!==expected||controlledVersion!==expected){
        throw Error("Neue Version nicht aktiviert oder Seite nicht übernommen");
      }
      // The browser/PWA must render the new HTML and JS, not merely replace
      // the worker while retaining the previous document in memory.
      const target=new URL(env.location.href);
      target.searchParams.set("v",expected);
      target.searchParams.set("loaded",String(Date.now()));
      env.location.replace(target.href);
      return true;
    }catch(error){
      return fail("Aktualisierung nicht abgeschlossen – Verbindung prüfen und erneut versuchen",error);
    }
  }
  const api=Object.freeze({refresh,parseVersion,versionOf});
  root.Pin2MapPwaRefresh=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
