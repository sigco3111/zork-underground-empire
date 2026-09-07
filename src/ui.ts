import type { ActionResult, GameState, ItemDef, RoomDef } from './types.ts';
import { compassBearing, compassJournalText } from './compass.ts';
import './item-selection.css';

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export const touchHint = (value: string) => value
  .replace(/\bPress L\b/g, '랜턴 켜기').replace(/\bpress L\b/g, '랜턴 켜기')
  .replace(/\bPress E\b/g, '상호작용 탭').replace(/\bpress E\b/g, '상호작용 탭')
  .replace(/\bwith E\b/g, '상호작용 사용').replace(/\bthen E\b/g, '그 다음 상호작용 탭')
  .replace(/\bDodge with Q\b/g, '회피 탭').replace(/\bparry with R\b/g, '가드를 눌러 막기')
  .replace(/\bStrike with F\b/g, '공격 탭');
const icon = `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 2 25 15 38 20 25 25 20 38 15 25 2 20 15 15Z" fill="none" stroke="currentColor"/><path d="m20 9 4 11-4 11-4-11Z" fill="currentColor"/></svg>`;

export class GameUI {
  root: HTMLDivElement;
  canvas: HTMLCanvasElement;
  title: HTMLDivElement;
  overlay: HTMLDivElement;
  hud: HTMLDivElement;
  currentPanel = '';
  onAction: (action: string) => void = () => {};
  onChoice: (action: string) => void = () => {};
  onSetting: (key: string, value: string) => void = () => {};
  private toastUntil = 0;
  private noticeUntil = 0;
  private titleUntil = 0;
  private lastHealth = -1;
  private lastStamina = -1;
  private toastNode: HTMLElement;
  private locationNode: HTMLElement;
  private lastPrompt = '';
  private deathMessage = '';
  private lastLookMode = 'inactive';
  private lookHintUntil = 0;
  private touchMode = false;
  private currentHint = '';
  constructor() {
    this.root = document.querySelector<HTMLDivElement>('#app')!;
    this.root.innerHTML = `
      <canvas id="world" aria-label="Zork 3D 게임 월드" tabindex="0"></canvas>
      <div class="loading-screen" id="loading"><div class="loading-mark">${icon}</div><p>THE GREAT UNDERGROUND EMPIRE</p><div class="loading-track"><i id="loading-bar"></i></div><span id="loading-label">탐험 준비 중</span></div>
      <div id="title-screen" class="title-screen hidden">
        <div class="title-top"><span class="studio-mark">${icon}</span><span>지하 세계를 향한 모험</span></div>
        <div class="title-content"><div class="title-rule"></div><h1>ZORK</h1><p class="title-subtitle">THE GREAT UNDERGROUND EMPIRE</p><p class="title-description">하얀 집. 황동 랜턴.<br>당신의 발 아래에 온 세상이 숨 쉬고 있다.</p>
          <div class="title-actions"><button class="primary-button hidden" data-action="continue" id="continue-button">탐험 계속하기 <span>→</span></button><button class="primary-button" data-action="start" id="start-button">탐험 시작 <span>↗</span></button><button class="quiet-button" data-action="settings">설정 및 조작</button></div>
          <p class="touch-only title-touch-note">왼쪽 스틱으로 이동하세요.<br>오른쪽을 쓸어내려 주위를 둘러보세요.</p>
        </div><div class="title-footer"><span>1인칭 액션 어드벤처</span><button data-action="credits">이 어댑테이션에 대하여</button><span id="title-input-mode">키보드 + 마우스</span></div>
      </div>
      <div id="hud" class="hud hidden">
        <div class="top-left"><span class="small-mark">${icon}</span><div><span id="region">THE WHITE HOUSE</span><small id="room-name">집 서쪽</small></div></div>
        <div class="compass" aria-label="나침반"><div id="compass-track"></div><i></i></div>
        <div class="top-right"><button class="hud-button" data-action="journal"><kbd>J</kbd> 일지</button><button class="hud-button touch-only" data-action="inventory">배낭</button><button class="hud-button" data-action="pause"><span>Ⅱ</span> 일시정지</button></div>
        <div class="objective" id="objective"><span id="objective-label">탐험</span><p id="objective-text"></p></div>
        <div id="room-reveal" class="room-reveal hidden"><span id="room-reveal-subtitle"></span><h2 id="room-reveal-name"></h2><i></i></div>
        <div class="crosshair" id="crosshair"><i></i><b></b></div>
        <button type="button" id="interact-prompt" class="interact-prompt hidden" data-action="interact"><span class="prompt-key" id="prompt-key">E</span><span class="prompt-copy"><strong id="prompt-name"></strong><small id="prompt-detail"></small></span></button>
        <div class="enemy-hud hidden" id="enemy-hud"><span id="enemy-intent"></span><div class="enemy-name" id="enemy-name"></div><div class="enemy-bar"><i id="enemy-health"></i></div><small id="combat-help">좌클릭 / F 공격 · 우클릭 / R 방어 · Q 회피</small></div>
        <div class="player-status"><div class="status-icon">${icon}</div><div class="status-bars"><div class="health-track"><i id="health-bar"></i></div><div class="stamina-track"><i id="stamina-bar"></i></div><span id="health-label">100</span></div></div>
        <div class="equipment"><span id="lamp-status" class="lamp-status"><span>♧</span><kbd>L</kbd> 랜턴</span><span id="treasure-count">0 / 19</span><button data-action="inventory"><kbd>TAB</kbd> 배낭</button></div>
        <div id="toast" class="toast hidden" role="status"><span id="toast-title"></span><p id="toast-text"></p></div>
        <div class="tutorial" id="tutorial"><span><kbd>W A S D</kbd> 이동</span><span><kbd>SHIFT</kbd> 달리기</span><span><kbd>E</kbd> 상호작용</span><span><kbd>ESC</kbd> 일시정지</span></div>
        <div id="look-hint" class="look-hint hidden">클릭하여 둘러보기 · Esc로 일시정지</div>
        <div class="save-indicator" id="save-indicator">◇ 탐험 기록 저장됨</div>
      </div>
      <div id="overlay" class="overlay hidden" role="dialog" aria-modal="true"></div>
      <div id="transition" class="transition"></div>
      <input type="file" id="import-save" accept="application/json,.json" hidden />
      <div id="fatal-error" class="fatal-error hidden"></div>`;
    this.canvas = document.querySelector('#world')!; this.title = document.querySelector('#title-screen')!;
    this.overlay = document.querySelector('#overlay')!; this.hud = document.querySelector('#hud')!;
    this.toastNode = document.querySelector('#toast')!; this.locationNode = document.querySelector('#room-reveal')!;
    this.root.addEventListener('click', event => {
      const choice = (event.target as HTMLElement).closest<HTMLElement>('[data-choice]');
      if (choice) { this.onChoice(choice.dataset.choice!); return; }
      const action = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (action) this.onAction(action.dataset.action!);
    });
    this.root.addEventListener('input', event => {
      const target = event.target as HTMLInputElement;
      if (target.dataset.setting) this.onSetting(target.dataset.setting, target.type === 'checkbox' ? String(target.checked) : target.value);
      if (target.type === 'range') { const output = target.closest('label')?.querySelector('output'); if (output) output.textContent = target.value; }
    });
    this.overlay.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      event.stopPropagation();
      const focusable = Array.from(this.overlay.querySelectorAll<HTMLElement>('button, input, select, a[href], [tabindex="0"]')).filter(el => !el.hasAttribute('disabled'));
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { last.focus(); event.preventDefault(); }
      else if (!event.shiftKey && document.activeElement === last) { first.focus(); event.preventDefault(); }
    });
  }
  setTouchMode(enabled: boolean) {
    this.touchMode = enabled;
    document.documentElement.classList.toggle('touch-mode', enabled);
    this.text('title-input-mode', enabled ? '터치 조작' : '키보드 + 마우스');
    this.text('prompt-key', enabled ? '탭' : 'E');
    this.text('combat-help', enabled ? '공격 · 가드 누르기 · 회피' : '좌클릭 / F 공격 · 우클릭 / R 방어 · Q 회피');
    this.text('map-guidance', enabled ? '드래그하여 지도를 탐험하세요.' : '스크롤하여 지도를 탐험하세요.');
    document.querySelector('#tutorial')!.innerHTML = enabled
      ? '<span>왼쪽 스틱으로 이동</span><span>오른쪽을 쓸어내려 둘러보기</span>'
      : '<span><kbd>W A S D</kbd> 이동</span><span><kbd>SHIFT</kbd> 달리기</span><span><kbd>E</kbd> 상호작용</span><span><kbd>ESC</kbd> 일시정지</span>';
    if (enabled) document.querySelector('#look-hint')!.classList.add('hidden');
    if (this.currentPanel === 'settings') this.overlay.querySelector('.controls-guide')!.innerHTML = this.controlsGuide();
    const hint = this.overlay.querySelector('.hint-text');
    if (hint) hint.textContent = enabled ? touchHint(this.currentHint) : this.currentHint;
  }
  private controlsGuide() {
    const controls = this.touchMode
      ? '<dt>이동 / 달리기</dt><dd>왼쪽 스틱 / 더 멀리 밀기</dd><dt>주위 둘러보기</dt><dd>오른쪽을 쓸어내리기</dd><dt>상호작용</dt><dd>안내 표시나 동작 버튼을 탭</dd><dt>공격</dt><dd>공격 버튼</dd><dt>방어 / 패링</dt><dd>가드 누르기</dd><dt>회피</dt><dd>회피 + 스틱 방향</dd><dt>점프 / 랜턴</dt><dd>점프 / 랜턴</dd><dt>일지 / 지도</dt><dd>일지, 그 다음 지도</dd><dt>배낭 / 일시정지</dt><dd>상단 버튼 사용</dd>'
      : '<dt>이동 / 둘러보기</dt><dd>WASD / 마우스</dd><dt>달리기 / 점프</dt><dd>Shift / Space</dd><dt>상호작용</dt><dd>E</dd><dt>공격</dt><dd>좌클릭 또는 F</dd><dt>방어 / 패링</dt><dd>우클릭 또는 R</dd><dt>회피</dt><dd>Q + 방향키</dd><dt>랜턴</dt><dd>L</dd><dt>일지 / 지도</dt><dd>J / M</dd><dt>배낭 / 일시정지</dt><dd>Tab / Esc</dd>';
    return `<h3>기본 조작</h3><dl>${controls}</dl><p>일격이 닿기 직전에 패링하면 적이 휘청거립니다. 공격을 회피로 빠져나간 뒤, 적이 휘청할 때 공격을 노리세요.</p><p>도구는 그에 맞는 곳에서 사용하세요. 탐험하고, 살펴보며, 막히면 일지가 길을 열어줍니다.</p><p class="muted">${this.touchMode ? '스틱 중앙에서 멀리 밀어달라면 더 빨리 달립니다. 손가락을 떼면 멈춥니다. 화면 오른쪽 어디든 쓸어내려 시점을 돌릴 수 있으며, 쓸어내리기는 공격으로 인식되지 않습니다. 장비가 갖춰지면 전투와 랜턴 조작 안내가 표시됩니다.' : '마우스 시점은 플레이 내내 켜진 상태입니다. 커서가 시야 가장자리에 닿으면 그 상태로 두고 계속 회전하세요. 방향키로도 카메라를 돌릴 수 있습니다. Esc로 일시정지하면 마우스가 풀립니다.'}</p>`;
  }
  loading(progress: number, label = '탐험 준비 중') { (document.querySelector('#loading-bar') as HTMLElement).style.width = `${progress * 100}%`; this.text('loading-label', label); }
  ready(hasSave: boolean) { document.querySelector('#loading')!.classList.add('hidden'); this.showTitle(hasSave); }
  showTitle(hasSave: boolean) {
    this.close(); this.title.classList.remove('hidden'); this.hud.classList.add('hidden');
    this.canvas.inert = true;
    document.querySelector('#continue-button')!.classList.toggle('hidden', !hasSave);
    const start = document.querySelector('#start-button')!; start.classList.toggle('secondary-button', hasSave);
    start.innerHTML = hasSave ? '새 탐험 <span>↗</span>' : '탐험 시작 <span>↗</span>';
    this.title.querySelector<HTMLButtonElement>(hasSave ? '#continue-button' : '#start-button')?.focus({ preventScroll: true });
  }
  play() { this.title.classList.add('hidden'); this.hud.classList.remove('hidden'); this.close(); }
  open(panel: string, body: string, title = '') {
    this.currentPanel = panel; this.overlay.classList.remove('hidden');
    this.overlay.innerHTML = `<div class="panel panel-${panel}">${title ? `<header class="panel-header"><div><span class="eyebrow">THE GREAT UNDERGROUND EMPIRE</span><h2>${escapeHtml(title)}</h2></div><button class="close-button" data-action="close" aria-label="닫기">×</button></header>` : ''}${body}</div><div id="panel-notice" class="panel-notice hidden" role="status"></div>`;
    const heading = this.overlay.querySelector('h2');
    if (heading) { heading.id = 'panel-heading'; this.overlay.setAttribute('aria-labelledby', heading.id); }
    this.title.inert = true; this.hud.inert = true; this.canvas.inert = true;
    this.overlay.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
  }
  close() { this.currentPanel = ''; this.overlay.classList.add('hidden'); this.overlay.innerHTML = ''; this.overlay.removeAttribute('aria-labelledby'); this.title.inert = false; this.hud.inert = false; this.canvas.inert = false; }
  pause(room: RoomDef) {
    this.open('pause', `<div class="pause-place"><span>탐험 일시정지</span><h2>${escapeHtml(room.name)}</h2></div><div class="pause-actions"><button class="primary-button" data-action="resume">모험으로 돌아가기 <span>→</span></button><button data-action="journal">일지 및 지도</button><button data-action="settings">설정 및 조작</button><button data-action="export">탐험 기록 내보내기</button><button data-action="import">탐험 기록 불러오기</button><button class="muted" data-action="title">저장하고 타이틀로</button></div><small class="pause-note">진행 상황은 자동으로 저장됩니다. 탐험 기록은 이 기기에 그대로 보관됩니다.</small>`);
  }
  settings(state: GameState) {
    const s = state.settings;
    this.open('settings', `<div class="settings-columns"><div class="settings-list"><label>소리 <output>${Math.round(s.volume * 100)}</output><input aria-label="소리 크기" data-setting="volume" type="range" min="0" max="100" value="${s.volume * 100}"/></label><label>시선 감도 <output>${s.sensitivity}</output><input aria-label="시선 감도" data-setting="sensitivity" type="range" min="0.4" max="2" step="0.1" value="${s.sensitivity}"/></label><label>화각 <output>${s.fov}</output><input aria-label="화각" data-setting="fov" type="range" min="60" max="100" step="1" value="${s.fov}"/></label><label>그래픽<select aria-label="그래픽 품질" data-setting="quality"><option value="high" ${s.quality === 'high' ? 'selected' : ''}>고품질 · 영화 같은 조명</option><option value="balanced" ${s.quality === 'balanced' ? 'selected' : ''}>균형 · 부드러운 성능</option></select></label><label>전투 난이도<select aria-label="전투 난이도" data-setting="difficulty"><option value="explorer" ${s.difficulty === 'explorer' ? 'selected' : ''}>탐험가 · 너그러운 타이밍, 낮은 피해</option><option value="adventurer" ${!s.difficulty || s.difficulty === 'adventurer' ? 'selected' : ''}>모험자 · 침착하고 읽기 쉬운 전투</option><option value="veteran" ${s.difficulty === 'veteran' ? 'selected' : ''}>베테랑 · 더 빠른 공격, 더 가혹한 실수</option></select></label><label class="toggle-label"><input data-setting="motion" type="checkbox" ${s.motion ? 'checked' : ''}/> 카메라 움직임</label></div><div class="controls-guide">${this.controlsGuide()}</div></div>`, '설정 및 조작');
  }
  choice(result: ActionResult) {
    if (result.itemSelection) { this.itemChoice(result); return; }
    const prompt = result.prompt ? `<form class="spoken-action"><label for="spoken-words">${escapeHtml(result.prompt.label)}</label><div><input id="spoken-words" name="words" type="text" inputmode="text" maxlength="60" autocomplete="off" autocorrect="off" autocapitalize="none" enterkeyhint="go" spellcheck="false" required /><button class="primary-button" type="submit">${escapeHtml(result.prompt.submit)} <span>→</span></button></div></form>` : '';
    this.open('interaction', `<span class="eyebrow">살펴보기</span><h2>${escapeHtml(result.title ?? '자세히 보기')}</h2><p class="interaction-text">${escapeHtml(result.message)}</p><div class="choice-list">${(result.choices ?? []).map(c => `<button data-choice="${escapeHtml(c.action)}">${escapeHtml(c.label)}<span>→</span></button>`).join('')}</div>${prompt}<button class="text-button" data-action="close">떠나기</button>`);
    if (result.prompt) {
      const action = result.prompt.action, field = this.overlay.querySelector<HTMLInputElement>('#spoken-words')!;
      this.overlay.querySelector('form')!.addEventListener('submit', event => { event.preventDefault(); if (field.value.trim()) this.onChoice(`${action}:${field.value.trim()}`); });
      if (!this.touchMode) requestAnimationFrame(() => field.focus());
      else field.addEventListener('focus', () => requestAnimationFrame(() => field.scrollIntoView({ block: 'nearest' })));
    }
  }
  private itemChoice(result: ActionResult) {
    let panel = this.overlay.querySelector<HTMLElement>('.item-selection-panel');
    const continuing = !!panel;
    if (!panel) {
      this.open('interaction', `<div class="item-selection-intro"><span class="eyebrow">살펴보기</span><h2 tabindex="-1"></h2><p class="interaction-text item-selection-description"></p></div><div class="item-selection-heading"><h3 id="item-selection-label">아이템을 선택하세요</h3><span class="item-selection-count"></span></div><p class="item-selection-feedback" role="status" aria-live="polite" aria-atomic="true"></p><div class="item-selection-list" role="group" aria-labelledby="item-selection-label"></div><footer class="item-selection-footer"><button type="button" class="text-button" data-action="close">떠나기</button></footer>`);
      panel = this.overlay.querySelector<HTMLElement>('.panel-interaction')!;
      panel.classList.add('item-selection-panel');
      // Start on the scene heading without suggesting one carried item.
      const heading = panel.querySelector<HTMLHeadingElement>('h2')!;
      heading.addEventListener('keydown', event => {
        if (event.key !== 'Tab') return;
        const buttons = panel!.querySelectorAll<HTMLButtonElement>('button');
        (event.shiftKey ? buttons[buttons.length - 1] : buttons[0])?.focus();
        event.preventDefault(); event.stopPropagation();
      });
    }
    const heading = panel.querySelector<HTMLHeadingElement>('h2')!;
    heading.textContent = result.title ?? '자세히 보기';
    panel.querySelector<HTMLElement>('.item-selection-description')!.textContent = result.message;
    const choices = result.choices ?? [];
    panel.querySelector<HTMLElement>('.item-selection-count')!.textContent = choices.length ? `소지품 ${choices.length}개` : '';

    const list = panel.querySelector<HTMLElement>('.item-selection-list')!;
    const signature = JSON.stringify(choices);
    // Keep the actual buttons on retries so browser focus and list scroll survive.
    if (list.dataset.choices !== signature) {
      const scrollTop = list.scrollTop;
      const focused = document.activeElement instanceof HTMLElement && list.contains(document.activeElement)
        ? document.activeElement.closest<HTMLButtonElement>('[data-choice]')?.dataset.choice : undefined;
      list.innerHTML = choices.length
        ? choices.map(choice => `<button type="button" data-choice="${escapeHtml(choice.action)}" aria-label="${escapeHtml(choice.label)} 사용"><span>${escapeHtml(choice.label)}</span><span class="item-selection-arrow" aria-hidden="true">→</span></button>`).join('')
        : '<p class="item-selection-empty">배낭이 비어 있습니다.</p>';
      list.dataset.choices = signature; list.scrollTop = scrollTop;
      if (focused) {
        const replacement = Array.from(list.querySelectorAll<HTMLButtonElement>('[data-choice]')).find(button => button.dataset.choice === focused);
        (replacement ?? heading).focus({ preventScroll: true });
      }
    }
    panel.querySelector<HTMLElement>('.item-selection-feedback')!.textContent = result.feedback ?? '';
    if (!continuing) heading.focus({ preventScroll: true });
    else {
      const focused = document.activeElement;
      if (focused instanceof HTMLButtonElement && list.contains(focused)) {
        // Feedback can shorten the list. Reveal only the clipped part of the retry target.
        const viewport = list.getBoundingClientRect(), bounds = focused.getBoundingClientRect();
        const top = viewport.top + list.clientTop + 2, bottom = viewport.top + list.clientTop + list.clientHeight - 2;
        if (bounds.top < top) list.scrollTop += bounds.top - top;
        else if (bounds.bottom > bottom) list.scrollTop += bounds.bottom - bottom;
      }
    }
  }
  journal(state: GameState, rooms: Record<string, RoomDef>, items: Record<string, ItemDef>, objective: { title: string; text: string }, tab = 'journal', selectedItem = '', hintText = '', hintLevel = 0) {
    this.currentHint = hintText;
    const tabs = `<nav class="journal-tabs">${[['journal', '일지'], ['map', '지도'], ['inventory', '배낭']].map(([id, label]) => `<button data-action="${id}" class="${id === tab ? 'selected' : ''}">${label}</button>`).join('')}<span>${state.deposited.length} / 19 보물을 보관함에 보관</span></nav>`;
    let body = '';
    if (tab === 'journal') {
      const hintLabel = hintLevel >= 3 ? '정답을 다시 보기' : hintLevel === 2 ? '정답 보기' : hintLevel === 1 ? '좀 더 명확한 힌트' : '살짝 힌트 주세요';
      body = `<div class="journal-content"><aside class="current-lead"><span class="eyebrow">당신의 관찰</span><h3>${escapeHtml(objective.title)}</h3><p>${escapeHtml(objective.text)}</p><button class="text-button hint-button" data-action="hint">${hintLabel} <span>↗</span></button>${hintText ? `<p class="hint-text">${escapeHtml(this.touchMode ? touchHint(hintText) : hintText)}</p>` : ''}<div class="journal-stats"><span>${state.visited.length}곳 발견</span><span>${Math.floor(state.playTime / 60)}분 동안 탐험</span></div></aside><div class="journal-entries">${[...state.journal].reverse().map(e => `<article><span>◇</span><div><h3>${escapeHtml(e.title)}</h3><p>${escapeHtml(compassJournalText(e))}</p></div></article>`).join('') || '<p>탐험을 이어가면 여기에 관찰 기록이 쌓입니다.</p>'}</div></div>`;
    } else if (tab === 'map') {
      const visited = Object.values(rooms).filter(r => state.visited.includes(r.id));
      const nextIds = new Set(visited.flatMap(r => r.exits.filter(e => !e.requires || state.flags[e.requires]).map(e => e.to)));
      const list = Object.values(rooms).filter(r => state.visited.includes(r.id) || nextIds.has(r.id)), xs = list.map(r => r.map[0]), ys = list.map(r => r.map[1]);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
      const mapWidth = Math.max(650, (maxX - minX) * 200 + 220), mapHeight = Math.max(280, (maxY - minY) * 96 + 140);
      const p = (r: RoomDef) => [(mapWidth - (maxX - minX) * 200) / 2 + (r.map[0] - minX) * 200, 60 + (r.map[1] - minY) * 96];
      const edges = new Set<string>();
      const lines = list.flatMap(room => room.exits.map(exit => {
        if (!rooms[exit.to] || !state.visited.includes(room.id) || exit.requires && !state.flags[exit.requires]) return '';
        const key = [room.id, exit.to].sort().join(':'); if (edges.has(key)) return ''; edges.add(key);
        const a = p(room), b = p(rooms[exit.to]); return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;
      })).join('');
      const nodes = list.map(r => {
        const [x, y] = p(r), known = state.visited.includes(r.id), words = (known ? r.name : '미지의 통로').split(' '), lines = [''];
        for (const word of words) { if ((lines[lines.length - 1] + ' ' + word).trim().length > 16) lines.push(word); else lines[lines.length - 1] = (lines[lines.length - 1] + ' ' + word).trim(); }
        return `<g class="${r.id === state.room ? 'map-current' : known ? '' : 'map-unknown'}"><circle cx="${x}" cy="${y}" r="${r.id === state.room ? 8 : 5}"/><text x="${x}" y="${y + 30}" text-anchor="middle">${lines.map((line, i) => `<tspan x="${x}" dy="${i ? 24 : 0}">${escapeHtml(line)}</tspan>`).join('')}</text></g>`;
      }).join('');
      const camps = ['living_room', 'round_room', 'temple', 'dam'].filter(id => state.flags[`rest_${id}`]);
      body = `<div class="map-container" tabindex="0" role="region" aria-label="스크롤 가능한 탐험 지도"><svg class="world-map" viewBox="0 0 ${mapWidth} ${mapHeight}" style="min-width:${mapWidth}px;height:${mapHeight}px;max-height:none" role="img" aria-label="당신이 발견한 장소들의 지도"><g class="map-lines">${lines}</g>${nodes}</svg></div><div class="map-footer"><p><span id="map-guidance">${this.touchMode ? '드래그하여 지도를 탐험하세요.' : '스크롤하여 지도를 탐험하세요.'}</span> <span class="gold">◇</span> 현재 위치</p><div><span>안전한 곳으로 돌아가기</span>${camps.map(id => `<button data-action="camp:${id}">${escapeHtml(rooms[id].name)}</button>`).join('') || '<small>쉼터를 발견하면 빠른 이동이 잠금 해제됩니다.</small>'}</div></div>`;
    } else {
      const owned = state.inventory.filter(id => items[id]); const selected = items[selectedItem] ?? items[owned[0]];
      body = `<div class="satchel-content"><div class="item-list">${owned.map(id => `<button data-action="inspect:${escapeHtml(id)}" class="${selected?.id === id ? 'selected' : ''}"><span class="item-glyph">${items[id].treasure ? '◇' : '·'}</span><span>${escapeHtml(items[id].name)}</span>${items[id].treasure ? '<small>보물</small>' : ''}</button>`).join('') || '<p>배낭이 비어 있습니다. 우체통부터 살펴보는 것이 좋겠습니다.</p>'}</div><div class="item-description">${selected ? `<span class="eyebrow">${selected.treasure ? '제국의 보물' : '배낭 속 아이템'}</span><div class="item-seal">${selected.treasure ? '◇' : icon}</div><h3>${escapeHtml(selected.name)}</h3><p>${escapeHtml(selected.description)}</p><small>장소나 생물을 살펴 사용 할 아이템을 선택하세요.</small>` : '<span class="empty-satchel">모험은 빈 주머니에서 시작됩니다.</span>'}</div></div>`;
    }
    this.open(tab, tabs + body, '탐험 일지');
    if (tab === 'map') requestAnimationFrame(() => {
      const container = this.overlay.querySelector<HTMLElement>('.map-container'), current = this.overlay.querySelector<SVGGraphicsElement>('.map-current');
      if (!container || !current) return;
      const box = current.getBoundingClientRect(), viewport = container.getBoundingClientRect();
      container.scrollTop += box.y - viewport.y - viewport.height / 2 + box.height / 2;
      container.scrollLeft += box.x - viewport.x - viewport.width / 2 + box.width / 2;
    });
  }
  credits() {
    this.open('credits', `<div class="credits-body"><h3>위대한 지하 제국으로의 귀환</h3><p>Zork I의 보물과 무덤의 이야기를 3D로 압축 재구성한 어댑테이션. 새로운 환경, 1인칭 전투, 19개의 되찾을 수 있는 보물, 그리고 고대의 지도가 담겨 있습니다.</p><p>Marc Blank, Dave Lebling, Bruce Daniels, Tim Anderson의 Zork, 그리고 2025년 마이크로소프트가 공개한 MIT 라이선스 Zork I 소스에 기반한 작품입니다. 본 게임은 독립적인 어댑테이션입니다.</p><p>세계 지형, 생물, 인터페이스, 사운드는 본 게임을 위해 제작되었습니다. 포토그래메트리 표면 자산은 Poly Haven의 CC0 자료입니다.</p><a href="https://github.com/emollick/zork-underground-empire" target="_blank" rel="noreferrer">GitHub에서 본 어댑테이션 보기 ↗</a><a href="./licenses/ADAPTATION-MIT.txt" target="_blank" rel="noreferrer">어댑테이션 소스 라이선스 ↗</a><a href="https://github.com/historicalsource/zork1" target="_blank" rel="noreferrer">원본 Zork I 소스 ↗</a><a href="./licenses/ZORK-MIT.txt" target="_blank" rel="noreferrer">Zork 소스 라이선스 ↗</a><a href="https://polyhaven.com/license" target="_blank" rel="noreferrer">Poly Haven 자산 라이선스 ↗</a></div>`, '이 모험에 대하여');
  }
  death(room: RoomDef, message?: string) {
    if (message !== undefined) this.deathMessage = message;
    this.open('death', `<span class="eyebrow">제국이 한 명을 더 거두었습니다</span><h2>당신은 죽었습니다.</h2>${this.deathMessage ? `<p>${escapeHtml(this.deathMessage)}</p>` : ''}<p>당신의 발견과 소지품은 안전하게 보존됩니다.</p><button class="primary-button" data-action="retry">${escapeHtml(room.name)}(으)로 돌아가기 <span>→</span></button><button class="text-button" data-action="settings">난이도 조절</button>`);
  }
  ending(state: GameState) {
    this.open('ending', `<div class="ending-mark">${icon}</div><span class="eyebrow">위대한 지하 제국의 정복자</span><h2>무덤의<br>내부</h2><p>무덤으로 들어서자, 문이 저항할 수 없이 뒤로 닫힙니다.</p><p class="ending-description">당신은 ZORK: 위대한 지하 제국을 정복했습니다.</p><div class="ending-stats"><div><strong>19</strong><span>돌아온 보물</span></div><div><strong>${state.visited.length}</strong><span>발견한 장소</span></div><div><strong>${Math.floor(state.playTime / 60)}</strong><span>밑에서 보낸 시간(분)</span></div></div><button class="primary-button" data-action="resume">탐험 계속하기 <span>→</span></button><button class="text-button" data-action="export">탐험 기록 보관하기</button>`);
  }
  toast(message: string, title = '', duration = 6) {
    const notice = this.overlay.querySelector<HTMLElement>('#panel-notice');
    if (this.currentPanel && notice) {
      notice.innerHTML = `${title ? `<strong>${escapeHtml(title)}</strong>` : ''}<p>${escapeHtml(message)}</p>`;
      notice.classList.remove('hidden'); this.noticeUntil = performance.now() + duration * 1000;
      return;
    }
    this.text('toast-title', title); this.text('toast-text', message); this.toastNode.classList.remove('hidden'); this.toastUntil = performance.now() + duration * 1000;
  }
  location(room: RoomDef, reveal = true) {
    this.text('region', room.subtitle); this.text('room-name', room.name); this.text('room-reveal-subtitle', room.subtitle); this.text('room-reveal-name', room.name);
    if (!reveal) { this.locationNode.classList.add('hidden'); return; }
    this.locationNode.classList.remove('hidden'); this.titleUntil = performance.now() + 4100;
  }
  objective(value: { title: string; text: string }) { this.text('objective-label', value.title); this.text('objective-text', value.text); }
  prompt(name: string, detail = '') { const key = name + detail; if (key === this.lastPrompt) return; this.lastPrompt = key; document.querySelector('#interact-prompt')!.classList.toggle('hidden', !name); document.querySelector('#crosshair')!.classList.toggle('targeted', !!name); this.text('prompt-name', name); this.text('prompt-detail', detail); }
  enemy(name: string, fraction: number, intent: string, show: boolean) { document.querySelector('#enemy-hud')!.classList.toggle('hidden', !show); this.text('enemy-name', name); this.text('enemy-intent', intent); (document.querySelector('#enemy-health') as HTMLElement).style.width = `${Math.max(0, fraction * 100)}%`; document.querySelector('#enemy-intent')!.classList.toggle('danger', intent.includes('Incoming')); }
  update(state: GameState, lookMode: 'captured' | 'free' | 'inactive' | 'touch', active: boolean) {
    if (this.lastHealth !== state.health) { this.lastHealth = state.health; (document.querySelector('#health-bar') as HTMLElement).style.width = `${Math.max(0, state.health)}%`; this.text('health-label', String(Math.ceil(state.health))); }
    if (Math.abs(this.lastStamina - state.stamina) > 0.8) { this.lastStamina = state.stamina; (document.querySelector('#stamina-bar') as HTMLElement).style.width = `${state.stamina}%`; }
    document.querySelector('#lamp-status')!.classList.toggle('lit', state.lantern);
    document.querySelector('#lamp-status')!.classList.toggle('hidden', !state.inventory.includes('lantern'));
    this.text('treasure-count', `${state.deposited.length} / 19`);
    const fighting = !document.querySelector('#enemy-hud')!.classList.contains('hidden');
    if (lookMode !== this.lastLookMode) {
      this.lastLookMode = lookMode; this.lookHintUntil = performance.now() + 7000;
      this.text('look-hint', lookMode === 'free' ? '마우스를 움직여 둘러보기 · 가장자리에 가까이 두면 계속 돕니다 · Esc로 일시정지' : '클릭하여 둘러보기 · Esc로 일시정지');
    }
    document.querySelector('#look-hint')!.classList.toggle('hidden', this.touchMode || lookMode === 'touch' || lookMode === 'captured' || !active || fighting || lookMode === 'free' && performance.now() > this.lookHintUntil);
    const degrees = compassBearing(state.room, state.yaw);
    const marks = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];
    const track = document.querySelector('#compass-track')!;
    track.innerHTML = marks.map((label, i) => { let offset = i * 45 - degrees; if (offset > 180) offset -= 360; if (offset < -180) offset += 360; return Math.abs(offset) <= 80 ? `<span style="left:calc(50% + ${offset * 2}px);opacity:${1 - Math.abs(offset) / 95}">${label}</span>` : ''; }).join('');
    if (performance.now() > this.toastUntil) this.toastNode.classList.add('hidden');
    if (performance.now() > this.noticeUntil) this.overlay.querySelector('#panel-notice')?.classList.add('hidden');
    if (performance.now() > this.titleUntil) this.locationNode.classList.add('hidden');
    document.querySelector('#tutorial')!.classList.toggle('hidden', state.playTime > (this.touchMode ? 15 : 65) || state.visited.length > 3 || fighting);
  }
  saveIndicator() { const el = document.querySelector('#save-indicator')!; el.classList.add('show'); window.setTimeout(() => el.classList.remove('show'), 1800); }
  fade(dark: boolean) { document.querySelector('#transition')!.classList.toggle('dark', dark); }
  error(message: string) { const el = document.querySelector('#fatal-error')!; el.classList.remove('hidden'); el.innerHTML = `<h2>탐험을 시작할 수 없습니다.</h2><p>${escapeHtml(message)}</p><button>다시 시도</button>`; el.querySelector('button')!.addEventListener('click', () => location.reload()); }
  private text(id: string, value: string) { const el = document.getElementById(id); if (el && el.textContent !== value) el.textContent = value; }
}
