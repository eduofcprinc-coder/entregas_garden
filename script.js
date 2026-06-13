// ATENÇÃO: COLE AQUI AS SUAS CREDENCIAIS REAIS DO FIREBASE NO LUGAR DESSAS ABAIXO!
const firebaseConfig = {
    apiKey: "AIzaSyDEgeBgRodDq4FjqegvlW89EJLtVvw-NxU",
    authDomain: "entregas-garden.firebaseapp.com",
    projectId: "entregas-garden",
    storageBucket: "entregas-garden.firebasestorage.app",
    messagingSenderId: "508011847412",
    appId: "1:508011847412:web:0bf66d6b0d0d756de448a1"
 };
 
 // 1. Inicializando o Firebase (Sintaxe Compat)
 firebase.initializeApp(firebaseConfig);
 const db = firebase.firestore();
 const pedidosRef = db.collection("pedidos");
 const horasRef = db.collection("horas_bar");
 let horasTrabalhadas = [];



 
 // 2. Variáveis Globais
 let pedidos = [];
 let imagemGeradaURL = null;
 let pedidoEmEdicaoId = null;
 
 // 3. Escutando o banco de dados em tempo real
 document.addEventListener('DOMContentLoaded', () => {
     const dataInput = document.getElementById('data-relatorio');
     if (dataInput) {
         const hoje = new Date();
         const dia = String(hoje.getDate()).padStart(2, '0');
         const mes = String(hoje.getMonth() + 1).padStart(2, '0');
         const ano = hoje.getFullYear();
         dataInput.value = `${ano}-${mes}-${dia}`;
	 }
	 pedidosRef.orderBy("id", "asc").onSnapshot((snapshot) => {
         pedidos = [];
         snapshot.forEach((doc) => {
             pedidos.push({ firebaseId: doc.id, ...doc.data() });
         });
         renderizar(); // Atualiza a tela automaticamente
     });
	horasRef.orderBy("id", "asc").onSnapshot((snapshot) => {
        horasTrabalhadas = [];
        snapshot.forEach((doc) => {
            horasTrabalhadas.push({ firebaseId: doc.id, ...doc.data() });
        });
        renderizarHorasMotoboy(); // Atualiza a lista do modal se estiver aberto
    });
	 
 });
 
 // --- FUNÇÕES DE BANCO DE DADOS ---
 
 async function adicionarPedido() {
     const endereco = document.getElementById('endereco').value;
     const valor = parseFloat(document.getElementById('valor').value);
     const pagamento = document.getElementById('pagamento').value;
     const appOrigem = document.getElementById('app-origem').value;
	 const dataSelecionada = document.getElementById('data-relatorio').value;
	 
     if (!endereco || isNaN(valor)) {
         alert("Preencha o endereço e o valor corretamente.");
         return;
     }
 
     const agora = new Date();
     const horaCadastro = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
 
     const pedido = {
         id: Date.now(),
		 data: dataSelecionada,
         endereco: endereco,
         valor: valor,
		 gorjeta: 0,
         pagamento: pagamento,
         app: appOrigem,
         entregue: false,
         horaSaida: horaCadastro,
         horaEntrega: null
     };
 
     try {
         await pedidosRef.add(pedido);
         document.getElementById('endereco').value = '';
         document.getElementById('valor').value = '';
         document.getElementById('endereco').focus();
     } catch (e) {
         console.error("Erro ao adicionar:", e);
         alert("Erro ao salvar o pedido na nuvem.");
     }
 }
 
 async function toggleStatus(firebaseId) {
     const pedido = pedidos.find(p => p.firebaseId === firebaseId);
     if (pedido) {
         let novaHoraEntrega = pedido.horaEntrega;
         if (!pedido.entregue && !pedido.horaEntrega) {
             novaHoraEntrega = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
         }
         
         await db.collection("pedidos").doc(firebaseId).update({
             entregue: !pedido.entregue,
             horaEntrega: novaHoraEntrega
         });
     }
 }
 
 async function excluir(firebaseId) {
     if (confirm('Deseja excluir este pedido permanentemente?')) {
         await db.collection("pedidos").doc(firebaseId).delete();
     }
 }
 
 async function limparTudo() {
     if(confirm('Tem certeza que deseja APAGAR TODOS os pedidos de hoje do banco de dados?')) {
         for (let p of pedidos) {
             await db.collection("pedidos").doc(p.firebaseId).delete();
         }
     }
 }
 
 // --- FUNÇÃO DE RENDERIZAÇÃO NA TELA ---
 
 function renderizar() {
     const lista = document.getElementById('lista-pedidos');
     lista.innerHTML = '';
 
     let totalVal = 0;
     let totalEntregas = 0;

	 const dataSelecionada = document.getElementById('data-relatorio').value;
     
     const pedidosDoDia = pedidos.filter(p => {
         // Se o pedido for de dias atrás e não tiver data, tratamos como de hoje para não dar erro
         const hoje = new Date();
         const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
         const dataPedido = p.data || hojeStr;
         
         return dataPedido === dataSelecionada;
     });
 
     pedidosDoDia.forEach(p => {
         totalVal += p.valor;
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
                     <span>💰 R$ ${p.valor.toFixed(2).replace('.', ',')}</span>
                     <span>💳 ${p.pagamento}</span>
                 </div>
                 <div class="pedido-hora">
                     <span>🕒 Saída: ${p.horaSaida}</span>
                     ${p.horaEntrega ? `<span>✅ Entregue: ${p.horaEntrega}</span>` : ''}
                 </div>
             </div>
             <div class="pedido-acoes">
                 <button class="btn-action-small btn-status" onclick="toggleStatus('${p.firebaseId}')">
                     <span class="material-icons-round">${p.entregue ? 'close' : 'check'}</span>
                 </button>
                 <button class="btn-action-small btn-edit" onclick="abrirEditor('${p.firebaseId}')">
                     <span class="material-icons-round">edit</span>
                 </button>
                 <button class="btn-action-small btn-delete" onclick="excluir('${p.firebaseId}')">
                     <span class="material-icons-round">delete</span>
                 </button>
             </div>
         `;
         lista.appendChild(item);
     });
 
     document.getElementById('total-valor').innerText = totalVal.toFixed(2).replace('.', ',');
     document.getElementById('total-entregas').innerText = totalEntregas;
 }
 
 // --- FUNÇÕES DE EDIÇÃO ---
 
 function abrirEditor(firebaseId) {
     const pedido = pedidos.find(p => p.firebaseId === firebaseId);
     if (!pedido) return;
 
     pedidoEmEdicaoId = firebaseId;
     document.getElementById('edit-endereco').value = pedido.endereco;
     document.getElementById('edit-valor').value = pedido.valor;
     document.getElementById('edit-hora-saida').value = pedido.horaSaida;
     document.getElementById('edit-hora-entrega').value = pedido.horaEntrega || '';
     document.getElementById('edit-pagamento').value = pedido.pagamento;
     document.getElementById('edit-app').value = pedido.app;
 
     document.getElementById('editor-modal').style.display = 'flex';
 }
 
 function fecharEditor() {
     document.getElementById('editor-modal').style.display = 'none';
     pedidoEmEdicaoId = null;
 }
 
 async function salvarEdicao() {
     if (!pedidoEmEdicaoId) return;
 
     const endereco = document.getElementById('edit-endereco').value;
     const valor = parseFloat(document.getElementById('edit-valor').value);
     const horaSaida = document.getElementById('edit-hora-saida').value;
     const horaEntrega = document.getElementById('edit-hora-entrega').value;
     const pagamento = document.getElementById('edit-pagamento').value;
     const appOrigem = document.getElementById('edit-app').value;
 
     if (!endereco || isNaN(valor)) {
         alert("Preencha corretamente.");
         return;
     }
 
     await db.collection("pedidos").doc(pedidoEmEdicaoId).update({
         endereco: endereco,
         valor: valor,
         horaSaida: horaSaida,
         horaEntrega: horaEntrega || null,
         pagamento: pagamento,
         app: appOrigem
     });
 
     fecharEditor();
 }
 
 // --- FUNÇÕES DE IMAGEM (HTML2CANVAS) ---
 
 function gerarImagem() {
     const botoesAcoes = document.querySelectorAll('.pedido-acoes');
     const header = document.querySelector('header');
     const form = document.querySelector('.form-section');
     const botoesFinais = document.querySelector('.action-buttons');
     const mainContent = document.body;
 
     botoesAcoes.forEach(b => b.style.display = 'none');
     header.style.display = 'none';
     form.style.display = 'none';
     botoesFinais.style.display = 'none';
 
     mainContent.style.padding = '20px';
     mainContent.style.background = '#1e1e1e'; 
 
     const modal = document.getElementById('modal');
     const container = document.getElementById('img-container');
     const btnShare = document.getElementById('btn-share');
 
     html2canvas(mainContent, { 
         backgroundColor: '#1e1e1e',
         scale: 2 
     }).then(canvas => {
         botoesAcoes.forEach(b => b.style.display = 'flex');
         header.style.display = 'block';
         form.style.display = 'block';
         botoesFinais.style.display = 'flex';
         mainContent.style.padding = '15px';
         mainContent.style.paddingBottom = '100px';
         mainContent.style.background = '#121212';
 
         container.innerHTML = '';
         imagemGeradaURL = canvas.toDataURL('image/png');
         
         const img = new Image();
         img.src = imagemGeradaURL;
         container.appendChild(img);
         
         if (navigator.share) {
              btnShare.style.display = "block";
         } else {
              btnShare.style.display = "none";
         }
 
         modal.style.display = 'flex';
     }).catch(err => {
         alert("Erro ao gerar imagem.");
         console.error(err);
     });
 }
 
 function fecharModal() {
     document.getElementById('modal').style.display = 'none';
     imagemGeradaURL = null;
     document.getElementById('img-container').innerHTML = '';
 }
 
 function baixarImagem() {
     if (!imagemGeradaURL) return;
     const link = document.createElement('a');
     link.download = `relatorio-${Date.now()}.png`;
     link.href = imagemGeradaURL;
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
 }
 
 async function compartilharImagem() {
     if (!imagemGeradaURL || !navigator.share) return;
     try {
         const blob = await (await fetch(imagemGeradaURL)).blob();
         const file = new File([blob], "relatorio.png", { type: "image/png" });
         await navigator.share({
             files: [file],
             title: 'Resumo Entregas',
             text: 'Segue meu relatório de hoje.'
         });
     } catch (err) {
         console.error("Erro ao compartilhar", err);
     }
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

// Abre o Resumo Mensal (Visão Motoboy)
function abrirRelatorios() {
    toggleMenu(); // Esconde o menu lateral

    const hoje = new Date();
    const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
    const anoAtual = hoje.getFullYear();
    const diaAtual = String(hoje.getDate()).padStart(2, '0');
    
    const filtroMes = `${anoAtual}-${mesAtual}`; 
    // Data de "segurança" para pedidos antigos que não tinham data salva
    const hojeStr = `${anoAtual}-${mesAtual}-${diaAtual}`;

    let totalEntregasMes = 0;
    let totalValorMes = 0;

    pedidos.forEach(p => {
        // TRUQUE: Se o pedido for antigo e não tiver data, o sistema usa a data de hoje para não ignorá-lo
        const dataPedido = p.data || hojeStr;

        if (dataPedido.startsWith(filtroMes)) {
            totalEntregasMes++;
            // Garante que o valor seja somado como número (caso tenha bugado no banco)
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

// --- FUNÇÕES DE HORAS BAR (MOTOBOY) ---

function abrirModalHoras() {
    toggleMenu(); // Fecha o menu lateral
    
    // Puxa a mesma data que está selecionada na tela inicial
    const dataPrincipal = document.getElementById('data-relatorio').value;
    document.getElementById('horas-data').value = dataPrincipal;
    
    // Limpa os campos
    document.getElementById('horas-qtd').value = '';
    document.getElementById('horas-valor').value = '';
    document.getElementById('horas-total-display').innerText = 'R$ 0,00';
    
    renderizarHorasMotoboy();
    document.getElementById('modal-horas').style.display = 'flex';
}

function fecharModalHoras() {
    document.getElementById('modal-horas').style.display = 'none';
}

function calcularTotalHoras() {
    const tempoStr = document.getElementById('horas-qtd').value; // Ex: "05:05"
    const valor = parseFloat(document.getElementById('horas-valor').value) || 0;
    
    if (tempoStr && valor) {
        const partes = tempoStr.split(':');
        const horasDecimal = parseInt(partes[0]) + (parseInt(partes[1]) / 60);
        document.getElementById('horas-total-display').innerText = `R$ ${(horasDecimal * valor).toFixed(2).replace('.', ',')}`;
    } else {
        document.getElementById('horas-total-display').innerText = 'R$ 0,00';
    }
}

async function adicionarHoras() {
    const data = document.getElementById('horas-data').value;
    const tempoStr = document.getElementById('horas-qtd').value;
    const valorHora = parseFloat(document.getElementById('horas-valor').value);

    if (!data || !tempoStr || !valorHora) {
        alert("Preencha todos os campos corretamente.");
        return;
    }

    // Converte o relógio (ex: 05:05) para número quebrado (ex: 5.08) para fazer a conta
    const partes = tempoStr.split(':');
    const horasInteiras = parseInt(partes[0]);
    const minutosInteiros = parseInt(partes[1]);
    const horasDecimal = horasInteiras + (minutosInteiros / 60);

    const registro = {
        id: Date.now(),
        data: data,
        horas: tempoStr,          // Salva "05:05" para mostrar bonito na tela
        horasDecimal: horasDecimal, // Salva "5.083" escondido para somar o dinheiro
        valorHora: valorHora,
        total: horasDecimal * valorHora
    };

    try {
        await horasRef.add(registro);
        document.getElementById('horas-qtd').value = '';
        document.getElementById('horas-valor').value = '';
        calcularTotalHoras();
    } catch (e) {
        console.error("Erro ao salvar horas:", e);
    }
}


function renderizarHorasMotoboy() {
    const lista = document.getElementById('lista-horas-motoboy');
    if(!lista) return;
    lista.innerHTML = '';
    
    const dataSelecionada = document.getElementById('horas-data').value;
    const horasDoDia = horasTrabalhadas.filter(h => h.data === dataSelecionada);

    horasDoDia.forEach(h => {
        const item = document.createElement('div');
        item.style = "background: #121212; padding: 10px; border-radius: 6px; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #333;";
        item.innerHTML = `
            <div style="text-align: left;">
                <span style="color: var(--text-secondary); font-size: 0.8rem;">⏱️ Tempo: ${h.horas} (R$ ${h.valorHora.toFixed(2).replace('.', ',')}/h)</span><br>
                <strong style="color: var(--warning);">R$ ${h.total.toFixed(2).replace('.', ',')}</strong>
            </div>
            <button onclick="deletarHora('${h.firebaseId}')" style="background:none; border:none; color: var(--danger); cursor:pointer;">
                <span class="material-icons-round">delete</span>
            </button>
        `;
        lista.appendChild(item);
    });
}

async function deletarHora(id) {
    if(confirm("Excluir este lançamento de horas?")) {
        await horasRef.doc(id).delete();
    }
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
