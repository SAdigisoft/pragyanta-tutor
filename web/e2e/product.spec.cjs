const { test, expect } = require('@playwright/test')

const WEB = 'http://localhost:5173'
const API = 'http://localhost:8000'

test.describe('Pragyanta product journeys', () => {
  test('uses the selected lesson throughout a new tutor session', async ({ page, request }) => {
    const lessons = await (await request.get(`${API}/api/lessons`)).json()
    const lesson = lessons.find((item) => item.title === 'Python Variables and Types')
    const created = await request.post(`${API}/api/sessions`, { data: { lesson_id: lesson.lesson_id, learner_level: 'beginner' } })
    const { session_id: sessionId } = await created.json()
    console.log(`PRODUCT_SESSION_ID=${sessionId}`)

    await page.goto(`${WEB}/learn/${sessionId}?role=student`)
    await expect(page.locator('.header-lesson')).toContainText('Python Variables and Types')
    await expect(page.getByText('Ask about Python Variables and Types.')).toBeVisible()
    await expect(page.getByText('What are the key ideas in Python Variables and Types?')).toBeVisible()
    await expect(page.locator('.lesson-rail')).toContainText('Tutor session')
    const navigation = page.getByRole('navigation', { name: 'Main navigation' })
    await expect(navigation.getByRole('button', { name: 'New tutoring chat' })).toBeVisible()
    await expect(navigation.getByRole('link', { name: 'Lesson library' })).toBeVisible()
    await page.screenshot({ path: '../artifacts/redesign/22-fixed-multi-lesson-chat.png', fullPage: true })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await expect(navigation).toBeVisible()
    await expect(navigation).toContainText('Recent tutoring')
    await expect.poll(async () => Math.round((await navigation.boundingBox()).x)).toBe(0)
    await page.screenshot({ path: '../artifacts/redesign/26-mobile-sidebar.png', fullPage: true })
  })

  test('new chat asks the learner to choose a source lesson', async ({ page }) => {
    await page.goto(`${WEB}/?role=teacher`)
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'New tutoring chat' }).click()
    await expect(page).toHaveURL(/\?role=student#lessons$/)
    await expect(page.locator('#lessons')).toBeVisible()
  })

  test('practice header is usable at desktop and mobile widths', async ({ page, request }) => {
    const lessons = await (await request.get(`${API}/api/lessons`)).json()
    const lesson = lessons.find((item) => item.title === 'Python Variables and Types')
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`${WEB}/practice/${lesson.lesson_id}?role=student`)
    await expect(page.locator('.practice-page .role-switch')).toBeHidden()
    await expect(page.locator('.header-lesson')).toContainText('Python Variables and Types')
    const titleBox = await page.locator('.header-lesson').boundingBox()
    const difficultyBox = await page.locator('.level-control').boundingBox()
    expect(titleBox.x + titleBox.width).toBeLessThanOrEqual(difficultyBox.x)
    await page.screenshot({ path: '../artifacts/redesign/23-fixed-practice-desktop.png', fullPage: true })

    const questions = await (await request.get(`${API}/api/lessons/${lesson.lesson_id}/questions?limit=15`)).json()
    const visiblePrompt = await page.locator('.question-prompt').textContent()
    const visibleQuestion = questions.find((item) => item.prompt === visiblePrompt)
    await page.getByRole('radio').filter({ hasText: visibleQuestion.answer }).click()
    await page.getByRole('button', { name: 'Check answer' }).click()
    await expect(page.getByText('Source evidence')).toBeVisible()
    await expect(page.locator('.practice-source')).toContainText(visibleQuestion.source_quote)
    await page.screenshot({ path: '../artifacts/redesign/25-grounded-practice-answer.png', fullPage: true })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.reload()
    await expect(page.locator('.header-lesson')).toContainText('Python Variables and Types')
    const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: window.innerWidth }))
    expect(widths.scroll).toBe(widths.viewport)
    await page.screenshot({ path: '../artifacts/redesign/24-fixed-practice-mobile.png', fullPage: true })
  })

  test('renders a newly created lesson without a date crash', async ({ page }) => {
    const createdAt = new Date().toISOString()
    await page.route(`${API}/api/lessons`, async (route) => {
      if (route.request().method() !== 'POST') return route.continue()
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ lesson_id: 'upload-contract-check', title: 'Upload contract check', created_at: createdAt, chunk_count: 1, question_count: 0 }),
      })
    })
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`${WEB}/?role=teacher#upload`)
    const upload = page.locator('.upload-card')
    await upload.getByRole('tab', { name: 'Paste text' }).click()
    await upload.getByLabel('Lesson title').fill('Upload contract check')
    await upload.getByLabel('Lesson material').fill('A useful lesson has source-backed material.')
    await upload.getByRole('button', { name: /Upload lesson/ }).click()
    await expect(upload.getByText('Lesson processed and ready for students.')).toBeVisible()
    await expect(page.locator('.lesson-card').filter({ hasText: 'Upload contract check' })).toBeVisible()
    expect(errors).toEqual([])
  })

  test('disables the composer for a missing session', async ({ page }) => {
    await page.goto(`${WEB}/learn/00000000-0000-0000-0000-000000000001?role=student`)
    await expect(page.getByText('The conversation could not be loaded.')).toBeVisible()
    await expect(page.getByLabel('Ask about this lesson')).toBeDisabled()
  })

  test('provides grounded practice coverage for every lesson', async ({ page, request }) => {
    const lessons = await (await request.get(`${API}/api/lessons`)).json()
    for (const lesson of lessons) {
      const questions = await (
        await request.get(`${API}/api/lessons/${lesson.lesson_id}/questions?limit=1`)
      ).json()
      expect(questions.length, `${lesson.title} should have practice coverage`).toBeGreaterThan(0)
      expect(questions[0].source_quote).toBeTruthy()
    }
    const filesLesson = lessons.find((item) => item.title === 'Python Files and Input/Output')
    await page.goto(`${WEB}/practice/${filesLesson.lesson_id}?role=student`)
    await expect(page.locator('.header-lesson')).toContainText(filesLesson.title)
    await expect(page.locator('.question-prompt')).toBeVisible()
    await page.screenshot({ path: '../artifacts/redesign/27-all-lessons-practice.png', fullPage: true })
  })
})
