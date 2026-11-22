import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/**
 * Runs against a dev server started with VITE_AEGIS_SOURCE=backend.
 * The backend adapter is not implemented, so the UI must say so plainly and
 * must never fall back to mock data or claim a connection.
 */
test.describe('backend source selected but not connected', () => {
  test('shows BACKEND UNAVAILABLE, never mock data or CONNECTED BACKEND', async ({ page }) => {
    await page.goto('/design-system')
    const header = page.locator('header').first()
    await expect(header.getByText('BACKEND UNAVAILABLE')).toBeVisible()
    await expect(page.getByText('CONNECTED BACKEND')).toHaveCount(0)
    await expect(page.getByText('MOCK / DEVELOPMENT')).toHaveCount(0)
    // The "demonstration data" banner is for mock data only.
    await expect(page.getByRole('note')).toHaveCount(0)
  })

  test('explains the failure instead of substituting mock data', async ({ page }) => {
    await page.goto('/design-system')
    await expect(page.getByRole('alert').filter({ hasText: "backend isn't available" })).toBeVisible()
    await expect(page.getByText(/will not substitute mock data/)).toBeVisible()
  })
})

test.describe('Command Center with backend selected', () => {
  test('shows an error and no mock scenario data', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('alert').filter({ hasText: 'could' })).toBeVisible()
    await expect(page.getByText('FIN-01')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
  })
})

test.describe('Agent Operations with backend selected', () => {
  test('overview and detail show an error and no mock agents', async ({ page }) => {
    for (const path of ['/agents', '/agents/agent-finance']) {
      await page.goto(path)
      await expect(page.getByRole('alert').filter({ hasText: 'could' })).toBeVisible()
      await expect(page.getByText('Finance Agent')).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
    }
  })
})

test.describe('Guided Tasks with backend selected', () => {
  test('shows an error and no mock tasks or runs', async ({ page }) => {
    await page.goto('/tasks')
    await expect(page.getByRole('alert').filter({ hasText: 'could' })).toBeVisible()
    await expect(page.getByText('Expense report')).toHaveCount(0)
    await expect(page.getByText(/does not substitute mock data/)).toBeVisible()
  })
})

test.describe('Red-Team Lab with backend selected', () => {
  test('says the backend is not connected and shows no demonstration data', async ({ page }) => {
    await page.goto('/red-team')
    await expect(page.locator('[data-connection-state="not_connected"]').getByText('BACKEND NOT CONNECTED')).toBeVisible()
    await expect(page.getByText('CONNECTED BACKEND')).toHaveCount(0)
    await expect(page.getByText('MOCK / DEVELOPMENT').first()).toBeHidden()
    await expect(page.getByText(/illustrative/i)).toHaveCount(0)
    await expect(page.getByText(/Unavailable\./)).toHaveCount(2)
    await expect(page.getByText(/does not substitute mock data/).first()).toBeVisible()
  })

  test('the Scenario Catalogue says the backend is not connected and shows no scenarios', async ({ page }) => {
    await page.goto('/red-team/scenarios')
    await expect(page.locator('[data-catalogue-state="backend-unavailable"]')).toContainText('the backend is not connected')
    await expect(page.locator('[data-catalogue-state="backend-unavailable"]')).toContainText('no demonstration data is shown')
    await expect(page.getByRole('list', { name: 'Scenarios' })).toHaveCount(0)
    await expect(page.getByText(/Demo:/)).toHaveCount(0)
    await expect(page.getByText('Mock demonstration data')).toHaveCount(0)
    const a11y = await new AxeBuilder({ page }).analyze()
    expect(a11y.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 120)}`)).toEqual([])
    await page.goto('/red-team/scenarios/demo-prompt-injection')
    await expect(page.locator('[data-catalogue-state="backend-unavailable"]')).toBeVisible()
    await expect(page.getByText(/Demo:/)).toHaveCount(0)
  })
})
