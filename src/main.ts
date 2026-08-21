import '@fontsource/noto-sans-jp/400.css';
import '@fontsource/noto-sans-jp/500.css';
import '@fontsource/noto-sans-jp/700.css';
import '@fontsource/noto-sans-jp/900.css';
import './styles.css';

type Alignment = 'left' | 'center' | 'right';

type PromptDocument = {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
};

type Settings = {
  activeId: string;
  fontSize: number;
  speed: number;
  alignment: Alignment;
  lineHeight: number;
  mirror: boolean;
};

const READING_GUIDE_POSITION = 1 / 3;
const DOCUMENTS_KEY = 'open-standalone-web-promptor.documents.v1';
const SETTINGS_KEY = 'open-standalone-web-promptor.settings.v1';

const DEFAULT_BODY = `Open Standalone Web Promptor へようこそ。

このアプリはブラウザーだけで動作する、スタンドアロンのテレプロンプターです。
左側で原稿を編集し、右側で再生速度や文字サイズを調整できます。

日本語が読みやすい Noto Sans JP を同梱しています。
複数の原稿はこのブラウザーに自動保存されます。`;

const createDocument = (title = '新しい原稿', body = ''): PromptDocument => ({
  id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  title,
  body,
  updatedAt: new Date().toISOString(),
});

const defaultDocument = createDocument('はじめての原稿', DEFAULT_BODY);

const defaultSettings: Settings = {
  activeId: defaultDocument.id,
  fontSize: 42,
  speed: 46,
  alignment: 'center',
  lineHeight: 1.55,
  mirror: false,
};

const safeParse = <T>(value: string | null): T | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn('Stored promptor data could not be parsed and will be reset.', error);
    return null;
  }
};

let documents = safeParse<PromptDocument[]>(localStorage.getItem(DOCUMENTS_KEY)) ?? [defaultDocument];
let settings = { ...defaultSettings, ...(safeParse<Partial<Settings>>(localStorage.getItem(SETTINGS_KEY)) ?? {}) };

if (documents.length === 0) {
  documents = [defaultDocument];
}

if (!documents.some((document) => document.id === settings.activeId)) {
  settings.activeId = documents[0]?.id ?? defaultDocument.id;
}

const persistDocuments = () => {
  localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(documents));
};

const persistSettings = () => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('App root element was not found.');
}

