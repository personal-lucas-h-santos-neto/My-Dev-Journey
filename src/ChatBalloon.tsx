import { useEffect, useState } from 'react';
import ChatPanel from './ChatPanel';
import { checkOllamaAvailable } from './agent';

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

  return (
    <div className={`chat-balloon ${open ? 'open' : 'closed'}`}>
      <button
        className="chat-toggle-button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title={open ? 'Fechar agente' : 'Abrir agente'}
      >
        <span className="chat-icon">💬</span>
        <span className={`status-dot ${ollamaOnline ? 'online' : ollamaOnline === false ? 'offline' : 'unknown'}`} />
      </button>

      {open && (
        <div className="chat-balloon-panel">
          <ChatPanel />
          <div className="chat-footer-note">
            Respostas tentam usar Ollama local (<strong>{ollamaOnline ? 'conectado' : ollamaOnline === false ? 'offline' : 'verificando...'}</strong>)
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatBalloon;
