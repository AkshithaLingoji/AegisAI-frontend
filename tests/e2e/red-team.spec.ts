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
  await expect(page.getByRole('list', { name: 'Attack categories' }).getByRole('listitem')).toHaveCount(7)
  const sections = page.getByRole('list', { name: 'Red-Team Lab sections' })
  await expect(sections.getByText('Upcoming')).toHaveCount(4)
  await expect(sections.getByRole('link')).toHaveCount(2)
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

test.describe('Scenario Catalogue', () => {
  test('browse, search, filter and open a scenario, accessibly and without overflow', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    await page.goto('/red-team')
    await page.getByRole('list', { name: 'Red-Team Lab sections' }).getByRole('link', { name: 'Scenario Catalogue' }).click()
    await expect(page).toHaveURL(/\/red-team\/scenarios$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Scenario Catalogue' })).toBeVisible()
    const list = page.getByRole('list', { name: 'Scenarios' })
    await expect(list.getByRole('listitem')).toHaveCount(5)
    await expect(page.locator('[data-no-execution-note]')).toContainText('does not mean it has been run')
    await expect(list.getByText('Mock demonstration data')).toHaveCount(5)
    expect(await overflow(page)).toBeLessThanOrEqual(0)
    const a11y = await new AxeBuilder({ page }).analyze()
    expect(a11y.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 120)}`)).toEqual([])

    await page.getByRole('group', { name: 'Filter by category' }).getByRole('button', { name: /Tool misuse/ }).click()
    await expect(list.getByRole('listitem')).toHaveCount(1)
    await page.getByRole('button', { name: /^All/ }).click()
    await page.getByRole('searchbox', { name: 'Search scenarios' }).fill('zzzz-nothing')
    await expect(page.locator('[data-catalogue-state="no-results"]')).toBeVisible()
    await page.getByRole('button', { name: 'Clear search and filters' }).click()
    await expect(list.getByRole('listitem')).toHaveCount(5)

    await page.getByRole('searchbox', { name: 'Search scenarios' }).fill('exfil')
    await list.getByRole('link', { name: /data sent to an unapproved destination/ }).click()
    await expect(page).toHaveURL(/\/red-team\/scenarios\/demo-data-exfiltration\?q=exfil$/)
    await expect(page.getByRole('heading', { level: 1, name: /data sent to an unapproved destination/ })).toBeVisible()
    await expect(page.locator('[data-input-format="structured"]')).toContainText('unapproved.example')
    await expect(page.locator('[data-expected-behavior]')).toContainText('Specification, not a result')
    await expect(page.locator('[data-execution-note]')).toContainText('Execution: none recorded')
    expect(await overflow(page)).toBeLessThanOrEqual(0)
    const a11y2 = await new AxeBuilder({ page }).analyze()
    expect(a11y2.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 120)}`)).toEqual([])

    await page.locator('[data-back-link]').click()
    await expect(page).toHaveURL(/\/red-team\/scenarios\?q=exfil$/)
    await expect(page.getByRole('searchbox', { name: 'Search scenarios' })).toHaveValue('exfil')
    expect(errors).toEqual([])
  })

  test('works from the keyboard', async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard path is exercised on desktop')
    await page.goto('/red-team/scenarios')
    await expect(page.getByRole('list', { name: 'Scenarios' }).getByRole('listitem')).toHaveCount(5)
    const link = page.getByRole('link', { name: /instruction hidden in a document/ })
    await link.focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/red-team\/scenarios\/demo-prompt-injection$/)
  })
})