app.innerHTML = `
  <main class="shell">
    <section class="workspace" aria-label="原稿編集">
      <header class="brand">
        <div>
          <p class="eyebrow">Browser-based teleprompter</p>
          <h1>Open Standalone Web Promptor</h1>
        </div>
        <button class="ghost-button" id="fullscreenButton" type="button">全画面表示</button>
      </header>

      <div class="editor-card">
        <div class="document-toolbar">
          <label class="field field-grow">
            <span>保存済み原稿</span>
            <select id="documentSelect"></select>
          </label>
          <button class="secondary-button" id="newDocumentButton" type="button">新規</button>
          <button class="danger-button" id="deleteDocumentButton" type="button">削除</button>
        </div>

        <label class="field">
          <span>タイトル</span>
          <input id="titleInput" autocomplete="off" />
        </label>

        <div class="field editor-field">
          <span>本文</span>
          <div class="editor-format-toolbar" aria-label="本文の書式設定">
            <button class="secondary-button format-button" id="boldButton" type="button">太字</button>
            <button class="secondary-button format-button" id="italicButton" type="button">斜体</button>
            <button class="secondary-button format-button" id="underlineButton" type="button">下線</button>
            <button class="secondary-button format-button" id="rewindPointButton" type="button">巻き戻しポイント</button>
            <label class="color-field">
              <span>色</span>
              <input id="textColorInput" type="color" value="#ffffff" />
            </label>
          </div>
          <div
            class="rich-editor"
            id="bodyInput"
            role="textbox"
            aria-label="本文"
            aria-multiline="true"
            contenteditable="true"
            spellcheck="false"
          ></div>
        </div>
      </div>
    </section>

    <aside class="controls" aria-label="表示設定">
      <section class="control-card">
        <h2>再生</h2>
        <div class="button-row">
          <button class="primary-button" id="playButton" type="button">再生</button>
          <button class="secondary-button" id="resetButton" type="button">先頭へ</button>
        </div>
        <div class="duration-summary">
          <span>想定再生時間</span>
          <output id="durationOutput" aria-live="polite">0分00秒</output>
          <small>現在の原稿・文字サイズ・行間・速度から算出</small>
        </div>
      </section>

      <section class="control-card">
        <h2>表示</h2>
        <label class="field">
          <span>文字サイズ <output id="fontSizeOutput"></output></span>
          <input id="fontSizeInput" type="range" min="24" max="96" step="2" />
        </label>
        <label class="field">
          <span>速度 <output id="speedOutput"></output></span>
          <input id="speedInput" type="range" min="10" max="140" step="2" />
        </label>
        <label class="field">
          <span>行間 <output id="lineHeightOutput"></output></span>
          <input id="lineHeightInput" type="range" min="1.1" max="2.2" step="0.05" />
        </label>
        <label class="field">
          <span>行揃え</span>
          <select id="alignmentInput">
            <option value="left">左</option>
            <option value="center">中央</option>
            <option value="right">右</option>
          </select>
        </label>
        <label class="toggle">
          <input id="mirrorInput" type="checkbox" />
          <span>左右反転</span>
        </label>
      </section>

      <section class="control-card hint-card">
        <h2>ローカル保存</h2>
        <p>原稿と設定はこのブラウザーの localStorage に保存されます。サーバーには送信されません。</p>
      </section>
    </aside>

    <section class="promptor-stage" id="promptorStage" aria-label="テレプロンプター表示">
      <div class="promptor-fade top"></div>
      <div class="reading-guide" id="readingGuide" aria-hidden="true"></div>
      <article class="promptor-text" id="promptorText"></article>
      <div class="promptor-fade bottom"></div>
      <div class="stage-controls" aria-label="全画面再生コントロール">
        <div class="stage-button-row">
          <button class="primary-button" id="stagePlayButton" type="button">再生</button>
          <button class="secondary-button" id="rewindLineButton" type="button">一行巻き戻し</button>
          <button class="secondary-button" id="rewindParagraphButton" type="button">一段落巻き戻し</button>
        </div>
        <div class="stage-range-grid">
          <label class="stage-field">
            <span>文字サイズ <output id="stageFontSizeOutput"></output></span>
            <input id="stageFontSizeInput" type="range" min="24" max="96" step="2" />
          </label>
          <label class="stage-field">
            <span>速度 <output id="stageSpeedOutput"></output></span>
            <input id="stageSpeedInput" type="range" min="10" max="140" step="2" />
          </label>
          <label class="stage-field">
            <span>行間 <output id="stageLineHeightOutput"></output></span>
            <input id="stageLineHeightInput" type="range" min="1.1" max="2.2" step="0.05" />
          </label>
        </div>
        <div class="stage-duration-summary">
          <span>想定再生時間</span>
          <output id="stageDurationOutput" aria-live="polite">0分00秒</output>
        </div>
      </div>
    </section>
  </main>
`;

const getElement = <T extends HTMLElement>(id: string) => {
  const element = document.querySelector<T>(`#${id}`);
  if (!element) {
    throw new Error(`Element #${id} was not found.`);
  }
  return element;
};

