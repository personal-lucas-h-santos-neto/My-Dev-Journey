import { useEffect, useMemo, useRef, useState } from 'react';
import ChatBalloon from './ChatBalloon';
import Vitrine from './Vitrine';
import Trajetoria from './Trajetoria';
import accLogo from './assets/brand/acc-logo.svg';
import accLogoWhite from './assets/brand/acc-logo-white.svg';
import siteData from './site-data.json';

const BASE = import.meta.env.BASE_URL;
function resolveImage(path: string): string {
  if (path.startsWith('http')) return path;
  return BASE + path;
}

type Tab = 'metas' | 'vitrine' | 'trajetoria';
type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const saved = window.localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const TAB_DESCRIPTIONS: Record<Tab, string> = {
  metas: 'Filtre metas por período avaliativo e acompanhe o avanço com submetas e comprovações visuais.',
  vitrine: 'Explore projetos em detalhe: descrição, ferramentas, desafios, evolução e resultados.',
  trajetoria: 'Percorra a linha do tempo de projetos e marcos importantes. Clique em um marcador para ver os detalhes.',
};

const TABS = Object.keys(TAB_DESCRIPTIONS) as Tab[];

type Subgoal = {
  title: string;
  completed: boolean;
  evidence: string[];
};

type SubgoalStatus = 'completed' | 'in-progress' | 'failed';

function getSubgoalStatus(completed: boolean, deadline: string): SubgoalStatus {
  if (completed) return 'completed';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(deadline) >= today ? 'in-progress' : 'failed';
}

const STATUS_CONFIG: Record<SubgoalStatus, { icon: string; label: string }> = {
  completed: { icon: '✓', label: 'Concluída' },
  'in-progress': { icon: '◑', label: 'Em andamento' },
  failed: { icon: '✕', label: 'Prazo expirado' },
};

function getProgressColor(pct: number): string {
  if (pct === 0) return '#cfcfcf';
  if (pct < 34) return 'linear-gradient(90deg, #ef4444, #f97316)';
  if (pct < 67) return 'linear-gradient(90deg, #f59e0b, #fbbf24)';
  if (pct < 100) return 'linear-gradient(90deg, #7500c0, #a100ff)';
  return 'linear-gradient(90deg, #10b981, #22c55e)';
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function formatJoinDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  return `${day} de ${MESES[month - 1]} de ${year}`;
}

const MESES_ABBR = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

type DeadlineStatus = 'ok' | 'soon' | 'overdue' | 'completed';
type DeadlineInfo = { formatted: string; status: DeadlineStatus; remaining: string };

