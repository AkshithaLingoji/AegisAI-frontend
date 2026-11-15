import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(err.message))
  return errors
}

test('root is the Command Center and shows the mock source', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Command Center' })).toBeVisible()
  await expect(page.locator('header').getByText('MOCK / DEVELOPMENT')).toBeVisible()
  await expect(page.getByRole('note')).toContainText('Demonstration data')
  expect(errors).toEqual([])
})

test('page loads scrolled to the top and focus is not stolen by the workspace', async ({ page }) => {
  await page.goto('/design-system')
  await expect(page.locator('header').getByText('MOCK / DEVELOPMENT')).toBeVisible()
  await page.waitForTimeout(300)
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BODY')
})

test('service layer panel reports the mock source', async ({ page }) => {
  await page.goto('/design-system')
  const panel = page.getByRole('heading', { name: 'Service layer' }).locator('xpath=ancestor::div[contains(@class,"rounded-card")][1]')
  await expect(panel.getByText(/Nothing here is evidence from the AegisAI backend/)).toBeVisible()
})

test('page has no horizontal overflow', async ({ page }) => {
  await page.goto('/design-system')
  await page.getByRole('heading', { level: 1 }).waitFor()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
})

test('desktop: sidebar lists real modules as links and planned ones as disabled', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop-only layout')
  await page.goto('/design-system')
  const nav = page.getByRole('navigation', { name: 'Primary' })
  await expect(nav).toBeVisible()
  await expect(nav.getByRole('link')).toHaveCount(3)
  await expect(nav.getByRole('link', { name: 'Design system' })).toHaveAttribute('aria-current', 'page')
  await expect(nav.getByRole('link', { name: /Assurance/ })).toHaveCount(0)
  await expect(nav.getByText('Assurance & Policy')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeHidden()
})

test('mobile: navigation opens in a drawer and closes again', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile-only layout')
  await page.goto('/design-system')
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeHidden()
  await page.getByRole('button', { name: 'Open navigation' }).tap()
  const drawer = page.getByRole('dialog', { name: 'Navigation' })
  await expect(drawer).toBeVisible()
  await expect(drawer.getByRole('link', { name: 'Design system' })).toBeVisible()
  await drawer.getByRole('button', { name: 'Close navigation' }).tap()
  await expect(drawer).toBeHidden()
})

test('guided workspace sample: continue, run with loading state, finish, revisit, start over', async ({ page }) => {
  await page.goto('/design-system')
  const workspace = page.locator('#workspace').locator('xpath=ancestor::section[1]')
  await workspace.scrollIntoViewIfNeeded()

  await expect(workspace.getByRole('heading', { name: 'The request' })).toBeVisible()
  await workspace.getByRole('button', { name: 'Continue' }).click()
  const actionsHeading = workspace.getByRole('heading', { name: 'What the agent wants to do' })
  await expect(actionsHeading).toBeVisible()
  // Focus follows the user to the new stage (keyboard / screen-reader users).
  await expect(actionsHeading).toBeFocused()

  // Plain language first, technical detail on demand.
  await workspace.getByRole('button', { name: 'Technical details' }).first().click()
  await expect(workspace.getByText('"kind": "read"')).toBeVisible()

  await workspace.getByRole('button', { name: 'Continue' }).click()
  await expect(workspace.getByRole('heading', { name: 'Run the sample' })).toBeVisible()

  await workspace.getByRole('button', { name: 'Run sample' }).click()
  await expect(workspace.getByText('Running the sample…')).toBeVisible()
  await expect(workspace.getByRole('button', { name: /Running/ })).toBeDisabled()

  await expect(workspace.getByText('Sample run complete')).toBeVisible()

  // Revisit an earlier step (not possible for future steps).
  await workspace.getByRole('button', { name: /Go back to step 1/ }).click()
  await expect(workspace.getByRole('heading', { name: 'The request' })).toBeVisible()
})

test('accessibility: no WCAG 2 A/AA violations', async ({ page }) => {
  await page.goto('/design-system')
  await page.getByRole('heading', { level: 1 }).waitFor()
  // Let the source badge settle out of its loading state.
  await expect(page.locator('header').getByText('MOCK / DEVELOPMENT')).toBeVisible()
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const summary = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
  }))
  expect(summary).toEqual([])
})

test('unknown routes show a friendly page', async ({ page }) => {
  await page.goto('/does-not-exist')
  await expect(page.getByText("This page doesn't exist")).toBeVisible()
})
