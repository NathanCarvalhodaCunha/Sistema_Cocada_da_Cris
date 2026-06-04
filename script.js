// ==========================================
// 1. GERENCIAMENTO DE ESTADO E LOCALSTORAGE
// ==========================================
const Storage = {
    get: () => JSON.parse(localStorage.getItem('sysGestaoPro')) || { transacoes: [], produtos: [] },
    set: (data) => localStorage.setItem('sysGestaoPro', JSON.stringify(data))
};

let db = Storage.get();

// ==========================================
// 2. UTILITÁRIOS E UX
// ==========================================
const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('pt-BR');
const generateID = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Tema Claro/Escuro
const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    themeToggle.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    updateChartTheme();
});

// Navegação de Abas
document.querySelectorAll('.menu-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.add('active');
        
        const titles = { 'dashboard': 'Dashboard Financeiro', 'caixa': 'Controle de Caixa', 'estoque': 'Gerenciamento de Estoque' };
        document.getElementById('page-title').textContent = titles[btn.dataset.target];
        
        if(btn.dataset.target === 'dashboard') updateDashboard();
        if (window.innerWidth <= 768) closeMenu(); // Fecha sidebar mobile ao clicar
    });
});

document.getElementById('current-date').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

// ==========================================
// 3. MENU MOBILE (OFF-CANVAS)
// ==========================================
const sidebar = document.querySelector('.sidebar');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const closeSidebarBtn = document.getElementById('close-sidebar');
const mobileOverlay = document.getElementById('mobile-overlay');

mobileMenuBtn.addEventListener('click', () => {
    sidebar.classList.add('open');
    mobileOverlay.classList.add('active');
});

closeSidebarBtn.addEventListener('click', closeMenu);
mobileOverlay.addEventListener('click', closeMenu);

function closeMenu() {
    sidebar.classList.remove('open');
    mobileOverlay.classList.remove('active');
}

// ==========================================
// 4. MÓDULO: CAIXA
// ==========================================
const formCaixa = document.getElementById('form-caixa');
const tabelaCaixa = document.querySelector('#tabela-caixa tbody');

formCaixa.addEventListener('submit', (e) => {
    e.preventDefault();
    const transacao = {
        id: generateID(),
        descricao: document.getElementById('cx-desc').value,
        valor: parseFloat(document.getElementById('cx-valor').value),
        tipo: document.getElementById('cx-tipo').value,
        categoria: document.getElementById('cx-cat').value,
        data: new Date().toISOString()
    };
    db.transacoes.push(transacao);
    Storage.set(db);
    renderCaixa();
    formCaixa.reset();
    showToast('Movimentação registrada!');
    updateDashboard();
});

function renderCaixa() {
    tabelaCaixa.innerHTML = '';
    const sorted = [...db.transacoes].sort((a, b) => new Date(b.data) - new Date(a.data));
    
    sorted.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDate(t.data)}</td>
            <td>${t.descricao}</td>
            <td style="text-transform: capitalize;">${t.categoria}</td>
            <td><span class="badge ${t.tipo}">${t.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span></td>
            <td style="color: ${t.tipo === 'entrada' ? 'var(--success)' : 'var(--danger)'}">${t.tipo === 'saida' ? '-' : ''}${formatCurrency(t.valor)}</td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="deleteTransacao('${t.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tabelaCaixa.appendChild(tr);
    });
}

window.deleteTransacao = (id) => {
    if(confirm('Excluir esta movimentação?')) {
        db.transacoes = db.transacoes.filter(t => t.id !== id);
        Storage.set(db);
        renderCaixa();
        updateDashboard();
        showToast('Movimentação excluída', 'error');
    }
}

// ==========================================
// 5. MÓDULO: ESTOQUE E INTEGRAÇÃO (Venda)
// ==========================================
const formEstoque = document.getElementById('form-estoque');
const tabelaEstoque = document.querySelector('#tabela-estoque tbody');

formEstoque.addEventListener('submit', (e) => {
    e.preventDefault();
    const produto = {
        id: generateID(),
        nome: document.getElementById('est-nome').value,
        qtd: parseInt(document.getElementById('est-qtd').value),
        custo: parseFloat(document.getElementById('est-custo').value),
        venda: parseFloat(document.getElementById('est-venda').value),
        data: new Date().toISOString()
    };
    db.produtos.push(produto);
    Storage.set(db);
    renderEstoque();
    formEstoque.reset();
    showToast('Produto cadastrado com sucesso!');
    updateDashboard();
});

