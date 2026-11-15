import { mkdirSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const dir = 'docs/screenshots'

test.beforeAll(() => mkdirSync(dir, { recursive: true }))

test('capture screenshots', async ({ page }, testInfo) => {
  const name = testInfo.project.name // "desktop" | "mobile"
  await page.goto('/design-system')
  await expect(page.locator('header').getByText('MOCK / DEVELOPMENT')).toBeVisible()
  await page.evaluate(() => document.fonts.ready)

  await page.screenshot({ path: `${dir}/${name}-01-overview.png` })

  await page.screenshot({ path: `${dir}/${name}-02-full-page.png`, fullPage: true })

  const workspace = page.locator('#workspace').locator('xpath=ancestor::section[1]')
  await workspace.scrollIntoViewIfNeeded()
  await workspace.screenshot({ path: `${dir}/${name}-03-guided-workspace.png` })

  // Individual sections, for reviewing the visual language up close.
  for (const [id, label] of [
    ['colour', 'palette'],
    ['actions', 'buttons'],
    ['states', 'states'],
    ['comparison', 'comparison'],
  ] as const) {
    const section = page.locator(`#${id}`).locator('xpath=ancestor::section[1]')
    await section.scrollIntoViewIfNeeded()
    await section.screenshot({ path: `${dir}/${name}-section-${label}.png` })
  }

  // Mid-flow state: actions stage.
  await workspace.getByRole('button', { name: 'Continue' }).click()
  await page.waitForTimeout(500)
  await workspace.screenshot({ path: `${dir}/${name}-04-workspace-actions-stage.png` })

  if (name === 'mobile') {
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.getByRole('button', { name: 'Open navigation' }).tap()
    await expect(page.getByRole('dialog', { name: 'Navigation' })).toBeVisible()
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${dir}/${name}-05-navigation-drawer.png` })
  }
})

test('capture Command Center screenshots', async ({ page }, testInfo) => {
  const name = testInfo.project.name
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 2, name: 'Resources' })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `${dir}/cc-${name}-01-top.png` })
  await page.screenshot({ path: `${dir}/cc-${name}-02-full-page.png`, fullPage: true })
  for (const id of ['comparison', 'scenarios', 'activity', 'agents', 'resources']) {
    const section = page.locator(`#${id}`).locator('xpath=ancestor::section[1]')
    await section.scrollIntoViewIfNeeded()
    await section.screenshot({ path: `${dir}/cc-${name}-section-${id}.png` })
  }
})

test('capture Agent Operations screenshots', async ({ page }, testInfo) => {
  const name = testInfo.project.name
  const shot = async (file: string) => page.screenshot({ path: `${dir}/ao-${name}-${file}.png`, fullPage: true })

  await page.goto('/agents')
  await expect(page.getByRole('heading', { level: 2, name: 'Health Administration Agent' })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `${dir}/ao-${name}-01-overview-top.png` })
  await shot('02-overview-full')

  for (const [id, label] of [['agent-finance', 'finance'], ['agent-health', 'health']] as const) {
    await page.goto(`/agents/${id}?task=${id === 'agent-finance' ? 'FIN-02' : 'HLT-02'}&condition=protected`)
    await page.getByRole('heading', { level: 2, name: 'Security and audit events' }).waitFor()
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: `${dir}/ao-${name}-${label}-01-top.png` })
    await shot(`${label}-02-full`)
    for (const section of ['resources', 'tasks', 'actions']) {
      const el = page.locator(`#${section}`).locator('xpath=ancestor::section[1]')
      await el.scrollIntoViewIfNeeded()
      await el.screenshot({ path: `${dir}/ao-${name}-${label}-section-${section}.png` })
    }
  }
})
