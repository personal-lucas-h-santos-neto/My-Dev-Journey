import { useState } from 'react';

const LOGO_SRC = import.meta.env.BASE_URL + 'assets/brand/acc-gt-white.svg';

/**
 * Avatar do agente conversacional.
 * Em desenvolvimento usa o símbolo da marca (arquivo local, protegido e fora do
 * repositório); em produção usa um emoji de robô para não expor o asset
 * proprietário nem gerar requisição 404. Se o arquivo local faltar, cai no emoji.
 */
function BotAvatar() {
  const [imgFailed, setImgFailed] = useState(false);

  if (import.meta.env.DEV && !imgFailed) {
    return <img src={LOGO_SRC} alt="" onError={() => setImgFailed(true)} />;
  }

  return (
    <span className="bot-avatar-emoji" role="img" aria-label="Assistente virtual">
      🤖
    </span>
  );
}

export default BotAvatar;