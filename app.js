// Configuração do Supabase
const SUPABASE_URL = 'https://hrdfivyvkhzptzhysmmq.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyZGZpdnl2a2h6cHR6aHlzbW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAyNTUzNDgsImV4cCI6MjA0NTgzMTM0OH0.A6mjgPCd_fP_K_H5A6Xu47NkW5g_DYil5FH23u-Ho_k'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Estado da aplicação
let currentUser = null;

// Elementos DOM
const clockElement = document.getElementById('clock');
const userNameElement = document.getElementById('userName');
const registrosList = document.getElementById('registrosList');
const btnEntrada = document.getElementById('btnEntrada');
const btnAlmocoSaida = document.getElementById('btnAlmocoSaida');
const btnAlmocoRetorno = document.getElementById('btnAlmocoRetorno');
const btnSaida = document.getElementById('btnSaida');
const loginCard = document.getElementById('loginCard');
const pontoCard = document.getElementById('pontoCard');
const loginForm = document.getElementById('loginForm');
const btnRegistrar = document.getElementById('btnRegistrar');

// Atualizar relógio
function updateClock() {
    const now = new Date();
    clockElement.textContent = now.toLocaleTimeString('pt-BR');
}

// Iniciar relógio
setInterval(updateClock, 1000);

// Função para registrar ponto
async function registrarPonto(tipo) {
    if (!currentUser) {
        alert('Por favor, faça login primeiro');
        return;
    }

    // Verifica se já atingiu o limite de registros
    const limiteAtingido = await verificarLimiteRegistros();
    if (limiteAtingido) {
        alert('Limite de registros diários atingido (máximo 4 registros por dia).');
        return;
    }

    // Confirma com o usuário
    if (!confirmarRegistro(tipo)) {
        return;
    }

    try {
        const { data, error } = await supabase
            .from('registros_ponto')
            .insert([
                {
                    usuario_id: currentUser.id,
                    tipo: tipo,
                    timestamp: new Date().toISOString()
                }
            ]);

        if (error) throw error;
        
        atualizarRegistros();
        atualizarEstadoBotoes();
        
        // Mensagem de sucesso personalizada
        const mensagens = {
            'Entrada': 'Entrada registrada com sucesso! Bom trabalho!',
            'Saída Almoço': 'Saída para almoço registrada. Bom apetite!',
            'Retorno Almoço': 'Retorno do almoço registrado. Bom trabalho!',
            'Saída': 'Saída registrada. Até amanhã!'
        };
        alert(mensagens[tipo]);

    } catch (error) {
        console.error('Erro ao registrar ponto:', error);
        alert('Erro ao registrar ponto');
    }
}

// Função para calcular horas trabalhadas
function calcularHorasTrabalhadas(registros) {
    let tempoTotal = 0;
    let tempoAlmoco = 0;
    let entrada = null;
    let saidaAlmoco = null;
    
    registros.forEach(registro => {
        const hora = new Date(registro.timestamp);
        
        switch(registro.tipo) {
            case 'Entrada':
                entrada = hora;
                break;
            case 'Saída Almoço':
                saidaAlmoco = hora;
                if (entrada) {
                    tempoTotal += (hora - entrada) / 1000 / 60 / 60;
                }
                break;
            case 'Retorno Almoço':
                if (saidaAlmoco) {
                    tempoAlmoco += (hora - saidaAlmoco) / 1000 / 60 / 60;
                }
                entrada = hora;
                break;
            case 'Saída':
                if (entrada) {
                    tempoTotal += (hora - entrada) / 1000 / 60 / 60;
                }
                break;
        }
    });

    return {
        total: tempoTotal.toFixed(2),
        almoco: tempoAlmoco.toFixed(2)
    };
}

// Carregar registros do dia
async function atualizarRegistros() {
    if (!currentUser) return;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    try {
        const { data, error } = await supabase
            .from('registros_ponto')
            .select('*')
            .eq('usuario_id', currentUser.id)
            .gte('timestamp', hoje.toISOString())
            .order('timestamp', { ascending: true });

        if (error) throw error;

        registrosList.innerHTML = '';
        
        // Adicionar aviso se já completou os registros do dia
        if (data.length >= 4) {
            registrosList.innerHTML = `
                <div class="aviso-registros-completos">
                    <span class="material-icons">check_circle</span>
                    <p>Registros do dia completos!</p>
                </div>
            `;
        }

        // Adicionar resumo do dia
        if (data.length > 0) {
            const horas = calcularHorasTrabalhadas(data);
            registrosList.innerHTML = `
                <div class="resumo-dia">
                    <div class="resumo-item">
                        <span class="material-icons">schedule</span>
                        <div class="resumo-info">
                            <span>Horas Trabalhadas</span>
                            <strong>${horas.total}h</strong>
                        </div>
                    </div>
                    <div class="resumo-item">
                        <span class="material-icons">restaurant</span>
                        <div class="resumo-info">
                            <span>Tempo de Almoço</span>
                            <strong>${horas.almoco}h</strong>
                        </div>
                    </div>
                </div>
            `;
        }

        // Adicionar registros
        data.forEach(registro => {
            registrosList.innerHTML += formatarRegistro(registro);
        });
    } catch (error) {
        console.error('Erro ao carregar registros:', error);
    }
}

