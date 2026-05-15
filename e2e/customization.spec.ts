import { expect, test } from '@playwright/test';

const now = 1700000000000;

test('navigation exposes the vocabulary page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: '词表' }).click();

  await expect(page).toHaveURL(/\/vocabulary$/);
  await expect(page.getByRole('button', { name: '新建词表' })).toBeVisible();
});

test('vocabulary page creates a custom word list', async ({ page }) => {
  await page.goto('/vocabulary');
  await page.getByRole('button', { name: '新建词表' }).click();
  await page.getByLabel('词表名称').fill('阅读生词本');
  const terms = page.getByLabel('词表条目');
  await terms.click();
  await terms.pressSequentially('analysis');
  await terms.press('Enter');
  await expect(terms).toHaveValue('analysis\n');
  await terms.pressSequentially('in terms of');

  await expect(page.getByText('2 个条目')).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('typetype_word_lists') || '[]'));
  expect(stored[0].name).toBe('阅读生词本');
  expect(stored[0].terms.map((term: { value: string }) => term.value)).toEqual(['analysis', 'in terms of']);
});

test('reading applies highlights from a word list created in the UI', async ({ page }) => {
  await page.goto('/vocabulary');
  await page.getByRole('button', { name: '新建词表' }).click();
  await page.getByLabel('词表名称').fill('阅读生词本');
  await page.getByLabel('词表条目').fill('analysis');

  await page.evaluate(() => {
    window.history.replaceState(
      { usr: { text: 'Careful analysis reveals evidence.', title: 'Smoke' }, key: 'smoke' },
      '',
      '/reading'
    );
  });
  await page.reload();

  const analysis = page.locator('span').filter({ hasText: /^analysis$/ }).first();
  await expect(analysis).toBeVisible();
  await expect(analysis).toHaveCSS('background-color', 'rgb(224, 242, 254)');
  await expect(analysis).toHaveCSS('color', 'rgb(7, 89, 133)');
});

test('reading applies custom word-list highlight and typography settings', async ({ page }) => {
  await page.addInitScript((timestamp) => {
    const now = timestamp as number;
    localStorage.setItem('typetype_highlight_styles', JSON.stringify([
      {
        id: 'style-new',
        name: '新词',
        config: {
          textColor: '#075985',
          backgroundColor: '#e0f2fe',
          underline: true,
          underlineColor: '#0284c7',
          borderRadius: 3,
        },
        createdAt: now,
        updatedAt: now,
      },
    ]));

    localStorage.setItem('typetype_word_lists', JSON.stringify([
      {
        id: 'list-reading',
        name: '阅读生词本',
        styleId: 'style-new',
        enabled: true,
        priority: 0,
        matchForms: true,
        terms: [{ id: 'term-analysis', value: 'analysis', createdAt: now }],
        createdAt: now,
        updatedAt: now,
      },
    ]));

    localStorage.setItem('typetype_settings', JSON.stringify({
      fontSize: 20,
      showLiveStats: true,
      theme: 'light',
      difficulty: 'medium',
      mode: 'full',
      timedDuration: 30,
      soundEnabled: false,
      soundVolume: 0.5,
      phraseHighlight: true,
      freqHighlight: { h: false, m: false, l: false },
      freqAnnotation: { h: false, m: false, l: false },
      freqDimLow: false,
      freqDimUltraLow: false,
      customHighlightsEnabled: true,
      typography: {
        fontFamily: 'serif',
        lineHeight: 2.1,
        letterSpacing: 0.04,
        wordSpacing: 0.12,
        maxWidth: 704,
      },
    }));
    window.history.replaceState(
      { usr: { text: 'Careful analysis reveals evidence.', title: 'Smoke' }, key: 'smoke' },
      '',
      '/reading'
    );
  }, now);

  await page.goto('/reading');
  const analysis = page.locator('span').filter({ hasText: /^analysis$/ }).first();
  await expect(analysis).toBeVisible();
  await expect(analysis).toHaveCSS('background-color', 'rgb(224, 242, 254)');
  await expect(analysis).toHaveCSS('color', 'rgb(7, 89, 133)');

  const textContainer = page.getByTestId('reading-text');
  await expect(textContainer).toHaveCSS('line-height', '42px');
  await expect(textContainer).toHaveCSS('letter-spacing', '0.8px');
});
