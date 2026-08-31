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

const readDurationSeconds = async (locator: Locator) => {
  const value = (await locator.textContent())?.trim() ?? '';
  const match = /^(\d+)分(\d{2})秒$/.exec(value);
  if (!match) {
    throw new Error(`Unexpected duration: ${value}`);
  }
  return Number(match[1]) * 60 + Number(match[2]);
};

test('estimated duration updates with speed and appears in fullscreen controls', async ({ page }) => {
  await page.goto('/');

  const durationOutput = page.locator('#durationOutput');
  const stageDurationOutput = page.locator('#stageDurationOutput');
  await expect(durationOutput).toHaveText(/^\d+分\d{2}秒$/);
  const initialDuration = await readDurationSeconds(durationOutput);
  expect(initialDuration).toBeGreaterThan(0);

  await setRangeValue(page.locator('#speedInput'), '92');
  await expect
    .poll(() => readDurationSeconds(durationOutput))
    .toBeLessThan(initialDuration);

  await page.locator('#playButton').click();
  await expect(stageDurationOutput).toBeVisible();
  await expect(stageDurationOutput).toHaveText((await durationOutput.textContent()) ?? '');
});

test('Ctrl+Enter remains available and Ctrl+Space starts fullscreen playback', async ({ page }) => {
  await page.goto('/');

  const editor = page.locator('#bodyInput');
  await editor.fill('本文');
  await editor.click();
  await page.keyboard.press('End');
  const ctrlEnterWasPrevented = page.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        document.addEventListener(
          'keydown',
          (event) => {
            resolve(event.defaultPrevented);
          },
          { once: true },
        );
      }),
  );
  await page.keyboard.press('Control+Enter');

  await expect(ctrlEnterWasPrevented).resolves.toBe(false);
  await expect
    .poll(async () => page.evaluate(() => document.fullscreenElement?.id ?? null))
    .toBeNull();

  await page.keyboard.press('Control+Space');
  await expect
    .poll(async () => page.evaluate(() => document.fullscreenElement?.id ?? null))
    .toBe('promptorStage');
});

