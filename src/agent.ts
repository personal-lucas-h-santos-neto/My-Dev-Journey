import siteData from './site-data.json';
import type { SiteData } from './types';

const defaultSiteData = siteData as SiteData;
const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'llama2';

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

async function askOllama(question: string, data: SiteData): Promise<string> {
  const prompt = [
    buildSystemPrompt(),
    '',
    'Dados do site:',
    serializeSiteData(data),
    '',
    `Pergunta: ${question}`,
  ].join('\n');

  const response = await fetch(`${OLLAMA_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama retornou ${response.status}: ${body}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return payload.choices?.[0]?.message?.content?.trim() ?? '';
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

export type AgentResult = { answer: string; source: 'ollama' | 'fallback' | 'unknown' };

export async function askAgent(question: string): Promise<AgentResult> {
  const trimmed = question.trim();
  if (!trimmed) {
    return { answer: 'Por favor, faça uma pergunta sobre as metas ou evidências exibidas no site.', source: 'unknown' };
  }

  try {
    const response = await askOllama(trimmed, defaultSiteData);
    if (response.length > 0) {
      return { answer: response, source: 'ollama' };
    }
  } catch {
    // Fallback para respostas geradas diretamente pelos dados do site.
  }
  return { answer: getAgentResponseFromSite(trimmed, defaultSiteData), source: 'fallback' };
}

export async function checkOllamaAvailable(timeout = 1200): Promise<boolean> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(`${OLLAMA_URL}/v1/models`, { signal: controller.signal });
    clearTimeout(id);
    return res.ok;
  } catch (err) {
    return false;
  }
}
