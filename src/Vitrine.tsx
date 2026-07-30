import siteData from './site-data.json';

type Tool = {
  name: string;
  logo: string;
  color: string;
  logoColor: string;
};

type Project = {
  id: string;
  title: string;
  subtitle: string;
  period: string;
  banner: string;
  description: string;
  tools: Tool[];
  challenges: string[];
  evolution: string[];
  results: string[];
};

const projects = (siteData as { projects?: Project[] }).projects ?? [];

function shieldUrl(tool: Tool): string {
  const label = encodeURIComponent(tool.name.replace(/-/g, '--').replace(/_/g, '__'));
  return `https://img.shields.io/badge/${label}-${tool.color}?style=for-the-badge&logo=${tool.logo}&logoColor=${tool.logoColor}`;
}

type DetailBlock = {
  key: 'challenges' | 'evolution' | 'results';
  title: string;
  icon: string;
};

const DETAIL_BLOCKS: DetailBlock[] = [
  { key: 'challenges', title: 'Desafios', icon: '⚠' },
  { key: 'evolution', title: 'Evolução', icon: '📈' },
  { key: 'results', title: 'Resultados', icon: '🏆' },
];

function Vitrine({ selectedPeriod }: { selectedPeriod: string }) {
  const visibleProjects = projects.filter((project) => project.period === selectedPeriod);

  if (visibleProjects.length === 0) {
    return (
      <section className="info-card">
        <h2>Vitrine de projetos</h2>
        <p>Nenhum projeto cadastrado para o período <strong>{selectedPeriod}</strong>.</p>
      </section>
    );
  }

  return (
    <section className="vitrine-list">
      {visibleProjects.map((project) => (
        <article key={project.id} className="project-card">
          <div className="project-banner">
            <img src={project.banner} alt={`Banner do projeto ${project.title}`} />
            <div className="project-banner-overlay">
              <h3>{project.title}</h3>
              <p>{project.subtitle}</p>
            </div>
          </div>

          <div className="project-body">
            <div className="project-panel project-description">
              <h4>Descrição</h4>
              <p>{project.description}</p>
            </div>

            <div className="project-panel project-tools">
              <h4>Ferramentas</h4>
              <div className="project-shields">
                {project.tools.map((tool) => (
                  <img
                    key={`${project.id}-${tool.name}`}
                    src={shieldUrl(tool)}
                    alt={tool.name}
                    loading="lazy"
                  />
                ))}
              </div>
            </div>

            <div className="project-detail-grid">
              {DETAIL_BLOCKS.map((block) => (
                <div key={block.key} className={`project-panel project-detail project-detail--${block.key}`}>
                  <h4>
                    <span className="project-detail-icon">{block.icon}</span>
                    {block.title}
                  </h4>
                  <ul>
                    {project[block.key].map((item, index) => (
                      <li key={`${project.id}-${block.key}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

export default Vitrine;
