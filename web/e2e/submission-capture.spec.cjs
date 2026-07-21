const { test, expect } = require('@playwright/test')

const WEB = process.env.WEB_URL || `http://127.0.0.1:${process.env.PW_WEB_PORT || 42734}`
const API = process.env.API_URL || process.env.VITE_API_URL || 'http://localhost:9000'
const OUT = '../artifacts/submission-2026-07-21'

test.use({ viewport: { width: 1920, height: 1080 } })

test('capture the submission gallery', async ({ page, request }) => {
  test.setTimeout(60_000)
  const lessons = await (await request.get(`${API}/api/lessons`)).json()
  const lesson = lessons.find((item) => item.title === 'Python Lists and Tuples')
  expect(lesson).toBeTruthy()

  await page.goto(`${WEB}/?role=teacher`)
  await expect(page.getByRole('heading', { name: 'Teach from sources you trust.' })).toBeVisible()
  await page.screenshot({ path: `${OUT}/01-lesson-library.png` })

  await page.locator('#upload').scrollIntoViewIfNeeded()
  await expect(page.locator('.upload-card')).toBeVisible()
  await page.screenshot({ path: `${OUT}/02-pdf-upload.png` })

  const showcase = page.locator('.lesson-card').filter({ hasText: 'Guided showcase' }).first()
  await showcase.getByRole('button', { name: /Try guided demo/ }).click()
  await expect(page).toHaveURL(/\/learn\//)

  await page.getByRole('button', { name: 'What is the difference between a list and a tuple?' }).click()
  await expect(page.locator('.citation-card')).toBeVisible()
  await page.locator('.citation-card').scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${OUT}/03-grounded-cited-answer.png` })

  const composer = page.getByLabel('Ask about this lesson')
  await composer.fill('A tuple is better because we can modify its values later.')
  await page.getByRole('button', { name: /Ask the tutor/ }).click()
  const remediation = page.getByText(/A tuple is like a printed page/)
  await expect(remediation).toBeVisible()
  await remediation.scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${OUT}/04-misconception-remediation.png` })

  await composer.fill('It raises an error because a tuple is immutable and cannot be changed.')
  await page.getByRole('button', { name: /Ask the tutor/ }).click()
  const resolved = page.getByLabel('Tutor conversation').getByText(/matches the lesson evidence/)
  await expect(resolved).toBeVisible()
  await resolved.scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${OUT}/05-understanding-verified.png` })

  const practiceResponse = page.waitForResponse((response) =>
    response.url().includes(`/api/lessons/${lesson.lesson_id}/questions`) && response.status() === 200,
  )
  await page.goto(`${WEB}/practice/${lesson.lesson_id}?role=student`)
  const visibleQuestions = await (await practiceResponse).json()
  await expect(page.locator('.question-prompt')).toBeVisible()
  const visiblePrompt = await page.locator('.question-prompt').textContent()
  const visibleQuestion = visibleQuestions.find((item) => item.prompt === visiblePrompt)
  expect(visibleQuestion).toBeTruthy()
  await page.locator('.option').filter({ hasText: visibleQuestion.answer }).click()
  await page.getByRole('button', { name: 'Check answer' }).click()
  await expect(page.getByText('Source evidence')).toBeVisible()
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${OUT}/06-grounded-practice.png` })

  await page.goto(`${WEB}/report/${lesson.lesson_id}?role=teacher`)
  await expect(page.getByRole('heading', { name: 'Misconception report' })).toBeVisible()
  await expect(page.locator('.report-stats')).toBeVisible()
  await page.screenshot({ path: `${OUT}/07-teacher-report.png` })
})
