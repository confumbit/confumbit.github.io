'use strict';
// Profile name and navigation destinations.
const PROFILE={name:'Hiten Dalmia'};
const TYPE={body:'Georgia, "Times New Roman", serif',heading:'Georgia, "Times New Roman", serif'};
const pageStyle=getComputedStyle(document.documentElement);
const COLORS=Object.fromEntries(['background','text','muted','rule','accent','panel','panel-active'].map(key=>[key,pageStyle.getPropertyValue('--'+key).trim()]));
// Simplified component-video bandwidth model: FFT filtering of YIQ scanlines.
// No RF, composite modulation, interlacing, or phosphor simulation.
const canvas=document.querySelector('#picture'),ctx=canvas.getContext('2d');
const slider=document.querySelector('#bandwidth'),links=[...document.querySelectorAll('nav a')];
// Each tab gets the 0.5 MHz introduction once; subsequent home visits use full bandwidth.
const homeVisitKey='hiten-home-visited';
let initialSliderValue=slider.defaultValue;
try {
 if(sessionStorage.getItem(homeVisitKey)==='1')initialSliderValue=slider.max;
 sessionStorage.setItem(homeVisitKey,'1');
} catch {
 // Storage may be blocked; the first visit still works and Back restores full bandwidth.
}
slider.value=initialSliderValue;
const contactLinks=[...document.querySelectorAll('.contact-links a')];
const emailLinks=contactLinks.filter(a=>a.getAttribute('href')?.startsWith('mailto:'));
const socialLinks=contactLinks.filter(a=>!emailLinks.includes(a));
let W,H,N,OFFSET,FS,pending=false;
// Text metrics are identical across hover/focus repaints.
const textMetrics=new Map();
function measureText(text){
 const key=ctx.font+'\n'+text;
 if(!textMetrics.has(key))textMetrics.set(key,ctx.measureText(text).width);
 return textMetrics.get(key);
}
// A gentler power curve brings detail in sooner: 75% of travel reaches 2 MHz.
function bandwidthMHz(){if(+slider.value===+slider.max)return Infinity;return 5*Math.pow(+slider.value/1000,Math.log(.4)/Math.log(.75));}
// Cache the signal-processing worker independently of page markup.
const worker=new Worker('/assets/signal-worker.js');
let busy=false,version=0,prepared=null,lastBandwidth=null,workerReady=false;
function pump(){
 if(busy)return;
 const bw=bandwidthMHz();
 if(prepared){const data=prepared;prepared=null;busy=true;workerReady=true;worker.postMessage({...data,bw},[data.pixels]);}
 else if(workerReady&&lastBandwidth!==bw){busy=true;worker.postMessage({type:'filter',bw,version});}
}
worker.onmessage=({data})=>{
 busy=false;
 if(data.version===version&&data.bw===bandwidthMHz()){ctx.putImageData(new ImageData(new Uint8ClampedArray(data.pixels),data.W,data.H),0,0);lastBandwidth=data.bw;}
 pump();
};

// The intro and bio share wrapping, text painting, and accessible link overlays.
function wrapText(element, size, maxWidth) {
 const lines=[];
 let runs=[],width=0;
 function finishLine(){
  while(runs.length&&/^\s+$/.test(runs[runs.length-1].text))width-=runs.pop().width;
  if(runs.length)lines.push({runs,width});
  runs=[];width=0;
 }
 for(const node of element.childNodes){
  const font=(node.nodeName==='I'||node.querySelector?.('i')?'italic ':'')+size+'px '+TYPE.body;
  ctx.font=font;
  for(const text of node.textContent.match(/\s+|\S+/g)||[]){
   const runWidth=measureText(text);
   if(width+runWidth>maxWidth&&runs.length)finishLine();
   if(!runs.length&&/^\s+$/.test(text))continue;
   runs.push({text,width:runWidth,font,link:node.nodeName==='A'?node:null});
   width+=runWidth;
  }
 }
 finishLine();
 return lines;
}
function paintText(lines, top, lineHeight, size, overlays) {
 lines.forEach((line,i)=>{
  let x=(W-line.width)/2,group=null;
  const y=top+i*lineHeight;
  function finishLink(){
   if(!group)return;
   const a=document.createElement('a');
   a.href=group.link.href;a.target='_blank';a.rel='noopener noreferrer';
   a.setAttribute('aria-label',group.link.textContent);
   Object.assign(a.style,{left:group.x+'px',top:y+'px',width:group.width+'px',height:lineHeight+'px'});
   overlays.appendChild(a);group=null;
  }
  for(const run of line.runs){
   ctx.font=run.font;ctx.fillText(run.text,x,y);
   if(group&&group.link!==run.link)finishLink();
   if(run.link){
    if(!group)group={link:run.link,x,width:0};
    group.width+=run.width;ctx.fillRect(x,y+size+2,run.width,.7);
   }
   x+=run.width;
  }
  finishLink();
 });
}

