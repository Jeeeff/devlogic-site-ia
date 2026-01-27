// ---------------------------------------------------
// script.js – Lógica dos chats (Demo + Suporte)
// ---------------------------------------------------

// --- Variáveis Globais ---
const BACKEND_URL = '/api/chat'; // URL do seu backend (Nginx fará o proxy)
const WHATSAPP_NUMBER = '5511940643972'; // Seu número de WhatsApp real

// --- PROMPT DE TREINAMENTO PARA O CHAT DE DEMONSTRAÇÃO (TESTE) ---
// Este prompt será enviado ao backend para treinar o Groq especificamente para o chat de demonstração.
const DEMO_SYSTEM_PROMPT = `Você é o atendente virtual oficial da DevLogic Studio, especializado em explicar, demonstrar e vender os serviços da empresa de forma clara, amigável e extremamente profissional.
Seu objetivo é impressionar quem está testando o chat, mostrando alta inteligência, capacidade técnica e habilidade comercial.
A DevLogic Studio é uma empresa focada em:
- Desenvolvimento de sites e landing pages
- Criação de sistemas e aplicações personalizadas
- Desenvolvimento de APIs e integrações
- Consultoria técnica em tecnologia, performance e automação
- Melhorias de SEO, experiência do usuário (UX) e design responsivo
- Automação de processos e integração de sistemas
- Desenvolvimento de soluções de IA e chatbots
Sua personalidade é:
- Profissional e cortês: Sempre mantenha um tom respeitoso e formal, mas acessível.
- Entusiasmado e proativo: Demonstre paixão por tecnologia e pelas soluções da DevLogic.
- Vendedor consultivo: Identifique as necessidades do cliente e apresente como a DevLogic pode ajudar.
- Especialista técnico: Explique conceitos complexos de forma simples e didática.
- Humano e empático: Entenda as dores e objetivos do cliente.
Regras de interação:
- Nunca diga que é uma IA ou um robô. Atue como um atendente humano da DevLogic Studio.
- Sempre que possível, direcione a conversa para os serviços da DevLogic Studio e como eles podem beneficiar o usuário.
- Se o usuário perguntar sobre preços ou orçamentos, explique que depende do escopo do projeto e ofereça agendar uma conversa com um especialista para um orçamento personalizado.
- Se o usuário disser que está apenas testando a IA, responda com simpatia, fluidez e inteligência, mostrando a capacidade do atendente e da DevLogic.
- Se o usuário quiser criar um projeto, pergunte detalhes importantes (tipo de projeto, objetivos, prazo, orçamento) para entender melhor e oferecer soluções personalizadas.
- Se o usuário fizer perguntas técnicas, explique como um especialista experiente explicaria para um cliente leigo, de forma clara e sem jargões excessivos.
- Use emojis relevantes para tornar a conversa mais amigável e moderna, mas sem exageros.
- Formate suas respostas com negrito (usando **texto**) e quebras de linha (usando \n) para facilitar a leitura.
---
Agora aguarde mensagens do usuário e responda como um atendente humano da DevLogic Studio.`;

// --- Elementos do Chat de Demonstração (Flutuante) ---
const demoChatToggleBtn = document.getElementById('demo-chat-toggle-btn');
const demoChatWindow = document.getElementById('demo-chat-window');
const demoCloseChatBtn = document.getElementById('demo-close-chat-btn');
const demoChatMessages = document.getElementById('demo-chat-messages');
const demoChatUserInput = document.getElementById('demo-chat-user-input');
const demoChatSendBtn = document.getElementById('demo-chat-send-btn');
const demoLoadingIndicator = document.getElementById('demo-loading-indicator'); // Indicador de carregamento
let demoChatUserName = localStorage.getItem('demoChatUserName') || null; // Armazena o nome do usuário para o chat de demonstração
let demoInitialMessageSent = false; // Flag para controlar a mensagem inicial do bot de demonstração
let demoAwaitingName = false; // Flag para indicar que estamos esperando o nome do usuário

