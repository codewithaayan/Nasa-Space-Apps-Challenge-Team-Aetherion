import { test,expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({page}) => {
  // Tests work offline apart from their own local application servers.
  await page.route('**/*',route => {
    const host = new URL(route.request().url()).hostname;
    return ['127.0.0.1','localhost'].includes(host) ? route.continue() : route.abort();
  });
});

test('team branding, favicon and city-specific photography load across the homepage',async ({page}) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Rosenzweig Index — Team Aetherion');
  await expect(page.getByText('ROSENZWEIG',{exact:false}).first()).toBeVisible();
  await expect(page.getByText('TEAM AETHERION PROJECT | NASA SPACE APPS CHALLENGE 2026')).toBeVisible();
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href','/favicon.png');
  await expect(page.locator('img:not([alt]), img[alt=""]')).toHaveCount(0);
  const logos=page.locator('.brand-mark img, .footer-brand img');
  await expect(logos).toHaveCount(2);
  for (const logo of await logos.all()) {
    await expect.poll(() => logo.evaluate(image => image.complete && image.naturalWidth >= 500)).toBe(true);
  }
  await expect(page.locator('.brand-mark svg')).toHaveCount(0);
  const photos=page.locator('.city-location-art');
  await expect(photos).toHaveCount(6);
  const names=['Karachi','Lahore','Islamabad','Quetta','Peshawar','Gilgit'];
  const photoInfo=await photos.evaluateAll(images => Promise.all(images.map(async image => {
    image.loading='eager';
    await image.decode();
    return { alt:image.alt,width:image.naturalWidth };
  })));
  expect(photoInfo.map(photo => photo.alt)).toEqual(names.map(name => `Photograph of ${name}, Pakistan`));
  expect(photoInfo.every(photo => photo.width >= 800)).toBe(true);
  await page.goto('about:blank');
});

