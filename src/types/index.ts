export type Role = 'Sales Director' | 'Sales Manager' | 'Team Lead' | 'Agent';
export type Site = 'Austin' | 'Charlotte';
export type Status = 'active' | 'terminated';
export type CommissionTier = 'new' | 'veteran';
export type ChangeType = 'promotion' | 'transfer' | 'new_hire' | 'termination' | 'commission_change';

export interface Employee {
  id: string;
  name: string;
  role: Role;
  site: Site;
  startDate: number; // timestamp
  managerId?: string;
  teamId?: string;
  status: Status;
  commissionTier?: CommissionTier; // only for agents
  notes?: string;
}

export interface Team {
  teamId: string;
  name: string;
  managerId: string;
  site: Site;
  agentCount: number;
}

export interface ExitSurveyResponse {
  fullName: string;
  position: string;
  lastWorkingDay: number; // timestamp
  lengthOfEmployment: string;
  reasonForLeaving: string;
  jobSatisfaction: number; // 1-5
  supervisorRelationship: number; // 1-5
  teamCollaboration: number; // 1-5
  workLifeBalance: number; // 1-5
  careerGrowth: number; // 1-5
  trainingDevelopment: number; // 1-5
  companyCulture: number; // 1-5
  compensation: number; // 1-5
  enjoyedMost: string;
  couldImprove: string;
  teamCultureDescription: string;
  wouldRecommend: string;
  wouldReturn: 'Yes' | 'No' | 'Maybe';
  additionalComments: string;
}

export interface ExitSurvey {
  surveyId: string;
  employeeId: string;
  submittedDate: number; // timestamp
  responses: ExitSurveyResponse;
  attachments: string[]; // file URLs
}

export interface ChangeLogEntry {
  changeId: string;
  timestamp: number;
  changeType: ChangeType;
  employeeId: string;
  oldData: Partial<Employee>;
  newData: Partial<Employee>;
  initiatedBy: string;
}

export interface CompensationInfo {
  baseSalary: number;
  commissionRate: number;
  description: string;
}

export const ROLE_COMPENSATION: Record<Role, CompensationInfo> = {
  'Sales Director': {
    baseSalary: 0, // unknown
    commissionRate: 0,
    description: 'Compensation TBD'
  },
  'Sales Manager': {
    baseSalary: 90000,
    commissionRate: 0,
    description: '$90k annual salary'
  },
  'Team Lead': {
    baseSalary: 40000,
    commissionRate: 0.20,
    description: '$40k annual salary + 20% commission'
  },
  'Agent': {
    baseSalary: 60000, // First 6 months
    commissionRate: 0.05,
    description: '$60k salary + 5% commission (first 6 months), then $30k + 20% commission'
  }
};

export const AGENT_VETERAN_COMPENSATION: CompensationInfo = {
  baseSalary: 30000,
  commissionRate: 0.20,
  description: '$30k annual salary + 20% commission'
}; 