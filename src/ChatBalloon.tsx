import { useEffect, useState } from 'react';
import ChatPanel from './ChatPanel';
import { checkOllamaAvailable } from './agent';

const AVATAR_SRC = import.meta.env.BASE_URL + 'assets/brand/acc-gt-white.svg';

function ChatBalloon() {
  const [open, setOpen] = useState(false);
  const [ollamaOnline, setOllamaOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    checkOllamaAvailable()
      .then((ok) => mounted && setOllamaOnline(ok))
      .catch(() => mounted && setOllamaOnline(false));
    return () => {
      mounted = false;
    };
  }, []);

  const statusClass = ollamaOnline ? 'online' : ollamaOnline === false ? 'offline' : 'unknown';
  const statusText = ollamaOnline
    ? 'Ollama conectado'
    : ollamaOnline === false
      ? 'Ollama offline'
      : 'Verificando...';

  return (
    <div className={`chat-balloon ${open ? 'open' : 'closed'}`}>
      <button
        className="chat-toggle-button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title={open ? 'Fechar agente' : 'Abrir agente'}
      >
        <span className="chat-icon">💬</span>
        <span className={`status-dot ${statusClass}`} />
      </button>

      {open && (
        <div className="chat-balloon-panel">
          <div className="chat-panel-header">
            <div className="chat-panel-avatar">
              <img src={AVATAR_SRC} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>
            <div className="chat-panel-heading">
              <strong>Agente conversacional</strong>
              <span className={`chat-status ${statusClass}`}>
                <span className="chat-status-dot" />
                {statusText}
              </span>
            </div>
            <button
              type="button"
              className="chat-panel-close"
              onClick={() => setOpen(false)}
              aria-label="Fechar agente"
            >
              ×
            </button>
          </div>

          <ChatPanel />

          <div className="chat-footer-note">Respostas baseadas apenas no conteúdo exibido no site.</div>
        </div>
      )}
    </div>
  );
}

export default ChatBalloon;
