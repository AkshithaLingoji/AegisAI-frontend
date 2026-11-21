import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

test('Guided Tasks is reachable from navigation and shows the catalogue', async ({ page, isMobile }) => {
  await page.goto('/')
  if (isMobile) await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('navigation', { name: 'Primary' }).last().getByRole('link', { name: 'Guided Tasks' }).click()
  await expect(page).toHaveURL(/\/tasks$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Guided Tasks' })).toBeVisible()
  for (const t of ['Expense report', 'Injected payroll export', 'Health summary', 'Custom task']) {
    await expect(page.getByRole('heading', { level: 3, name: t })).toBeVisible()
  }
  expect(await overflow(page)).toBeLessThanOrEqual(0)
})

test('FIN-01: run, resolve the simulated approval, reach the final result', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/tasks')
  await page.getByRole('button', { name: /Choose Expense report/ }).click()
  await expect(page.getByRole('heading', { name: 'Review the task and its context' })).toBeVisible()
  expect(await overflow(page)).toBeLessThanOrEqual(0)
  await page.getByRole('button', { name: /continue to the simulation/i }).click()
  await page.getByRole('button', { name: /start simulation/i }).click()

  await expect(page.getByRole('heading', { name: 'Inspect the decisions' })).toBeVisible()
  await expect(page.getByText(/waiting for a simulated human approval/)).toBeVisible()
  expect(await overflow(page)).toBeLessThanOrEqual(0)
  const a11y = await new AxeBuilder({ page }).analyze()
  expect(a11y.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 120)}`)).toEqual([])

  await page.getByRole('button', { name: /^Approve: Save the Q3 expense summary/ }).click()
  await page.getByRole('button', { name: /see the final result/i }).click()
  await expect(page.getByRole('heading', { name: 'Final result' })).toBeVisible()
  await expect(page.getByText('Completed: every proposed action ran')).toBeVisible()
  await expect(page.getByRole('list', { name: 'Run timeline' })).toBeVisible()
  expect(await overflow(page)).toBeLessThanOrEqual(0)
  const a11y2 = await new AxeBuilder({ page }).analyze()
  expect(a11y2.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 120)}`)).toEqual([])
  expect(errors).toEqual([])
})

test('FIN-02: the injected export is shown as denied and blocked', async ({ page }) => {
  await page.goto('/tasks')
  await page.getByRole('button', { name: /Choose Injected payroll export/ }).click()
  await expect(page.getByText('Untrusted (catalogue)')).toBeVisible()
  await page.getByRole('button', { name: /continue to the simulation/i }).click()
  await page.getByRole('button', { name: /start simulation/i }).click()
  const card = page.getByRole('article', { name: /Export the payroll table/ })
  await expect(card).toHaveAttribute('data-tone', 'red')
  await expect(card.getByText('DENY')).toBeVisible()
  await expect(card.getByText(/blocked at the gateway and did not run/)).toBeVisible()
  expect(await overflow(page)).toBeLessThanOrEqual(0)
  const a11y = await new AxeBuilder({ page }).analyze()
  expect(a11y.violations.map((v) => v.id)).toEqual([])
})

test('custom task: validation, then a run with the request recorded verbatim', async ({ page }) => {
  await page.goto('/tasks')
  await page.getByRole('button', { name: 'Create a custom task' }).click()
  await page.getByRole('button', { name: /continue to the simulation/i }).click()
  await expect(page.getByText('Give the task a name.')).toBeVisible()
  await page.getByLabel('Task name').fill('Demo custom task')
  await page.getByLabel('What should the agent do?').fill('Please summarise these notes.')
  await page.getByRole('radio', { name: /FIN-01/ }).check()
  await page.getByRole('button', { name: 'Add an input' }).click()
  await expect(page.getByText('Untrusted by default').first()).toBeVisible()
  expect(await overflow(page)).toBeLessThanOrEqual(0)
  const a11y = await new AxeBuilder({ page }).analyze()
  expect(a11y.violations.map((v) => v.id)).toEqual([])
  await page.getByRole('button', { name: /continue to the simulation/i }).click()
  await expect(page.getByText('Please summarise these notes.')).toBeVisible()
  await page.getByRole('button', { name: /start simulation/i }).click()
  await expect(page.getByRole('heading', { name: 'Inspect the decisions' })).toBeVisible()
})