const documentSelect = getElement<HTMLSelectElement>('documentSelect');
const titleInput = getElement<HTMLInputElement>('titleInput');
const bodyInput = getElement<HTMLDivElement>('bodyInput');
const promptorStage = getElement<HTMLElement>('promptorStage');
const promptorText = getElement<HTMLElement>('promptorText');
const boldButton = getElement<HTMLButtonElement>('boldButton');
const italicButton = getElement<HTMLButtonElement>('italicButton');
const underlineButton = getElement<HTMLButtonElement>('underlineButton');
const rewindPointButton = getElement<HTMLButtonElement>('rewindPointButton');
const textColorInput = getElement<HTMLInputElement>('textColorInput');
const playButton = getElement<HTMLButtonElement>('playButton');
const stagePlayButton = getElement<HTMLButtonElement>('stagePlayButton');
const rewindLineButton = getElement<HTMLButtonElement>('rewindLineButton');
const rewindParagraphButton = getElement<HTMLButtonElement>('rewindParagraphButton');
const resetButton = getElement<HTMLButtonElement>('resetButton');
const fullscreenButton = getElement<HTMLButtonElement>('fullscreenButton');
const newDocumentButton = getElement<HTMLButtonElement>('newDocumentButton');
const deleteDocumentButton = getElement<HTMLButtonElement>('deleteDocumentButton');
const fontSizeInput = getElement<HTMLInputElement>('fontSizeInput');
const stageFontSizeInput = getElement<HTMLInputElement>('stageFontSizeInput');
const speedInput = getElement<HTMLInputElement>('speedInput');
const stageSpeedInput = getElement<HTMLInputElement>('stageSpeedInput');
const lineHeightInput = getElement<HTMLInputElement>('lineHeightInput');
const stageLineHeightInput = getElement<HTMLInputElement>('stageLineHeightInput');
const alignmentInput = getElement<HTMLSelectElement>('alignmentInput');
const mirrorInput = getElement<HTMLInputElement>('mirrorInput');
const fontSizeOutput = getElement<HTMLOutputElement>('fontSizeOutput');
const stageFontSizeOutput = getElement<HTMLOutputElement>('stageFontSizeOutput');
const speedOutput = getElement<HTMLOutputElement>('speedOutput');
const stageSpeedOutput = getElement<HTMLOutputElement>('stageSpeedOutput');
const lineHeightOutput = getElement<HTMLOutputElement>('lineHeightOutput');
const stageLineHeightOutput = getElement<HTMLOutputElement>('stageLineHeightOutput');
const durationOutput = getElement<HTMLOutputElement>('durationOutput');
const stageDurationOutput = getElement<HTMLOutputElement>('stageDurationOutput');

let activeDocument = documents.find((document) => document.id === settings.activeId) ?? documents[0];
let isPlaying = false;
let lastAnimationFrame = 0;
let promptScrollTop = 0;
let savedEditorRange: Range | null = null;
let durationRenderFrame: number | null = null;

const containsHtml = (value: string) => /<\/?[a-z][\s\S]*>/i.test(value);

const plainTextToHtml = (value: string) => {
  const wrapper = document.createElement('div');
  wrapper.textContent = value;
  return wrapper.innerHTML.replace(/\n/g, '<br>');
};

const sanitizeColor = (value: string | null) => {
  if (!value) {
    return '';
  }

  const probe = document.createElement('span');
  probe.style.color = value;
  return probe.style.color;
};

const sanitizeHtml = (value: string) => {
  const template = document.createElement('template');
  template.innerHTML = containsHtml(value) ? value : plainTextToHtml(value);

  const sanitizeNode = (node: Node): Node => {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent ?? '');
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return document.createDocumentFragment();
    }

    const sourceElement = node as HTMLElement;
    const tagName = sourceElement.tagName.toLowerCase();
    const fragment = document.createDocumentFragment();

    if (tagName === 'br') {
      return document.createElement('br');
    }

    if (tagName === 'span' && sourceElement.dataset.rewindPoint === 'true') {
      const rewindPoint = document.createElement('span');
      rewindPoint.dataset.rewindPoint = 'true';
      rewindPoint.contentEditable = 'false';
      rewindPoint.textContent = '↩ 巻き戻しポイント';
      return rewindPoint;
    }

    const formattingTags = new Set(['b', 'strong', 'i', 'em', 'u', 'span', 'div', 'p']);
    let targetElement: HTMLElement | null = null;

    if (tagName === 'font') {
      targetElement = document.createElement('span');
      const sanitizedColor = sanitizeColor(sourceElement.getAttribute('color'));
      if (sanitizedColor) {
        targetElement.style.color = sanitizedColor;
      }
    } else if (formattingTags.has(tagName)) {
      targetElement = document.createElement(tagName);
      if (tagName === 'span') {
        const sanitizedColor = sanitizeColor(sourceElement.style.color);
        if (sanitizedColor) {
          targetElement.style.color = sanitizedColor;
        }
      }
    }

    for (const child of sourceElement.childNodes) {
      fragment.append(sanitizeNode(child));
    }

    if (!targetElement) {
      return fragment;
    }

    targetElement.append(fragment);
    return targetElement;
  };

  const sanitizedFragment = document.createDocumentFragment();
  for (const child of template.content.childNodes) {
    sanitizedFragment.append(sanitizeNode(child));
  }

  const wrapper = document.createElement('div');
  wrapper.append(sanitizedFragment);
  return wrapper.innerHTML;
};

