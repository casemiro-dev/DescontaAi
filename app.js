/* ========== MENSAGENS (ORIGINAIS PRESERVADAS) ========== */
const MESSAGES = {
    500: `Verifiquei uma condição especial para o senhor e consegui liberar uma redução no valor da sua fatura, ficando em {{valor}} por 6 meses, com renovação de fidelidade. É uma oportunidade de continuar conosco pagando menos; posso aplicar essa condição para o senhor?`,
    1000: `Consegui verificar uma condição ainda melhor para o senhor. Foi liberado o valor de {{valor}} por 6 meses, com renovação de fidelidade, garantindo uma economia na sua fatura durante esse período. Posso deixar essa condição ativa para o senhor?`,
    1500: `Fiz uma nova verificação para tentar melhorar sua condição e consegui uma oferta especial: sua fatura pode ficar em {{valor}} por 6 meses, com renovação de fidelidade. Assim, o senhor consegue reduzir seu custo mensal e continuar aproveitando o serviço. Podemos fechar dessa forma?`,
    2000: `Consegui uma condição diferenciada para o senhor após verificar as possibilidades disponíveis. Sua fatura pode ficar em {{valor}} por 6 meses, com renovação de fidelidade. É uma oportunidade de reduzir bastante o valor mensal sem precisar cancelar o serviço. O senhor gostaria que eu aplicasse essa condição?`,
    2500: `Para tentar resolver da melhor forma possível, verifiquei uma condição especial com a supervisão e consegui liberar sua fatura por {{valor}} durante 6 meses, com renovação de fidelidade. Dessa forma, o senhor consegue uma redução importante no valor e mantém seu serviço conosco. Podemos aproveitar essa condição?`,
    3000: `Fiz o possível para encontrar a melhor condição disponível e consegui uma oferta especial para sua permanência conosco: {{valor}} por 6 meses, com renovação de fidelidade. É a melhor condição que consegui liberar para reduzir seu valor mensal e evitar o cancelamento. Posso aplicar essa oferta para o senhor?`
};

/* ========== ESTADO ========== */
const state = { centavos: 0, desconto: 0 };

/* ========== TEMA ========== */
function initTheme() {
    const saved = localStorage.getItem('ofv2-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', saved || (prefersDark ? 'dark' : 'light'));
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ofv2-theme', next);
}

/* ========== PARSER BRL ========== */
function parseBRLToCentavos(text) {
    if (!text) return 0;
    let cleaned = text.trim();
    // Remove R$ e espaços
    cleaned = cleaned.replace(/R\$\s*/gi, '');
    cleaned = cleaned.replace(/\s/g, '');
    if (cleaned === '') return 0;

    let hasSep = false;
    let sepIdx = -1;
    let digits = '';
    let decDigits = '';

    for (let i = 0; i < cleaned.length; i++) {
        const ch = cleaned[i];
        if (ch >= '0' && ch <= '9') {
            if (!hasSep) digits += ch;
            else decDigits += ch;
        } else if ((ch === ',' || ch === '.') && !hasSep) {
            hasSep = true;
            sepIdx = digits.length;
        }
    }

    decDigits = decDigits.substring(0, 2);
    const intStr = digits || '0';
    const decStr = decDigits || '0';
    const padded = decStr.padEnd(2, '0');
    const totalCents = parseInt(intStr + padded, 10);
    return isNaN(totalCents) ? 0 : totalCents;
}

function formatBRL(cents) {
    const abs = Math.abs(cents);
    const reais = Math.floor(abs / 100);
    const centPart = abs % 100;
    return reais.toLocaleString('pt-BR') + ',' + centPart.toString().padStart(2, '0');
}

/* ========== VALUE DISPLAY ========== */
function updateValueDisplay() {
    const el = document.getElementById('valueDisplay');
    if (el) el.textContent = 'R$ ' + formatBRL(state.centavos);
}

