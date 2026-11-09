// Executed through Figma MCP. Prefix with const MODE and const screens.
const page=figma.currentPage;
const created=[],mutated=[],links=[],frames={};
const wire=MODE==='Wireframe';
const C=wire?{ink:'#303030',muted:'#626262',brand:'#525252',paper:'#ffffff',bg:'#f4f4f4',line:'#cccccc',tint:'#e9e9e9',radius:0}:{ink:'#102d46',muted:'#536779',brand:'#086c65',paper:'#ffffff',bg:'#f3f6f8',line:'#dce4e9',tint:'#e9f4f1',radius:12};
const available=await figma.listAvailableFontsAsync();
for(const style of ['Regular','Bold']){if(!available.some(f=>f.fontName.family==='Inter'&&f.fontName.style===style))throw Error('Required Inter font unavailable');await figma.loadFontAsync({family:'Inter',style});}
const buttonSet=await figma.getNodeByIdAsync('7:239');
const inputSet=await figma.getNodeByIdAsync('7:325');
const buttonMain=buttonSet.children.find(n=>n.name==='Variant=Primary, State=Default, Size=Medium');
const inputMain=inputSet.children.find(n=>n.name==='State=Default, Value Type=Default');
// Preload all current component fonts before creating or editing instances.
const fontMap=new Map();
for(const root of [buttonMain,inputMain])for(const n of root.findAllWithCriteria({types:['TEXT']}))for(const seg of n.getStyledTextSegments(['fontName']))fontMap.set(JSON.stringify(seg.fontName),seg.fontName);
for(const f of fontMap.values())await figma.loadFontAsync(f);
const rgb=h=>({r:parseInt(h.slice(1,3),16)/255,g:parseInt(h.slice(3,5),16)/255,b:parseInt(h.slice(5,7),16)/255});
const paint=h=>[{type:'SOLID',color:rgb(h)}];
const track=n=>(created.push(n.id),n);
function box(p,name,w,vertical=true,bg=null,pad=0,gap=12){const n=track(figma.createAutoLayout(vertical?'VERTICAL':'HORIZONTAL'));p.appendChild(n);n.name=name;n.resize(w,1);n.primaryAxisSizingMode=vertical?'AUTO':'FIXED';n.counterAxisSizingMode=vertical?'FIXED':'AUTO';n.paddingTop=n.paddingBottom=n.paddingLeft=n.paddingRight=pad;n.itemSpacing=gap;n.fills=bg?paint(bg):[];n.clipsContent=false;return n;}
function txt(p,str,w,size=14,bold=false,ink=C.ink){const n=track(figma.createText());p.appendChild(n);n.fontName={family:'Inter',style:bold?'Bold':'Regular'};n.fontSize=size;n.characters=str;n.fills=paint(ink);n.resize(w,24);n.textAutoResize='HEIGHT';n.lineHeight={unit:'PERCENT',value:145};return n;}
function round(n){n.cornerRadius=C.radius;n.strokes=paint(C.line);return n;}
function btn(p,label,to,w,key,primary=false){let n;if(wire){n=round(box(p,label,w,true,primary?C.brand:C.paper,14,0));txt(n,label,w-28,13,true,primary?'#ffffff':C.ink);}else{n=track(buttonMain.createInstance());p.appendChild(n);n.name=label;n.setProperties({'Label#2:0':label,'Has Icon End#4:64':false,'Has Icon Start#4:128':false});n.resize(w,48);n.fills=paint(primary?C.brand:C.paper);n.strokes=paint(primary?C.brand:C.line);n.cornerRadius=8;for(const t of n.findAllWithCriteria({types:['TEXT']})){t.fills=paint(primary?'#ffffff':C.ink);mutated.push(t.id);}}
  if(to)links.push([n,key+to]);return n;}