const getDocumentBodyHtml = () => sanitizeHtml(activeDocument.body || 'ここに原稿を入力してください。');

const getMaxPromptScrollTop = () => Math.max(0, promptorStage.scrollHeight - promptorStage.clientHeight);

const setPromptScrollTop = (top: number) => {
  promptScrollTop = Math.max(0, Math.min(top, getMaxPromptScrollTop()));
  promptorStage.scrollTop = promptScrollTop;
};

const formatDuration = (totalSeconds: number) => {
  const roundedSeconds = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;
  return `${minutes}分${String(seconds).padStart(2, '0')}秒`;
};

const renderEstimatedDuration = () => {
  const measurement = promptorText.cloneNode(true) as HTMLElement;
  measurement.removeAttribute('id');
  measurement.classList.add('duration-measurement');
  document.body.append(measurement);

  const fullscreenScrollDistance = Math.max(0, measurement.scrollHeight - window.innerHeight);
  measurement.remove();

  const formattedDuration = formatDuration(fullscreenScrollDistance / settings.speed);
  durationOutput.value = formattedDuration;
  stageDurationOutput.value = formattedDuration;
};

const scheduleEstimatedDurationRender = () => {
  if (durationRenderFrame !== null) {
    cancelAnimationFrame(durationRenderFrame);
  }

  durationRenderFrame = requestAnimationFrame(() => {
    durationRenderFrame = null;
    renderEstimatedDuration();
  });
};

const setActiveDocument = (id: string) => {
  const nextDocument = documents.find((document) => document.id === id);
  if (!nextDocument) {
    throw new Error(`Document ${id} was not found.`);
  }

  activeDocument = nextDocument;
  settings.activeId = id;
  persistSettings();
  render();
};

const renderDocumentList = () => {
  documentSelect.replaceChildren(
    ...documents.map((document) => {
      const option = new Option(document.title || '無題の原稿', document.id);
      option.selected = document.id === activeDocument.id;
      return option;
    }),
  );
};

const renderPromptText = () => {
  const template = document.createElement('template');
  template.innerHTML = getDocumentBodyHtml();
  const paragraphElements: HTMLElement[] = [];
  let currentLine: Node[] = [];
  let currentParagraphLines: Node[][] = [];

  const lineHasContent = (line: Node[]) => {
    const probe = document.createElement('div');
    probe.append(...line.map((node) => node.cloneNode(true)));
    return Boolean(probe.textContent?.trim() || probe.querySelector('b, strong, i, em, u, span:not([data-rewind-point])'));
  };

  const pushParagraph = () => {
    if (currentParagraphLines.length === 0) {
      return;
    }

    const paragraph = document.createElement('div');
    paragraph.className = 'promptor-paragraph';
    currentParagraphLines.forEach((line, index) => {
      if (index > 0) {
        paragraph.append(document.createElement('br'));
      }
      paragraph.append(...line);
    });
    paragraphElements.push(paragraph);
    currentParagraphLines = [];
  };

  const pushLine = () => {
    if (lineHasContent(currentLine)) {
      currentParagraphLines.push(currentLine);
    } else {
      pushParagraph();
    }
    currentLine = [];
  };

  const pushRewindPoint = () => {
    const rewindPoint = document.createElement('span');
    rewindPoint.className = 'promptor-rewind-point';
    rewindPoint.setAttribute('aria-hidden', 'true');
    currentLine.push(rewindPoint);
  };

  const appendInlineNodes = (nodes: Node[]) => {
    for (const node of nodes) {
      if (node instanceof HTMLElement && node.dataset.rewindPoint === 'true') {
        pushRewindPoint();
      } else if (node instanceof HTMLBRElement) {
        pushLine();
      } else {
        currentLine.push(node.cloneNode(true));
      }
    }
  };

  for (const node of template.content.childNodes) {
    if (node instanceof HTMLElement && node.dataset.rewindPoint === 'true') {
      pushRewindPoint();
    } else if (node instanceof HTMLElement && ['DIV', 'P'].includes(node.tagName)) {
      if (currentLine.length > 0) {
        pushLine();
      }
      appendInlineNodes([...node.childNodes]);
      pushLine();
    } else {
      appendInlineNodes([node]);
    }
  }

  pushLine();
  pushParagraph();

  promptorText.replaceChildren(...paragraphElements);
  promptorText.style.fontSize = `${settings.fontSize}px`;
  promptorText.style.lineHeight = `${settings.lineHeight}`;
  promptorText.style.textAlign = settings.alignment;
  promptorText.style.transform = settings.mirror ? 'scaleX(-1)' : 'none';
  scheduleEstimatedDurationRender();
};

