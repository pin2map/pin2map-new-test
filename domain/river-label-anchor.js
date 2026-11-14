"use strict";
/* Viewport-dependent name anchor for long rivers.
 * Operates on projected pixel coordinates; independent of Leaflet and the DOM.
 * A label is centered along the longest CONTIGUOUS visible portion, not at
 * the fixed middle of the entire (possibly thousands-kilometre) river.
 */
(function(root){
  function clipSegment(a,b,width,height,padding=30){
    const minX=padding,maxX=width-padding,minY=padding,maxY=height-padding;
    if(maxX<=minX||maxY<=minY)return null;
    const dx=b.x-a.x,dy=b.y-a.y;
    let low=0,high=1;
    const bounds=[[-dx,a.x-minX],[dx,maxX-a.x],[-dy,a.y-minY],[dy,maxY-a.y]];
    for(const [p,q] of bounds){
      if(p===0){if(q<0)return null;continue;}
      const t=q/p;
      if(p<0){if(t>high)return null;low=Math.max(low,t);}
      else{if(t<low)return null;high=Math.min(high,t);}
      if(low>high)return null;
    }
    return [
      {x:a.x+dx*low,y:a.y+dy*low},
      {x:a.x+dx*high,y:a.y+dy*high}
    ];
  }
  function findVisibleAnchor(chains,project,width,height,padding=30){
    let best=null;
    for(const chain of chains||[]){
      let run=[],runLength=0,previous=null;
      function consider(){
        if(runLength<0.1)return;
        let wanted=runLength/2,point=run[0][0];
        for(const [a,b,len] of run){
          if(wanted<=len){
            const t=len?wanted/len:0;
            point={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
            break;
          }
          wanted-=len;point=b;
        }
        const centerDistance=Math.hypot((point.x-width/2)/Math.max(width,1),
          (point.y-height/2)/Math.max(height,1));
        // Favor longer continuous stretches but keep the label near the
        // viewport center when two visible stretches have similar lengths.
        const score=runLength/(1+centerDistance*0.2);
        if(!best||score>best.score)best={point,length:runLength,score};
      }
      for(const latLng of chain){
        const current=project(latLng);
        if(previous){
          const segment=clipSegment(previous,current,width,height,padding);
          if(segment){
            const [a,b]=segment;
            const length=Math.hypot(b.x-a.x,b.y-a.y);
            if(length>0){
              run.push([a,b,length]);runLength+=length;
            }
            // A line leaving the padded map cannot stay in the same
            // continuous visible run as another line re-entering later.
            if(Math.hypot(b.x-current.x,b.y-current.y)>0.001){
              consider();run=[];runLength=0;
            }
          }else if(run.length){
            consider();run=[];runLength=0;
          }
        }
        previous=current;
      }
      consider();
    }
    return best?.point||null;
  }
  const api=Object.freeze({clipSegment,findVisibleAnchor});
  root.Pin2MapRiverLabelAnchor=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
