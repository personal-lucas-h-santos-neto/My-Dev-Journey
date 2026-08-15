import { useMemo, useState } from 'react';
import { askAgent } from './agent';

const AVATAR_SRC = import.meta.env.BASE_URL + 'assets/brand/acc-gt-white.svg';

type SourceType = 'ollama' | 'fallback' | 'unknown' | null;

function ChatPanel() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [asked, setAsked] = useState('');
  const [lastSource, setLastSource] = useState<SourceType>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [history, setHistory] = useState<{ question: string; answer: string; source?: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const canAsk = question.trim().length > 0 && !loading;

  const handleAsk = async () => {
    if (!canAsk) return;
    const currentQuestion = question;
    setAsked(currentQuestion);
    setLoading(true);
    setAnswer('');
    setLastSource(null);
    setReason(null);

    try {
      // onToken atualiza a resposta em tempo real conforme o LLM gera o texto.
      const res = await askAgent(currentQuestion, {
        onToken: (full) => {
          setAnswer(full);
          setLastSource('ollama');
        },
      });

      const entry = { question: currentQuestion, answer: res.answer, source: res.source };
      setHistory((prev) => [entry, ...prev]);
      setAnswer(res.answer);
      setLastSource(res.source);
      setReason(res.reason ?? null);
      setQuestion('');
    } catch (error) {
      const text = 'Erro ao processar a pergunta. Verifique a conexão com o servidor local Ollama ou use o agente offline.';
      setAnswer(text);
      setLastSource('unknown');
      setReason(error instanceof Error ? error.message : null);
      setHistory((prev) => [{ question: currentQuestion, answer: text, source: 'unknown' }, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const placeholder = useMemo(
    () => 'Pergunte sobre metas, prazos, submetas ou evidências...',
    [],
  );

  const sourceLabel =
    lastSource === 'ollama' ? 'Ollama' : lastSource === 'fallback' ? 'Local' : 'Desconhecido';

  return (
    <section className="chat-panel">
      <div className="chat-body">
        {asked && (
          <div className="chat-msg chat-msg--user">
            <div className="chat-bubble chat-bubble--user">{asked}</div>
          </div>
        )}

        {answer ? (
          <div className="chat-msg chat-msg--bot">
            <div className="chat-avatar">
              <img src={AVATAR_SRC} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>
            <div className="chat-bubble chat-bubble--bot">
              <div className="response-header">
                <span className="response-title">Resposta</span>
                <span className={`response-badge ${lastSource ?? ''}`}>{sourceLabel}</span>
              </div>
              <pre>
                {answer}
                {loading && lastSource === 'ollama' ? ' ▍' : ''}
              </pre>
              {!loading && lastSource === 'fallback' && reason && (
                <p className="response-note">Resposta local usada: {reason}</p>
              )}
            </div>
          </div>
        ) : loading ? (
          <div className="chat-msg chat-msg--bot">
            <div className="chat-avatar">
              <img src={AVATAR_SRC} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>
            <div className="chat-bubble chat-bubble--bot">
              <div className="chat-typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        ) : !asked ? (
          <div className="chat-empty">
            <div className="chat-empty-icon">💡</div>
            <p>Faça uma pergunta sobre suas metas, prazos, submetas ou evidências exibidas no site.</p>
          </div>
        ) : null}
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
        <button
          type="button"
          className="chat-send-button"
          onClick={handleAsk}
          disabled={!canAsk}
          aria-label={loading ? 'Gerando resposta' : 'Perguntar'}
          title={loading ? 'Gerando...' : 'Perguntar'}
        >
          {loading ? <span className="chat-spinner" /> : <span className="send-icon">➤</span>}
        </button>
      </div>
    </section>
  );
}

export default ChatPanel;
