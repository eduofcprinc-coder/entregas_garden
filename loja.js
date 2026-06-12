// Usa as exatas mesmas credenciais do seu script2.js para acessar o mesmo banco
const firebaseConfig = {
    apiKey: "AIzaSyDEgeBgRodDq4FjqegvlW89EJLtVvw-NxU",
    authDomain: "entregas-garden.firebaseapp.com",
    projectId: "entregas-garden",
    storageBucket: "entregas-garden.firebasestorage.app",
    messagingSenderId: "508011847412",
    appId: "1:508011847412:web:0bf66d6b0d0d756de448a1"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const pedidosRef = db.collection("pedidos");

let pedidosLoja = [];

// Escuta as alterações no banco em TEMPO REAL
document.addEventListener('DOMContentLoaded', () => {
	const dataInput = document.getElementById('loja-data');
    if (dataInput) {
        const hoje = new Date();
        const dia = String(hoje.getDate()).padStart(2, '0');
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const ano = hoje.getFullYear();
        dataInput.value = `${ano}-${mes}-${dia}`;
    }
	
    pedidosRef.orderBy("id", "asc").onSnapshot((snapshot) => {
        pedidosLoja = [];
        snapshot.forEach((doc) => {
            pedidosLoja.push({ firebaseId: doc.id, ...doc.data() });
        });
        renderizarLoja(); 
    });
});

function renderizarLoja() {
    const lista = document.getElementById('lista-pedidos-loja');
    lista.innerHTML = '';

    let totalVal = 0;
    let totalEntregas = 0;

	const dataSelecionada = document.getElementById('loja-data').value;
    const pedidosDoDia = pedidosLoja.filter(p => {
        const hoje = new Date();
        const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
        const dataPedido = p.data || hojeStr;
        return dataPedido === dataSelecionada;
    });

    if (pedidosDoDia.length === 0) { // <-- Mude pedidosLoja.length para pedidosDoDia.length
        lista.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Nenhuma entrega encontrada para esta data.</p>';
        document.getElementById('loja-total-valor').innerText = 'R$ 0,00';
        document.getElementById('loja-total-entregas').innerText = '0';
        return;
	}

    pedidosDoDia.forEach(p => {
        // Puxa a gorjeta se existir, senão considera 0
        const gorjeta = p.gorjeta || 0;
        const valorFinal = p.valor + gorjeta;

        totalVal += valorFinal;
        totalEntregas++;

        const appCores = {
            'Ifood': '#ea1d2c',
            'Delivery Much': '#ff7a00',
            'ComprAqui': '#0097ff',
			'Whatsapp': '#2e7e4e',
			'Pedidos 10': '#ffe412',
			'Aiq Fome': '#620c84',
            'Outros': '#888'
        };

        const item = document.createElement('div');
        item.className = `pedido-item ${p.entregue ? 'entregue' : ''}`;
        
        item.innerHTML = `
            <div class="pedido-info">
                <div class="pedido-endereco">${p.endereco}</div>
                <div class="pedido-detalhes">
                    <span class="badge" style="background-color: ${appCores[p.app] || '#888'}">${p.app}</span>
                    <span>🛵 R$ ${p.valor.toFixed(2).replace('.', ',')}</span>
                    ${gorjeta > 0 ? `<span style="color: var(--accent); font-weight: bold;">+ Gorjeta: R$ ${gorjeta.toFixed(2).replace('.', ',')}</span>` : ''}
                    <span>💳 ${p.pagamento}</span>
                </div>
            </div>
            
        `;
        lista.appendChild(item);
    });

    document.getElementById('loja-total-valor').innerText = `R$ ${totalVal.toFixed(2).replace('.', ',')}`;
    document.getElementById('loja-total-entregas').innerText = totalEntregas;
}

// Função para a loja adicionar a gorjeta
async function adicionarGorjeta(firebaseId) {
    const valorPrompt = prompt("Digite o valor da gorjeta (ex: 5.50):");
    
    if (!valorPrompt) return; // Se cancelar, não faz nada
    
    // Troca vírgula por ponto para o sistema entender números quebrados
    const valorGorjeta = parseFloat(valorPrompt.replace(',', '.'));
    
    if (isNaN(valorGorjeta) || valorGorjeta <= 0) {
        alert("Valor inválido. Tente novamente.");
        return;
    }
    
    const pedido = pedidosLoja.find(p => p.firebaseId === firebaseId);
    const gorjetaAtual = pedido.gorjeta || 0; // Se já tiver gorjeta, ele soma
    
    try {
        await db.collection("pedidos").doc(firebaseId).update({
            gorjeta: gorjetaAtual + valorGorjeta
        });
    } catch (e) {
        console.error("Erro ao adicionar gorjeta:", e);
        alert("Erro de conexão ao adicionar a gorjeta.");
    }
}

// Ação do Botão Pagar
// --- FUNÇÕES DE PAGAMENTO (MODAL PIX) ---

function realizarPagamento() {
    // 1. Pega o valor total atual que está aparecendo na tela da loja
    const totalFormatado = document.getElementById('loja-total-valor').innerText;
    
    // 2. Verifica se tem entregas para pagar (se não for R$ 0,00)
    if(totalFormatado === 'R$ 0,00' || totalFormatado === '0,00') {
        // Você pode até criar um modal de erro depois, mas por enquanto:
        alert("Não há entregas para serem pagas hoje.");
        return;
    }

    // 3. Joga o valor formatado para dentro do modal
    document.getElementById('modal-valor-total').innerText = totalFormatado;
    
    // 4. Exibe o modal na tela
    document.getElementById('modal-pagamento').style.display = 'flex';
}

function fecharModalPagamento() {
    // Esconde o modal
    document.getElementById('modal-pagamento').style.display = 'none';
}

function copiarChavePix(botaoClicado) {
    // Pega o input que tem a chave PIX
    const inputChave = document.getElementById('chave-pix');
    
    // Seleciona o texto dentro dele
    inputChave.select();
    inputChave.setSelectionRange(0, 99999); // Necessário para funcionar bem em celulares

    // Copia para a área de transferência (Clipboard)
    navigator.clipboard.writeText(inputChave.value).then(() => {
        
        // Efeito visual bem legal: muda o texto do botão para dar feedback
        const textoOriginal = botaoClicado.innerHTML;
        botaoClicado.innerHTML = '<span class="material-icons-round">check</span> COPIADO!';
        botaoClicado.style.backgroundColor = '#4caf50'; // Fica verde escuro
        botaoClicado.style.color = 'white';

        // Volta ao normal depois de 2 segundos
        setTimeout(() => {
            botaoClicado.innerHTML = textoOriginal;
            botaoClicado.style.backgroundColor = 'var(--accent)';
            botaoClicado.style.color = '#000';
        }, 2000);

    }).catch(err => {
        console.error("Erro ao copiar PIX: ", err);
        alert("Erro ao copiar. Tente copiar manualmente.");
    });
}

// ==========================================
// CONTROLES DO MENU LATERAL E MODO CLARO/ESCURO
// ==========================================

function toggleMenu() {
    const menu = document.getElementById('side-menu');
    const overlay = document.getElementById('menu-overlay');
    
    if (menu.classList.contains('open')) {
        // Fechar menu
        menu.classList.remove('open');
        overlay.style.opacity = '0';
        setTimeout(() => overlay.style.display = 'none', 300);
    } else {
        // Abrir menu
        overlay.style.display = 'block';
        setTimeout(() => overlay.style.opacity = '1', 10);
        menu.classList.add('open');
    }
}

function toggleTema() {
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');
    const themeText = document.getElementById('theme-text');
    
    body.classList.toggle('light-mode');
    
    if (body.classList.contains('light-mode')) {
        localStorage.setItem('tema', 'claro');
        themeIcon.innerText = 'dark_mode';
        themeText.innerText = 'Modo Escuro';
    } else {
        localStorage.setItem('tema', 'escuro');
        themeIcon.innerText = 'light_mode';
        themeText.innerText = 'Modo Claro';
    }
}

// Abre o Resumo Mensal (Visão Loja)
function abrirRelatorios() {
    toggleMenu(); // Esconde o menu lateral

    const hoje = new Date();
    const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
    const anoAtual = hoje.getFullYear();
    const diaAtual = String(hoje.getDate()).padStart(2, '0');
    
    const filtroMes = `${anoAtual}-${mesAtual}`; 
    const hojeStr = `${anoAtual}-${mesAtual}-${diaAtual}`;

    let totalEntregasMes = 0;
    let totalValorMes = 0;

    // ATENÇÃO AQUI: Usa 'pedidosLoja' no painel da loja
    pedidosLoja.forEach(p => {
        const dataPedido = p.data || hojeStr;

        if (dataPedido.startsWith(filtroMes)) {
            totalEntregasMes++;
            totalValorMes += parseFloat(p.valor || 0); 
        }
    });

    // Atualiza o HTML
    document.getElementById('relatorio-mes-texto').innerText = `${mesAtual}/${anoAtual}`;
    document.getElementById('relatorio-total-entregas').innerText = totalEntregasMes;
    document.getElementById('relatorio-total-valor').innerText = `R$ ${totalValorMes.toFixed(2).replace('.', ',')}`;

    document.getElementById('modal-relatorios').style.display = 'flex';
}


// Fecha o Resumo Mensal
function fecharModalRelatorios() {
    document.getElementById('modal-relatorios').style.display = 'none';
}


// Verifica o tema salvo no celular quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
    const temaSalvo = localStorage.getItem('tema');
    if (temaSalvo === 'claro') {
        document.body.classList.add('light-mode');
        const themeIcon = document.getElementById('theme-icon');
        const themeText = document.getElementById('theme-text');
        if(themeIcon && themeText) {
            themeIcon.innerText = 'dark_mode';
            themeText.innerText = 'Modo Escuro';
        }
    }
});