const renderSettings = () => {
  fontSizeInput.value = String(settings.fontSize);
  stageFontSizeInput.value = String(settings.fontSize);
  speedInput.value = String(settings.speed);
  stageSpeedInput.value = String(settings.speed);
  lineHeightInput.value = String(settings.lineHeight);
  stageLineHeightInput.value = String(settings.lineHeight);
  alignmentInput.value = settings.alignment;
  mirrorInput.checked = settings.mirror;

  fontSizeOutput.value = `${settings.fontSize}px`;
  stageFontSizeOutput.value = `${settings.fontSize}px`;
  speedOutput.value = `${settings.speed}`;
  stageSpeedOutput.value = `${settings.speed}`;
  lineHeightOutput.value = settings.lineHeight.toFixed(2);
  stageLineHeightOutput.value = settings.lineHeight.toFixed(2);
  playButton.textContent = isPlaying ? '一時停止' : '再生';
  stagePlayButton.textContent = isPlaying ? '一時停止' : '再生';
};

const render = () => {
  renderDocumentList();
  titleInput.value = activeDocument.title;
  if (bodyInput.innerHTML !== getDocumentBodyHtml()) {
    bodyInput.innerHTML = getDocumentBodyHtml();
  }
  renderPromptText();
  renderSettings();
};

const updateActiveDocument = (changes: Partial<Pick<PromptDocument, 'title' | 'body'>>) => {
  activeDocument = {
    ...activeDocument,
    ...changes,
    updatedAt: new Date().toISOString(),
  };
  documents = documents.map((document) => (document.id === activeDocument.id ? activeDocument : document));
  persistDocuments();
  renderDocumentList();
  renderPromptText();
};

const stopPlayback = () => {
  isPlaying = false;
  lastAnimationFrame = 0;
  promptScrollTop = promptorStage.scrollTop;
  renderSettings();
};

const scrollStep = (timestamp: number) => {
  if (!isPlaying) {
    return;
  }

  if (lastAnimationFrame) {
    const elapsedSeconds = Math.min((timestamp - lastAnimationFrame) / 1000, 0.1);
    setPromptScrollTop(promptScrollTop + settings.speed * elapsedSeconds);
  }

  lastAnimationFrame = timestamp;

  const bottomReached = promptScrollTop >= getMaxPromptScrollTop() - 1;
  if (bottomReached) {
    stopPlayback();
    return;
  }

  requestAnimationFrame(scrollStep);
};

const getLineScrollAmount = () => settings.fontSize * settings.lineHeight;

const getElementTopInStage = (element: Element) =>
  element.getBoundingClientRect().top - promptorStage.getBoundingClientRect().top + promptorStage.scrollTop;

const rewindOneLine = () => {
  setPromptScrollTop(promptorStage.scrollTop - getLineScrollAmount());
  lastAnimationFrame = 0;
};

const rewindOneParagraph = () => {
  const rewindTargets = [
    ...promptorText.querySelectorAll<HTMLElement>('.promptor-paragraph, .promptor-rewind-point'),
  ];
  if (rewindTargets.length === 0) {
    rewindOneLine();
    return;
  }

  const readingLineTop = promptorStage.scrollTop + promptorStage.clientHeight * READING_GUIDE_POSITION;
  const rewindTargetTops = rewindTargets.map(getElementTopInStage);
  let currentTargetIndex = 0;
  for (const [index, top] of rewindTargetTops.entries()) {
    if (top < readingLineTop - getLineScrollAmount()) {
      currentTargetIndex = index;
    }
  }
  const currentTarget = rewindTargets[currentTargetIndex];
  const targetIndex = currentTarget.classList.contains('promptor-rewind-point')
    ? currentTargetIndex
    : Math.max(0, currentTargetIndex - 1);
  const targetTop =
    rewindTargetTops[targetIndex] - promptorStage.clientHeight * READING_GUIDE_POSITION;
  setPromptScrollTop(targetTop);
  lastAnimationFrame = 0;
};