function renderEstoque() {
    tabelaEstoque.innerHTML = '';
    db.produtos.forEach(p => {
        const isLowStock = p.qtd <= 5;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${p.nome}</strong></td>
            <td><span class="badge ${isLowStock ? 'low-stock' : 'ok-stock'}">${p.qtd} un</span></td>
            <td>${formatCurrency(p.custo)}</td>
            <td>${formatCurrency(p.venda)}</td>
            <td>${p.qtd === 0 ? '<span class="badge low-stock">Esgotado</span>' : 'Disponível'}</td>
            <td>
                <button class="btn btn-sm btn-action" onclick="openVendaModal('${p.id}')" ${p.qtd === 0 ? 'disabled' : ''}><i class="fa-solid fa-cart-shopping"></i> Vender</button>
                <button class="btn btn-sm btn-danger" onclick="deleteProduto('${p.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tabelaEstoque.appendChild(tr);
    });
}

window.deleteProduto = (id) => {
    if(confirm('Excluir este produto permanentemente?')) {
        db.produtos = db.produtos.filter(p => p.id !== id);
        Storage.set(db);
        renderEstoque();
        updateDashboard();
        showToast('Produto excluído', 'error');
    }
}

// Modal de Venda (Integração Estoque -> Caixa)
const modalVenda = document.getElementById('modal-venda');
const formVenda = document.getElementById('form-venda');

window.openVendaModal = (id) => {
    const p = db.produtos.find(x => x.id === id);
    document.getElementById('venda-produto-nome').textContent = p.nome;
    document.getElementById('venda-produto-id').value = p.id;
    document.getElementById('venda-estoque-max').textContent = p.qtd;
    
    const inputQtd = document.getElementById('venda-qtd');
    inputQtd.max = p.qtd;
    inputQtd.value = 1;
    
    const inputTotal = document.getElementById('venda-total');
    inputTotal.value = p.venda.toFixed(2);
    
    inputQtd.oninput = () => { inputTotal.value = (inputQtd.value * p.venda).toFixed(2); };
    
    modalVenda.style.display = 'flex';
}

document.querySelector('.close-modal').onclick = () => modalVenda.style.display = 'none';

formVenda.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('venda-produto-id').value;
    const qtdVendida = parseInt(document.getElementById('venda-qtd').value);
    const p = db.produtos.find(x => x.id === id);
    
    p.qtd -= qtdVendida;
    const valorTotal = qtdVendida * p.venda;
    
    db.transacoes.push({
        id: generateID(),
        descricao: `Venda: ${p.nome} (${qtdVendida}x)`,
        valor: valorTotal,
        tipo: 'entrada',
        categoria: 'venda',
        data: new Date().toISOString()
    });
    
    Storage.set(db);
    renderEstoque();
    renderCaixa();
    updateDashboard();
    modalVenda.style.display = 'none';
    showToast(`Venda registrada! +${formatCurrency(valorTotal)} no caixa.`);
});

// ==========================================
// 6. DASHBOARD E GRÁFICOS (Chart.js)
// ==========================================
let cashflowChartInstance = null;

function updateDashboard() {
    const currentMonth = new Date().getMonth();
    
    let entradas = 0, saidas = 0;
    db.transacoes.forEach(t => {
        const isCurrentMonth = new Date(t.data).getMonth() === currentMonth;
        if(isCurrentMonth) {
            if(t.tipo === 'entrada') entradas += t.valor;
            if(t.tipo === 'saida') saidas += t.valor;
        }
    });
    const saldo = entradas - saidas;
    const valorEstoque = db.produtos.reduce((acc, p) => acc + (p.qtd * p.custo), 0);

    document.getElementById('dash-entradas').textContent = formatCurrency(entradas);
    document.getElementById('dash-saidas').textContent = formatCurrency(saidas);
    document.getElementById('dash-saldo').textContent = formatCurrency(saldo);
    document.getElementById('dash-valor-estoque').textContent = formatCurrency(valorEstoque);
    
    updateChart(entradas, saidas);
}

function updateChart(entradas, saidas) {
    const ctx = document.getElementById('cashflowChart').getContext('2d');
    const isDark = document.body.classList.contains('dark-mode');
    const textColor = isDark ? '#9ca3af' : '#6b7280';
    
    if (cashflowChartInstance) cashflowChartInstance.destroy();
    
    cashflowChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Entradas', 'Saídas'],
            datasets: [{
                data: [entradas, saidas],
                backgroundColor: ['#10b981', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: textColor } }
            }
        }
    });
}

function updateChartTheme() {
    if(document.getElementById('dashboard').classList.contains('active')) {
        updateDashboard();
    }
}

// ==========================================
// 7. BACKUP / EXPORTAÇÃO
// ==========================================
document.getElementById('export-btn').addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `gestaopro_backup_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
    showToast('Backup gerado com sucesso!');
});

// ==========================================
// INICIALIZAÇÃO
// ==========================================
renderCaixa();
renderEstoque();
updateDashboard();