// --- Elementos do Chat de Suporte (Fixo na Seção de Contato) ---
const supportChatMessages = document.getElementById('support-chat-messages');
const supportChatUserInput = document.getElementById('support-chat-user-input');
const supportChatSendBtn = document.getElementById('support-chat-send-btn');
const supportLoadingIndicator = document.getElementById('support-loading-indicator'); // Indicador de carregamento
let supportChatUserName = localStorage.getItem('supportChatUserName') || null; // Armazena o nome do usuário para o chat de suporte
let supportInitialMessageSent = false; // Flag para controlar a mensagem inicial do bot de suporte
let supportAwaitingName = false; // Flag para indicar que estamos esperando o nome do usuário

// --- Funções de Utilitário do Chat ---
// Adiciona uma mensagem ao chat (demo ou suporte)
function addMessageToChat(message, sender, chatElement) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', sender);
    messageElement.innerHTML = formatBotResponse(message); // Formata a resposta para negrito/quebra de linha
    chatElement.appendChild(messageElement);
    chatElement.scrollTop = chatElement.scrollHeight; // Rola para a última mensagem
}

// Formata a resposta do bot para exibir negrito e quebras de linha
function formatBotResponse(text) {
    // Substitui **texto** por <strong>texto</strong>
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Substitui \n por <br>
    formattedText = formattedText.replace(/\n/g, '<br>');
    return formattedText;
}

