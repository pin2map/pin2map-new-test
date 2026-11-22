"use strict";
/* Existing GPX-pin attachment export only. Not a calculated routing route.
 * No DOM, Leaflet, storage, network or provider assumptions. */
(function(root){
  function prepare(pin,project,encodeGpx){
    const attachment=pin?.gpxAttachment;
    if(!attachment?.chains?.length)throw new TypeError("GPX-Anhang fehlt");
    if(typeof encodeGpx!=="function")throw new TypeError("GPX-Exportport fehlt");
    const content=attachment.sourceGpx||
      encodeGpx({...project,pins:[pin],rivers:[]});
    const safe=String(attachment.filename||pin.name||"GPX-Route")
      .replace(/[^a-zA-Z0-9_äöüÄÖÜß. -]/g,"-").replace(/\.gpx$/i,"").slice(0,90);
    return {content,filename:(safe||"GPX-Route")+".gpx"};
  }
  const api=Object.freeze({prepare});
  root.Pin2MapGpxAttachmentExport=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