function card(p,title,copy,w,bg=C.paper){const n=round(box(p,title,w,true,bg,20,10));txt(n,title,w-40,15,true);txt(n,copy,w-40,13,false,C.muted);return n;}
function field(p,label,value,w){if(!wire&&value.length<75&&!/Kronologi|Pesan|Ringkasan|Catatan|Balasan/.test(label)){const n=track(inputMain.createInstance());p.appendChild(n);n.name=label;n.setProperties({'Label#280:41':label,'Value#630:14':value,'Has Description#611:20':false,'Has Error#72:6':false});n.resize(w,n.height);for(const t of n.findAllWithCriteria({types:['TEXT']}))mutated.push(t.id);return n;}
const n=box(p,label,w,true,null,0,8);txt(n,label,w,13,true);const input=round(box(n,'Example input',w,true,C.bg,14,0));txt(input,value,w-28,14,false,C.muted);if(/Kronologi|Pesan|Ringkasan|Catatan|Balasan/.test(label))input.minHeight=90;return n;}
function chart(p,s,w,mobile){if(s.id!=='transparansi')return;const graph=round(box(p,'Grafik laporan per bulan',w,true,C.paper,20,12));txt(graph,'Laporan masuk per bulan',w-40,16,true);const area=box(graph,'Bar chart',w-40,false,null,0,mobile?12:28);area.counterAxisAlignItems='MAX';for(const [month,value] of [['Jul',72],['Agu',89],['Sep',104],['Okt',128]]){const colW=(w-40-(mobile?36:84))/4,col=box(area,month,colW,true,null,0,8);txt(col,String(value),colW,12,true);const bar=track(figma.createRectangle());col.appendChild(bar);bar.name=month+' '+value;bar.resize(colW,value*1.1);bar.fills=paint(C.brand);bar.cornerRadius=wire?0:4;txt(col,month,colW,12,false,C.muted);}}
const keyPrefix=MODE+'/';
const startX=Math.max(0,...page.children.map(n=>n.x+n.width))+180;
let groupY=120;
const sectionIDs=[];
for(const device of ['Desktop','Mobile']){
 const mobile=device==='Mobile',W=mobile?390:1440,key=keyPrefix+device+'/',cols=mobile?7:4;
 const label=txt(page,MODE.toUpperCase()+' / '+device.toUpperCase()+' · SIAP',1800,32,true);label.x=startX;label.y=groupY-70;sectionIDs.push(label.id);
 for(let i=0;i<screens.length;i++){
  const s=screens[i],admin=['admin','detail','verifikasi','lengkapi','admin-lengkap','tolak','ditolak','teruskan','tindakan','selesai','audit','master'].includes(s.id);
  const f=box(page,key+s.id,W,true,C.bg,0,0);f.name=key+s.id;f.x=startX+(i%cols)*(W+80);f.y=groupY+Math.floor(i/cols)*1180;frames[key+s.id]=f;
  const banner=box(f,'Demo notice',W,true,wire?'#e9e9e9':'#fff4d9',mobile?10:12,0);txt(banner,'PROTOTYPE LOMBA · Data contoh · Tidak menerima laporan sungguhan',W-(mobile?20:24),mobile?10:11,false,C.ink);
  const nav=box(f,'Header',W,false,C.paper,mobile?18:32,20);txt(nav,'SIAP',mobile?100:250,26,true);
  if(mobile){btn(nav,'Beranda','home',mobile?210:180,key);}else for(const [label,to]of [['Beranda','home'],['Transparansi','transparansi'],['Panduan & privasi','panduan'],['Cek status','cek']])btn(nav,label,to,225,key);
  const pad=mobile?22:64,bw=W-pad*2;
  const body=box(f,'Page content',W,true,null,pad,20);
  txt(body,s.eyebrow,bw,11,true,C.brand);
  if(s.id==='home'){
   const hero=box(body,'Hero',bw,mobile,null,0,32),leftW=mobile?bw:760,left=box(hero,'Value proposition',leftW,true,null,0,22);
   txt(left,s.title,leftW,mobile?36:62,true);txt(left,s.intro,leftW,mobile?16:19,false,C.muted);
   const actions=box(left,'Primary actions',leftW,mobile,null,0,12);s.actions.slice(0,2).forEach(([l,to],j)=>btn(actions,l,to,mobile?leftW:280,key,j===0));
   if(!mobile){const side=round(box(hero,'Privacy illustration',bw-leftW-32,true,C.tint,28,22));txt(side,'IDENTITAS ANDA BERHARGA',side.width-56,11,true,C.brand);txt(side,'Suara Anda.\nAkses Anda.',side.width-56,34,true);card(side,'Tiket pribadi','Satu kode tiket + satu PIN untuk memantau tanggapan.',side.width-56);txt(side,'Tanpa nama, email, atau nomor telepon.',side.width-56,14,false,C.muted);}
   const featureRow=box(body,'Trust benefits',bw,mobile,null,0,16);for(const [title,copy]of s.cards)card(featureRow,title,copy,mobile?bw:(bw-32)/3);
   const extra=box(body,'Explore',bw,mobile,null,0,12);s.actions.slice(2).forEach(([l,to])=>btn(extra,l,to,mobile?bw:280,key));
  }else{
   txt(body,s.title,bw,mobile?30:38,true);txt(body,s.intro,bw,mobile?15:17,false,C.muted);
   const split=box(body,'Content and support',bw,mobile,null,0,24);
   const panelW=mobile?bw:admin?990:900;
   const panel=round(box(split,'Main content',panelW,true,C.paper,mobile?16:26,18)),inner=panelW-(mobile?32:52);
   if(s.stats){const row=box(panel,'Metrics',inner,mobile,null,0,12);for(const [v,l]of s.stats){const mw=mobile?inner:(inner-12*(s.stats.length-1))/s.stats.length;const metric=round(box(row,l,mw,true,C.tint,16,5));txt(metric,v,mw-32,26,true);txt(metric,l,mw-32,11,false,C.muted);}}
   chart(panel,s,inner,mobile);
   for(const [l,v]of s.fields||[])field(panel,l,v,inner);
   for(const [t,c]of s.cards||[])card(panel,t,c,inner,C.bg);
   if(s.note)card(panel,'Perhatikan',s.note,inner,C.tint);
   const actions=box(panel,'Actions',inner,true,null,0,10);s.actions.forEach(([l,to],j)=>btn(actions,l,to,inner,key,j===0));
   if(!mobile){const aside=box(split,'Support sidebar',bw-panelW-24,true,null,0,16);if(admin){txt(aside,'RUANG PETUGAS',aside.width,11,true,C.brand);for(const [l,to]of [['Antrean laporan','admin'],['Audit log (Super Admin)','audit'],['Master data (Super Admin)','master']])btn(aside,l,to,aside.width,key);}else{txt(aside,'Laporan yang bisa ditindaklanjuti.',aside.width,21,true);txt(aside,'01 · Ceritakan fakta\n02 · Lengkapi bukti\n03 · Simpan tiket & PIN\n04 · Pantau tanggapan',aside.width,14,false,C.muted);btn(aside,'Panduan & privasi','panduan',aside.width,key);}}
  }
  const footer=box(f,'Footer',W,mobile,C.paper,mobile?22:32,18);txt(footer,'SIAP · Lapor aman, pantau sampai tuntas.',mobile?346:900,12,false,C.muted);btn(footer,'Akses petugas','login',mobile?346:240,key);
  // Fixed presentation viewport. Long content scrolls inside the frame.
  f.resize(W,mobile?844:1000);f.primaryAxisSizingMode='FIXED';f.counterAxisSizingMode='FIXED';f.clipsContent=true;f.overflowDirection='VERTICAL';
 }
 groupY+=Math.ceil(screens.length/cols)*1180+350;
}
let connections=0;
for(const [n,target]of links){const dest=frames[target];let source=n;while(source.parent&&source.parent.type!=='PAGE')source=source.parent;if(dest&&source.id!==dest.id){await n.setReactionsAsync([{trigger:{type:'ON_CLICK'},actions:[{type:'NODE',destinationId:dest.id,navigation:'NAVIGATE',transition:null,resetScrollPosition:true}]}]);connections++;}}
const starts=['Desktop','Mobile'].map(device=>({nodeId:frames[keyPrefix+device+'/home'].id,name:'SIAP '+MODE+' · '+device}));page.flowStartingPoints=[...new Map([...page.flowStartingPoints,...starts].map(s=>[s.nodeId,s])).values()];mutated.push(page.id);
// Include every created descendant, including instantiated library children.
for(const f of Object.values(frames))for(const n of f.findAll(()=>true))if(!created.includes(n.id))created.push(n.id);
await frames[keyPrefix+'Desktop/home'].screenshot({scale:0.6});
await frames[keyPrefix+'Mobile/lapor'].screenshot({scale:0.8});
figma.viewport.scrollAndZoomIntoView([frames[keyPrefix+'Desktop/home']]);
return {createdNodeIds:created,mutatedNodeIds:[...new Set(mutated)],frames:Object.fromEntries(Object.entries(frames).map(([k,n])=>[k,n.id])),connections,frameCount:Object.keys(frames).length};
