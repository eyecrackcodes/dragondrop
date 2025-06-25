import { Employee, Site } from '../types';

interface ImportTeamLead {
  name: string;
  agents: string[];
}

interface ImportSalesManager {
  name: string;
  team_leads: ImportTeamLead[];
  agents?: string[];
}

interface ImportSiteData {
  site: Site;
  director: string;
  sales_managers: ImportSalesManager[];
}

export const transformImportData = (importData: ImportSiteData[]): Employee[] => {
  const employees: Employee[] = [];
  let employeeIdCounter = 1;

  const generateId = (prefix: string) => `${prefix}-${employeeIdCounter++}`;
  const generateStartDate = () => {
    // Generate random start dates between 6 months and 3 years ago
    const monthsAgo = Math.floor(Math.random() * 30) + 6; // 6-36 months ago
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsAgo);
    return startDate.getTime();
  };

  importData.forEach((siteData) => {
    // Create Director
    const directorId = generateId('dir');
    employees.push({
      id: directorId,
      name: siteData.director,
      role: 'Sales Director',
      site: siteData.site,
      status: 'active',
      startDate: generateStartDate(),
      teamId: `${siteData.site.toLowerCase()}-leadership`
    });

    siteData.sales_managers.forEach((managerData, managerIndex) => {
      // Create Sales Manager
      const managerId = generateId('mgr');
      employees.push({
        id: managerId,
        name: managerData.name,
        role: 'Sales Manager',
        site: siteData.site,
        status: 'active',
        startDate: generateStartDate(),
        managerId: directorId,
        teamId: `${siteData.site.toLowerCase()}-team-${managerIndex + 1}`
      });

      // Create Team Leads
      managerData.team_leads.forEach((teamLeadData, teamLeadIndex) => {
        const teamLeadId = generateId('tl');
        employees.push({
          id: teamLeadId,
          name: teamLeadData.name,
          role: 'Team Lead',
          site: siteData.site,
          status: 'active',
          startDate: generateStartDate(),
          managerId: managerId,
          teamId: `${siteData.site.toLowerCase()}-team-${managerIndex + 1}-alpha`,
          commissionTier: 'veteran' // Team leads are typically veteran
        });

        // Create Agents under Team Lead
        teamLeadData.agents.forEach((agentName) => {
          const agentId = generateId('agent');
          const startDate = generateStartDate();
          const monthsSinceStart = (Date.now() - startDate) / (1000 * 60 * 60 * 24 * 30);
          
          employees.push({
            id: agentId,
            name: agentName,
            role: 'Agent',
            site: siteData.site,
            status: 'active',
            startDate: startDate,
            managerId: managerId, // Agents report directly to Sales Manager
            teamId: `${siteData.site.toLowerCase()}-team-${managerIndex + 1}-alpha`,
            commissionTier: monthsSinceStart >= 6 ? 'veteran' : 'new'
          });
        });
      });

      // Create Agents directly under Manager (no team lead)
      if (managerData.agents) {
        managerData.agents.forEach((agentName) => {
          const agentId = generateId('agent');
          const startDate = generateStartDate();
          const monthsSinceStart = (Date.now() - startDate) / (1000 * 60 * 60 * 24 * 30);
          
          employees.push({
            id: agentId,
            name: agentName,
            role: 'Agent',
            site: siteData.site,
            status: 'active',
            startDate: startDate,
            managerId: managerId,
            teamId: `${siteData.site.toLowerCase()}-team-${managerIndex + 1}`,
            commissionTier: monthsSinceStart >= 6 ? 'veteran' : 'new'
          });
        });
      }
    });
  });

  return employees;
};

