import { useEffect, useMemo, useState } from 'react';
import siteData from './site-data.json';

type TeamMember = {
  name: string;
  role?: string;
};

type TrajectoryEventType =
  | 'accenture-admission'
  | 'project-start'
  | 'achievement'
  | 'milestone';

type TrajectoryEvent = {
  id: string;
  date: string;
  endDate?: string;
  type: TrajectoryEventType;
  title: string;
  description?: string;
  company?: string;
  project?: string;
  team?: TeamMember[];
};

const events = (siteData as { trajectory?: TrajectoryEvent[] }).trajectory ?? [];

const TYPE_CONFIG: Record<TrajectoryEventType, { label: string; icon: string }> = {
  'accenture-admission': { label: 'Admissão na Accenture', icon: '🧳' },
  'project-start': { label: 'Início de projeto', icon: '🚀' },
  achievement: { label: 'Conquista', icon: '🏆' },
  milestone: { label: 'Marco importante', icon: '🎯' },
};

function typeConfig(type: TrajectoryEventType) {
  return TYPE_CONFIG[type] ?? { label: type, icon: '•' };
}

const MESES_ABBR = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

// Ano fiscal: Q1 inicia em setembro. FY26 = set/2025 → ago/2026.
const FISCAL_START_MONTH = 9;

// Quarters com o mês de início (Q1 set, Q2 dez, Q3 mar, Q4 jun).
const QUARTERS = [
  { q: 1, startMonth: 9 },
  { q: 2, startMonth: 12 },
  { q: 3, startMonth: 3 },
  { q: 4, startMonth: 6 },
];

// Sequência de meses do ano fiscal (set → ago), com o deslocamento (0..11).
const FISCAL_MONTHS = Array.from({ length: 12 }, (_, offset) => {
  const month = ((FISCAL_START_MONTH - 1 + offset) % 12) + 1;
  return { month, offset, abbr: MESES_ABBR[month - 1] };
});

function fiscalYearNumber(iso: string): number {
  const [year, month] = iso.split('-').map(Number);
  // meses set–dez pertencem ao FY que termina no ano seguinte
  return month >= FISCAL_START_MONTH ? year + 1 : year;
}

function fiscalLabel(fyNumber: number): string {
  return `FY${String(fyNumber).slice(-2)}`;
}

// Deslocamento em meses (fracionário) a partir de setembro: set=0 … ago≈11.9
function fiscalOffset(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number);
  const monthOffset = (month - FISCAL_START_MONTH + 12) % 12;
  const daysInMonth = new Date(year, month, 0).getDate();
  return monthOffset + (day - 1) / daysInMonth;
}

// Posição horizontal (%) na trilha de 12 meses, com margem para não cortar as bordas.
function positionPct(offset: number): number {
  const raw = (offset / 12) * 100;
  return Math.min(98.5, Math.max(1.5, raw));
}

function formatShort(iso: string): string {
  const [year, month] = iso.split('-').map(Number);
  if (!year || !month) return iso;
  return `${MESES_ABBR[month - 1]}/${year}`;
}

function formatLong(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  return `${day} de ${MESES[month - 1]} de ${year}`;
}

type MonthGroup = {
  key: string;
  label: string;
  events: TrajectoryEvent[];
};