/* ========== INPUT HANDLERS ========== */
function handleValorInput(e) {
    const input = e.target;
    const val = input.value;
    const cursor = input.selectionStart;

    // Filter: keep only digits, one separator (, or .), max 2 decimal digits
    let filtered = '';
    let sepSeen = false;
    let decCount = 0;
    let removedBefore = 0;

    for (let i = 0; i < val.length; i++) {
        const ch = val[i];
        if (ch >= '0' && ch <= '9') {
            filtered += ch;
        } else if ((ch === ',' || ch === '.') && !sepSeen) {
            filtered += ch;
            sepSeen = true;
        }
        // Count removed chars before cursor for position mapping
    }

    // Truncate decimals to 2 max
    const sepIdx = filtered.lastIndexOf(',');
    const sepIdx2 = filtered.lastIndexOf('.');
    const lastSep = Math.max(sepIdx, sepIdx2);
    if (lastSep >= 0) {
        const decPart = filtered.substring(lastSep + 1);
        if (decPart.length > 2) {
            filtered = filtered.substring(0, lastSep + 1) + decPart.substring(0, 2);
        }
    }

    // Map cursor position
    let newCursor = 0;
    let mapPos = 0;
    for (let i = 0; i < val.length && i < cursor; i++) {
        const ch = val[i];
        if ((ch >= '0' && ch <= '9') || ((ch === ',' || ch === '.') && !sepSeen && filtered.indexOf(ch) >= 0 && (filtered.lastIndexOf(ch) < filtered.indexOf(',') || filtered.lastIndexOf(ch) < filtered.indexOf('.')))) {
            // Keep
        }
        // Simpler: just count valid chars in filtered up to position
    }

    // Simpler cursor mapping: count valid chars in original before cursor
    let validCount = 0;
    let s2 = false;
    let d2 = 0;
    for (let i = 0; i < cursor && i < val.length; i++) {
        const ch = val[i];
        if (ch >= '0' && ch <= '9') {
            if (!s2) { validCount++; }
            else if (d2 < 2) { d2++; validCount++; }
        } else if ((ch === ',' || ch === '.') && !s2) {
            s2 = true;
            validCount++;
        }
    }

    if (filtered !== val) {
        input.value = filtered;
        input.setSelectionRange(Math.min(validCount, filtered.length), Math.min(validCount, filtered.length));
    }

    state.centavos = parseBRLToCentavos(filtered);
    updateValueDisplay();
    update();
}

function handleValorBlur(e) {
    const input = e.target;
    if (state.centavos === 0) {
        input.value = '';
    } else {
        input.value = formatBRL(state.centavos);
    }
}

function handleValorKeyDown(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        e.target.blur();
    }
}

function setValorFromText(text) {
    const cents = parseBRLToCentavos(text);
    state.centavos = cents;
    const input = document.getElementById('valorInput');
    if (input) {
        input.value = cents > 0 ? formatBRL(cents) : '';
    }
    updateValueDisplay();
    update();
}

/* ========== DESCONTO ========== */
function selecionarDesconto(cents, btn) {
    state.desconto = cents;
    document.querySelectorAll('.discount-row').forEach(row => {
        row.setAttribute('aria-checked', 'false');
    });
    btn.setAttribute('aria-checked', 'true');
    update();
}

/* ========== UPDATE ========== */
function update() {
    const finalCents = Math.max(state.centavos - state.desconto, 0);
    const originalEl = document.getElementById('resultOriginal');
    const finalEl = document.getElementById('resultFinal');
    const savingsEl = document.getElementById('resultSavings');
    const pctEl = document.getElementById('resultPct');
    const msgText = document.getElementById('messageText');
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.getElementById('msgStatusText');
    const charCount = document.getElementById('msgCharCount');

    if (originalEl) originalEl.textContent = 'R$ ' + formatBRL(state.centavos);
    if (finalEl) finalEl.textContent = 'R$ ' + formatBRL(finalCents);

    const savingsCents = state.centavos - finalCents;
    if (savingsEl) savingsEl.textContent = 'R$ ' + formatBRL(savingsCents);

    if (state.centavos > 0 && savingsCents > 0) {
        const pct = ((savingsCents / state.centavos) * 100).toFixed(1);
        if (pctEl) pctEl.textContent = pct + '%';
    } else if (pctEl) {
        pctEl.textContent = '';
    }

    // Message
    if (state.centavos > 0 && state.desconto > 0) {
        const finalFormatted = formatBRL(finalCents);
        const mensagem = MESSAGES[state.desconto].replace('{{valor}}', finalFormatted);
        if (msgText) msgText.textContent = mensagem;
        if (statusDot) statusDot.classList.add('ready');
        if (statusText) statusText.textContent = 'Pronta';
        if (charCount) charCount.textContent = mensagem.length + ' caracteres';
    } else if (state.centavos > 0 && state.desconto === 0) {
        if (msgText) msgText.textContent = 'Escolha um desconto para gerar a mensagem.';
        if (statusDot) statusDot.classList.remove('ready');
        if (statusText) statusText.textContent = 'Escolha desconto';
        if (charCount) charCount.textContent = '0 caracteres';
    } else {
        if (msgText) msgText.textContent = 'Selecione o valor e o desconto para gerar a mensagem.';
        if (statusDot) statusDot.classList.remove('ready');
        if (statusText) statusText.textContent = 'Aguardando';
        if (charCount) charCount.textContent = '0 caracteres';
    }

    validateValor();
}