test('play button scrolls the teleprompter stage', async ({ page }) => {
  await page.goto('/');

  const stage = page.locator('#promptorStage');
  const stagePlayButton = page.locator('#stagePlayButton');
  const readingGuide = page.locator('#readingGuide');
  await expect(stage).toBeVisible();
  await expect(readingGuide).toBeHidden();

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
  await expect(readingGuide).toBeVisible();
  const readingGuidePosition = await readingGuide.evaluate(
    (element) => element.getBoundingClientRect().top / window.innerHeight,
  );
  expect(readingGuidePosition).toBeCloseTo(1 / 3, 2);

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
  const promptorText = page.locator('#promptorText');
  await editor.fill('書式テスト');
  await editor.focus();
  await page.keyboard.press('Control+A');

  await page.locator('#boldButton').click();
  await expect(promptorText.locator('b')).toHaveCSS('font-weight', '900');

  await page.locator('#italicButton').click();
  await expect(promptorText.locator('i')).toHaveCSS('font-style', 'italic');

  await page.locator('#underlineButton').click();
  await setRangeValue(page.locator('#textColorInput'), '#ffcc00');

  await expect(promptorText.locator('b')).toHaveText('書式テスト');
  await expect(promptorText.locator('i')).toHaveText('書式テスト');
  await expect(promptorText.locator('u')).toHaveCSS('text-decoration-line', 'underline');
  await expect(promptorText.locator('span')).toHaveCSS('color', 'rgb(255, 204, 0)');

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

test('font size controls support up to 150px', async ({ page }) => {
  await page.goto('/');

  const fontSizeInput = page.locator('#fontSizeInput');
  const stageFontSizeInput = page.locator('#stageFontSizeInput');
  await expect(fontSizeInput).toHaveAttribute('max', '150');
  await expect(stageFontSizeInput).toHaveAttribute('max', '150');

  await setRangeValue(fontSizeInput, '150');
  await expect(stageFontSizeInput).toHaveValue('150');
  await expect(page.locator('#fontSizeOutput')).toHaveText('150px');
  await expect(page.locator('#promptorText')).toHaveCSS('font-size', '150px');
});

test('editor emphasizes only selected text at each supported multiplier', async ({ page }) => {
  await page.goto('/');

  const editor = page.locator('#bodyInput');
  for (const [factor, buttonId] of [
    ['1.2', 'emphasis12Button'],
    ['1.4', 'emphasis14Button'],
    ['1.8', 'emphasis18Button'],
  ] as const) {
    await editor.fill('前強調後');
    await editor.evaluate((element) => {
      const text = element.firstChild;
      if (!text) {
        throw new Error('Editor text node was not found.');
      }
      const range = document.createRange();
      range.setStart(text, 1);
      range.setEnd(text, 3);
      const selection = document.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      element.dispatchEvent(new Event('mouseup', { bubbles: true }));
    });

    await page.locator(`#${buttonId}`).click();

    const emphasized = page.locator(`#promptorText [data-emphasis="${factor}"]`);
    await expect(emphasized).toHaveText('強調');
    const actualMultiplier = await emphasized.evaluate((element) => {
      const parentSize = Number.parseFloat(getComputedStyle(element.parentElement!).fontSize);
      return Number.parseFloat(getComputedStyle(element).fontSize) / parentSize;
    });
    expect(actualMultiplier).toBeCloseTo(Number(factor), 2);
    await expect(page.locator('#promptorText')).toHaveText('前強調後');
  }

  const savedBody = await page.evaluate(() => {
    const documents = JSON.parse(localStorage.getItem('open-standalone-web-promptor.documents.v1') ?? '[]') as Array<{
      body: string;
    }>;
    return documents[0]?.body ?? '';
  });
  expect(savedBody).toContain('data-emphasis="1.8"');
});

test('editor emphasis does not compound when reapplied to the same selection', async ({ page }) => {
  await page.goto('/');

  const editor = page.locator('#bodyInput');
  await editor.fill('強調テスト');
  await editor.focus();
  await page.keyboard.press('Control+A');

  await page.locator('#emphasis12Button').click();
  await page.locator('#emphasis12Button').click();
  await page.locator('#emphasis18Button').click();

  const emphasized = page.locator('#promptorText [data-emphasis]');
  await expect(emphasized).toHaveCount(1);
  await expect(emphasized).toHaveAttribute('data-emphasis', '1.8');
  const actualMultiplier = await emphasized.evaluate((element) => {
    const parentSize = Number.parseFloat(getComputedStyle(element.parentElement!).fontSize);
    return Number.parseFloat(getComputedStyle(element).fontSize) / parentSize;
  });
  expect(actualMultiplier).toBeCloseTo(1.8, 2);
});

test('editor clears all formatting from the selected text', async ({ page }) => {
  await page.goto('/');

  const editor = page.locator('#bodyInput');
  await editor.fill('前解除後');
  await editor.focus();
  await page.keyboard.press('Control+A');
  await page.locator('#boldButton').click();
  await page.locator('#italicButton').click();
  await page.locator('#underlineButton').click();
  await setRangeValue(page.locator('#textColorInput'), '#ffcc00');
  await page.locator('#emphasis14Button').click();

  await editor.evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let text = walker.nextNode();
    while (text && !text.textContent?.includes('前解除後')) {
      text = walker.nextNode();
    }
    if (!text) {
      throw new Error('Editor text node was not found.');
    }
    const range = document.createRange();
    range.setStart(text, 1);
    range.setEnd(text, 3);
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    element.dispatchEvent(new Event('mouseup', { bubbles: true }));
  });
  await page.locator('#clearFormattingButton').click();

  await expect(editor).toHaveText('前解除後');
  await expect(editor.locator('b')).toHaveCount(2);
  const clearedTextIsFormatted = await editor.evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node && node.textContent !== '解除') {
      node = walker.nextNode();
    }
    return node?.parentElement?.closest('b, strong, i, em, u, font, span') !== null;
  });
  expect(clearedTextIsFormatted).toBe(false);
  await expect(page.locator('#promptorText')).toHaveText('前解除後');
  await expect(page.locator('#promptorText').locator('b')).toHaveCount(2);
});

test('editor toggles formatting off for the selected text', async ({ page }) => {
  await page.goto('/');

  const editor = page.locator('#bodyInput');
  await editor.fill('トグルテスト');

  for (const [buttonId, tagName] of [
    ['boldButton', 'b'],
    ['italicButton', 'i'],
    ['underlineButton', 'u'],
  ] as const) {
    await editor.focus();
    await page.keyboard.press('Control+A');
    await page.locator(`#${buttonId}`).click();
    await expect(editor.locator(tagName)).toHaveText('トグルテスト');

    await page.locator(`#${buttonId}`).click();
    await expect(editor.locator(tagName)).toHaveCount(0);
    await expect(editor).toHaveText('トグルテスト');
  }
});

