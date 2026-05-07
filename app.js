// ===== State =====
const state = {
  category: '',
  lines: [], // 由下到上累积，元素 { value: 0|1, moving: bool }
};

const $ = (id) => document.getElementById(id);
const CAT_NAMES = { career: '事业', love: '感情', wealth: '财运', health: '健康', decision: '抉择' };

// ===== Init =====
document.addEventListener('DOMContentLoaded', init);

function init() {
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.category = btn.dataset.cat;
      updateStartBtn();
    });
  });

  $('start-btn').addEventListener('click', goToThrow);
  $('throw-btn').addEventListener('click', throwCoins);
  $('restart-btn').addEventListener('click', restart);
}

function updateStartBtn() {
  $('start-btn').disabled = !state.category;
}

function switchStep(id) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// ===== Step 2: throw =====
function goToThrow() {
  state.lines = [];
  throwing = false;
  $('line-num').textContent = '1';
  $('throw-hint').textContent = '点击下方按钮投掷三枚铜钱';
  $('throw-btn').disabled = false;
  $('throw-btn').textContent = '摇卦';
  // reset coin transforms
  document.querySelectorAll('.coin').forEach(c => {
    c.classList.remove('tossing');
    c.style.setProperty('--final-rot', '0deg');
    c.style.transform = '';
  });
  renderLinesProgress();
  switchStep('step-throw');
}

function renderLinesProgress() {
  const c = $('lines-progress');
  c.innerHTML = '';
  const labels = ['初', '二', '三', '四', '五', '上'];
  for (let i = 0; i < 6; i++) {
    const row = document.createElement('div');
    row.className = 'line-row';
    const line = state.lines[i];
    const filled = !!line;
    row.innerHTML = `
      <span class="line-num">${labels[i]}爻</span>
      <span class="line-bar"></span>
      <span class="line-mark">${line && line.moving ? '动' : ''}</span>
    `;
    if (filled) {
      row.classList.add('filled');
      row.classList.add(line.value === 1 ? 'yang' : 'yin');
      if (line.moving) row.classList.add('moving');
    }
    c.appendChild(row);
  }
}

let throwing = false;
function throwCoins() {
  if (throwing || state.lines.length >= 6) return;
  throwing = true;
  $('throw-btn').disabled = true;
  $('throw-hint').textContent = '...';

  // 三枚铜钱：0=正面(陽,字面计2)，1=反面(素,背面计3)
  const coins = [0, 0, 0].map(() => Math.random() < 0.5 ? 0 : 1);
  const sum = coins.reduce((a, c) => a + (c === 0 ? 2 : 3), 0);
  // 6=老阴(动) 7=少阳 8=少阴 9=老阳(动)
  let line;
  if (sum === 6) line = { value: 0, moving: true };
  else if (sum === 7) line = { value: 1, moving: false };
  else if (sum === 8) line = { value: 0, moving: false };
  else line = { value: 1, moving: true };

  document.querySelectorAll('.coin').forEach((coinEl, i) => {
    const finalRot = coins[i] === 1 ? 180 : 0;
    coinEl.style.setProperty('--final-rot', `${finalRot}deg`);
    coinEl.classList.remove('tossing');
    void coinEl.offsetWidth; // 强制 reflow，重启动画
    coinEl.classList.add('tossing');
  });

  setTimeout(() => {
    state.lines.push(line);
    renderLinesProgress();

    if (state.lines.length < 6) {
      $('line-num').textContent = state.lines.length + 1;
      $('throw-hint').textContent = describeLine(line);
      $('throw-btn').disabled = false;
      throwing = false;
    } else {
      $('throw-hint').textContent = '六爻已成 · 正在解卦...';
      setTimeout(showResult, 900);
    }
  }, 1550);
}

function describeLine(line) {
  if (line.value === 1 && line.moving) return '老阳 · 阳爻动';
  if (line.value === 1) return '少阳 · 阳爻静';
  if (line.value === 0 && line.moving) return '老阴 · 阴爻动';
  return '少阴 · 阴爻静';
}

// ===== Step 3: result =====
function showResult() {
  const benCode = state.lines.map(l => l.value).join('');
  const bianCode = state.lines.map(l => l.moving ? (1 - l.value) : l.value).join('');
  const hasMoving = state.lines.some(l => l.moving);

  const benData = guaData[benCode];
  const bianData = hasMoving ? guaData[bianCode] : null;

  renderGuaLines('ben-lines', state.lines, true);
  $('ben-name').textContent = benData.name;
  $('ben-trigram').textContent = benData.trigrams;

  if (bianData) {
    $('bian-block').style.display = '';
    $('gua-arrow').style.display = '';
    const bianLines = state.lines.map(l => ({
      value: l.moving ? (1 - l.value) : l.value,
      moving: false,
    }));
    renderGuaLines('bian-lines', bianLines, false);
    $('bian-name').textContent = bianData.name;
    $('bian-trigram').textContent = bianData.trigrams;
  } else {
    $('bian-block').style.display = 'none';
    $('gua-arrow').style.display = 'none';
  }

  $('interp-essence').textContent = benData.essence;
  $('interp-cat-tag').textContent = '「' + CAT_NAMES[state.category] + '」';
  $('interp-category').textContent = benData.interpretations[state.category];

  // 动爻
  const movingIdxs = state.lines.map((l, i) => l.moving ? i : -1).filter(i => i >= 0);
  const cc = $('interp-changes');
  cc.innerHTML = '';
  if (movingIdxs.length === 0) {
    $('interp-changes-section').style.display = 'none';
  } else {
    $('interp-changes-section').style.display = '';
    movingIdxs.forEach(i => {
      const item = document.createElement('div');
      item.className = 'change-item';
      const isYang = state.lines[i].value === 1;
      item.innerHTML = `<span class="change-pos">${lineName(i, isYang)}</span>${benData.changes[i]}`;
      cc.appendChild(item);
    });
  }

  // 变卦走向
  if (bianData) {
    $('interp-bian-section').style.display = '';
    $('interp-bian').textContent = `局势由「${benData.name}」转向「${bianData.name}」：${bianData.essence}。${bianData.interpretations[state.category]}`;
  } else {
    $('interp-bian-section').style.display = 'none';
  }

  switchStep('step-result');
}

function lineName(pos, isYang) {
  const num = isYang ? '九' : '六';
  if (pos === 0) return '初' + num;
  if (pos === 5) return '上' + num;
  return num + ['', '二', '三', '四', '五', ''][pos];
}

function renderGuaLines(containerId, lines, showMoving) {
  const c = $(containerId);
  c.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const div = document.createElement('div');
    div.className = `gua-line ${lines[i].value === 1 ? 'yang' : 'yin'}`;
    if (showMoving && lines[i].moving) div.classList.add('moving');
    c.appendChild(div);
  }
}

// ===== Restart =====
function restart() {
  state.category = '';
  state.lines = [];
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  updateStartBtn();
  switchStep('step-input');
}