/* ========== VALIDAÇÃO ========== */
function validateValor() {
    const input = document.getElementById('valorInput');
    const errorEl = document.getElementById('valorErro');
    if (!input || !errorEl) return;

    if (state.centavos <= 0) {
        input.classList.add('erro');
        input.setAttribute('aria-invalid', 'true');
        errorEl.textContent = 'Informe um valor maior que zero.';
        errorEl.classList.add('visible');
        return false;
    }

    if (state.desconto > state.centavos) {
        input.classList.add('erro');
        input.setAttribute('aria-invalid', 'true');
        errorEl.textContent = 'O desconto não pode ser maior que o valor.';
        errorEl.classList.add('visible');
        return false;
    }

    input.classList.remove('erro');
    input.setAttribute('aria-invalid', 'false');
    errorEl.classList.remove('visible');
    errorEl.textContent = '';
    return true;
}

/* ========== COPIAR ========== */
async function copiarMensagem() {
    const texto = document.getElementById('messageText').textContent;
    if (!texto || texto.startsWith('Selecione')) {
        showToast('Primeiro defina valor e desconto.');
        return;
    }
    try {
        await navigator.clipboard.writeText(texto);
        showToast(true);
        salvarHistorico();
    } catch (err) {
        const range = document.createRange();
        range.selectNodeContents(document.getElementById('messageText'));
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('copy');
        sel.removeAllRanges();
        showToast(true);
        salvarHistorico();
    }
}

/* ========== TOAST ========== */
function showToast(sucesso) {
    const t = document.getElementById('toast');
    const txt = document.getElementById('toastText');
    if (!t || !txt) return;
    if (sucesso === true) {
        txt.textContent = 'Copiado!';
    } else {
        txt.textContent = sucesso;
    }
    t.classList.add('mostrar');
    setTimeout(() => t.classList.remove('mostrar'), 2500);
}

/* ========== LIMPAR ========== */
function limparTudo() {
    state.centavos = 0;
    state.desconto = 0;
    const input = document.getElementById('valorInput');
    if (input) input.value = '';
    updateValueDisplay();
    document.querySelectorAll('.discount-row').forEach(row => {
        row.setAttribute('aria-checked', 'false');
    });
    const bubble = document.getElementById('messageBubble');
    if (bubble) bubble.querySelector('p').textContent = 'Selecione o valor e o desconto para gerar a mensagem.';
    const statusDot = document.querySelector('.status-dot');
    if (statusDot) statusDot.classList.remove('ready');
    const statusText = document.getElementById('msgStatusText');
    if (statusText) statusText.textContent = 'Aguardando';
    const charCount = document.getElementById('msgCharCount');
    if (charCount) charCount.textContent = '0 caracteres';
    update();
}

