const path = require('path');
const fs = require('fs');
async function run(env) {
  const {browser,baseUrl,root,outputDir,assert,openAuditedPage,waitForStablePage,assertNoOverflow,assertNoRuntimeErrors}=env;
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'assets/research/uga/catalog.json'),'utf8'));
  for (const width of [1280,390]) {
    const label=`research archive ${width}`, {context,page,errors}=await openAuditedPage(browser,baseUrl,{width,height:844},label);
    try {
      await page.goto(baseUrl+'/research.html');
      await page.getByRole('status').filter({hasText:'找到 89 条'}).waitFor();
      await page.getByLabel('查找记录').fill('C129');
      assert(await page.locator('[data-archive-results] article').count()===1,label+' finds the exact claim');
      await page.locator('[data-archive-results] h3 a').click();
      await page.waitForFunction(()=>document.body.dataset.recordReady==='true');
      assert((await page.locator('[data-record-body]').innerText()).includes('SECOND factor'),label+' reads the full original proof statement');
      assert((await page.locator('[data-record-status]').innerText()).includes('NOT INDEPENDENTLY VERIFIED'),label+' retains the actual verification boundary');
      assert(await page.locator('[data-record-related] article').count()>0,label+' connects the claim to related source records');
      const download=await page.locator('[data-record-download]').getAttribute('href');
      const raw=await page.request.get(baseUrl+'/'+download.replace(/^\.\//,''));
      assert(raw.ok() && (await raw.text()).includes('UGA-C129'),label+' original claim is downloadable');
      await assertNoOverflow(page,label);
      await page.screenshot({path:path.join(outputDir,`uga-claim-${width}.png`),fullPage:false});
      await page.goBack(); await page.getByLabel('查找记录').waitFor();
      assert(await page.getByLabel('查找记录').inputValue()==='C129',label+' browser Back retains search');
      await page.getByLabel('查找记录').fill(''); await page.getByLabel('资料类型').selectOption('runs');
      assert((await page.locator('[data-archive-status]').innerText()).includes('91'),label+' includes every Run');
      await page.getByLabel('资料类型').selectOption('all');
      assert((await page.locator('[data-archive-status]').innerText()).includes('399'),label+' includes the complete source set');
      const initial=await page.locator('[data-archive-results] article').count(); await page.getByRole('button',{name:'继续展开'}).click();
      assert(await page.locator('[data-archive-results] article').count()>initial,label+' expands beyond the first page');
      await page.getByLabel('查找记录').fill('no-such-record-xyz');
      assert((await page.locator('[data-archive-status]').innerText()).includes('没有匹配'),label+' empty search has an explicit state');
      const first=catalog.claims[0]; await page.goto(baseUrl+'/research-record.html?id='+first.id); await page.waitForFunction(()=>document.body.dataset.recordReady==='true');
      assert((await page.locator('[data-record-title]').innerText()).includes('C041'),label+' keeps the earliest actual ledger number');
      const large=catalog.files.find(r=>r.bytes>16000000);
      await page.goto(baseUrl+'/research-record.html?id='+large.id); await page.waitForFunction(()=>document.body.dataset.recordReady==='true');
      assert((await page.locator('[data-record-body]').innerText()).includes('180,000'),label+' large evidence is bounded with a full download');
      await assertNoOverflow(page,label); await assertNoRuntimeErrors(errors,label);
    } finally {await context.close();}
  }
  const context=await browser.newContext({javaScriptEnabled:false});
  try {const page=await context.newPage(); await page.goto(baseUrl+'/room.html'); assert(await page.getByRole('link',{name:'进入书房'}).getAttribute('href')==='./magic-cabin/index.html?view=shelf','Room retains a no-JS fallback link');} finally {await context.close();}
  console.log('[research-archive-qa] PASS claims, sources, downloads, filters, history and large evidence');
}
module.exports={run};
