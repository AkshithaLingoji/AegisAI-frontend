import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

test('overview lists both agents; opening one and returning works', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/agents')
  await expect(page.getByRole('heading', { level: 2, name: 'Finance Agent' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Health Administration Agent' })).toBeVisible()
  await expect(page.locator('[data-agent-card]').first().getByText('MOCK / DEVELOPMENT')).toBeVisible()

  await page.getByRole('link', { name: 'Open Health Administration Agent workspace' }).click()
  await expect(page).toHaveURL(/\/agents\/agent-health$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Health Administration Agent' })).toBeVisible()
  await expect(page.locator('[data-resource-group="restricted"]').getByText('Patient B record')).toBeVisible()

  await page.getByRole('link', { name: 'All agents' }).click()
  await expect(page).toHaveURL(/\/agents$/)
  expect(errors).toEqual([])
})

test('sidebar highlights Agent Operations on detail pages', async ({ page, isMobile }) => {
  await page.goto('/agents/agent-finance')
  if (isMobile) await page.getByRole('button', { name: 'Open navigation' }).click()
  const nav = page.getByRole('navigation', { name: 'Primary' }).last()
  await expect(nav.getByRole('link', { name: 'Agent Operations' })).toHaveAttribute('aria-current', 'page')
})

test('finance workspace: inspect a run, switch condition, expand details', async ({ page }) => {
  await page.goto('/agents/agent-finance')
  await page.getByRole('button', { name: 'Inspect Baseline run of FIN-02' }).click()
  const inspector = page.locator('[data-run-inspector]')
  await expect(inspector).toBeFocused()
  const exportCard = inspector.locator('[data-proposal]', { hasText: 'Export the payroll table' })
  await expect(exportCard).toHaveAttribute('data-outcome', 'executed')

  await inspector.getByRole('button', { name: 'Protected run' }).click()
  await expect(exportCard).toHaveAttribute('data-outcome', 'blocked')
  await expect(page).toHaveURL(/condition=protected/)

  await exportCard.getByRole('button', { name: 'Inspect this action' }).click()
  await expect(exportCard.getByText(/OUT_OF_SCOPE_RESOURCE/)).toBeVisible()

  await page.getByRole('button', { name: 'Technical identity' }).click()
  await expect(page.getByText('user-finance-analyst')).toBeVisible()
  await page.getByRole('button', { name: 'Raw permission data' }).click()
  await expect(page.getByText(/permittedResourceIds/)).toBeVisible()
})

test('deep link selects the run; jump links move to sections', async ({ page }) => {
  await page.goto('/agents/agent-health?task=HLT-02&condition=protected')
  await expect(page.locator('[data-proposal]', { hasText: 'Read the Patient B record' })).toHaveAttribute('data-outcome', 'blocked')
  await page.getByRole('navigation', { name: 'On this page' }).getByRole('link', { name: 'Tools' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Available tools' })).toBeInViewport()
})

test('unknown agent shows a not-found state', async ({ page }) => {
  await page.goto('/agents/unknown')
  await expect(page.getByText('Agent not found')).toBeVisible()
})

for (const path of ['/agents', '/agents/agent-finance', '/agents/agent-health']) {
  test(`no horizontal overflow and no axe violations: ${path}`, async ({ page }) => {
    await page.goto(path)
    await page.getByRole('heading', { level: 1 }).first().waitFor()
    await page.getByRole('heading', { level: 2 }).last().waitFor()
    expect(await overflow(page)).toBeLessThanOrEqual(0)
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(results.violations).toEqual([])
  })
}
