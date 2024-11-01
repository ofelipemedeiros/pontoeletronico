// Configuração do Supabase
const SUPABASE_URL = 'https://hrdfivyvkhzptzhysmmq.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyZGZpdnl2a2h6cHR6aHlzbW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAyNTUzNDgsImV4cCI6MjA0NTgzMTM0OH0.A6mjgPCd_fP_K_H5A6Xu47NkW5g_DYil5FH23u-Ho_k'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Estado da aplicação
let currentUser = null;

// Elementos DOM
const registrosList = document.getElementById('registrosList');
const userNameElement = document.getElementById('userName');
const btnLogout = document.getElementById('btnLogout');

// Função para carregar registros do usuário
async function carregarRegistros() {
    if (!currentUser) return;

    try {
        const { data, error } = await supabase
            .from('registros_ponto')
            .select('*')
            .eq('usuario_id', currentUser.id)
            .order('timestamp', { ascending: true });

        if (error) throw error;

        registrosList.innerHTML = '';

        data.forEach(registro => {
            const horario = new Date(registro.timestamp).toLocaleTimeString('pt-BR');
            const dataRegistro = new Date(registro.timestamp).toLocaleDateString('pt-BR');
            const registroItem = document.createElement('tr');
            registroItem.className = registro.tipo.toLowerCase().replace(' ', '-'); // Adiciona a classe correspondente
            registroItem.innerHTML = `
                <td>${dataRegistro}</td>
                <td>${registro.tipo}</td>
                <td>${horario}</td>
            `;
            registrosList.appendChild(registroItem);
        });
    } catch (error) {
        console.error('Erro ao carregar registros:', error);
    }
}

// Função de Logout
async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        currentUser = null;
        window.location.href = 'index.html'; // Redireciona para a página de login
    } catch (error) {
        console.error('Erro no logout:', error);
        alert('Erro ao fazer logout');
    }
}

// Event Listener para o botão de logout
btnLogout.addEventListener('click', handleLogout);

// Inicialização
async function init() {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (session) {
        currentUser = session.user;
        userNameElement.textContent = currentUser.email;
        carregarRegistros();
    } else {
        window.location.href = 'index.html'; // Redireciona para a página de login
    }
}

init(); 