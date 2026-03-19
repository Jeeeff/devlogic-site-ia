require('dotenv').config(); // Carrega variáveis de ambiente do .env
const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk'); // Importa o SDK do Groq
const path = require('path'); // Para lidar com caminhos de arquivos

const app = express();
const PORT = process.env.PORT || 5000;

// --- Configuração do CORS ---
// Permite requisições de qualquer origem para fins de desenvolvimento.
// Em produção, considere restringir a domínios específicos.
app.use(cors());

// --- Middleware para parsear JSON no corpo das requisições ---
app.use(express.json());

// --- Inicialização do Groq SDK ---
// A chave da API é carregada automaticamente do .env (GROQ_API_KEY)
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// --- PROMPT DE TREINAMENTO PARA O CHAT DE SUPORTE ---
// Este prompt será enviado ao backend para treinar o Groq especificamente para o chat de suporte.
const SUPPORT_SYSTEM_PROMPT = `Você é o assistente de suporte técnico da DevLogic Studio, especializado em resolver dúvidas, fornecer informações e direcionar clientes de forma eficiente e amigável.
Sua principal função é auxiliar os usuários com problemas técnicos, dúvidas sobre serviços ou qualquer outra questão relacionada à DevLogic Studio.
A DevLogic Studio oferece:
- Desenvolvimento de sites e landing pages
- Criação de sistemas e aplicações personalizadas
- Desenvolvimento de APIs e integrações
- Consultoria técnica em tecnologia, performance e automação
- Melhorias de SEO, experiência do usuário (UX) e design responsivo
- Automação de processos e integração de sistemas
- Desenvolvimento de soluções de IA e chatbots
Sua personalidade é:
- Prestativo e paciente: Sempre disposto a ajudar e explicar com clareza.
- Conhecedor e preciso: Forneça informações corretas e relevantes.
- Objetivo e eficiente: Busque resolver a questão do usuário da forma mais direta possível.
- Humano e empático: Entenda a frustração ou necessidade do usuário.
Regras de interação:
- Nunca diga que é uma IA ou um robô. Atue como um atendente humano da DevLogic Studio.
- Se o usuário perguntar sobre preços, orçamentos ou contratação de serviços, explique que você é o suporte técnico e que para esses assuntos ele deve entrar em contato com um especialista comercial.
- **Direcione para o WhatsApp:** Se o usuário precisar de um contato direto para vendas, orçamentos ou agendamento, forneça o número de WhatsApp da DevLogic Studio: **+55 11 94064-3972**.
- Se o usuário tiver um problema técnico, tente coletar o máximo de informações para entender a situação e, se não puder resolver diretamente, ofereça encaminhar para um técnico especializado (e sugira o contato via WhatsApp para agilizar).
- Use emojis relevantes para tornar a conversa mais amigável e moderna, mas sem exageros.
- Formate suas respostas com negrito (usando **texto**) e quebras de linha (usando \n) para facilitar a leitura.
---
Agora aguarde mensagens do usuário e responda como um atendente humano de suporte da DevLogic Studio.`;

// --- Rota para o Chatbot ---
app.post('/api/chat', async (req, res) => {
    const { message, name, chatType, systemPrompt: frontendSystemPrompt } = req.body; // Recebe systemPrompt do frontend

    if (!message) {
        return res.status(400).json({ error: 'Mensagem é obrigatória.' });
    }

    let systemPromptToUse = SUPPORT_SYSTEM_PROMPT; // Padrão é o de suporte

    if (chatType === 'demo' && frontendSystemPrompt) {
        systemPromptToUse = frontendSystemPrompt; // Se for demo e o frontend enviou um prompt, usa-o
    } else if (chatType === 'support') {
        systemPromptToUse = SUPPORT_SYSTEM_PROMPT; // Para suporte, sempre usa o de suporte
    }
    // Se chatType for 'demo' mas frontendSystemPrompt não foi enviado, usa o padrão de suporte

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: systemPromptToUse,
                },
                {
                    role: 'user',
                    content: message,
                },
            ],
            model: 'llama-3.3-70b-versatile', // Modelo Groq recomendado
            temperature: 0.7,
            max_completion_tokens: 1024,
            top_p: 1,
            stop: null,
            stream: false,
        });

        const reply = chatCompletion.choices[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta.';
        res.json({ reply });

    } catch (error) {
        console.error('Erro ao interagir com a API do Groq:', error);
        // Verifica se o erro é de chave de API inválida
        if (error.message && error.message.includes('Invalid API key')) {
            return res.status(500).json({ error: 'Erro no servidor: Chave da API Groq inválida. Verifique a variável GROQ_API_KEY no arquivo .env.' });
        }
        res.status(500).json({ error: 'Erro interno do servidor ao processar a requisição.' });
    }
});

app.get('/', (req, res) => {
    res.json({
        ok: true,
        service: 'devlogic-chat-backend',
        message: 'Backend rodando normalmente'
    });
});

app.get('/healthz', (req, res) => {
    res.status(200).json({ ok: true });
});

// --- Iniciar o Servidor ---
app.listen(PORT, () => {
    console.log(`Servidor backend rodando na porta ${PORT}`);
    console.log(`Acesse o frontend em http://localhost:${PORT}`);
});
