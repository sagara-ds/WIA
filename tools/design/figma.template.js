// Preparation only. Review existing file/library before executing in Figma.
// Standard Plugin API; one active page; adds content to the right; no deletes.
// Call `await buildSIAP(figma)` in the connected Figma execution environment.
async function buildSIAP(figma) {
  const screens = __SCREENS__;
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
  const page=figma.currentPage, created=[], links=[], frames={};
  const baseX=Math.max(0,...page.children.map(n=>n.x+n.width))+160;
  const color=h=>({r:parseInt(h.slice(1,3),16)/255,g:parseInt(h.slice(3,5),16)/255,b:parseInt(h.slice(5,7),16)/255});
  const fill=h=>[{type:'SOLID',color:color(h)}];
  function track(n){created.push(n.id);return n;}
  function box(parent,name,w,vertical=true,bg=null,pad=0,gap=12){
    const n=track(figma.createFrame());parent.appendChild(n);n.name=name;
    n.layoutMode=vertical?'VERTICAL':'HORIZONTAL';n.primaryAxisSizingMode='AUTO';n.counterAxisSizingMode='FIXED';n.resize(w,1);
    n.paddingTop=n.paddingBottom=n.paddingLeft=n.paddingRight=pad;n.itemSpacing=gap;n.fills=bg?fill(bg):[];n.clipsContent=false;return n;
  }
  function text(p,str,w,size=14,bold=false,ink='#102d46'){
    const n=track(figma.createText());p.appendChild(n);n.fontName={family:'Inter',style:bold?'Bold':'Regular'};n.fontSize=size;n.characters=str;n.fills=fill(ink);n.resize(w,Math.max(size*1.5,20));n.textAutoResize='HEIGHT';n.lineHeight={unit:'PERCENT',value:150};return n;
  }
  function button(p,label,to,w,C,key,primary=false){
    const n=box(p,label,w,true,primary?C.brand:C.paper,14,0);n.cornerRadius=C.radius;n.strokes=fill(C.line);text(n,label,w-28,13,true,primary?'#ffffff':C.ink);links.push([n,key+to]);return n;
  }
  for(const fidelity of ['Wireframe','Mock-up']){
    const wire=fidelity==='Wireframe';
    const C=wire?{ink:'#303030',muted:'#666666',brand:'#555555',paper:'#ffffff',bg:'#f2f2f2',line:'#cccccc',tint:'#e7e7e7',radius:0}:{ink:'#102d46',muted:'#536779',brand:'#086c65',paper:'#ffffff',bg:'#f3f6f8',line:'#dce4e9',tint:'#e9f4f1',radius:12};
    for(const device of ['Desktop','Mobile']){
      const mobile=device==='Mobile', subset=mobile?screens.filter(s=>['home','lapor','bukti','tinjau','terkirim','cek','tiket','balas','transparansi'].includes(s.id)):screens;
      for(let i=0;i<subset.length;i++){
        const s=subset[i],W=mobile?390:1440,key=fidelity+'/'+device+'/',x=baseX+(i%4)*(W+100),y=(wire?0:19000)+(mobile?11000:0)+Math.floor(i/4)*1450;
        const frame=box(page,key+s.id,W,true,C.bg,0,0);frame.x=x;frame.y=y;frame.name=key+s.id;frames[key+s.id]=frame;
        const banner=box(frame,'Prototype disclaimer',W,true,C.tint,12,0);text(banner,'PROTOTYPE LOMBA · Data contoh · Tidak menerima laporan sungguhan',W-24,11,false,C.ink);
        const nav=box(frame,'Navigation',W,!mobile,C.paper,mobile?20:36,22);text(nav,'SIAP',mobile?310:180,26,true,C.ink);
        if(!mobile){for(const [label,to] of [['Beranda','home'],['Transparansi','transparansi'],['Panduan & privasi','panduan'],['Cek status','cek']]){button(nav,label,to,210,C,key);}}
        const pad=mobile?22:80,bw=W-pad*2,body=box(frame,'Content',W,true,null,pad,20);
        text(body,s.eyebrow,bw,11,true,C.brand);text(body,s.title,bw,mobile?30:s.id==='home'?58:38,true,C.ink);text(body,s.intro,bw,mobile?15:17,false,C.muted);
        const panel=box(body,'Main panel',bw,true,C.paper,mobile?18:30,18);panel.cornerRadius=C.radius;panel.strokes=fill(C.line);const inner=bw-(mobile?36:60);
        if(s.stats){const stats=box(panel,'Key metrics',inner,mobile?true:false,null,0,16);for(const [value,label]of s.stats){const metric=box(stats,label,mobile?inner:(inner-16*(s.stats.length-1))/s.stats.length,true,C.tint,16,6);text(metric,value,metric.width-32,28,true,C.ink);text(metric,label,metric.width-32,12,false,C.muted);}}
        for(const [label,value]of s.fields||[]){const field=box(panel,label,inner,true,null,0,7);text(field,label,inner,13,true,C.ink);const input=box(field,'Example field value',inner,true,C.bg,14,0);input.cornerRadius=C.radius/2;input.strokes=fill(C.line);text(input,value,inner-28,14,false,C.muted);}
        for(const [title,copy]of s.cards||[]){const card=box(panel,title,inner,true,C.bg,18,8);card.cornerRadius=C.radius;text(card,title,inner-36,16,true,C.ink);text(card,copy,inner-36,14,false,C.muted);}
        if(s.note){const note=box(panel,'Notice',inner,true,C.tint,16,0);text(note,s.note,inner-32,13,false,C.ink);}
        const actions=box(panel,'Actions',inner,true,null,0,10);s.actions.forEach(([label,to],j)=>button(actions,label,to,inner,C,key,j===0));
        const footer=box(frame,'Footer',W,true,C.paper,mobile?22:36,8);text(footer,'SIAP · Lapor aman, pantau sampai tuntas.',W-(mobile?44:72),12,false,C.muted);button(footer,'Akses petugas →','login',mobile?346:240,C,key);
        frame.resize(W,Math.max(mobile?844:1000,frame.height));
      }
    }
  }
  let connections=0;
  for(const [node,target]of links){
    let dest=frames[target];if(!dest){const parts=target.split('/');parts[1]='Desktop';dest=frames[parts.join('/')];}
    if(dest){await node.setReactionsAsync([{trigger:{type:'ON_CLICK'},actions:[{type:'NODE',destinationId:dest.id,navigation:'NAVIGATE',transition:null,preserveScrollPosition:false}]}]);connections++;}
  }
  const start=frames['Mock-up/Desktop/home'];
  page.flowStartingPoints=[...page.flowStartingPoints,{nodeId:start.id,name:'SIAP — Laporan anonim & akuntabilitas'}];
  figma.viewport.scrollAndZoomIntoView([start]);
  return {createdNodeIds:created,mutatedNodeIds:[page.id],frameIds:Object.fromEntries(Object.entries(frames).map(([k,v])=>[k,v.id])),connections};
}
