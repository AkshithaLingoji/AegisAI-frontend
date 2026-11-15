import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('Command Center renders all sections with simulated data labelled', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Command Center' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Baseline vs Protected' })).toBeVisible()
  for (const id of ['FIN-01', 'FIN-02', 'HLT-01', 'HLT-02']) {
    await expect(page.locator(`[data-scenario="${id}"]`)).toBeVisible()
  }
  await expect(page.locator('[data-agent]')).toHaveCount(2)
  await expect(page.getByRole('note')).toContainText('Demonstration data')
  expect(errors).toEqual([])
})

test('Command Center has no horizontal overflow', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('heading', { level: 2, name: 'Resources' }).waitFor()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})

test('Command Center passes axe WCAG A/AA', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('heading', { level: 2, name: 'Resources' }).waitFor()
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(results.violations).toEqual([])
})

test('navigation moves between Command Center and Design system', async ({ page, isMobile }) => {
  await page.goto('/')
  if (isMobile) await page.getByRole('button', { name: 'Open navigation' }).click()
  const nav = page.getByRole('navigation', { name: 'Primary' }).last()
  await expect(nav.getByRole('link', { name: 'Command Center' })).toHaveAttribute('aria-current', 'page')
  await nav.getByRole('link', { name: 'Design system' }).click()
  await expect(page).toHaveURL(/\/design-system$/)
})
