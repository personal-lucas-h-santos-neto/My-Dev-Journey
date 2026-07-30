export const periods = ['FY26', 'FY27'];

export const goals = [
  {
    id: 'goal-1',
    title: 'Trabalho em Equipe',
    description: 'Tornar-se referência no compartilhamento de informações, soluções e cooperação.',
    deadline: '2026-08-01',
    period: 'FY26',
    images: [
      'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=900&q=80',
    ],
    subgoals: [
      {
        title: 'Documentar processos internos do projeto',
        completed: true,
        evidence: ['Configuração do repositório de documentação', 'Definição de workflow para atualização', 'Checklist de revisão aprovado'],
      },
      {
        title: 'Realizar 3 reuniões de revisão de progresso',
        completed: true,
        evidence: ['Reuniões realizadas com clientes', 'Ações definidas em ata', 'Feedbacks incorporados no plano'],
      },
      {
        title: 'Orientar dois colegas em solução técnica',
        completed: false,
        evidence: ['Sessão de pair programming agendada', 'Documento de transferência de conhecimento em produção'],
      },
    ],
  },
  {
    id: 'goal-2',
    title: 'Certificação',
    description: 'Obter certificação relevante para o cargo e trabalho desempenhado.',
    deadline: '2027-03-15',
    period: 'FY26',
    images: [
      'https://images.unsplash.com/photo-1587614382346-acddf12d7b6d?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=900&q=80',
    ],
    subgoals: [
      {
        title: 'Finalizar módulo básico',
        completed: true,
        evidence: ['Vídeos, quizzes e exercícios concluídos', 'Resumo de tópicos principais registrado'],
      },
      {
        title: 'Realizar simulado final',
        completed: false,
        evidence: ['Simulados em andamento', 'Áreas de melhoria identificadas'],
      },
      {
        title: 'Marcar prova oficial',
        completed: false,
        evidence: ['Calendário de prova definido', 'Documentos pessoais prontos para envio'],
      },
    ],
  },
  {
    id: 'goal-3',
    title: 'Aprimoramento Técnico',
    description: 'Aprofundar conceitos de IA e realizar entrega de projeto Meli/Accenture.',
    deadline: '2026-12-31',
    period: 'FY26',
    images: [
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80',
    ],
    subgoals: [
      {
        title: 'Mapear requisitos de IA e integrá-los ao fluxo',
        completed: true,
        evidence: ['Entrevista com stakeholders realizada', 'Requisitos documentados e validados'],
      },
      {
        title: 'Criar protótipo funcional do dashboard',
        completed: true,
        evidence: ['Tela principal implementada', 'Fluxo de navegação testado pelo time'],
      },
      {
        title: 'Testar integração com API externa',
        completed: false,
        evidence: ['Endpoint mapeado', 'Plano de testes de conexão definido'],
      },
    ],
  },
];