function draw(){
 pending=false;
 // Work in CSS pixels so text and controls remain aligned on every viewport.
 W=Math.round(document.documentElement.clientWidth);N=2**Math.ceil(Math.log2(W+256));OFFSET=Math.floor((N-W)/2);FS=W/52;
 const compactIntro=W<540;
 const sidePadding=Math.max(20,Math.min(80,W*.08)),textWidth=W-2*sidePadding,size=compactIntro?12:14,lineHeight=compactIntro?18:24;
 const introWidth=Math.min(1200,textWidth);
 ctx.font=size+'px '+TYPE.body;
 const lines=wrapText(document.querySelector('#intro'),size,introWidth);
 const top=W<540?24:32;
 const nameSize=Math.min(52,textWidth/6.8),introHeight=lines.length*lineHeight;
 ctx.font='13px '+TYPE.body;
 const navCellWidth=Math.max(150,...links.map(a=>measureText(a.textContent)+56));
 const navColumns=Math.max(1,Math.min(links.length,Math.floor(textWidth/navCellWidth)));
 const menuHeight=Math.ceil(links.length/navColumns)*80;
 const controlY=top+introHeight+24;
 const controlsBottom=controlY+88;
 const bioSize=16,bioLineHeight=bioSize*1.5,bioWidth=Math.min(920,textWidth);
 const bioLines=wrapText(document.querySelector('#bio'),bioSize,bioWidth);
 // Center the profile as a group; on short screens keep a clear gap and scroll.
 const bioHeight=bioLines.length*bioLineHeight;
 const contactHeight=emailLinks.length*32+(socialLinks.length?16+32:0);
 const profileHeight=nameSize+24+bioHeight+24+contactHeight+32+menuHeight;
 const nameY=Math.max(controlsBottom+(W<540?48:72),innerHeight*.52-profileHeight/2);
 const bioY=nameY+nameSize+24,contactY=bioY+bioHeight+24;
 const navY=contactY+contactHeight+32;
 H=Math.ceil(Math.max(innerHeight,navY+menuHeight+32));if(canvas.width!==W)canvas.width=W;if(canvas.height!==H)canvas.height=H;
 ctx.fillStyle=COLORS.background;ctx.fillRect(0,0,W,H);ctx.textBaseline='top';ctx.font=size+'px '+TYPE.body;ctx.fillStyle=COLORS.muted;
 ctx.textAlign='left';
 const introOverlays=document.querySelector('#intro-links');introOverlays.replaceChildren();
 paintText(lines,top,lineHeight,size,introOverlays);
 const controlWidth=Math.min(360,textWidth),control=document.querySelector('#bandwidth-control');
 control.style.left=((W-controlWidth)/2)+'px';control.style.top=controlY+'px';control.style.width=controlWidth+'px';
 ctx.textAlign='center';ctx.font=nameSize+'px '+TYPE.heading;ctx.fillStyle=COLORS.text;ctx.fillText(PROFILE.name,W/2,nameY);
 ctx.textAlign='left';ctx.fillStyle=COLORS.muted;
 paintText(bioLines,bioY,bioLineHeight,bioSize,introOverlays);
 ctx.textAlign='center';ctx.font='14px '+TYPE.body;
 contactLinks.forEach((a,i)=>{
  const emailIndex=emailLinks.indexOf(a),socialIndex=socialLinks.indexOf(a);
  const x=emailIndex>=0?W/2:W/2+(socialIndex-(socialLinks.length-1)/2)*104;
  const y=contactY+(emailIndex>=0?emailIndex*32:emailLinks.length*32+16);
  const width=Math.min(textWidth,measureText(a.textContent)+20);
  a.style.left=(x-width/2)+'px';a.style.top=y+'px';a.style.width=width+'px';a.style.height='32px';
  ctx.fillStyle=COLORS.muted;ctx.fillText(a.textContent,x,y+6);
  if(a.hasAttribute('href')){ctx.fillRect(x-(width-20)/2,y+23,width-20,1);}
  if(document.activeElement===a){ctx.strokeStyle=COLORS.accent;ctx.strokeRect(x-width/2,y,width,32);}
 });
 // Draw the entire navigation into the signal; HTML links provide hit areas.
 const spacing=Math.min(194,textWidth/navColumns);
 links.forEach((a,i)=>{
  const row=Math.floor(i/navColumns),rowCount=Math.min(navColumns,links.length-row*navColumns);
  const x=W/2+(i%navColumns-(rowCount-1)/2)*spacing-spacing/2+6,y=navY+row*80,width=spacing-12;
  a.style.left=x+'px';a.style.top=y+'px';a.style.width=width+'px';
  const active=a.matches(':hover')||document.activeElement===a;
  ctx.fillStyle=active?COLORS['panel-active']:COLORS.panel;ctx.fillRect(x,y,width,68);
  ctx.strokeStyle=active?COLORS.accent:COLORS.rule;ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,width-1,67);
  ctx.textAlign='left';ctx.font='10px '+TYPE.body;ctx.fillStyle=COLORS.accent;ctx.fillText(a.dataset.index,x+12,y+11);
  ctx.font='13px '+TYPE.body;ctx.fillStyle=COLORS.text;ctx.fillText(a.textContent,x+12,y+40);
  ctx.textAlign='right';ctx.font='16px '+TYPE.body;ctx.fillStyle=COLORS.accent;ctx.fillText(a.hasAttribute('data-document')?'↗':'→',x+width-12,y+39);
 });
 ctx.textAlign='left';
 const source=ctx.getImageData(0,0,W,H);
 prepared={type:'prepare',pixels:source.data.buffer,W,H,N,OFFSET,FS,version:++version};
 pump();
}
function schedule(){if(!pending){pending=true;requestAnimationFrame(draw);}}
function updateSlider(){
 const bw=bandwidthMHz();
 document.querySelector('#bandwidth-value').textContent=bw===Infinity?'Full bandwidth':bw.toFixed(2)+' MHz';
 slider.setAttribute('aria-valuetext',bw===Infinity?'Full bandwidth, unfiltered':bw.toFixed(2)+' megahertz');
 // Illustrative waveform; updated only on input, with no animation loop.
 const fraction=Math.min(1,bw/5),cycles=1+27*Math.pow(fraction,.55),amplitude=2+7*Math.sqrt(fraction);
 const points=[];
 for(let i=0;i<=360;i++){
  const t=i/360,x=8+344*t,y=18-amplitude*Math.sin(2*Math.PI*cycles*t);
  points.push((i?'L':'M')+x.toFixed(1)+' '+y.toFixed(2));
 }
 const path=points.join(' ');
 document.querySelector('#wave-path').setAttribute('d',path);
 document.querySelector('#wave-active').setAttribute('d',path);
 document.querySelector('#wave-progress-width').setAttribute('width',8+344*(+slider.value/+slider.max));
}
let sliderFrame;
slider.addEventListener('input',()=>{
 if(sliderFrame)return;
 sliderFrame=requestAnimationFrame(()=>{sliderFrame=null;updateSlider();pump();});
});
// Back/Forward may restore this document without running its initialization again.
addEventListener('pageshow',event=>{
 slider.value=event.persisted?slider.max:initialSliderValue;
 updateSlider();
 pump();
});
updateSlider();
contactLinks.forEach(el=>{el.addEventListener('focus',schedule);el.addEventListener('blur',schedule);});
links.forEach(el=>['mouseenter','mouseleave','focus','blur'].forEach(event=>el.addEventListener(event,schedule)));
document.querySelector('h1').textContent=PROFILE.name;
let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(schedule,150);});
draw();
