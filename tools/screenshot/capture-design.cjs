const {chromium}=require('C:/Users/septi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('path');
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'}),page=await browser.newPage({viewport:{width:1440,height:1100}}),root=path.resolve(__dirname,'..','..'),out=path.join(root,'assets'),design=path.resolve(__dirname,'..','design');
await page.goto('http://127.0.0.1:4173/index.html');await page.locator('.hero').screenshot({path:path.join(out,'06-landing-detail.png')});
await page.goto('http://127.0.0.1:4173/lapor.html');await page.getByRole('button',{name:'Isi contoh'}).click();await page.locator('#judul').blur();await page.locator('.report-layout').screenshot({path:path.join(out,'07-form-detail.png')});
await page.goto('file:///'+path.join(design,'preview.html').replace(/\\/g,'/')+'#home');await page.click('#wire');await page.locator('#canvas').screenshot({path:path.join(out,'08-wireframe.png')});await page.click('#mock');await page.locator('#canvas').screenshot({path:path.join(out,'09-mockup.png')});
await browser.close();console.log('Four presentation evidence images captured.');})().catch(e=>{console.error(e);process.exit(1)});
