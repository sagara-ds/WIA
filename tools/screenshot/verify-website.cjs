const {chromium}=require('C:/Users/septi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..','..'),out=path.join(root,'assets');
 const browser=await chromium.launch({headless:true,channel:'msedge'}),context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage();
 const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST')requests.push(r.url());});
 const base='http://127.0.0.1:4173';
 for(const route of ['index.html','lapor.html','cek.html','transparansi.html','panduan.html']){const r=await page.goto(base+'/'+route);assert.equal(r.status(),200);assert.ok(await page.locator('h1').isVisible());}
 await page.goto(base+'/index.html');await page.screenshot({path:path.join(out,'01-landing-desktop.png'),fullPage:true});
 await page.goto(base+'/lapor.html');await page.getByRole('button',{name:'Lanjut ke bukti'}).click();assert.equal(await page.locator('#form-errors').isVisible(),true);
 await page.getByRole('button',{name:'Isi contoh'}).click();await page.screenshot({path:path.join(out,'02-lapor-desktop.png'),fullPage:true});
 await page.getByRole('button',{name:'Lanjut ke bukti'}).click();
 await page.locator('#bukti').setInputFiles({name:'tidak-valid.txt',mimeType:'text/plain',buffer:Buffer.from('contoh')});assert.match(await page.locator('#file-error').textContent(),/belum didukung/);
 await page.locator('#bukti').setInputFiles({name:'bukti-contoh.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1WQAAAAASUVORK5CYII=','base64')});
 await page.getByRole('button',{name:'Tinjau laporan'}).click();assert.match(await page.locator('#review').textContent(),/Dugaan biaya tambahan/);
 await page.getByRole('button',{name:'Kirim laporan demo'}).click();assert.equal(await page.locator('#form-errors').isVisible(),true);
 await page.locator('#consent').check();await page.getByRole('button',{name:'Kirim laporan demo'}).click();await page.waitForSelector('#success:not([hidden])');
 const ticket=await page.locator('#ticket-output').textContent(),pin=await page.locator('#pin-output').textContent();assert.match(ticket,/^SIAP-[A-F0-9]{12}$/);assert.match(pin,/^\d{6}$/);
 const saved=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('siap-first-draft-v1')));assert.equal(saved[0].pin,undefined);assert.equal(saved[0].pinHash.length,64);assert.equal(saved[0].files[0].name,'bukti-contoh.png');
 await page.goto(base+'/cek.html');await page.locator('#ticket-input').fill(ticket);await page.locator('#pin-input').fill(pin==='000000'?'111111':'000000');await page.getByRole('button',{name:'Buka tiket'}).click();assert.equal(await page.locator('#lookup-error').isVisible(),true);
 await page.locator('#pin-input').fill(pin);await page.getByRole('button',{name:'Buka tiket'}).click();await page.waitForSelector('#ticket-detail:not([hidden])');assert.match(await page.locator('#ticket-title').textContent(),/Dugaan biaya tambahan/);
 await page.screenshot({path:path.join(out,'03-status-desktop.png'),fullPage:true});
 await page.goto(base+'/panduan.html');await page.getByRole('button',{name:'Hapus seluruh laporan demo'}).click();assert.equal(await page.evaluate(()=>sessionStorage.getItem('siap-first-draft-v1')),null);
 const overflow=[];for(const width of [375,768,1440]){await page.setViewportSize({width,height:1000});for(const route of ['index.html','lapor.html','cek.html','transparansi.html','panduan.html']){await page.goto(base+'/'+route);if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))overflow.push(width+':'+route);}}
 await page.setViewportSize({width:390,height:844});await page.goto(base+'/index.html');await page.screenshot({path:path.join(out,'04-landing-mobile.png'),fullPage:true});await page.getByRole('button',{name:'Menu',exact:true}).click();assert.equal(await page.locator('#main-nav').isVisible(),true);
 await page.goto(base+'/lapor.html');await page.getByRole('button',{name:'Isi contoh'}).click();await page.screenshot({path:path.join(out,'05-lapor-mobile.png'),fullPage:true});
 assert.deepEqual(overflow,[]);assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
 const result={date:'2026-11-01',unit:'See npm test',screenshots:5,browserErrors:errors,horizontalOverflow:overflow,formPostRequests:requests,passed:['report validation','file validation','consent','ticket creation','PIN hash storage','invalid credentials','valid ticket access','clear session','mobile navigation','responsive 375/768/1440']};
 fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