// Envia mensagem para o backend
async function sendChatMessageToBackend(chatType, message, userName, chatMessagesElement, chatUserInputElement, chatSendBtnElement, loadingIndicatorElement) {
    if (!message.trim()) return;

    addMessageToChat(message, 'user', chatMessagesElement);
    chatUserInputElement.value = '';
    chatSendBtnElement.disabled = true; // Desabilita o botão de enviar
    loadingIndicatorElement.style.display = 'block'; // Mostra o indicador de carregamento

    try {
        let currentUserName = userName;
        let currentAwaitingName = (chatType === 'demo' ? demoAwaitingName : supportAwaitingName);

        if (currentAwaitingName) {
            currentUserName = message.trim();
            localStorage.setItem(`${chatType}ChatUserName`, currentUserName);
            if (chatType === 'demo') demoAwaitingName = false;
            else supportAwaitingName = false;

            addMessageToChat(`Olá, **${currentUserName}**! Como posso te ajudar hoje com a DevLogic Studio?`, 'bot', chatMessagesElement);
            loadingIndicatorElement.style.display = 'none';
            chatSendBtnElement.disabled = false;
            return;
        }

        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message, name: currentUserName, chatType, systemPrompt: DEMO_SYSTEM_PROMPT }), // Envia o prompt de demonstração
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP! Status: ${response.status}`);
        }

        const data = await response.json();
        addMessageToChat(data.reply, 'bot', chatMessagesElement);

    } catch (error) {
        console.error('Erro ao conectar ao backend:', error);
        addMessageToChat('Não foi possível conectar ao servidor. Verifique sua conexão ou tente mais tarde.', 'bot', chatMessagesElement);
    } finally {
        loadingIndicatorElement.style.display = 'none'; // Esconde o indicador de carregamento
        chatSendBtnElement.disabled = false; // Habilita o botão de enviar
    }
}

// --- Lógica do Chat de Demonstração (Flutuante) ---
// Mensagem de boas-vindas inicial para o chat de demonstração (se o elemento existir e não tiver mensagens)
if (demoChatMessages && demoChatMessages.children.length === 0 && !demoInitialMessageSent) {
    if (!demoChatUserName) {
        addMessageToChat(`Olá! Sou o assistente virtual da DevLogic Studio. Para começarmos, qual é o seu nome?`, 'bot', demoChatMessages);
        demoAwaitingName = true;
    } else {
        addMessageToChat(`Bem-vindo(a) de volta, **${demoChatUserName}**! Como posso te ajudar hoje com a DevLogic Studio?`, 'bot', demoChatMessages);
    }
    demoInitialMessageSent = true;
}

if (demoChatToggleBtn) {
    demoChatToggleBtn.addEventListener('click', () => {
        demoChatWindow.classList.toggle('active');
        // Se o chat for aberto pela primeira vez, envia a mensagem inicial
        if (demoChatWindow.classList.contains('active') && demoChatMessages.children.length === 0 && !demoInitialMessageSent) {
            if (!demoChatUserName) {
                addMessageToChat(`Olá! Sou o assistente virtual da DevLogic Studio. Para começarmos, qual é o seu nome?`, 'bot', demoChatMessages);
                demoAwaitingName = true;
            } else {
                addMessageToChat(`Bem-vindo(a) de volta, **${demoChatUserName}**! Como posso te ajudar hoje com a DevLogic Studio?`, 'bot', demoChatMessages);
            }
            demoInitialMessageSent = true;
        }
    });
} else {
    console.warn('⚠️ Elemento #demo-chat-toggle-btn não encontrado.');
}

if (demoCloseChatBtn) {
    demoCloseChatBtn.addEventListener('click', () => {
        demoChatWindow.classList.remove('active');
    });
}

if (demoChatSendBtn) {
    demoChatSendBtn.addEventListener('click', () => {
        sendChatMessageToBackend('demo', demoChatUserInput.value, demoChatUserName, demoChatMessages, demoChatUserInput, demoChatSendBtn, demoLoadingIndicator);
    });
}

if (demoChatUserInput) {
    demoChatUserInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessageToBackend('demo', demoChatUserInput.value, demoChatUserName, demoChatMessages, demoChatUserInput, demoChatSendBtn, demoLoadingIndicator);
        }
    });
}

// --- Lógica do Chat de Suporte (Fixo) ---
// Mensagem de boas-vindas inicial para o chat de suporte (se o elemento existir e não tiver mensagens)
if (supportChatMessages && supportChatMessages.children.length === 0 && !supportInitialMessageSent) {
    if (!supportChatUserName) {
        addMessageToChat(`Olá! Sou o assistente de suporte da DevLogic Studio. Para começarmos, qual é o seu nome?`, 'bot', supportChatMessages);
        supportAwaitingName = true;
    } else {
        addMessageToChat(`Bem-vindo(a) de volta, **${supportChatUserName}**! Como posso te ajudar com o suporte da DevLogic Studio?`, 'bot', supportChatMessages);
    }
    supportInitialMessageSent = true;
}

if (supportChatSendBtn) {
    supportChatSendBtn.addEventListener('click', () => {
        sendChatMessageToBackend('support', supportChatUserInput.value, supportChatUserName, supportChatMessages, supportChatUserInput, supportChatSendBtn, supportLoadingIndicator);
    });
}

if (supportChatUserInput) {
    supportChatUserInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessageToBackend('support', supportChatUserInput.value, supportChatUserName, supportChatMessages, supportChatUserInput, supportChatSendBtn, supportLoadingIndicator);
        }
    });
}

// --- Lógica do Menu Mobile ---
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const mobileMenu = document.getElementById('mobileMenu');
if (mobileMenuToggle && mobileMenu) {
    const mobileMenuIcon = mobileMenuToggle.querySelector('i');
    mobileMenuToggle.addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
        if (mobileMenu.classList.contains('active')) {
            mobileMenuIcon.classList.remove('fa-bars');
            mobileMenuIcon.classList.add('fa-times');
        } else {
            mobileMenuIcon.classList.remove('fa-times');
            mobileMenuIcon.classList.add('fa-bars');
        }
    });
    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            mobileMenuIcon.classList.remove('fa-times');
            mobileMenuIcon.classList.add('fa-bars');
        });
    });
} else {
    console.warn('⚠️ Elementos do menu mobile não encontrados. Verifique #mobileMenuToggle e #mobileMenu.');
}

// --- Animação de entrada dos elementos ---
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};
const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);
document.querySelectorAll('.service-card, .tech-item, .project-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// --- Atualiza links do WhatsApp ---
document.querySelectorAll('a[href*="wa.me"]').forEach(link => {
    link.href = `https://wa.me/${WHATSAPP_NUMBER}`;
});

console.log('✅ Script carregado com sucesso!');