/* ========== HISTÓRICO ========== */
function salvarHistorico() {
    const texto = document.getElementById('messageText').textContent;
    if (!texto || texto.startsWith('Selecione')) return;
    const entry = {
        centavos: state.centavos,
        desconto: state.desconto,
        final: formatBRL(Math.max(state.centavos - state.desconto, 0)),
        mensagem: texto,
        timestamp: Date.now()
    };
    let hist = [];
    try { hist = JSON.parse(localStorage.getItem('ofv2-hist') || '[]'); } catch (e) { hist = []; }
    hist.unshift(entry);
    if (hist.length > 10) hist = hist.slice(0, 10);
    try { localStorage.setItem('ofv2-hist', JSON.stringify(hist)); } catch (e) {}
    renderHistorico();
}

function renderHistorico() {
    const list = document.getElementById('drawerList');
    if (!list) return;
    let hist = [];
    try { hist = JSON.parse(localStorage.getItem('ofv2-hist') || '[]'); } catch (e) { hist = []; }
    if (!hist.length) { list.innerHTML = '<div class="drawer-empty">Nenhuma oferta salva ainda.</div>'; return; }
    list.innerHTML = hist.map((item, i) => `
        <div class="drawer-item" role="listitem">
            <div class="drawer-item-info">
                <div class="drawer-item-val">${formatBRL(item.centavos)} → ${item.final}</div>
                <div class="drawer-item-desc">Desconto R$ ${formatBRL(item.desconto)} • ${new Date(item.timestamp).toLocaleString('pt-BR')}</div>
            </div>
            <div class="drawer-item-actions">
                <button class="drawer-btn reaplicar" type="button" onclick="reaplicar(${i})">Reaplicar</button>
                <button class="drawer-btn remover" type="button" onclick="removerHist(${i})">✕</button>
            </div>
        </div>
    `).join('');
}

function reaplicar(index) {
    let hist = [];
    try { hist = JSON.parse(localStorage.getItem('ofv2-hist') || '[]'); } catch (e) { return; }
    const item = hist[index];
    if (!item) return;
    state.centavos = item.centavos;
    state.desconto = item.desconto;
    updateValueDisplay();
    const input = document.getElementById('valorInput');
    if (input) input.value = item.centavos > 0 ? formatBRL(item.centavos) : '';
    document.querySelectorAll('.discount-row').forEach(row => row.setAttribute('aria-checked', 'false'));
    const btns = document.querySelectorAll('.discount-row');
    const matchIdx = [...btns].findIndex(b => parseInt(b.dataset.centavos) === item.desconto);
    if (matchIdx >= 0 && btns[matchIdx]) btns[matchIdx].setAttribute('aria-checked', 'true');
    update();
    closeDrawer();
}

function removerHist(index) {
    let hist = [];
    try { hist = JSON.parse(localStorage.getItem('ofv2-hist') || '[]'); } catch (e) { return; }
    hist.splice(index, 1);
    try { localStorage.setItem('ofv2-hist', JSON.stringify(hist)); } catch (e) {}
    renderHistorico();
}

function openDrawer() {
    document.getElementById('drawerOverlay').classList.add('open');
    document.getElementById('drawer').classList.add('open');
    renderHistorico();
}

function closeDrawer() {
    document.getElementById('drawerOverlay').classList.remove('open');
    document.getElementById('drawer').classList.remove('open');
}

/* ========== ATALHOS ========== */
function setupKeyboard() {
    document.addEventListener('keydown', function(e) {
        if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
        const num = parseInt(e.key);
        if (num >= 1 && num <= 6) {
            const btns = document.querySelectorAll('.discount-row');
            if (btns[num - 1]) { btns[num - 1].click(); btns[num - 1].focus(); }
        }
        if (e.key === 'Escape') limparTudo();
    });
}

/* ========== INICIALIZAÇÃO ========== */
document.addEventListener('DOMContentLoaded', function() {
    initTheme();

    const valorInput = document.getElementById('valorInput');
    valorInput.addEventListener('input', handleValorInput);
    valorInput.addEventListener('blur', handleValorBlur);
    valorInput.addEventListener('keydown', handleValorKeyDown);

    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('historyBtn').addEventListener('click', openDrawer);
    document.getElementById('drawerClose').addEventListener('click', closeDrawer);
    document.getElementById('drawerOverlay').addEventListener('click', closeDrawer);

    setupKeyboard();

    setTimeout(() => valorInput.focus(), 400);
    updateValueDisplay();
});