const enterPromptorFullscreen = async () => {
  if (document.fullscreenElement) {
    return;
  }

  await promptorStage.requestFullscreen();
};

const startPlayback = async () => {
  await enterPromptorFullscreen();
  promptScrollTop = promptorStage.scrollTop;
  isPlaying = true;
  renderSettings();
  requestAnimationFrame(scrollStep);
};

const togglePlayback = async () => {
  if (isPlaying) {
    stopPlayback();
    return;
  }

  await startPlayback();
};

const updateFontSize = (value: string) => {
  settings.fontSize = Number(value);
  persistSettings();
  renderPromptText();
  renderSettings();
};

const updateSpeed = (value: string) => {
  settings.speed = Number(value);
  persistSettings();
  renderSettings();
  scheduleEstimatedDurationRender();
};

const updateLineHeight = (value: string) => {
  settings.lineHeight = Number(value);
  persistSettings();
  renderPromptText();
  renderSettings();
};

const saveEditorSelection = () => {
  const selection = document.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return;
  }

  const range = selection.getRangeAt(0);
  if (bodyInput.contains(range.commonAncestorContainer)) {
    savedEditorRange = range.cloneRange();
  }
};

const restoreEditorSelection = () => {
  bodyInput.focus({ preventScroll: true });
  if (!savedEditorRange) {
    return;
  }

  const selection = document.getSelection();
  if (!selection) {
    return;
  }

  selection.removeAllRanges();
  selection.addRange(savedEditorRange);
};

const saveEditorBody = () => {
  updateActiveDocument({ body: sanitizeHtml(bodyInput.innerHTML) });
  saveEditorSelection();
};

const applyEditorCommand = (command: 'bold' | 'italic' | 'underline' | 'foreColor', value?: string) => {
  restoreEditorSelection();
  const selection = document.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return;
  }

  const range = selection.getRangeAt(0);
  if (range.collapsed || !bodyInput.contains(range.commonAncestorContainer)) {
    return;
  }

  let commandValue: string | undefined;
  if (command === 'foreColor') {
    commandValue = sanitizeColor(value ?? '');
    if (!commandValue) {
      return;
    }
  }

  const commandApplied = document.execCommand(command, false, commandValue);
  if (!commandApplied) {
    console.error(`Editor command "${command}" could not be applied.`);
    return;
  }

  bodyInput.focus();
  saveEditorBody();
};

const insertRewindPoint = () => {
  restoreEditorSelection();
  const selection = document.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return;
  }

  const range = selection.getRangeAt(0);
  if (!bodyInput.contains(range.commonAncestorContainer)) {
    return;
  }

  range.collapse(false);
  let topLevelNode = range.endContainer;
  while (topLevelNode.parentNode && topLevelNode.parentNode !== bodyInput) {
    topLevelNode = topLevelNode.parentNode;
  }
  if (topLevelNode !== range.endContainer && topLevelNode.parentNode === bodyInput) {
    range.setStartAfter(topLevelNode);
    range.collapse(true);
  }

  const rewindPoint = document.createElement('span');
  rewindPoint.dataset.rewindPoint = 'true';
  rewindPoint.contentEditable = 'false';
  rewindPoint.textContent = '↩ 巻き戻しポイント';
  range.insertNode(rewindPoint);

  const nextRange = document.createRange();
  nextRange.setStartAfter(rewindPoint);
  nextRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(nextRange);
  savedEditorRange = nextRange.cloneRange();

  bodyInput.focus();
  saveEditorBody();
};

titleInput.addEventListener('input', () => {
  updateActiveDocument({ title: titleInput.value });
});

bodyInput.addEventListener('input', () => {
  saveEditorBody();
});

bodyInput.addEventListener('keyup', saveEditorSelection);

bodyInput.addEventListener('mouseup', saveEditorSelection);

bodyInput.addEventListener('focus', saveEditorSelection);

