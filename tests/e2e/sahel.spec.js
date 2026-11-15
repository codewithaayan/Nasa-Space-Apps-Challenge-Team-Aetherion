import { test, expect } from '@playwright/test';

test('real Sahel map remains visible without opposing trends, from city to report', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
    ? route.continue() : route.abort());
  await page.goto('http://127.0.0.1:8767/lab?dataset=karachi_temperature');
  await page.getByRole('link', { name: 'OPEN SAHEL GRID' }).click();
  await expect(page).toHaveURL(/dataset=grid__sahel_precipitation/);
  await expect(page.getByLabel('Location', { exact: true })).toHaveValue('sahel');
  await expect(page.getByLabel('Start month')).toHaveValue('2001-01');
  await expect(page.getByLabel('End month')).toHaveValue('2024-12');
  const responsePromise = page.waitForResponse(response => response.url().includes('/datasets/grid__sahel_precipitation/analysis'));
  await page.getByRole('button', { name: 'RUN ANALYSIS' }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const analysis = await response.json();
  expect(analysis.paradox.opposing_trends).toBe(false);
  expect(analysis.paradox.cells).toHaveLength(99);
  expect(analysis.dataset.data_kind).toBe('reanalysis');
  const map = page.getByRole('region', { name: 'Trend map with 99 source cells' });
  await expect(map).toBeVisible();
  await expect(map.locator('.leaflet-interactive')).toHaveCount(99);
  await expect(page.getByText('No statistically supported opposing trends found. Cell trends are still shown on the map.')).toBeVisible();
  await expect(page.getByText('Map slopes describe annual totals;', { exact: false })).toBeVisible();
  await expect(page.getByText('WESTERN SAHEL', { exact: true })).toBeVisible();
  await map.locator('.leaflet-interactive').first().hover();
  await expect(map.locator('.leaflet-tooltip')).toContainText('Raw p-value:');
  await page.screenshot({ path: testInfo.outputPath('sahel-grid-map.png'), fullPage: true });
  await page.getByRole('link', { name: 'OPEN CASE REPORT' }).click();
  await expect(page.getByRole('heading', { name: 'Western Sahel case file' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Trend map with 99 source cells' })).toBeVisible();
  expect(errors).toEqual([]);
});
