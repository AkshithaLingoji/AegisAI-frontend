import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

test('Red-Team Lab is reachable from the sidebar and explains itself honestly', async ({ page, isMobile }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  if (isMobile) await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('navigation', { name: 'Primary' }).last().getByRole('link', { name: 'Red-Team Lab' }).click()
  await expect(page).toHaveURL(/\/red-team$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Red-Team Lab' })).toBeVisible()
  await expect(page.locator('[data-connection-state="mock"]')).toBeVisible()
  await expect(page.locator('[data-connection-state]').getByText('MOCK / DEVELOPMENT')).toBeVisible()
  await expect(page.getByText(/No executions yet/)).toBeVisible()
  await expect(page.getByText('CONNECTED BACKEND')).toHaveCount(0)
  await expect(page.getByRole('list', { name: 'Attack categories' }).getByRole('listitem')).toHaveCount(5)
  const sections = page.getByRole('list', { name: 'Red-Team Lab sections' })
  await expect(sections.getByText('Upcoming')).toHaveCount(5)
  await expect(sections.getByRole('link')).toHaveCount(0)
  expect(await overflow(page)).toBeLessThanOrEqual(0)
  const a11y = await new AxeBuilder({ page }).analyze()
  expect(a11y.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 120)}`)).toEqual([])
  expect(errors).toEqual([])
})

test('existing modules still work alongside the Red-Team Lab', async ({ page }) => {
  await page.goto('/red-team')
  await page.goto('/tasks')
  await expect(page.getByRole('heading', { level: 1, name: 'Guided Tasks' })).toBeVisible()
  await page.goto('/agents')
  await expect(page.getByRole('heading', { level: 2, name: 'Finance Agent' })).toBeVisible()
})
