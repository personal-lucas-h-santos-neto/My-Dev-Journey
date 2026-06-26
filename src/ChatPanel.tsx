import { useMemo, useState } from 'react';
import { askAgent } from './agent';

type SourceType = 'ollama' | 'fallback' | 'unknown' | null;

function ChatPanel() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [lastSource, setLastSource] = useState<SourceType>(null);
  const [history, setHistory] = useState<{ question: string; answer: string; source?: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const canAsk = question.trim().length > 0;

  const handleAsk = async () => {
    if (!canAsk) return;
    setLoading(true);

    try {
      const res = await askAgent(question);
      const entry = { question, answer: res.answer, source: res.source };
      setHistory((prev) => [entry, ...prev]);
      setAnswer(res.answer);
      setLastSource(res.source);
      setQuestion('');
    } catch (error) {
      const text = 'Erro ao processar a pergunta. Verifique a conexão com o servidor local Ollama ou use o agente offline.';
      setAnswer(text);
      setLastSource('unknown');
      setHistory((prev) => [{ question, answer: text, source: 'unknown' }, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const placeholder = useMemo(
    () => 'Pergunte sobre metas, períodos, prazos, submetas ou evidências exibidas no site.',
    [],
  );

  return (
    <section className="chat-panel">
      <div className="chat-header">
        <h2>Agente conversacional</h2>
        <p>O LLM local responde apenas com base no conteúdo mostrado no site.</p>
      </div>

      <div className="chat-input-row">
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleAsk();
            }
          }}
          placeholder={placeholder}
          disabled={loading}
        />
        <button type="button" onClick={handleAsk} disabled={!canAsk || loading}>
          {loading ? 'Aguardando...' : 'Perguntar'}
        </button>
      </div>

      {answer && (
        <div className="chat-response">
          <div className="response-header">
            <span>Resposta</span>
            <span className={`response-badge ${lastSource ?? ''}`}>{lastSource === 'ollama' ? 'Ollama' : lastSource === 'fallback' ? 'Local' : 'Desconhecido'}</span>
          </div>
          <pre>{answer}</pre>
        </div>
      )}
    </section>
  );
}

export default ChatPanel;