test('About tab introduces the team and keeps the science guide under How It Works',async ({page}) => {
  await page.goto('/about');
  await expect(page.getByRole('heading',{name:'Meet the team behind Rosenzweig Index.'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Ayesha'})).toBeVisible();
  await expect(page.getByText('Research & presentation')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Inspired by two Rosenzweigs.'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Cynthia E. Rosenzweig'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Michael L. Rosenzweig'})).toBeVisible();
  await expect(page.getByText('not a standardized index developed by either scientist', {exact:false})).toBeVisible();
  await expect(page.getByRole('link',{name:'Columbia Climate School profile'})).toHaveAttribute('href','https://people.climate.columbia.edu/users/profile/cynthia-ropes-rosenzweig');
  await expect(page.getByRole('link',{name:'University of Arizona research profile'})).toHaveAttribute('href','https://experts.arizona.edu/en/publications/reconciliation-ecology-and-the-future-of-species-diversity/');
  await expect(page.locator('.demo-badge, .about-hero-note, .about-orbit-tag, .about-member-number')).toHaveCount(0);
  await page.getByRole('link',{name:'How It Works',exact:true}).click();
  await expect(page).toHaveURL(/\/science$/);
  await expect(page.getByRole('heading',{name:'How it works'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Four steps. Evidence at every step.'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'A trend is a signal—not an explanation.'})).toBeVisible();
  await page.setViewportSize({width:375,height:812});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Open navigation'}).click();
  await page.getByRole('link',{name:'About',exact:true}).click();
  await expect(page).toHaveURL(/\/about$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('wizard validates real precipitation coverage, plots it and prints a report',async ({page},testInfo) => {
  const errors=[]; page.on('pageerror',error => errors.push(error.message));
  await page.goto('/wizard');
  await expect(page.getByText('Reading dataset coverage…')).toHaveCount(0);
  await page.getByRole('button',{name:/^Precipitation/}).click();
  await page.getByRole('button',{name:'CONTINUE'}).click();
  await page.getByRole('button',{name:/^Karachi/}).click();
  await page.getByRole('button',{name:'CONTINUE'}).click();
  await expect(page.getByLabel('Start month')).toHaveValue('2006-01');
  await expect(page.getByLabel('End month')).toHaveValue('2025-01');
  await page.getByRole('button',{name:'LAST 10 YEARS'}).click();
  await expect(page.getByLabel('Start month')).toHaveValue('2015-02');
  await page.getByRole('button',{name:'CONTINUE'}).click();
  await page.getByRole('button',{name:'BEGIN INVESTIGATION'}).click();
  await expect(page).toHaveURL(/\/lab\?dataset=karachi_precipitation/);
  await expect(page.getByRole('status').filter({hasText:'Analysis complete'})).toBeVisible();
  const plot=page.locator('.js-plotly-plot');
  await expect.poll(() => plot.evaluate(node => node.data?.length)).toBe(3);
  expect(await plot.evaluate(node => node.data[0].y.length)).toBe(120);
  await expect(page.getByText('mm/hr',{exact:true}).first()).toBeVisible();
  await expect(page.getByText('inch/day',{exact:true})).toBeVisible();
  await expect(page.getByText(/Precipitation rates converted from inch\/day to mm\/hr/)).toBeVisible();
  await page.getByRole('link',{name:'OPEN CASE REPORT'}).click();
  await expect(page.getByRole('button',{name:'PRINT / SAVE AS PDF'})).toBeEnabled();
  await expect(page.locator('.js-plotly-plot')).toBeVisible();
  await page.emulateMedia({media:'print'});
  const pdf=testInfo.outputPath('case-report.pdf');
  await page.pdf({path:pdf,format:'A4',printBackground:true});
  expect((await readFile(pdf)).subarray(0,4).toString()).toBe('%PDF');
  await page.screenshot({path:testInfo.outputPath('report.png'),fullPage:true});
  expect(errors).toEqual([]);
});

test('short ranges retain source values, and refresh preserves selections',async ({page}) => {
  await page.goto('/lab?dataset=karachi_temperature&start=2006-01&end=2006-12');
  await expect(page.getByLabel('End month')).toHaveValue('2006-12');
  await page.getByRole('button',{name:'RUN ANALYSIS'}).click();
  await expect(page.getByText('Monthly source values are available, but this selection does not support trend estimation.')).toBeVisible();
  await expect.poll(() => page.locator('.js-plotly-plot').evaluate(node => node.data?.length)).toBe(1);
  expect(await page.locator('.js-plotly-plot').evaluate(node => node.data[0].y.length)).toBe(12);
  await page.reload();
  await expect(page.getByLabel('Start month')).toHaveValue('2006-01');
  await expect(page.getByLabel('End month')).toHaveValue('2006-12');
  await page.getByLabel('Variable',{exact:true}).selectOption('soil_moisture');
  await expect(page.getByLabel('End month')).toHaveValue('2025-12');
  await page.getByRole('button',{name:'RUN ANALYSIS'}).click();
  await expect(page.getByRole('status').filter({hasText:'Analysis complete'})).toBeVisible();
  await expect.poll(() => page.locator('.js-plotly-plot').evaluate(node => node.data?.length)).toBe(3);
  expect(await page.locator('.js-plotly-plot').evaluate(node => node.data[0].y[0])).toBeCloseTo(14.7339945);
  await page.getByLabel('Start month').fill('2030-01');
  await expect(page.getByRole('button',{name:'RUN ANALYSIS'})).toBeDisabled();
});

test('real Lahore data enables analysis and only compatible city comparisons',async ({page}) => {
  await page.goto('/lab?dataset=lahore_temperature');
  await page.getByRole('button',{name:'RUN ANALYSIS'}).click();
  await expect(page.getByRole('status').filter({hasText:'Analysis complete'})).toBeVisible();
  expect(await page.locator('.js-plotly-plot').evaluate(node => node.data[0].y[0])).toBeCloseTo(285.582916);
  await expect(page.getByText('No per-cell monthly grid is included; regional trend mapping and Paradox Finder are unavailable.')).toBeVisible();
  await page.goto('/compare');
  await expect(page.getByRole('button',{name:'RUN COMPARISON'})).toBeEnabled();
  await page.getByRole('button',{name:'RUN COMPARISON'}).click();
  await expect.poll(() => page.locator('.js-plotly-plot').evaluateAll(nodes => nodes.every(node => node.data?.length === 3))).toBe(true);
  await page.getByLabel('Comparison variable').selectOption('soil_moisture');
  await expect(page.getByText(/Comparison needs matching product/)).toBeVisible();
  await expect(page.getByRole('button',{name:'RUN COMPARISON'})).toHaveCount(0);
  await page.getByLabel('Comparison variable').selectOption('precipitation');
  await expect(page.getByRole('button',{name:'RUN COMPARISON'})).toBeEnabled();
  await expect(page.getByLabel('End month')).toHaveValue('2025-01');
  await expect(page.getByText('Precipitation rate · mm/hr',{exact:true})).toHaveCount(2);
});

test('all six cities are discoverable and a new-city wizard respects its actual coverage',async ({page}) => {
  await page.goto('/');
  for (const name of ['Karachi','Lahore','Gilgit','Islamabad','Peshawar','Quetta']) {
    await expect(page.getByRole('link',{name:`Investigate ${name}`,exact:true})).toBeVisible();
  }
  await page.getByRole('link',{name:'Investigate Gilgit',exact:true}).click();
  await page.getByRole('button',{name:/^Precipitation/}).click();
  await page.getByRole('button',{name:'CONTINUE'}).click();
  await expect(page.getByRole('button',{name:/^Gilgit/})).toContainText('Source export available');
  await page.getByRole('button',{name:'CONTINUE'}).click();
  await expect(page.getByLabel('Start month')).toHaveValue('2006-01');
  await expect(page.getByLabel('End month')).toHaveValue('2025-09');
  await page.getByRole('button',{name:'CONTINUE'}).click();
  await expect(page.getByText('mm/hr',{exact:true}).first()).toBeVisible();
  await page.getByRole('button',{name:'BEGIN INVESTIGATION'}).click();
  await expect(page).toHaveURL(/dataset=gilgit_precipitation/);
  await expect(page.getByRole('status').filter({hasText:'Analysis complete'})).toBeVisible();
  expect(await page.locator('.js-plotly-plot').evaluate(node => node.data[0].y.length)).toBe(237);
});

test('comparison selectors analyze new cities and reject different evaporation components',async ({page}) => {
  await page.goto('/compare');
  await page.getByLabel('First comparison place').selectOption('gilgit');
  await page.getByLabel('Second comparison place').selectOption('islamabad');
  await expect(page.getByRole('button',{name:'RUN COMPARISON'})).toBeEnabled();
  await page.getByRole('button',{name:'RUN COMPARISON'}).click();
  await expect.poll(() => page.locator('.js-plotly-plot').evaluateAll(nodes => nodes.every(node => node.data?.length === 3))).toBe(true);
  await expect(page.getByRole('heading',{name:'Gilgit',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Islamabad',exact:true})).toBeVisible();
  const first = await page.locator('.js-plotly-plot').evaluateAll(nodes => nodes.map(node => node.data[0].y[0]));
  expect(first[0]).toBeCloseTo(258.963501);
  expect(first[1]).toBeCloseTo(283.368317);
  await page.getByLabel('Second comparison place').selectOption('quetta');
  await page.getByLabel('First comparison place').selectOption('lahore');
  await page.getByLabel('Comparison variable').selectOption('evaporation');
  await expect(page.getByText(/Comparison needs matching product/)).toBeVisible();
  await expect(page.getByText('Direct evaporation from bare soil (energy flux) · W m-2',{exact:true})).toBeVisible();
  await expect(page.getByText('Canopy water evaporation (energy flux) · W m-2',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'RUN COMPARISON'})).toHaveCount(0);
});

test('new-city reports retain NDVI geolocation caveats and missing datasets remain explicit',async ({page}) => {
  await page.goto('/cases/quetta?dataset=quetta_ndvi');
  await expect(page.getByRole('heading',{name:'Quetta case file'})).toBeVisible();
  await expect(page.getByRole('button',{name:'PRINT / SAVE AS PDF'})).toBeEnabled();
  await expect(page.getByText(/Quetta is the supplied folder association/)).toBeVisible();
  expect(await page.locator('.js-plotly-plot').evaluate(node => node.data[0].y.length)).toBe(240);
  await expect(page.getByText(/contributing Count between 2352 and 2352/)).toBeVisible();
  await page.goto('/lab?dataset=unregistered_dataset');
  await expect(page.getByRole('button',{name:'RUN ANALYSIS'})).toBeDisabled();
  await expect(page.getByText('This selection is awaiting a registered dataset.')).toBeVisible();
});

test('comparison selectors submit the selected pair from all six cities',async ({page}) => {
  const comparisonRequests=[];
  page.on('request',request => {
    if (request.url().endsWith('/api/comparison') && request.postData()) comparisonRequests.push(JSON.parse(request.postData()));
  });
  await page.goto('/compare');
  const firstPlace=page.getByLabel('First comparison place');
  const secondPlace=page.getByLabel('Second comparison place');
  // Offline grid fixtures may add a source-defined region alongside the six cities.
  await expect.poll(() => firstPlace.locator('option').allTextContents()).toEqual(
    expect.arrayContaining(['Karachi','Lahore','Islamabad','Quetta','Peshawar','Gilgit']));
  await firstPlace.selectOption('quetta');
  await secondPlace.selectOption('gilgit');
  await expect.poll(() => comparisonRequests.some(request => request.left_location === 'quetta' && request.right_location === 'gilgit')).toBe(true);
  await expect(page.locator('.compare-city h2')).toHaveText(['Quetta','Gilgit']);
  await expect(page.getByRole('button',{name:'RUN COMPARISON'})).toBeEnabled();
  await page.getByRole('button',{name:'RUN COMPARISON'}).click();
  await expect.poll(() => page.locator('.js-plotly-plot').evaluateAll(nodes => nodes.length === 2 && nodes.every(node => node.data?.length === 3))).toBe(true);
});

test('city selection is available from the selected location panel without a target bar',async ({page}) => {
  await page.setViewportSize({width:1280,height:900});
  await page.goto('/');
  await expect(page.locator('.hud-city-bar')).toHaveCount(0);
  const locationSwitcher=page.locator('.hud-location-panel .hud-panel-city-switcher');
  await expect(locationSwitcher.locator('button')).toHaveCount(6);
  await locationSwitcher.getByRole('button',{name:'Gilgit'}).click();
  await expect(page.locator('.hud-location-name')).toHaveText('Gilgit');
  await page.setViewportSize({width:320,height:760});
  await expect(page.locator('.hud-city-bar')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('about:blank');
});

test('synthetic grids exercise the actual map contract without posing as NASA data',async ({page},testInfo) => {
  await page.goto('/lab?dataset=grid__contract_grid');
  await expect(page.getByLabel('Bounding box')).toBeVisible();
  await page.getByRole('button',{name:'RUN ANALYSIS'}).click();
  await expect(page.getByRole('region',{name:'Trend map with 4 source cells'})).toBeVisible();
  await expect(page.getByText('Supported increases and decreases meet the regional screening rule.')).toBeVisible();
  await expect(page.getByText('Synthetic fixture, NOT NASA observations.')).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('grid-map.png'),fullPage:true});
  await page.getByLabel('Bounding box').fill('66.99,24.89,67.01,24.91');
  await page.getByRole('button',{name:'RUN ANALYSIS'}).click();
  await expect(page.getByText('Only one native grid cell is selected; opposing spatial trends require multiple cells.')).toBeVisible();
});

test('prepared cases load from backend artifacts with review status intact',async ({page}) => {
  await page.goto('/cases');
  await page.getByRole('link',{name:'OPEN PREPARED CASE'}).last().click();
  await expect(page).toHaveURL(/\/cases\/demo\/arctic/);
  await expect(page.getByText('Synthetic software-test fixture, NOT an Arctic finding. Scientific review has not occurred.')).toBeVisible();
  await expect(page.locator('.js-plotly-plot')).toBeVisible();
  await expect(page.getByRole('button',{name:'PRINT / SAVE AS PDF'})).toBeEnabled();
});

test('server-enforced city comparison becomes usable when compatible fixtures arrive',async ({page}) => {
  await page.goto('http://127.0.0.1:8766/compare');
  await expect(page.getByRole('button',{name:'RUN COMPARISON'})).toBeEnabled();
  await page.getByRole('button',{name:'RUN COMPARISON'}).click();
  await expect.poll(() => page.locator('.js-plotly-plot').evaluateAll(nodes => nodes.every(node => node.data?.length === 3))).toBe(true);
  await expect(page.getByText('Synthetic software-test fixture, NOT NASA observations',{exact:true})).toHaveCount(2);
  await expect(page.getByText(/statistically significant increasing trend/)).toBeVisible();
  await expect(page.getByText(/statistically significant decreasing trend/)).toBeVisible();
});

test('catalog errors are visible and retry restores the connection',async ({page}) => {
  let fail=true;
  await page.route('**/api/datasets',route => fail ? route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Dataset service temporarily unavailable'})}) : route.continue());
  await page.goto('/lab');
  await expect(page.getByRole('alert')).toContainText('Dataset service temporarily unavailable');
  fail=false;
  await page.getByRole('button',{name:'RETRY CONNECTION'}).click();
  await expect(page.getByRole('button',{name:'RUN ANALYSIS'})).toBeEnabled();
});

test('mobile investigation and report layouts fit without horizontal scrolling',async ({page},testInfo) => {
  await page.setViewportSize({width:375,height:812});
  await page.goto('/lab?dataset=karachi_temperature');
  await page.getByRole('button',{name:'RUN ANALYSIS'}).click();
  await expect(page.getByRole('status').filter({hasText:'Analysis complete'})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('mobile-lab.png'),fullPage:true});
  await page.getByRole('link',{name:'OPEN CASE REPORT'}).click();
  await expect(page.getByRole('button',{name:'PRINT / SAVE AS PDF'})).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/compare');
  await page.getByLabel('Second comparison place').selectOption('islamabad');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