boldButton.addEventListener('mousedown', (event) => event.preventDefault());

italicButton.addEventListener('mousedown', (event) => event.preventDefault());

underlineButton.addEventListener('mousedown', (event) => event.preventDefault());

rewindPointButton.addEventListener('mousedown', (event) => event.preventDefault());

boldButton.addEventListener('click', () => applyEditorCommand('bold'));

italicButton.addEventListener('click', () => applyEditorCommand('italic'));

underlineButton.addEventListener('click', () => applyEditorCommand('underline'));

rewindPointButton.addEventListener('click', insertRewindPoint);

textColorInput.addEventListener('input', () => applyEditorCommand('foreColor', textColorInput.value));

documentSelect.addEventListener('change', () => {
  stopPlayback();
  setActiveDocument(documentSelect.value);
  setPromptScrollTop(0);
});

newDocumentButton.addEventListener('click', () => {
  const document = createDocument(`新しい原稿 ${documents.length + 1}`);
  documents = [document, ...documents];
  persistDocuments();
  setActiveDocument(document.id);
  titleInput.focus();
});

deleteDocumentButton.addEventListener('click', () => {
  if (documents.length === 1) {
    updateActiveDocument({ title: '新しい原稿', body: '' });
    setPromptScrollTop(0);
    return;
  }

  const activeIndex = documents.findIndex((document) => document.id === activeDocument.id);
  documents = documents.filter((document) => document.id !== activeDocument.id);
  persistDocuments();
  setActiveDocument(documents[Math.max(0, activeIndex - 1)].id);
  setPromptScrollTop(0);
});

fontSizeInput.addEventListener('input', () => {
  updateFontSize(fontSizeInput.value);
});

stageFontSizeInput.addEventListener('input', () => {
  updateFontSize(stageFontSizeInput.value);
});

speedInput.addEventListener('input', () => {
  updateSpeed(speedInput.value);
});

stageSpeedInput.addEventListener('input', () => {
  updateSpeed(stageSpeedInput.value);
});

lineHeightInput.addEventListener('input', () => {
  updateLineHeight(lineHeightInput.value);
});

stageLineHeightInput.addEventListener('input', () => {
  updateLineHeight(stageLineHeightInput.value);
});

alignmentInput.addEventListener('change', () => {
  settings.alignment = alignmentInput.value as Alignment;
  persistSettings();
  renderPromptText();
});

mirrorInput.addEventListener('change', () => {
  settings.mirror = mirrorInput.checked;
  persistSettings();
  renderPromptText();
});

playButton.addEventListener('click', () => {
  void togglePlayback().catch((error: unknown) => {
    console.error('Playback could not be started.', error);
  });
});

stagePlayButton.addEventListener('click', () => {
  void togglePlayback().catch((error: unknown) => {
    console.error('Playback could not be started.', error);
  });
});

resetButton.addEventListener('click', () => {
  stopPlayback();
  setPromptScrollTop(0);
});

rewindLineButton.addEventListener('click', rewindOneLine);

rewindParagraphButton.addEventListener('click', rewindOneParagraph);

promptorStage.addEventListener('scroll', () => {
  if (!isPlaying) {
    promptScrollTop = promptorStage.scrollTop;
  }
});

promptorStage.addEventListener('click', (event) => {
  if (document.fullscreenElement !== promptorStage) {
    return;
  }

  const target = event.target;
  if (target instanceof Element && target.closest('.stage-controls')) {
    return;
  }

  void togglePlayback().catch((error: unknown) => {
    console.error('Playback could not be toggled from the stage.', error);
  });
});

fullscreenButton.addEventListener('click', async () => {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }

  await enterPromptorFullscreen();
});

document.addEventListener('keydown', (event) => {
  const isEditing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
  if (isEditing) {
    return;
  }

  if (event.code === 'Space') {
    event.preventDefault();
    playButton.click();
  }

  if (event.key === 'Home') {
    resetButton.click();
  }
});

window.addEventListener('resize', scheduleEstimatedDurationRender);

document.addEventListener('fullscreenchange', scheduleEstimatedDurationRender);

void document.fonts.ready.then(scheduleEstimatedDurationRender);

persistDocuments();
persistSettings();
render();
