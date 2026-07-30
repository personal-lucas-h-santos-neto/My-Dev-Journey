import siteData from './site-data.json';
import type { SiteData } from './types';

const defaultSiteData = siteData as SiteData;

const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2:1b';
const OLLAMA_MAX_TOKENS = Number(import.meta.env.VITE_OLLAMA_MAX_TOKENS) || 500;
// Timeout ocioso: aborta se nenhum token novo chegar nesse intervalo (em ms).
// A inferência local pode demorar para o primeiro token, então o valor é generoso.
const OLLAMA_IDLE_TIMEOUT_MS = Number(import.meta.env.VITE_OLLAMA_TIMEOUT_MS) || 60000;

function serializeSiteData(data: SiteData) {
  return [
    'Períodos:',
    data.periods.map((item) => `- ${item}`).join('\n'),
    '',
    ...data.goals.flatMap((goal) => [
      `Meta: ${goal.title}`,
      `Descrição: ${goal.description}`,
      `Período: ${goal.period}`,
      `Prazo: ${goal.deadline}`,
      'Submetas:',
      ...goal.subgoals.flatMap((subgoal) => [
        `  • ${subgoal.title} (${subgoal.completed ? 'completa' : 'pendente'})`,
        ...subgoal.evidence.map((evidence) => `    - ${evidence}`),
      ]),
      '',
    ]),
  ].join('\n');
}

function buildSystemPrompt() {
  return [
    'Você é um assistente de suporte para metas e progresso.',
    'Responda apenas com base nas informações fornecidas sobre metas, submetas, prazos e evidências.',
    'Se a pergunta não puder ser respondida pelos dados exibidos, informe que a resposta está limitada ao conteúdo do site.',
  ].join(' ');
}

function buildUserPrompt(question: string, data: SiteData) {
  return [
    'Dados do site:',
    serializeSiteData(data),
    '',
    `Pergunta: ${question}`,
  ].join('\n');
}

/** Categoria de erro para mensagens claras de fallback. */
type OllamaErrorKind = 'http' | 'offline' | 'timeout' | 'empty' | 'unknown';

class OllamaError extends Error {
  kind: OllamaErrorKind;
  constructor(kind: OllamaErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = 'OllamaError';
  }
}

type StreamHandlers = {
  /** Chamado a cada token recebido, com o texto acumulado até o momento. */
  onToken?: (token: string, full: string) => void;
  signal?: AbortSignal;
};

/**
 * Consulta o Ollama local via endpoint compatível com a API OpenAI,
 * em modo streaming (Server-Sent Events), repassando cada token ao chamador.
 */
async function streamOllama(question: string, data: SiteData, handlers: StreamHandlers): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${OLLAMA_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: handlers.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildUserPrompt(question, data) },
        ],
        temperature: 0.1,
        max_tokens: OLLAMA_MAX_TOKENS,
        stream: true,
      }),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new OllamaError('timeout', 'Tempo limite excedido ao aguardar o Ollama.');
    }
    throw new OllamaError('offline', 'Não foi possível conectar ao servidor Ollama local.');
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new OllamaError('http', `Ollama retornou ${response.status}: ${body}`);
  }

  if (!response.body) {
    throw new OllamaError('unknown', 'A resposta do Ollama não pôde ser lida (sem corpo de stream).');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const raw of lines) {
        const line = raw.trim();
        if (!line || !line.startsWith('data:')) continue;

        const payload = line.slice(5).trim();
        if (payload === '[DONE]') continue;

        try {
          const json = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const token = json.choices?.[0]?.delta?.content ?? '';
          if (token) {
            full += token;
            handlers.onToken?.(token, full);
          }
        } catch {
          // Linha SSE parcial; será completada na próxima leitura.
        }
      }
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new OllamaError('timeout', 'O Ollama parou de responder (tempo limite ocioso).');
    }
    throw new OllamaError('unknown', 'Falha ao ler o stream de resposta do Ollama.');
  }

  return full.trim();
}

