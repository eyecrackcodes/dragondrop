export type Role = "Sales Director" | "Sales Manager" | "Team Lead" | "Agent";
export type Site = "Austin" | "Charlotte";
export type Status = "active" | "terminated";
export type CommissionTier = "new" | "veteran";
export type ChangeType =
  | "promotion"
  | "transfer"
  | "new_hire"
  | "termination"
  | "commission_change";

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
  termination?: TerminationDetails;
}

export interface TerminationDetails {
  terminationDate: number; // timestamp
  reason: TerminationReason;
  terminatedBy: string; // user who initiated termination
  notes: string;
  documents: TerminationDocument[];
  exitSurveyCompleted?: boolean;
  finalPayoutAmount?: number;
  lastWorkingDay: number; // timestamp
}

export interface TerminationDocument {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploadDate: number; // timestamp
  uploadedBy: string;
  category: DocumentCategory;
}

export type TerminationReason =
  | "voluntary_resignation"
  | "involuntary_termination"
  | "performance_issues"
  | "misconduct"
  | "layoff"
  | "position_elimination"
  | "end_of_contract"
  | "retirement"
  | "other";

export type DocumentCategory =
  | "termination_letter"
  | "resignation_letter"
  | "final_pay_stub"
  | "exit_interview"
  | "equipment_return"
  | "other";

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
  wouldReturn: "Yes" | "No" | "Maybe";
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
  "Sales Director": {
    baseSalary: 0, // unknown
    commissionRate: 0,
    description: "Compensation TBD",
  },
  "Sales Manager": {
    baseSalary: 90000,
    commissionRate: 0,
    description: "$90k annual salary",
  },
  "Team Lead": {
    baseSalary: 40000,
    commissionRate: 0.2,
    description: "$40k annual salary + 20% commission",
  },
  Agent: {
    baseSalary: 60000, // New agent tier
    commissionRate: 0.05,
    description:
      "$60k salary + 5% commission (new agents), $30k + 20% commission (veteran agents - eligible after 6 months or by performance-based early promotion)",
  },
};

export const AGENT_VETERAN_COMPENSATION: CompensationInfo = {
  baseSalary: 30000,
  commissionRate: 0.2,
  description: "$30k annual salary + 20% commission",
};