// Event Listeners
btnEntrada.addEventListener('click', () => registrarPonto('Entrada'));
btnAlmocoSaida.addEventListener('click', () => registrarPonto('Saída Almoço'));
btnAlmocoRetorno.addEventListener('click', () => registrarPonto('Retorno Almoço'));
btnSaida.addEventListener('click', () => registrarPonto('Saída'));

// Função para formatar o registro para exibição
function formatarRegistro(registro) {
    const horario = new Date(registro.timestamp).toLocaleTimeString('pt-BR');
    let classe = '';
    
    switch(registro.tipo) {
        case 'Entrada':
            classe = 'registro-entrada';
            break;
        case 'Saída Almoço':
            classe = 'registro-almoco-saida';
            break;
        case 'Retorno Almoço':
            classe = 'registro-almoco-retorno';
            break;
        case 'Saída':
            classe = 'registro-saida';
            break;
    }

    return `
        <div class="registro-item ${classe}">
            <span>${registro.tipo}</span>
            <span>${horario}</span>
        </div>
    `;
}

// Função de Login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        currentUser = data.user;
        showPontoCard();
        atualizarRegistros();
        atualizarEstadoBotoes();
    } catch (error) {
        console.error('Erro no login:', error);
        alert('Erro ao fazer login: ' + error.message);
    }
}

// Função de Registro
async function handleRegistro() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        alert('Por favor, preencha email e senha');
        return;
    }

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });

        if (error) throw error;

        alert('Registro realizado com sucesso! Por favor, verifique seu email.');
    } catch (error) {
        console.error('Erro no registro:', error);
        alert('Erro ao registrar: ' + error.message);
    }
}

// Função de Logout
async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        currentUser = null;
        showLoginCard();
    } catch (error) {
        console.error('Erro no logout:', error);
        alert('Erro ao fazer logout');
    }
}

// Funções auxiliares
function showLoginCard() {
    loginCard.style.display = 'block';
    pontoCard.style.display = 'none';
}

function showPontoCard() {
    loginCard.style.display = 'none';
    pontoCard.style.display = 'block';
    userNameElement.textContent = currentUser.email;
}

// Event Listeners
loginForm.addEventListener('submit', handleLogin);
btnRegistrar.addEventListener('click', handleRegistro);

// Inicialização
async function init() {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (session) {
        currentUser = session.user;
        showPontoCard();
        atualizarRegistros();
        atualizarEstadoBotoes();
    } else {
        showLoginCard();
    }

    // Listener para mudanças na autenticação
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            currentUser = session.user;
            showPontoCard();
            atualizarRegistros();
            atualizarEstadoBotoes();
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            showLoginCard();
        }
    });
}

// Função para verificar limite de registros
async function verificarLimiteRegistros() {
    if (!currentUser) return false;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    try {
        const { data, error } = await supabase
            .from('registros_ponto')
            .select('tipo')
            .eq('usuario_id', currentUser.id)
            .gte('timestamp', hoje.toISOString());

        if (error) throw error;

        return data.length >= 4;
    } catch (error) {
        console.error('Erro ao verificar limite de registros:', error);
        return false;
    }
}

// Função para confirmar registro
function confirmarRegistro(tipo) {
    const mensagens = {
        'Entrada': 'Registrar entrada do dia?',
        'Saída Almoço': 'Registrar saída para almoço?',
        'Retorno Almoço': 'Registrar retorno do almoço?',
        'Saída': 'Registrar saída do expediente?\nAtenção: Não será possível fazer mais registros hoje.'
    };

    return confirm(mensagens[tipo]);
}

// Função atualizada para controle dos botões
async function atualizarEstadoBotoes() {
    if (!currentUser) return;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    try {
        const { data, error } = await supabase
            .from('registros_ponto')
            .select('tipo')
            .eq('usuario_id', currentUser.id)
            .gte('timestamp', hoje.toISOString())
            .order('timestamp', { ascending: true });

        if (error) throw error;

        // Desabilita todos os botões primeiro
        btnEntrada.disabled = true;
        btnAlmocoSaida.disabled = true;
        btnAlmocoRetorno.disabled = true;
        btnSaida.disabled = true;

        // Se não há registros hoje, só habilita entrada
        if (!data || data.length === 0) {
            btnEntrada.disabled = false;
            return;
        }

        // Se já tem 4 registros, desabilita todos os botões
        if (data.length >= 4) {
            return;
        }

        const ultimoRegistro = data[data.length - 1].tipo;
        
        switch (ultimoRegistro) {
            case 'Entrada':
                btnAlmocoSaida.disabled = false;
                break;
            case 'Saída Almoço':
                btnAlmocoRetorno.disabled = false;
                break;
            case 'Retorno Almoço':
                btnSaida.disabled = false;
                break;
            case 'Saída':
                // Mantém todos os botões desabilitados
                break;
        }

    } catch (error) {
        console.error('Erro ao atualizar estado dos botões:', error);
    }
}

init();