import { Employee, Team } from "../types";

export const sampleEmployees: Employee[] = [
  // Sales Directors
  {
    id: "dir-1",
    name: "Sarah Martinez",
    role: "Sales Director",
    site: "Austin",
    status: "active",
    startDate: new Date("2019-03-15").getTime(),
    birthDate: new Date("1985-07-22").getTime(),
    teamId: "austin-leadership",
  },
  {
    id: "dir-2",
    name: "Michael Chen",
    role: "Sales Director",
    site: "Charlotte",
    status: "active",
    startDate: new Date("2020-01-20").getTime(),
    birthDate: new Date("1982-11-30").getTime(),
    teamId: "charlotte-leadership",
  },

  // Sales Managers - Austin
  {
    id: "mgr-1",
    name: "Jessica Williams",
    role: "Sales Manager",
    site: "Austin",
    status: "active",
    startDate: new Date("2021-06-10").getTime(),
    birthDate: new Date("1988-02-14").getTime(),
    managerId: "dir-1",
    teamId: "austin-team-1",
  },
  {
    id: "mgr-2",
    name: "David Rodriguez",
    role: "Sales Manager",
    site: "Austin",
    status: "active",
    startDate: new Date("2021-09-15").getTime(),
    birthDate: new Date("1990-05-08").getTime(),
    managerId: "dir-1",
    teamId: "austin-team-2",
  },

  // Sales Managers - Charlotte
  {
    id: "mgr-3",
    name: "Amanda Johnson",
    role: "Sales Manager",
    site: "Charlotte",
    status: "active",
    startDate: new Date("2021-04-20").getTime(),
    birthDate: new Date("1987-09-25").getTime(),
    managerId: "dir-2",
    teamId: "charlotte-team-1",
  },
  {
    id: "mgr-4",
    name: "Robert Kim",
    role: "Sales Manager",
    site: "Charlotte",
    status: "active",
    startDate: new Date("2021-11-01").getTime(),
    birthDate: new Date("1989-12-03").getTime(),
    managerId: "dir-2",
    teamId: "charlotte-team-2",
  },

  // Team Leads - Austin (reporting to Sales Managers)
  {
    id: "tl-1",
    name: "Emily Davis",
    role: "Team Lead",
    site: "Austin",
    status: "active",
    startDate: new Date("2022-02-14").getTime(),
    birthDate: new Date("1991-02-14").getTime(), // Birthday today for testing!
    managerId: "mgr-1", // Reports to Jessica Williams
    teamId: "austin-team-1-alpha",
    commissionTier: "veteran",
  },
  {
    id: "tl-2",
    name: "James Wilson",
    role: "Team Lead",
    site: "Austin",
    status: "active",
    startDate: new Date("2022-05-30").getTime(),
    birthDate: new Date("1993-06-18").getTime(),
    managerId: "mgr-2", // Reports to David Rodriguez
    teamId: "austin-team-2-alpha",
    commissionTier: "veteran",
  },

  // Team Leads - Charlotte (reporting to Sales Managers)
  {
    id: "tl-3",
    name: "Lisa Thompson",
    role: "Team Lead",
    site: "Charlotte",
    status: "active",
    startDate: new Date("2022-01-18").getTime(),
    birthDate: new Date("1992-03-10").getTime(),
    managerId: "mgr-3", // Reports to Amanda Johnson
    teamId: "charlotte-team-1-alpha",
    commissionTier: "veteran",
  },

  // Agents - Austin (reporting directly to Sales Managers)
  {
    id: "agent-1",
    name: "Chris Anderson",
    role: "Agent",
    site: "Austin",
    status: "active",
    startDate: new Date("2023-08-15").getTime(),
    birthDate: new Date("1995-08-15").getTime(),
    managerId: "mgr-1", // Reports directly to Jessica Williams
    teamId: "austin-team-1-alpha",
    commissionTier: "new",
    notes: "High performer - approaching 6-month milestone",
  },
  {
    id: "agent-2",
    name: "Maria Garcia",
    role: "Agent",
    site: "Austin",
    status: "active",
    startDate: new Date("2022-10-20").getTime(),
    birthDate: new Date("1994-04-20").getTime(),
    managerId: "mgr-1", // Reports directly to Jessica Williams
    teamId: "austin-team-1-alpha",
    commissionTier: "veteran",
  },
  {
    id: "agent-3",
    name: "Kevin Brown",
    role: "Agent",
    site: "Austin",
    status: "active",
    startDate: new Date("2023-12-01").getTime(),
    birthDate: new Date("1996-01-15").getTime(),
    managerId: "mgr-2", // Reports directly to David Rodriguez
    teamId: "austin-team-2-alpha",
    commissionTier: "new",
  },
  {
    id: "agent-4",
    name: "Ashley Lee",
    role: "Agent",
    site: "Austin",
    status: "active",
    startDate: new Date("2022-07-12").getTime(),
    birthDate: new Date("1993-10-05").getTime(),
    managerId: "mgr-2", // Reports directly to David Rodriguez
    teamId: "austin-team-2-alpha",
    commissionTier: "veteran",
  },

  // Agents - Charlotte (reporting directly to Sales Managers)
  {
    id: "agent-5",
    name: "Daniel White",
    role: "Agent",
    site: "Charlotte",
    status: "active",
    startDate: new Date("2023-09-05").getTime(),
    birthDate: new Date("1997-09-05").getTime(),
    managerId: "mgr-3", // Reports directly to Amanda Johnson
    teamId: "charlotte-team-1-alpha",
    commissionTier: "new",
    notes: "Strong start - projected for early promotion",
  },
  {
    id: "agent-6",
    name: "Jennifer Taylor",
    role: "Agent",
    site: "Charlotte",
    status: "active",
    startDate: new Date("2022-11-30").getTime(),
    birthDate: new Date("1992-07-28").getTime(),
    managerId: "mgr-3", // Reports directly to Amanda Johnson
    teamId: "charlotte-team-1-alpha",
    commissionTier: "veteran",
  },
  {
    id: "agent-7",
    name: "Ryan Martinez",
    role: "Agent",
    site: "Charlotte",
    status: "active",
    startDate: new Date("2023-01-15").getTime(),
    birthDate: new Date("1994-11-12").getTime(),
    managerId: "mgr-4", // Reports directly to Robert Kim
    teamId: "charlotte-team-2-alpha",
    commissionTier: "veteran",
  },

  // Unassigned Employees (to demonstrate new warning system)
  {
    id: "tl-unassigned",
    name: "Mark Thompson",
    role: "Team Lead",
    site: "Austin",
    status: "active",
    startDate: new Date("2023-11-01").getTime(),
    // No managerId - needs assignment
    teamId: "unassigned",
    commissionTier: "veteran",
    notes: "Recently transferred, awaiting manager assignment",
  },

  // Terminated Employees (for testing document viewer and termination system)
  {
    id: "terminated-1",
    name: "Alex Johnson",
    role: "Agent",
    site: "Austin",
    status: "terminated",
    startDate: new Date("2022-05-15").getTime(),
    managerId: "mgr-1",
    teamId: "austin-team-1-alpha",
    commissionTier: "veteran",
    termination: {
      terminationDate: new Date("2024-01-15").getTime(),
      lastWorkingDay: new Date("2024-01-15").getTime(),
      reason: "voluntary_resignation",
      terminatedBy: "Jessica Williams",
      notes:
        "Employee resigned to pursue higher education. Completed two weeks notice. Professional throughout process. Exit interview conducted. All equipment returned.",
      documents: [
        {
          id: "doc-1",
          fileName: "resignation_letter_alex_johnson.pdf",
          fileUrl: "demo://document/resignation_letter",
          fileType: "application/pdf",
          uploadDate: new Date("2024-01-10").getTime(),
          uploadedBy: "Alex Johnson",
          category: "resignation_letter",
        },
        {
          id: "doc-2",
          fileName: "exit_interview_summary.pdf",
          fileUrl: "demo://document/exit_interview",
          fileType: "application/pdf",
          uploadDate: new Date("2024-01-15").getTime(),
          uploadedBy: "Jessica Williams",
          category: "exit_interview",
        },
        {
          id: "doc-3",
          fileName: "equipment_return_receipt.jpg",
          fileUrl: "demo://document/equipment_return",
          fileType: "image/jpeg",
          uploadDate: new Date("2024-01-15").getTime(),
          uploadedBy: "IT Department",
          category: "equipment_return",
        },
      ],
      exitSurveyCompleted: true,
      finalPayoutAmount: 2850,
    },
  },
  {
    id: "terminated-2",
    name: "Rachel Smith",
    role: "Team Lead",
    site: "Charlotte",
    status: "terminated",
    startDate: new Date("2021-08-20").getTime(),
    managerId: "mgr-3",
    teamId: "charlotte-team-1-alpha",
    commissionTier: "veteran",
    termination: {
      terminationDate: new Date("2023-12-08").getTime(),
      lastWorkingDay: new Date("2023-12-08").getTime(),
      reason: "performance_issues",
      terminatedBy: "Amanda Johnson",
      notes:
        "Performance improvement plan was unsuccessful. Multiple coaching sessions provided. Decision made after thorough review process. All procedures followed per HR guidelines.",
      documents: [
        {
          id: "doc-4",
          fileName: "termination_letter_rachel_smith.pdf",
          fileUrl: "demo://document/termination_letter",
          fileType: "application/pdf",
          uploadDate: new Date("2023-12-08").getTime(),
          uploadedBy: "Amanda Johnson",
          category: "termination_letter",
        },
        {
          id: "doc-5",
          fileName: "pip_documentation.pdf",
          fileUrl: "demo://document/pip_documentation",
          fileType: "application/pdf",
          uploadDate: new Date("2023-12-08").getTime(),
          uploadedBy: "HR Department",
          category: "other",
        },
        {
          id: "doc-6",
          fileName: "final_payroll_summary.xlsx",
          fileUrl: "demo://document/final_payroll",
          fileType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          uploadDate: new Date("2023-12-10").getTime(),
          uploadedBy: "Payroll Department",
          category: "final_pay_stub",
        },
      ],
      exitSurveyCompleted: false,
      finalPayoutAmount: 4200,
    },
  },
  {
    id: "terminated-3",
    name: "Michael Torres",
    role: "Agent",
    site: "Charlotte",
    status: "terminated",
    startDate: new Date("2023-03-01").getTime(),
    managerId: "mgr-4",
    teamId: "charlotte-team-2-alpha",
    commissionTier: "new",
    termination: {
      terminationDate: new Date("2024-01-20").getTime(),
      lastWorkingDay: new Date("2024-01-18").getTime(),
      reason: "misconduct",
      terminatedBy: "Robert Kim",
      notes:
        "Terminated for violation of company policy regarding client data handling. Investigation completed. Decision upheld by HR review board.",
      documents: [
        {
          id: "doc-7",
          fileName: "incident_report.pdf",
          fileUrl: "demo://document/incident_report",
          fileType: "application/pdf",
          uploadDate: new Date("2024-01-18").getTime(),
          uploadedBy: "Security Department",
          category: "other",
        },
        {
          id: "doc-8",
          fileName: "termination_notice.pdf",
          fileUrl: "demo://document/termination_notice",
          fileType: "application/pdf",
          uploadDate: new Date("2024-01-20").getTime(),
          uploadedBy: "Robert Kim",
          category: "termination_letter",
        },
      ],
      exitSurveyCompleted: false,
    },
  },
  {
    id: "agent-unassigned-1",
    name: "Sophie Chen",
    role: "Agent",
    site: "Charlotte",
    status: "active",
    startDate: new Date("2024-01-05").getTime(),
    // No managerId - needs assignment
    teamId: "unassigned",
    commissionTier: "new",
    notes: "New hire - pending manager assignment",
  },
  {
    id: "agent-unassigned-2",
    name: "Alex Rivera",
    role: "Agent",
    site: "Austin",
    status: "active",
    startDate: new Date("2024-01-10").getTime(),
    // No managerId - needs assignment
    teamId: "unassigned",
    commissionTier: "new",
    notes: "New hire - pending manager assignment",
  },
];

export const sampleTeams: Team[] = [
  {
    teamId: "team-austin-1",
    name: "Austin Alpha Team",
    managerId: "mgr-001",
    site: "Austin",
    agentCount: 3,
  },
  {
    teamId: "team-austin-2",
    name: "Austin Beta Team",
    managerId: "mgr-002",
    site: "Austin",
    agentCount: 2,
  },
  {
    teamId: "team-charlotte-1",
    name: "Charlotte Delta Team",
    managerId: "mgr-003",
    site: "Charlotte",
    agentCount: 4,
  },
];

// Mock Firebase data setup for development
export const initializeSampleData = async () => {
  try {
    // In a real implementation, this would seed the Firebase database
    console.log("Sample data initialized:", {
      employees: sampleEmployees.length,
      teams: sampleTeams.length,
    });

    return {
      employees: sampleEmployees,
      teams: sampleTeams,
    };
  } catch (error) {
    console.error("Error initializing sample data:", error);
    throw error;
  }
};
