async (page) => {
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.reload();await page.waitForFunction(()=>window.previewReady===true);
 await page.screenshot({path:'output/robot-p20max/angled.png'});
 await page.locator('article').first().screenshot({path:'output/robot-p20max/tank-improved-angled.png'});
 await page.getByRole('button',{name:'正面',exact:true}).click();await page.screenshot({path:'output/robot-p20max/front.png'});
 await page.getByRole('button',{name:'俯视',exact:true}).click();await page.locator('article').first().screenshot({path:'output/robot-p20max/tank-improved-top.png'});
 await page.getByRole('button',{name:'水箱版空站',exact:true}).click();await page.getByRole('button',{name:'斜视',exact:true}).click();
 await page.locator('article').first().screenshot({path:'output/robot-p20max/tank-improved-empty.png'});
 await page.getByRole('button',{name:'水箱版停靠',exact:true}).click();
 await page.getByRole('button',{name:'侧面',exact:true}).click();await page.locator('article').first().screenshot({path:'output/robot-p20max/tank-smooth-side.png'});
 await page.getByRole('button',{name:'斜视',exact:true}).click();
 if(errors.length)throw Error(errors.join('\n'));
}