test('rewind point control tag preserves text flow and stays hidden in the prompt', async ({ page }) => {
  await page.goto('/');

  const editor = page.locator('#bodyInput');
  await editor.fill('前半後半');
  await editor.evaluate((element) => {
    const text = element.firstChild;
    if (!text) {
      throw new Error('Editor text node was not found.');
    }

    const range = document.createRange();
    range.setStart(text, 2);
    range.collapse(true);
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    element.dispatchEvent(new Event('mouseup', { bubbles: true }));
  });

  await page.locator('#rewindPointButton').click();

  await expect(editor.locator('[data-rewind-point="true"]')).toHaveText('↩ 巻き戻しポイント');
  await expect(page.locator('#promptorText .promptor-paragraph')).toHaveCount(1);
  await expect(page.locator('#promptorText .promptor-rewind-point')).toHaveCount(1);
  await expect(page.locator('#promptorText')).toHaveText('前半後半');
  await expect(page.locator('#promptorText')).not.toContainText('巻き戻しポイント');
  const markerLayout = await page.locator('#promptorText .promptor-rewind-point').evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      width: element.getBoundingClientRect().width,
      marginLeft: style.marginLeft,
      marginRight: style.marginRight,
      paddingLeft: style.paddingLeft,
      paddingRight: style.paddingRight,
    };
  });
  expect(markerLayout).toEqual({
    width: 0,
    marginLeft: '0px',
    marginRight: '0px',
    paddingLeft: '0px',
    paddingRight: '0px',
  });

  const savedBody = await page.evaluate(() => {
    const documents = JSON.parse(localStorage.getItem('open-standalone-web-promptor.documents.v1') ?? '[]') as Array<{
      body: string;
    }>;
    return documents[0]?.body ?? '';
  });
  expect(savedBody).toContain('data-rewind-point="true"');
});

test('rewind point between editor div lines does not create a blank prompt line', async ({ page }) => {
  await page.goto('/');

  const promptorText = page.locator('#promptorText');
  await page.locator('#bodyInput').evaluate((element) => {
    element.innerHTML =
      '<div>創業30周年、</div>' +
      '<span data-rewind-point="true" contenteditable="false">↩ 巻き戻しポイント</span>' +
      '<div>誠におめでとうございます。</div>';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });

  await expect(promptorText.locator('.promptor-paragraph')).toHaveCount(1);
  await expect(promptorText.locator('.promptor-rewind-point')).toHaveCount(1);
  await expect(promptorText).toHaveText('創業30周年、誠におめでとうございます。');

  const heightWithMarker = await promptorText.evaluate((element) => {
    const paragraph = element.querySelector('.promptor-paragraph');
    if (!paragraph) {
      throw new Error('Prompt paragraph was not rendered.');
    }
    return paragraph.getBoundingClientRect().height;
  });

  await page.locator('#bodyInput').evaluate((element) => {
    element.querySelector('[data-rewind-point="true"]')?.remove();
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const heightWithoutMarker = await promptorText.locator('.promptor-paragraph').evaluate(
    (element) => element.getBoundingClientRect().height,
  );

  expect(heightWithMarker).toBe(heightWithoutMarker);
});

test('paragraph rewind stops at the previous control point instead of the beginning', async ({ page }) => {
  await page.goto('/');

  const editor = page.locator('#bodyInput');
  await editor.evaluate((element) => {
    const firstSection = Array.from({ length: 12 }, (_, index) => `前半 ${index + 1}`).join('<br>');
    const secondSection = Array.from({ length: 12 }, (_, index) => `後半 ${index + 1}`).join('<br>');
    element.innerHTML =
      `${firstSection}<span data-rewind-point="true" contenteditable="false">` +
      `↩ 巻き戻しポイント</span>${secondSection}`;
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });

  await page.locator('#playButton').click();
  await expect
    .poll(async () => page.evaluate(() => document.fullscreenElement?.id ?? null))
    .toBe('promptorStage');
  await page.locator('#stagePlayButton').click();

  const stage = page.locator('#promptorStage');
  const positions = await stage.evaluate((element) => {
    const prompt = element.querySelector('#promptorText');
    const rewindPoint = prompt?.querySelector('.promptor-rewind-point');
    const paragraphs = prompt?.querySelectorAll('.promptor-paragraph');
    if (!rewindPoint || !paragraphs || paragraphs.length < 1) {
      throw new Error('Expected rewind targets were not rendered.');
    }

    const stageTop = element.getBoundingClientRect().top;
    const getTop = (target: Element) =>
      target.getBoundingClientRect().top - stageTop + element.scrollTop;
    const lineHeight = Number.parseFloat(getComputedStyle(paragraphs[0]).lineHeight);
    const readingOffset = element.clientHeight / 3;
    const initial = getTop(rewindPoint) - readingOffset + lineHeight * 2;
    const expected = Math.max(0, getTop(rewindPoint) - readingOffset);
    element.scrollTop = initial;
    element.dispatchEvent(new Event('scroll', { bubbles: true }));
    return { expected, initial };
  });

  await page.locator('#rewindParagraphButton').click();
  const actual = await stage.evaluate((element) => element.scrollTop);

  expect(actual).toBeLessThan(positions.initial);
  expect(actual).toBeGreaterThan(0);
  expect(actual).toBeCloseTo(positions.expected, 0);
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
