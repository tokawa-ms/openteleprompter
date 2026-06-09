import { expect, type Locator, test } from '@playwright/test';

const setRangeValue = async (locator: Locator, value: string) => {
  await locator.evaluate(
    (element, nextValue) => {
      const input = element as HTMLInputElement;
      input.value = nextValue;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    },
    value,
  );
};

test('play button scrolls the teleprompter stage', async ({ page }) => {
  await page.goto('/');

  const stage = page.locator('#promptorStage');
  const stagePlayButton = page.locator('#stagePlayButton');
  await expect(stage).toBeVisible();

  const before = await stage.evaluate((element) => ({
    scrollTop: element.scrollTop,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
  }));

  expect(before.scrollHeight).toBeGreaterThan(before.clientHeight);

  await page.locator('#playButton').click();
  await expect(stagePlayButton).toHaveText('一時停止');

  await expect
    .poll(async () => page.evaluate(() => document.fullscreenElement?.id ?? null), {
      message: 'teleprompter stage should become fullscreen when playback starts',
      timeout: 3_000,
    })
    .toBe('promptorStage');

  await expect(stagePlayButton).toBeVisible();
  await expect(page.locator('#rewindLineButton')).toBeVisible();
  await expect(page.locator('#rewindParagraphButton')).toBeVisible();
  await expect(page.locator('#stageFontSizeInput')).toBeVisible();
  await expect(page.locator('#stageSpeedInput')).toBeVisible();
  await expect(page.locator('#stageLineHeightInput')).toBeVisible();

  await expect
    .poll(async () => stage.evaluate((element) => element.scrollTop), {
      message: 'teleprompter stage should scroll after playback starts',
      timeout: 3_000,
    })
    .toBeGreaterThan(before.scrollTop);

  await stage.click({ position: { x: 24, y: 24 } });
  await expect(stagePlayButton).toHaveText('再生');
  await stage.click({ position: { x: 24, y: 24 } });
  await expect(stagePlayButton).toHaveText('一時停止');
  await stagePlayButton.click();
  await expect(stagePlayButton).toHaveText('再生');
  const pausedScrollTop = await stage.evaluate((element) => element.scrollTop);

  await page.locator('#rewindLineButton').click();
  await expect
    .poll(async () => stage.evaluate((element) => element.scrollTop), {
      message: 'line rewind should move the prompt backward',
      timeout: 1_000,
    })
    .toBeLessThan(pausedScrollTop);

  await stage.evaluate((element) => {
    element.scrollTop = 900;
    element.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
  const paragraphStart = await stage.evaluate((element) => element.scrollTop);
  await page.locator('#rewindParagraphButton').click();
  await expect
    .poll(async () => stage.evaluate((element) => element.scrollTop), {
      message: 'paragraph rewind should move the prompt backward',
      timeout: 1_000,
    })
    .toBeLessThan(paragraphStart);

  await setRangeValue(page.locator('#stageFontSizeInput'), '56');
  await expect(page.locator('#fontSizeInput')).toHaveValue('56');
  await expect(page.locator('#stageFontSizeOutput')).toHaveText('56px');
  await expect(stage.locator('#promptorText')).toHaveCSS('font-size', '56px');

  await setRangeValue(page.locator('#stageSpeedInput'), '88');
  await expect(page.locator('#speedInput')).toHaveValue('88');
  await expect(page.locator('#stageSpeedOutput')).toHaveText('88');

  await setRangeValue(page.locator('#stageLineHeightInput'), '1.8');
  await expect(page.locator('#lineHeightInput')).toHaveValue('1.8');
  await expect(page.locator('#stageLineHeightOutput')).toHaveText('1.80');
});

test('teleprompter text uses Japanese line-breaking rules', async ({ page }) => {
  await page.goto('/');

  const styles = await page.locator('#promptorText').evaluate((element) => {
    const computedStyle = getComputedStyle(element);
    return {
      lineBreak: computedStyle.lineBreak,
      wordBreak: computedStyle.wordBreak,
      overflowWrap: computedStyle.overflowWrap,
    };
  });

  expect(styles).toEqual({
    lineBreak: 'strict',
    wordBreak: 'normal',
    overflowWrap: 'normal',
  });
});

test('editor applies rich text formatting to teleprompter text', async ({ page }) => {
  await page.goto('/');

  const editor = page.locator('#bodyInput');
  await editor.fill('書式テスト');
  await editor.focus();
  await page.keyboard.press('Control+A');

  await page.locator('#boldButton').click();
  await page.locator('#italicButton').click();
  await page.locator('#underlineButton').click();
  await setRangeValue(page.locator('#textColorInput'), '#ffcc00');

  await expect(page.locator('#promptorText b')).toHaveText('書式テスト');
  await expect(page.locator('#promptorText i')).toHaveText('書式テスト');
  await expect(page.locator('#promptorText u')).toHaveText('書式テスト');
  await expect(page.locator('#promptorText span')).toHaveCSS('color', 'rgb(255, 204, 0)');

  const savedBody = await page.evaluate(() => {
    const documents = JSON.parse(localStorage.getItem('open-standalone-web-promptor.documents.v1') ?? '[]') as Array<{
      body: string;
    }>;
    return documents[0]?.body ?? '';
  });

  expect(savedBody).toContain('<b>');
  expect(savedBody).toContain('<i>');
  expect(savedBody).toContain('<u>');
  expect(savedBody).toContain('color: rgb(255, 204, 0)');
});

test('editor keeps existing text when appending a new line', async ({ page }) => {
  await page.goto('/');

  const editor = page.locator('#bodyInput');
  const promptorText = page.locator('#promptorText');
  const originalText = await promptorText.textContent();

  expect(originalText).toContain('Open Standalone Web Promptor へようこそ。');

  await editor.focus();
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('追記した行');

  await expect(promptorText).toContainText('Open Standalone Web Promptor へようこそ。');
  await expect(promptorText).toContainText('追記した行');

  const storedBody = await page.evaluate(() => {
    const documents = JSON.parse(localStorage.getItem('open-standalone-web-promptor.documents.v1') ?? '[]') as Array<{
      body: string;
    }>;
    return documents[0]?.body ?? '';
  });

  expect(storedBody).toContain('Open Standalone Web Promptor へようこそ。');
  expect(storedBody).toContain('追記した行');
});