export function getAgentResponseFromSite(question: string, data: SiteData = defaultSiteData) {
  const normalizedQuestion = question.trim().toLowerCase();
  const answers: string[] = [];

  if (/qual|quais|objetivo|meta/.test(normalizedQuestion)) {
    answers.push('Metas exibidas no site:');
    answers.push(...data.goals.map((goal) => `- ${goal.title} (${goal.period}): ${goal.description}`));
  }

  if (/submeta|submetas|etapa|etapas/.test(normalizedQuestion)) {
    answers.push(
      ...data.goals.flatMap((goal) => [
        `Submetas de ${goal.title}:`,
        ...goal.subgoals.map(
          (subgoal) => `- ${subgoal.title} (${subgoal.completed ? 'completa' : 'pendente'})`,
        ),
      ]),
    );
  }

  if (/evid(ncia|ência)|prova|comprovação/.test(normalizedQuestion)) {
    answers.push(
      ...data.goals.flatMap((goal) => [
        `Evidências de ${goal.title}:`,
        ...goal.subgoals.flatMap((subgoal) => [
          `- ${subgoal.title}:`,
          ...subgoal.evidence.map((item) => `  • ${item}`),
        ]),
      ]),
    );
  }

  if (/prazo|deadline/.test(normalizedQuestion)) {
    answers.push(
      ...data.goals.map((goal) => `${goal.title}: prazo em ${goal.deadline} (${goal.period})`),
    );
  }

  if (answers.length === 0) {
    return 'Desculpe, minha resposta é baseada apenas no conteúdo exibido no site. Não tenho informação adicional além das metas, submetas, prazos e evidências mostradas.';
  }

  return answers.join('\n');
}

export type AgentResult = {
  answer: string;
  source: 'ollama' | 'fallback' | 'unknown';
  /** Motivo do fallback, quando o Ollama não foi usado. */
  reason?: string;
};

export type AskAgentOptions = {
  /** Recebe o texto acumulado a cada token, para renderização em tempo real. */
  onToken?: (full: string) => void;
};

function describeFallbackReason(err: unknown): string {
  if (err instanceof OllamaError) {
    switch (err.kind) {
      case 'offline':
        return 'Servidor Ollama indisponível — verifique se o Ollama está em execução.';
      case 'timeout':
        return 'O Ollama demorou demais para responder.';
      case 'http':
        return `O Ollama retornou um erro: ${err.message}`;
      case 'empty':
        return 'O modelo retornou uma resposta vazia.';
      default:
        return 'Não foi possível obter a resposta do Ollama.';
    }
  }
  return 'Erro inesperado ao consultar o Ollama.';
}

export async function askAgent(question: string, options: AskAgentOptions = {}): Promise<AgentResult> {
  const trimmed = question.trim();
  if (!trimmed) {
    return {
      answer: 'Por favor, faça uma pergunta sobre as metas ou evidências exibidas no site.',
      source: 'unknown',
    };
  }

  const controller = new AbortController();
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  const armIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => controller.abort(), OLLAMA_IDLE_TIMEOUT_MS);
  };
  armIdleTimer();

  try {
    const answer = await streamOllama(trimmed, defaultSiteData, {
      signal: controller.signal,
      onToken: (_token, full) => {
        armIdleTimer();
        options.onToken?.(full);
      },
    });

    if (answer.length > 0) {
      return { answer, source: 'ollama' };
    }

    return {
      answer: getAgentResponseFromSite(trimmed, defaultSiteData),
      source: 'fallback',
      reason: describeFallbackReason(new OllamaError('empty', 'vazio')),
    };
  } catch (err) {
    return {
      answer: getAgentResponseFromSite(trimmed, defaultSiteData),
      source: 'fallback',
      reason: describeFallbackReason(err),
    };
  } finally {
    if (idleTimer) clearTimeout(idleTimer);
  }
}

export async function checkOllamaAvailable(timeout = 1500): Promise<boolean> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(`${OLLAMA_URL}/v1/models`, { signal: controller.signal });
    clearTimeout(id);
    return res.ok;
  } catch {
    return false;
  }
}
