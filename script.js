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
 
 // 2. Variáveis Globais
 let pedidos = [];
 let imagemGeradaURL = null;
 let pedidoEmEdicaoId = null;
 
 // 3. Escutando o banco de dados em tempo real
 document.addEventListener('DOMContentLoaded', () => {
     pedidosRef.orderBy("id", "asc").onSnapshot((snapshot) => {
         pedidos = [];
         snapshot.forEach((doc) => {
             pedidos.push({ firebaseId: doc.id, ...doc.data() });
         });
         renderizar(); // Atualiza a tela automaticamente
     });
 });
 
 // --- FUNÇÕES DE BANCO DE DADOS ---
 
 async function adicionarPedido() {
     const endereco = document.getElementById('endereco').value;
     const valor = parseFloat(document.getElementById('valor').value);
     const pagamento = document.getElementById('pagamento').value;
     const appOrigem = document.getElementById('app-origem').value;
 
     if (!endereco || isNaN(valor)) {
         alert("Preencha o endereço e o valor corretamente.");
         return;
     }
 
     const agora = new Date();
     const horaCadastro = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
 
     const pedido = {
         id: Date.now(),
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
 
     pedidos.forEach(p => {
         totalVal += p.valor;
         totalEntregas++;
 
         const appCores = {
             'Ifood': '#ea1d2c',
             'Delivery Much': '#ff7a00',
             'ComprAqui': '#0097ff',
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

function abrirRelatorios() {
    alert("Em breve! O sistema de salvamento de fechamento diário será implementado em breve na área de relatórios.");
    toggleMenu(); // Fecha o menu ao clicar
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
