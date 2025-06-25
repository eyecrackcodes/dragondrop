import { useState, useEffect } from 'react';
import { Employee, Team, Site } from '../types';
import { sampleEmployees, sampleTeams } from '../data/sampleData';
import { checkCommissionEligibility, getAgentsApproachingMilestone } from '../utils/commissionCalculator';

// Mock hook that simulates Firebase data for testing
export const useMockEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setEmployees(sampleEmployees);
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const refetch = () => {
    setIsLoading(true);
    setTimeout(() => {
      setEmployees(sampleEmployees);
      setIsLoading(false);
    }, 500);
  };

  return {
    employees,
    isLoading,
    refetch
  };
};

export const useMockTeams = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTeams(sampleTeams);
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return {
    teams,
    teamsById: teams.reduce((acc, team) => ({ ...acc, [team.teamId]: team }), {}),
    isLoading,
  };
};

export const useMockEmployeesBySite = (site: Site) => {
  const { employees, isLoading, refetch } = useMockEmployees();
  
  const filteredEmployees = employees.filter(emp => emp.site === site);
  
  return {
    employees: filteredEmployees,
    isLoading,
    refetch,
  };
};

export const useMockCommissionAlerts = () => {
  const { employees } = useMockEmployees();
  
  const agentsApproachingMilestone = getAgentsApproachingMilestone(employees);
  const agentsNeedingUpdate = employees.filter(checkCommissionEligibility);
  
  return {
    agentsApproachingMilestone,
    agentsNeedingUpdate,
    hasAlerts: agentsApproachingMilestone.length > 0 || agentsNeedingUpdate.length > 0,
  };
};

export const useMockOrgStructure = (site?: Site) => {
  const { employees, isLoading, refetch } = useMockEmployees();
  
  const filteredEmployees = site ? employees.filter(emp => emp.site === site) : employees;
  
  // Build hierarchical structure
  const directors = filteredEmployees.filter(emp => emp.role === 'Sales Director');
  const managers = filteredEmployees.filter(emp => emp.role === 'Sales Manager');
  const teamLeads = filteredEmployees.filter(emp => emp.role === 'Team Lead');
  const agents = filteredEmployees.filter(emp => emp.role === 'Agent');
  
  // Create hierarchy tree
  const orgTree = directors.map(director => ({
    ...director,
    reports: managers.filter(manager => manager.managerId === director.id).map(manager => ({
      ...manager,
      reports: teamLeads.filter(lead => lead.managerId === manager.id).map(lead => ({
        ...lead,
        reports: agents.filter(agent => agent.managerId === lead.id)
      }))
    }))
  }));
  
  return {
    orgTree,
    directors,
    managers,
    teamLeads,
    agents,
    isLoading,
    refetch,
    stats: {
      totalEmployees: filteredEmployees.length,
      totalDirectors: directors.length,
      totalManagers: managers.length,
      totalTeamLeads: teamLeads.length,
      totalAgents: agents.length,
    }
  };
};

export const useMockDragAndDrop = () => {
  const moveEmployee = {
    mutate: (params: { 
      employeeId: string; 
      newManagerId?: string; 
      newSite?: Site;
      status?: 'active' | 'terminated';
    }) => {
      // In a real implementation, this would update the employee data
      // For now, we'll just simulate success
      setTimeout(() => {
        console.log('Employee moved:', params);
      }, 100);
    }
  };

  const promoteEmployee = {
    mutate: (params: { 
      employeeId: string; 
      newRole: Employee['role']; 
    }) => {
      // In a real implementation, this would update the employee's role
      setTimeout(() => {
        console.log('Employee promoted:', params);
      }, 100);
    }
  };

  return {
    moveEmployee,
    promoteEmployee,
  };
}; 