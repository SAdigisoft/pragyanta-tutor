const { test, expect } = require('@playwright/test')

const WEB = process.env.WEB_URL || `http://127.0.0.1:${process.env.PW_WEB_PORT || 42733}`
const OUT = '../artifacts/submission-mock-2026-07-21'

test.use({ viewport: { width: 1920, height: 1080 } })

test('capture mock-mode submission gallery', async ({ page }) => {
  test.setTimeout(90_000)

  await page.goto(`${WEB}/?role=teacher`)
  await expect(page.getByRole('heading', { name: 'Teach from sources you trust.' })).toBeVisible()
  await page.screenshot({ path: `${OUT}/01-lesson-library.png`, fullPage: true })

  await page.locator('#upload').scrollIntoViewIfNeeded()
  await expect(page.locator('.upload-card')).toBeVisible()
  await page.screenshot({ path: `${OUT}/02-pdf-upload.png`, fullPage: true })

  await page.getByRole('tab', { name: 'Paste text' }).click()
  await page.getByLabel('Lesson title').fill('Demo lesson upload')
  await page.getByLabel('Lesson material').fill('A list is mutable, meaning its contents can be changed after creation. A tuple is immutable.')
  await page.screenshot({ path: `${OUT}/03-paste-text-lesson.png`, fullPage: true })

  await page.goto(`${WEB}/?role=teacher`)
  const showcase = page.locator('.lesson-card').filter({ hasText: 'Guided showcase' }).first()
  await showcase.getByRole('button', { name: /Try guided demo/ }).click()
  await expect(page).toHaveURL(/\/learn\//)
  await expect(page.getByRole('heading', { name: /What would you like/ })).toBeVisible()
  await page.screenshot({ path: `${OUT}/04-student-lesson-start.png`, fullPage: true })

  await page.getByRole('button', { name: 'What is the difference between a list and a tuple?' }).click()
  await expect(page.locator('.citation-card')).toBeVisible()
  await page.screenshot({ path: `${OUT}/05-grounded-cited-answer.png`, fullPage: true })

  const composer = page.getByLabel('Ask about this lesson')
  await composer.fill('A tuple is better because we can modify its values later.')
  await page.getByRole('button', { name: /Ask the tutor/ }).click()
  await expect(page.getByText(/A tuple is like a printed page/)).toBeVisible()
  await page.screenshot({ path: `${OUT}/06-misconception-remediation.png`, fullPage: true })

  await composer.fill('It raises an error because a tuple is immutable and cannot be changed.')
  await page.getByRole('button', { name: /Ask the tutor/ }).click()
  await expect(page.getByLabel('Tutor conversation').getByText('Misconception resolved')).toBeVisible()
  await page.screenshot({ path: `${OUT}/07-understanding-verified.png`, fullPage: true })

  await composer.fill('Who won the cricket world cup?')
  await page.getByRole('button', { name: /Ask the tutor/ }).click()
  await expect(page.getByText(/outside this lesson/)).toBeVisible()
  await page.screenshot({ path: `${OUT}/08-off-topic-refusal.png`, fullPage: true })

  await page.goto(`${WEB}/practice/demo-lesson?role=student`)
  await expect(page.locator('.question-prompt')).toBeVisible()
  await page.screenshot({ path: `${OUT}/09-practice-question.png`, fullPage: true })
  const answer = page.getByRole('radio').filter({ hasText: 'A list is mutable; a tuple is immutable' })
  await answer.click()
  await page.getByRole('button', { name: 'Check answer' }).click()
  await expect(page.getByText('Source evidence')).toBeVisible()
  await page.screenshot({ path: `${OUT}/10-practice-grounded-result.png`, fullPage: true })

  await page.goto(`${WEB}/report/demo-lesson?role=teacher`)
  await expect(page.getByRole('heading', { name: 'Misconception report' })).toBeVisible()
  await expect(page.locator('.report-stats')).toBeVisible()
  await expect(page.locator('.status-badge.resolved').first()).toBeVisible()
  await page.screenshot({ path: `${OUT}/11-teacher-report.png`, fullPage: true })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${WEB}/?role=teacher`)
  await expect(page.getByRole('heading', { name: 'Teach from sources you trust.' })).toBeVisible()
  await page.screenshot({ path: `${OUT}/12-mobile-landing.png`, fullPage: true })

  await page.goto(`${WEB}/practice/demo-lesson?role=student`)
  await expect(page.locator('.question-prompt')).toBeVisible()
  await page.screenshot({ path: `${OUT}/13-mobile-practice.png`, fullPage: true })

  await page.goto(`${WEB}/report/demo-lesson?role=teacher`)
  await expect(page.getByRole('heading', { name: 'Misconception report' })).toBeVisible()
  await expect(page.locator('.report-stats')).toBeVisible()
  await expect(page.locator('.status-badge.resolved').first()).toBeVisible()
  await page.screenshot({ path: `${OUT}/14-mobile-report.png`, fullPage: true })
})