// Your real organizational data
export const realOrganizationalData: ImportSiteData[] = [
  {
    "site": "Austin",
    "director": "Steve Kelley",
    "sales_managers": [
      {
        "name": "David Druxman",
        "team_leads": [
          {
            "name": "Justin Hinze",
            "agents": [
              "Alisha O'Bryant",
              "Doug Curtright",
              "Jovon Holts",
              "Jeff Korioth",
              "Brando Pina",
              "Jacqueline \"Rose\" Scales",
              "Shanaya Anderson"
            ]
          }
        ]
      },
      {
        "name": "Patricia Lewis",
        "team_leads": [],
        "agents": [
          "Leif Carlson",
          "Jremekyo Anderson",
          "Ron Rydzfski",
          "Jaime Valdez",
          "Leslie Chandler",
          "Amy Phillips",
          "Autra Okeke"
        ]
      },
      {
        "name": "Lanae Edwards",
        "team_leads": [
          {
            "name": "Magifira Jemal",
            "agents": [
              "Pedro Rodrigues",
              "Rory Behnke",
              "Brandon Simmons",
              "John Parker",
              "Romey Kelso",
              "Katherine Freeman",
              "Ugo"
            ]
          }
        ]
      },
      {
        "name": "Frederick Holguin",
        "team_leads": [
          {
            "name": "Eric Marrs",
            "agents": [
              "Nikia Lewis",
              "Michelle Brown",
              "Celeste Garcia",
              "Miguel Palacios",
              "Ty Morley",
              "Jennifer Davis",
              "Al Escaname"
            ]
          }
        ]
      },
      {
        "name": "Mario Herrera",
        "team_leads": [
          {
            "name": "Roza Veravillalba",
            "agents": [
              "Iesha Alexander",
              "Michael Galaviz",
              "John Sivy",
              "Jack Benken",
              "Tim Dominguez",
              "Stephen Johnson",
              "Patrick McMurrey"
            ]
          }
        ]
      },
      {
        "name": "Jonothan Mejia",
        "team_leads": [],
        "agents": [
          "Mark Garcia",
          "Brandon Escort",
          "Crystal Kurtanic",
          "Mike Ferguson",
          "Jonathon Dubbs",
          "Jamal Washington"
        ]
      },
      {
        "name": "Sandy Benson",
        "team_leads": [],
        "agents": [
          "Maleek Oden",
          "Jeff Bachick",
          "Gabriel Mumphrey",
          "Shawn Sheridan",
          "Alfred Castillo"
        ]
      },
      {
        "name": "Austin Houser",
        "team_leads": [],
        "agents": []
      }
    ]
  },
  {
    "site": "Charlotte",
    "director": "Trent Terrell",
    "sales_managers": [
      {
        "name": "Vincent Blanchett",
        "team_leads": [
          {
            "name": "Lynethe Guevara",
            "agents": [
              "Adelina Guardado",
              "Doug Yang",
              "Gabrielle Smith",
              "Angel Harris",
              "Mitchell Pittman",
              "Gakian Grayer",
              "Taleah Watson"
            ]
          }
        ]
      },
      {
        "name": "Nisrin Hajmahmoud",
        "team_leads": [
          {
            "name": "Serena Cowan",
            "agents": [
              "Chris Chen",
              "Jimmie Royster IV",
              "Camryn Anderson",
              "Paul Grady",
              "Latesha Johnson",
              "Chester Hannah"
            ]
          }
        ]
      },
      {
        "name": "Jovan Espinoza",
        "team_leads": [
          {
            "name": "Beau Carson",
            "agents": [
              "Montrell Morgan",
              "Kenny McLaughlin",
              "Quincy Jones",
              "Lasondra Davis",
              "Alana Tankley",
              "Matt Buffington"
            ]
          }
        ]
      },
      {
        "name": "Katelyn Helms",
        "team_leads": [
          {
            "name": "Robert Carter",
            "agents": [
              "Kyle Williford",
              "Alexia Salinas",
              "Denasha Paul",
              "Don McCoy",
              "Devon Daniels",
              "Bryon Griffin"
            ]
          }
        ]
      },
      {
        "name": "Jacob Fuller",
        "team_leads": [
          {
            "name": "Da'Von Loney",
            "agents": [
              "Quinn McLeod",
              "Jeff Rosenberg",
              "Chris Williams",
              "David Hill",
              "Thompson",
              "Oshay Barrett"
            ]
          }
        ]
      },
      {
        "name": "Jamal Gipson",
        "team_leads": [
          {
            "name": "Kevin Gray",
            "agents": [
              "Loren Johnson",
              "Alvin Fulmore",
              "Dawn Strong",
              "Alexis Alexander",
              "Jerren Cropps",
              "Tyrone Gooding"
            ]
          }
        ]
      },
      {
        "name": "Miguel Roman",
        "team_leads": [],
        "agents": [
          "Victoria Caldwell",
          "Aguil McIntyre",
          "Kevin Gillard",
          "Tamara Hemmings",
          "Krystal Rodgers",
          "Ysidro Wilks"
        ]
      },
      {
        "name": "Brent Lahti",
        "team_leads": [],
        "agents": [
          "Caleb McIntosh",
          "Marcus Vaughn",
          "Terial Buycks",
          "Keyanna Hood",
          "M'Siba Irvin",
          "Rion Jones",
          "Clara Frazer"
        ]
      },
      {
        "name": "Brook Coyne",
        "team_leads": [],
        "agents": []
      },
      {
        "name": "Asaad Weaver",
        "team_leads": [],
        "agents": [
          "Khadjia Ervin"
        ]
      }
    ]
  }
];

// Utility function to generate and log the transformed data for inspection
export const generateEmployeeData = (): Employee[] => {
  const employees = transformImportData(realOrganizationalData);
  console.log('Generated employee data:', employees);
  console.log(`Total employees: ${employees.length}`);
  console.log(`Directors: ${employees.filter(e => e.role === 'Sales Director').length}`);
  console.log(`Managers: ${employees.filter(e => e.role === 'Sales Manager').length}`);
  console.log(`Team Leads: ${employees.filter(e => e.role === 'Team Lead').length}`);
  console.log(`Agents: ${employees.filter(e => e.role === 'Agent').length}`);
  return employees;
}; 