function Trajetoria({ selectedPeriod }: { selectedPeriod: string }) {
  const periodEvents = useMemo(
    () =>
      events
        .filter((event) => fiscalLabel(fiscalYearNumber(event.date)) === selectedPeriod)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [selectedPeriod],
  );

  // Agrupamento por mês para o resumo. periodEvents já vem ordenado por data
  // crescente e, dentro de um mesmo FY, essa ordem coincide com a ordem fiscal;
  // o Map preserva a ordem de inserção.
  const monthGroups = useMemo<MonthGroup[]>(() => {
    const map = new Map<string, TrajectoryEvent[]>();
    for (const event of periodEvents) {
      const [year, month] = event.date.split('-').map(Number);
      const key = `${year}-${String(month).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }
    return [...map.entries()].map(([key, list]) => {
      const [year, month] = key.split('-').map(Number);
      return {
        key,
        label: `${MESES[month - 1]} de ${year}`,
        events: list,
      };
    });
  }, [periodEvents]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = events.find((event) => event.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedId(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selected]);

  const rangeStartYear = periodEvents.length
    ? fiscalYearNumber(periodEvents[0].date) - 1
    : null;

  return (
    <section className="trajectory">
      <div className="info-card trajectory-intro">
        <h2>Trajetória — {selectedPeriod}</h2>
        <p>Linha do tempo do ano fiscal selecionado. Clique em um marcador para ver os detalhes.</p>
        <div className="trajectory-legend">
          {(Object.keys(TYPE_CONFIG) as TrajectoryEventType[]).map((type) => (
            <span key={type} className="trajectory-legend-item">
              <span aria-hidden="true">{TYPE_CONFIG[type].icon}</span>
              {TYPE_CONFIG[type].label}
            </span>
          ))}
        </div>
      </div>

      {periodEvents.length === 0 ? (
        <div className="info-card">
          <p>Nenhum marco cadastrado para o período <strong>{selectedPeriod}</strong>.</p>
        </div>
      ) : (
        <>
          <div className="trajectory-fy">
            <div className="trajectory-fy-head">
              <h3>{selectedPeriod}</h3>
              {rangeStartYear !== null && (
                <span className="trajectory-fy-range">set/{rangeStartYear} – ago/{rangeStartYear + 1}</span>
              )}
            </div>

            <div className="trajectory-fy-scroll">
              <div className="trajectory-fy-track">
                {QUARTERS.map((quarter, index) => (
                  <div
                    key={`band-${quarter.q}`}
                    className={`trajectory-band ${index % 2 === 1 ? 'alt' : ''}`}
                    style={{ left: `${index * 25}%` }}
                  />
                ))}

                {/* Subticks de meses. Os offsets 0/3/6/9 são início de quarter e
                    reaproveitam a própria linha do quarter como divisória do mês. */}
                {FISCAL_MONTHS.filter((m) => m.offset % 3 !== 0).map((m) => (
                  <span
                    key={`month-tick-${m.offset}`}
                    className="trajectory-month-tick"
                    style={{ left: `${(m.offset / 12) * 100}%` }}
                    aria-hidden="true"
                  />
                ))}
                {FISCAL_MONTHS.map((m) => (
                  <span
                    key={`month-label-${m.offset}`}
                    className="trajectory-month-label"
                    style={{ left: `${((m.offset + 0.5) / 12) * 100}%` }}
                  >
                    {m.abbr}
                  </span>
                ))}

                <div className="trajectory-baseline" aria-hidden="true" />

                {QUARTERS.map((quarter, index) => (
                  <div
                    key={`q-${quarter.q}`}
                    className="trajectory-quarter"
                    style={{ left: `${index * 25}%` }}
                  >
                    <span className="trajectory-quarter-tick" aria-hidden="true" />
                    <span className="trajectory-quarter-label">
                      Q{quarter.q}
                      <small>{MESES_ABBR[quarter.startMonth - 1]}</small>
                    </span>
                  </div>
                ))}

                {periodEvents.map((event) => {
                  const config = typeConfig(event.type);
                  const active = event.id === selectedId;
                  const left = `${positionPct(fiscalOffset(event.date))}%`;
                  return (
                    <span key={event.id}>
                      <span
                        className="trajectory-connector"
                        style={{ left }}
                        aria-hidden="true"
                      />
                      <button
                        type="button"
                        className={`trajectory-marker ${active ? 'active' : ''}`}
                        style={{ left }}
                        onClick={() => setSelectedId(event.id)}
                        title={`${event.title} — ${formatShort(event.date)}`}
                        aria-label={`${config.label}: ${event.title} — ${formatLong(event.date)}`}
                      >
                        <span className="trajectory-marker-emoji" aria-hidden="true">{config.icon}</span>
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Resumo: títulos dos marcadores por mês */}
          <div className="trajectory-summary">
            <h3 className="trajectory-summary-title">Resumo por mês</h3>
            <div className="trajectory-summary-grid">
              {monthGroups.map((group) => (
                <div key={group.key} className="trajectory-summary-month">
                  <span className="trajectory-summary-month-label">{group.label}</span>
                  <ul>
                    {group.events.map((event) => {
                      const config = typeConfig(event.type);
                      return (
                        <li key={event.id}>
                          <button
                            type="button"
                            className="trajectory-summary-item"
                            onClick={() => setSelectedId(event.id)}
                          >
                            <span className="trajectory-summary-item-icon" aria-hidden="true">{config.icon}</span>
                            <span className="trajectory-summary-item-title">{event.title}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {selected && (() => {
        const config = typeConfig(selected.type);
        // Eventos de projeto exibem início e término; quando não há término
        // definido, sinaliza "Em andamento". Demais tipos mostram a data única.
        const isRange = selected.type === 'project-start' || !!selected.endDate;
        const startLabel = isRange ? 'Início' : 'Data';
        return (
          <div className="trajectory-modal-overlay" onClick={() => setSelectedId(null)}>
            <div
              className="trajectory-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="trajectory-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="trajectory-modal-close"
                onClick={() => setSelectedId(null)}
                aria-label="Fechar"
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>

              <div className="trajectory-modal-header">
                <span className="trajectory-modal-icon" aria-hidden="true">{config.icon}</span>
                <div>
                  <span className="trajectory-modal-type">{config.label}</span>
                  <h3 id="trajectory-modal-title">{selected.title}</h3>
                  <span className="trajectory-modal-fy">{fiscalLabel(fiscalYearNumber(selected.date))}</span>
                </div>
              </div>

              <div className="trajectory-modal-dates">
                <div className="trajectory-date-item">
                  <span className="trajectory-date-label">{startLabel}</span>
                  <span className="trajectory-date-value">{formatLong(selected.date)}</span>
                </div>
                {isRange && (
                  <div className="trajectory-date-item">
                    <span className="trajectory-date-label">Término</span>
                    <span className="trajectory-date-value">
                      {selected.endDate ? formatLong(selected.endDate) : 'Em andamento'}
                    </span>
                  </div>
                )}
              </div>

              <div className="trajectory-modal-chips">
                {selected.company && (
                  <span className="trajectory-chip trajectory-chip--company">🏢 {selected.company}</span>
                )}
                {selected.project && (
                  <span className="trajectory-chip trajectory-chip--project">📁 {selected.project}</span>
                )}
              </div>

              {selected.description && (
                <p className="trajectory-modal-description">{selected.description}</p>
              )}

              {selected.team && selected.team.length > 0 && (
                <div className="trajectory-team">
                  <h4>Equipe</h4>
                  <ul className="trajectory-team-list">
                    {selected.team.map((member, index) => (
                      <li key={`${selected.id}-member-${index}`} className="trajectory-team-member">
                        <span className="trajectory-team-avatar" aria-hidden="true">
                          {member.name.trim().charAt(0).toUpperCase() || '?'}
                        </span>
                        <span className="trajectory-team-info">
                          <span className="trajectory-team-name">{member.name}</span>
                          {member.role && <span className="trajectory-team-role">{member.role}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </section>
  );
}

export default Trajetoria;