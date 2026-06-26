export type Subgoal = {
  title: string;
  completed: boolean;
  evidence: string[];
};

export type Goal = {
  id: string;
  title: string;
  description: string;
  deadline: string;
  period: string;
  images: string[];
  subgoals: Subgoal[];
};

export type SiteData = {
  periods: string[];
  goals: Goal[];
};