function getDeadlineInfo(iso: string, isCompleted = false): DeadlineInfo {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return { formatted: iso, status: 'ok', remaining: '' };

  const target = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  const formatted = `${String(day).padStart(2, '0')} ${MESES_ABBR[month - 1]} ${year}`;

  if (isCompleted) {
    return { formatted, status: 'completed', remaining: 'Concluída no prazo' };
  }

  if (diffDays < 0) {
    const n = Math.abs(diffDays);
    const remaining = n > 30 ? 'Encerrado há > 30 dias' : `Encerrado há ${n} ${n === 1 ? 'dia' : 'dias'}`;
    return { formatted, status: 'overdue', remaining };
  }
  if (diffDays === 0) {
    return { formatted, status: 'soon', remaining: 'Encerra hoje' };
  }
  if (diffDays <= 30) {
    return { formatted, status: 'soon', remaining: `Faltam ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}` };
  }
  if (diffDays <= 60) {
    return { formatted, status: 'ok', remaining: `Faltam ${diffDays} dias` };
  }
  const months = Math.round(diffDays / 30);
  return { formatted, status: 'ok', remaining: `Faltam ~${months} ${months === 1 ? 'mês' : 'meses'}` };
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback abaixo
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

type LightboxState = { goalId: string; index: number };

type Goal = {
  id: string;
  title: string;
  description: string;
  deadline: string;
  period: string;
  images: string[];
  subgoals: Subgoal[];
};

const { periods, goals, user } = siteData;

function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [profileOpen, setProfileOpen] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleCopyEmail = async () => {
    const ok = await copyToClipboard(user.email);
    if (ok) {
      setEmailCopied(true);
      window.setTimeout(() => setEmailCopied(false), 2000);
    }
  };
  const [activeTab, setActiveTab] = useState<Tab>('metas');
  const [selectedPeriod, setSelectedPeriod] = useState<string>(periods[0]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!profileOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProfileOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [profileOpen]);
  const [imageIndexes, setImageIndexes] = useState<Record<string, number>>({});
  const [expandedSubgoals, setExpandedSubgoals] = useState<Record<string, boolean>>({});
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    const goal = goals.find((g) => g.id === lightbox.goalId);
    if (!goal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowLeft')
        setLightbox((prev) => prev ? { ...prev, index: (prev.index - 1 + goal.images.length) % goal.images.length } : null);
      if (e.key === 'ArrowRight')
        setLightbox((prev) => prev ? { ...prev, index: (prev.index + 1) % goal.images.length } : null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox]);

  const filteredGoals = useMemo(
    () => goals.filter((goal) => goal.period === selectedPeriod),
    [selectedPeriod],
  );

  const progressSummary = useMemo(() => {
    const totalGoals = filteredGoals.length;
    const completedGoals = filteredGoals.filter((goal) =>
      goal.subgoals.length > 0 && goal.subgoals.every((s) => s.completed),
    ).length;
    const allSubgoals = filteredGoals.flatMap((goal) => goal.subgoals);
    const totalSubgoals = allSubgoals.length;
    const completedSubgoals = allSubgoals.filter((s) => s.completed).length;
    const totalEvidence = allSubgoals.reduce((acc, s) => acc + s.evidence.length, 0);
    return {
      totalGoals,
      completedGoals,
      totalSubgoals,
      completedSubgoals,
      totalEvidence,
    };
  }, [filteredGoals]);

  const changeSlide = (goalId: string, direction: 'prev' | 'next') => {
    const goal = goals.find((goal) => goal.id === goalId);
    if (!goal || goal.images.length === 0) return;

    setImageIndexes((prev) => {
      const current = prev[goalId] ?? 0;
      const nextIndex =
        direction === 'next'
          ? (current + 1) % goal.images.length
          : (current - 1 + goal.images.length) % goal.images.length;
      return { ...prev, [goalId]: nextIndex };
    });
  };

  const selectSlide = (goalId: string, index: number) => {
    setImageIndexes((prev) => ({ ...prev, [goalId]: index }));
  };

  const toggleSubgoal = (goalId: string, index: number) => {
    const key = `${goalId}-${index}`;
    setExpandedSubgoals((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <div className="brand-bar">
            <img
              src={theme === 'dark' ? accLogoWhite : accLogo}
              alt="Accenture"
              className="brand-logo"
            />
            <span className="brand-divider" />
            <span className="brand-tagline">Let there be change</span>
          </div>
          <div className="app-header-actions">
            <button
              type="button"
              className="theme-toggle"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            <div className="user-menu" ref={userMenuRef}>
              <button
                type="button"
                className={`user-avatar-button ${profileOpen ? 'active' : ''}`}
                onClick={() => setProfileOpen((open) => !open)}
                aria-haspopup="true"
                aria-expanded={profileOpen}
                aria-label="Informações do usuário"
              >
                <img src={resolveImage(user.avatar)} alt={user.name} />
              </button>

              {profileOpen && (
                <div className="user-dropdown" role="menu">
                  <div className="user-dropdown-header">
                    <img src={resolveImage(user.avatar)} alt="" className="user-dropdown-avatar" />
                    <div className="user-dropdown-identity">
                      <strong>{user.name}</strong>
                      <button
                        type="button"
                        className={`user-email-copy ${emailCopied ? 'copied' : ''}`}
                        onClick={handleCopyEmail}
                        title="Copiar e-mail"
                      >
                        {emailCopied ? (
                          <>
                            <span className="user-email-icon" aria-hidden="true">✓</span>
                            <span className="user-email-text">E-mail copiado!</span>
                          </>
                        ) : (
                          <>
                            <span className="user-email-text">{user.email}</span>
                            <span className="user-email-icon" aria-hidden="true">⧉</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <dl className="user-dropdown-info">
                    <div>
                      <dt>Projeto atual</dt>
                      <dd>{user.currentProject}</dd>
                    </div>
                    <div>
                      <dt>Data de entrada</dt>
                      <dd>{formatJoinDate(user.joinDate)}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="app-shell">
        <section className="hero">
          <span className="eyebrow">Tracker de metas</span>
          <h1>Minha jornada de desenvolvimento</h1>
          <div className="hero-desc">
            {TABS.map((tab) => (
              <p
                key={tab}
                className={tab === activeTab ? 'active' : ''}
                aria-hidden={tab !== activeTab}
              >
                {TAB_DESCRIPTIONS[tab]}
              </p>
            ))}
          </div>
        </section>

      <div className="tab-bar">
        <nav className="tab-nav" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'metas'}
            className={`tab-button ${activeTab === 'metas' ? 'active' : ''}`}
            onClick={() => setActiveTab('metas')}
          >
            Metas
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'vitrine'}
            className={`tab-button ${activeTab === 'vitrine' ? 'active' : ''}`}
            onClick={() => setActiveTab('vitrine')}
          >
            Vitrine
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'trajetoria'}
            className={`tab-button ${activeTab === 'trajetoria' ? 'active' : ''}`}
            onClick={() => setActiveTab('trajetoria')}
          >
            Trajetória
          </button>
        </nav>

        <div className="filter-card compact">
          <span className="filter-label">Período avaliativo</span>
          <select value={selectedPeriod} onChange={(event) => setSelectedPeriod(event.target.value)}>
            {periods.map((period) => (
              <option key={period} value={period}>
                {period}
              </option>
            ))}
          </select>
        </div>
      </div>

      <main>
        {activeTab === 'metas' && (
          <section className="summary-card">
            <strong>Resumo</strong>
            <div className="summary-grid">
              {/* <div>
                <span>{progressSummary.totalGoals}</span>
                <small>Metas definidas</small>
              </div>
              <div>
                <span>{progressSummary.totalSubgoals}</span>
                <small>Submetas</small>
              </div> */}
              <div>
                <span>{progressSummary.completedGoals}/{progressSummary.totalGoals}</span>
                <small>Metas concluídas</small>
              </div>
              <div>
                <span>{progressSummary.completedSubgoals}/{progressSummary.totalSubgoals}</span>
                <small>Submetas concluídas</small>
              </div>
              <div>
                <span>{progressSummary.totalEvidence}</span>
                <small>Evidências coletadas</small>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'metas' && (
          <section className="info-card">
            <h2>Visão de performance</h2>
            <p>Este painel exibe metas locais organizadas por ano fiscal. Cada meta apresenta submetas, itens de evidência e um carrossel de imagens para facilitar a análise visual.</p>
          </section>
        )}

        <ChatBalloon />

        {activeTab === 'vitrine' && <Vitrine selectedPeriod={selectedPeriod} />}

        {activeTab === 'trajetoria' && <Trajetoria selectedPeriod={selectedPeriod} />}

        {activeTab === 'metas' && (
        <section className="goal-list">
          {filteredGoals.map((goal) => {
            const currentImageIndex = imageIndexes[goal.id] ?? 0;
            const completedCount = goal.subgoals.filter((s) => s.completed).length;
            const pct = Math.round((completedCount / goal.subgoals.length) * 100);
            const isGoalCompleted = goal.subgoals.length > 0 && completedCount === goal.subgoals.length;
            const deadline = getDeadlineInfo(goal.deadline, isGoalCompleted);
            return (
              <article key={goal.id} className="goal-card">
                <div className="goal-header">
                  <div>
                    <h3>{goal.title}</h3>
                    <p>{goal.description}</p>
                  </div>
                  <div className="goal-meta">
                    <span className="deadline-label">Prazo</span>
                    <span className={`deadline-chip deadline-chip--${deadline.status}`}>
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      {deadline.formatted}
                    </span>
                    {deadline.remaining && (
                      <span className={`deadline-remaining deadline-remaining--${deadline.status}`}>
                        {deadline.remaining}
                      </span>
                    )}
                  </div>
                </div>

                <div className="goal-body">
                  <div className="subgoal-block">
                    <div className="subgoal-header">
                      <div>
                        <h4>Submetas</h4>
                        <small>{`${completedCount}/${goal.subgoals.length} concluídas`}</small>
                      </div>
                      <div className="progress-chip">
                        <span>{pct}% </span>
                        <small>Concluído</small>
                      </div>
                    </div>

                    <div className="goal-progress-bar">
                      <div
                        className="goal-progress-fill"
                        style={{ width: `${pct}%`, background: getProgressColor(pct) }}
                      />
                    </div>

                    <div className="subgoal-grid">
                      {goal.subgoals.map((subgoal, index) => {
                        const key = `${goal.id}-${index}`;
                        const expanded = expandedSubgoals[key] ?? false;
                        const status = getSubgoalStatus(subgoal.completed, goal.deadline);
                        const { icon, label } = STATUS_CONFIG[status];
                        return (
                          <button
                            key={key}
                            type="button"
                            className={`subgoal-card status-${status} ${expanded ? 'expanded' : ''}`}
                            onClick={() => toggleSubgoal(goal.id, index)}
                          >
                            <div className="subgoal-card-header">
                              <div className="subgoal-title-row">
                                <span className={`checkmark checkmark--${status}`}>{icon}</span>
                                <span>{subgoal.title}</span>
                              </div>
                              <span className="toggle-icon">{expanded ? '−' : '+'}</span>
                            </div>

                            {status !== 'completed' && (
                              <span className={`subgoal-status-badge subgoal-status-badge--${status}`}>{label}</span>
                            )}

                            {expanded && subgoal.evidence.length > 0 && (
                              <ul className="subgoal-evidence-list">
                                {subgoal.evidence.map((text, evidenceIndex) => (
                                  <li key={`${key}-evidence-${evidenceIndex}`}>{text}</li>
                                ))}
                              </ul>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {goal.images.length > 0 && (
                    <div className="carousel-card">
                      <div className="carousel-stage">
                        {goal.images.length > 1 && (
                          <button
                            className="carousel-control prev"
                            onClick={() => changeSlide(goal.id, 'prev')}
                            aria-label="Imagem anterior"
                            type="button"
                          >
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="15 18 9 12 15 6" />
                            </svg>
                          </button>
                        )}
                        <button
                          type="button"
                          className="carousel-expand-btn"
                          onClick={() => setLightbox({ goalId: goal.id, index: currentImageIndex })}
                          aria-label="Ampliar imagem"
                        >
                          <img src={resolveImage(goal.images[currentImageIndex])} alt={`${goal.title} comprovação ${currentImageIndex + 1}`} />
                          <span className="carousel-expand-hint">⤢</span>
                        </button>
                        {goal.images.length > 1 && (
                          <button
                            className="carousel-control next"
                            onClick={() => changeSlide(goal.id, 'next')}
                            aria-label="Próxima imagem"
                            type="button"
                          >
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          </button>
                        )}
                        {goal.images.length > 1 && (
                          <span className="carousel-counter">
                            {currentImageIndex + 1} / {goal.images.length}
                          </span>
                        )}
                      </div>
                      {goal.images.length > 1 && (
                        <div className="carousel-indicators">
                          {goal.images.map((_, index) => (
                            <button
                              key={`${goal.id}-indicator-${index}`}
                              className={index === currentImageIndex ? 'active' : ''}
                              onClick={() => selectSlide(goal.id, index)}
                              aria-label={`Ir para imagem ${index + 1}`}
                              type="button"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>
        )}
      </main>

      {lightbox && (() => {
        const goal = goals.find((g) => g.id === lightbox.goalId)!;
        const total = goal.images.length;
        const src = goal.images[lightbox.index];
        const prev = () => setLightbox({ goalId: lightbox.goalId, index: (lightbox.index - 1 + total) % total });
        const next = () => setLightbox({ goalId: lightbox.goalId, index: (lightbox.index + 1) % total });
        return (
          <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
              <button className="lightbox-close" onClick={() => setLightbox(null)} aria-label="Fechar">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
              {total > 1 && (
                <button className="lightbox-nav lightbox-prev" onClick={prev} aria-label="Anterior">
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
              )}
              <img src={resolveImage(src)} alt={`${goal.title} comprovação ${lightbox.index + 1}`} className="lightbox-img" />
              {total > 1 && (
                <button className="lightbox-nav lightbox-next" onClick={next} aria-label="Próxima">
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              )}
              {total > 1 && (
                <div className="lightbox-counter">{lightbox.index + 1} / {total}</div>
              )}
            </div>
          </div>
        );
      })()}
      </div>
    </>
  );
}

export default App;
