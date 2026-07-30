import { useEffect, useMemo, useState } from 'react';
import ChatBalloon from './ChatBalloon';
import Vitrine from './Vitrine';
import siteData from './site-data.json';

const BASE = import.meta.env.BASE_URL;
function resolveImage(path: string): string {
  if (path.startsWith('http')) return path;
  return BASE + path;
}

type Tab = 'metas' | 'vitrine';

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
  if (pct === 0) return '#e2e8f0';
  if (pct < 34) return 'linear-gradient(90deg, #ef4444, #f97316)';
  if (pct < 67) return 'linear-gradient(90deg, #f59e0b, #fbbf24)';
  if (pct < 100) return 'linear-gradient(90deg, #3b82f6, #0ea5e9)';
  return 'linear-gradient(90deg, #10b981, #22c55e)';
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

const { periods, goals } = siteData;

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('metas');
  const [selectedPeriod, setSelectedPeriod] = useState<string>(periods[0]);
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
    const total = filteredGoals.length;
    const withEvidence = filteredGoals.filter((goal) =>
      goal.subgoals.some((subgoal) => subgoal.evidence.length > 0),
    ).length;
    return {
      total,
      withEvidence,
      completionRate: total ? Math.round((withEvidence / total) * 100) : 0,
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
    <div className="app-shell">
      <header>
        <div>
          <span className="eyebrow">Tracker de metas</span>
          <h1>Minha jornada de desenvolvimento</h1>
          <p>
            {activeTab === 'metas'
              ? 'Filtre metas por período avaliativo e acompanhe o avanço com submetas e comprovações visuais.'
              : 'Explore projetos em detalhe: banner, descrição, ferramentas, desafios, evolução e resultados.'}
          </p>
        </div>
      </header>

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
              <div>
                <span>{progressSummary.total}</span>
                <small>Metas no período</small>
              </div>
              <div>
                <span>{progressSummary.withEvidence}</span>
                <small>Com evidência</small>
              </div>
              <div>
                <span>{progressSummary.completionRate}%</span>
                <small>Progresso estimado</small>
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

        {activeTab === 'metas' && (
        <section className="goal-list">
          {filteredGoals.map((goal) => {
            const currentImageIndex = imageIndexes[goal.id] ?? 0;
            const completedCount = goal.subgoals.filter((s) => s.completed).length;
            const pct = Math.round((completedCount / goal.subgoals.length) * 100);
            return (
              <article key={goal.id} className="goal-card">
                <div className="goal-header">
                  <div>
                    <h3>{goal.title}</h3>
                    <p>{goal.description}</p>
                  </div>
                  <div className="goal-meta">
                    <span className="deadline-label">Prazo</span>
                    <strong>{goal.deadline}</strong>
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
                        <button className="carousel-control prev" onClick={() => changeSlide(goal.id, 'prev')}>
                          ‹
                        </button>
                        <button
                          type="button"
                          className="carousel-expand-btn"
                          onClick={() => setLightbox({ goalId: goal.id, index: currentImageIndex })}
                          aria-label="Ampliar imagem"
                        >
                          <img src={resolveImage(goal.images[currentImageIndex])} alt={`${goal.title} comprovação ${currentImageIndex + 1}`} />
                          <span className="carousel-expand-hint">⤢</span>
                        </button>
                        <button className="carousel-control next" onClick={() => changeSlide(goal.id, 'next')}>
                          ›
                        </button>
                      </div>
                      <div className="carousel-indicators">
                        {goal.images.map((_, index) => (
                          <button
                            key={`${goal.id}-indicator-${index}`}
                            className={index === currentImageIndex ? 'active' : ''}
                            onClick={() => selectSlide(goal.id, index)}
                            type="button"
                          />
                        ))}
                      </div>
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
              <button className="lightbox-close" onClick={() => setLightbox(null)} aria-label="Fechar">×</button>
              {total > 1 && (
                <button className="lightbox-nav lightbox-prev" onClick={prev} aria-label="Anterior">‹</button>
              )}
              <img src={resolveImage(src)} alt={`${goal.title} comprovação ${lightbox.index + 1}`} className="lightbox-img" />
              {total > 1 && (
                <button className="lightbox-nav lightbox-next" onClick={next} aria-label="Próxima">›</button>
              )}
              {total > 1 && (
                <div className="lightbox-counter">{lightbox.index + 1} / {total}</div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default App;
