import { useMemo, useState } from 'react';
import ChatBalloon from './ChatBalloon';
import siteData from './site-data.json';

type Subgoal = {
  title: string;
  completed: boolean;
  evidence: string[];
};

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
  const [selectedPeriod, setSelectedPeriod] = useState<string>(periods[0]);
  const [imageIndexes, setImageIndexes] = useState<Record<string, number>>({});
  const [expandedSubgoals, setExpandedSubgoals] = useState<Record<string, boolean>>({});

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
          <p>Filtre metas por período avaliativo e acompanhe o avanço com submetas e comprovações visuais.</p>
        </div>
      </header>

      <div className="page-controls">
        <div className="filter-card">
          <span className="filter-label">Período avaliativo</span>
          <select value={selectedPeriod} onChange={(event) => setSelectedPeriod(event.target.value)}>
            {periods.map((period) => (
              <option key={period} value={period}>
                {period}
              </option>
            ))}
          </select>
        </div>

        <div className="summary-card">
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
        </div>
      </div>

      <main>
        <section className="info-card">
          <h2>Visão de performance</h2>
          <p>Este painel exibe metas locais organizadas por ano fiscal. Cada meta apresenta submetas, itens de evidência e um carrossel de imagens para facilitar a análise visual.</p>
        </section>

        <ChatBalloon />

        <section className="goal-list">
          {filteredGoals.map((goal) => {
            const currentImageIndex = imageIndexes[goal.id] ?? 0;
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
                        <small>{`${goal.subgoals.filter((item) => item.completed).length}/${goal.subgoals.length} concluídas`}</small>
                      </div>
                      <div className="progress-chip">
                        <span>{Math.round((goal.subgoals.filter((item) => item.completed).length / goal.subgoals.length) * 100)}%</span>
                        <small>Concluído</small>
                      </div>
                    </div>

                    <div className="goal-progress-bar">
                      <div
                        className="goal-progress-fill"
                        style={{
                          width: `${Math.round((goal.subgoals.filter((item) => item.completed).length / goal.subgoals.length) * 100)}%`,
                        }}
                      />
                    </div>

                    <div className="subgoal-grid">
                      {goal.subgoals.map((subgoal, index) => {
                        const key = `${goal.id}-${index}`;
                        const expanded = expandedSubgoals[key] ?? false;
                        return (
                          <button
                            key={key}
                            type="button"
                            className={`subgoal-card ${expanded ? 'expanded' : ''}`}
                            onClick={() => toggleSubgoal(goal.id, index)}
                          >
                            <div className="subgoal-card-header">
                              <div className="subgoal-title-row">
                                <span className="checkmark">{subgoal.completed ? '✓' : '○'}</span>
                                <span>{subgoal.title}</span>
                              </div>
                              <span className="toggle-icon">{expanded ? '−' : '+'}</span>
                            </div>

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
                        <img src={goal.images[currentImageIndex]} alt={`${goal.title} comprovação ${currentImageIndex + 1}`} />
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
      </main>
    </div>
  );
}

export default App;
