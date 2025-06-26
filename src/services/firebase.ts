import { initializeApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  push, 
  set, 
  update, 
  remove, 
  onValue, 
  off,
  get,
  query,
  orderByChild,
  equalTo
} from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { Employee, Team, ExitSurvey, ChangeLogEntry, Site, Role, CommissionTier } from '../types';

// Firebase environment variables loaded from .env file

// Debug: Log what environment variables React is seeing
console.log('🔧 DEBUG: Environment variables check:');
console.log('🔧 REACT_APP_FIREBASE_API_KEY:', process.env.REACT_APP_FIREBASE_API_KEY ? `[SET: ${process.env.REACT_APP_FIREBASE_API_KEY.substring(0, 10)}...]` : '[MISSING]');
console.log('🔧 REACT_APP_FIREBASE_DATABASE_URL:', process.env.REACT_APP_FIREBASE_DATABASE_URL || '[MISSING]');
console.log('🔧 REACT_APP_FIREBASE_PROJECT_ID:', process.env.REACT_APP_FIREBASE_PROJECT_ID || '[MISSING]');
console.log('🔧 All Firebase env vars found:', Object.keys(process.env).filter(key => key.startsWith('REACT_APP_FIREBASE_')));

// Firebase configuration - temporary hardcoded to fix connection issue
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'AIzaSyA-4im1CI-Ds3f2unSkNUViBEcqIkI7jAE',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'dragondrop-9802e.firebaseapp.com',
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL || 'https://dragondrop-9802e-default-rtdb.firebaseio.com',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'dragondrop-9802e',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'dragondrop-9802e.firebasestorage.app',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '973998104962',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || '1:973998104962:web:5733e8dc8539e4771d2f9b',
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || 'G-W1QKTP0NM2'
};

console.log('🔧 DEBUG: Firebase config values:');
console.log('🔧 apiKey:', firebaseConfig.apiKey ? `[${firebaseConfig.apiKey.substring(0, 10)}...]` : '[EMPTY]');
console.log('🔧 databaseURL:', firebaseConfig.databaseURL || '[EMPTY]');
console.log('🔧 projectId:', firebaseConfig.projectId || '[EMPTY]');

// Validate Firebase configuration
const validateFirebaseConfig = () => {
  const requiredFields = ['apiKey', 'databaseURL', 'projectId'];
  const missing = requiredFields.filter(field => {
    const value = firebaseConfig[field as keyof typeof firebaseConfig];
    return !value || value === '';
  });
  
  if (missing.length > 0) {
    console.warn('🔥 Firebase configuration incomplete. Missing:', missing);
    console.warn('💡 App will run in demo mode. Check .env file with Firebase credentials.');
    return false;
  }
  
  console.log('🔥 Firebase configuration loaded successfully');
  return true;
};

// Initialize Firebase only if properly configured
let app: any = null;
let database: any = null;
let storage: any = null;

const isFirebaseConfigured = validateFirebaseConfig();

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    storage = getStorage(app);
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    console.warn('💡 Falling back to demo mode');
  }
}

export { database, storage };

// Database paths
const EMPLOYEES_PATH = 'employees';
const TEAMS_PATH = 'teams';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SETTINGS_PATH = 'settings';

// Employee CRUD Operations
export const EmployeeService = {
  // Create a new employee
  async create(employee: Omit<Employee, 'id'>): Promise<string> {
    if (!database) {
      console.warn('Firebase not configured - create operation skipped');
      return 'demo-' + Date.now().toString();
    }
    
    try {
      const employeesRef = ref(database, EMPLOYEES_PATH);
      const newEmployeeRef = push(employeesRef);
      const employeeId = newEmployeeRef.key!;
      
      const employeeData: Employee = {
        ...employee,
        id: employeeId
      };
      
      await set(newEmployeeRef, employeeData);
      return employeeId;
    } catch (error) {
      console.error('Error creating employee:', error);
      throw new Error('Failed to create employee');
    }
  },

  // Get all employees
  async getAll(): Promise<Employee[]> {
    if (!database) {
      console.warn('Firebase not configured - returning empty array');
      return [];
    }
    
    try {
      const employeesRef = ref(database, EMPLOYEES_PATH);
      const snapshot = await get(employeesRef);
      
      if (!snapshot.exists()) {
        return [];
      }
      
      const employees: Employee[] = [];
      snapshot.forEach((childSnapshot) => {
        const employee = childSnapshot.val() as Employee;
        employees.push(employee);
      });
      
      return employees;
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw new Error('Failed to fetch employees');
    }
  },

  // Get employees by site
  async getBySite(site: Site): Promise<Employee[]> {
    if (!database) {
      console.warn('Firebase not configured - returning empty array');
      return [];
    }
    
    try {
      const employeesRef = ref(database, EMPLOYEES_PATH);
      const siteQuery = query(employeesRef, orderByChild('site'), equalTo(site));
      const snapshot = await get(siteQuery);
      
      if (!snapshot.exists()) {
        return [];
      }
      
      const employees: Employee[] = [];
      snapshot.forEach((childSnapshot) => {
        const employee = childSnapshot.val() as Employee;
        employees.push(employee);
      });
      
      return employees;
    } catch (error) {
      console.error('Error fetching employees by site:', error);
      throw new Error('Failed to fetch employees by site');
    }
  },

  // Get single employee
  async getById(id: string): Promise<Employee | null> {
    if (!database) {
      console.warn('Firebase not configured - returning null');
      return null;
    }
    
    try {
      const employeeRef = ref(database, `${EMPLOYEES_PATH}/${id}`);
      const snapshot = await get(employeeRef);
      
      if (!snapshot.exists()) {
        return null;
      }
      
      return snapshot.val() as Employee;
    } catch (error) {
      console.error('Error fetching employee:', error);
      throw new Error('Failed to fetch employee');
    }
  },

  // Update employee
  async update(id: string, updates: Partial<Employee>): Promise<void> {
    if (!database) {
      console.warn('Firebase not configured - update operation skipped');
      return;
    }
    
    try {
      const employeeRef = ref(database, `${EMPLOYEES_PATH}/${id}`);
      await update(employeeRef, updates);
    } catch (error) {
      console.error('Error updating employee:', error);
      throw new Error('Failed to update employee');
    }
  },

  // Delete employee
  async delete(id: string): Promise<void> {
    if (!database) {
      console.warn('Firebase not configured - delete operation skipped');
      return;
    }
    
    try {
      const employeeRef = ref(database, `${EMPLOYEES_PATH}/${id}`);
      await remove(employeeRef);
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw new Error('Failed to delete employee');
    }
  },

  // Move employee to new manager
  async moveToManager(employeeId: string, newManagerId: string): Promise<void> {
    try {
      await this.update(employeeId, { managerId: newManagerId });
    } catch (error) {
      console.error('Error moving employee:', error);
      throw new Error('Failed to move employee');
    }
  },

  // Transfer employee to different site
  async transferToSite(employeeId: string, newSite: Site): Promise<void> {
    try {
      await this.update(employeeId, { site: newSite });
    } catch (error) {
      console.error('Error transferring employee:', error);
      throw new Error('Failed to transfer employee');
    }
  },

  // Promote employee
  async promote(employeeId: string, newRole: Role): Promise<void> {
    try {
      await this.update(employeeId, { role: newRole });
    } catch (error) {
      console.error('Error promoting employee:', error);
      throw new Error('Failed to promote employee');
    }
  },

  // Terminate employee
  async terminate(employeeId: string): Promise<void> {
    try {
      await this.update(employeeId, { status: 'terminated' });
    } catch (error) {
      console.error('Error terminating employee:', error);
      throw new Error('Failed to terminate employee');
    }
  },

  // Update commission tier
  async updateCommissionTier(employeeId: string, tier: CommissionTier): Promise<void> {
    try {
      await this.update(employeeId, { commissionTier: tier });
    } catch (error) {
      console.error('Error updating commission tier:', error);
      throw new Error('Failed to update commission tier');
    }
  },

  // Bulk operations
  async bulkUpdate(updates: Array<{ id: string; data: Partial<Employee> }>): Promise<void> {
    try {
      const updatePromises = updates.map(({ id, data }) => this.update(id, data));
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error in bulk update:', error);
      throw new Error('Failed to perform bulk update');
    }
  },

  // Real-time listener for employees
  onEmployeesChange(callback: (employees: Employee[]) => void): () => void {
    if (!database) {
      console.warn('Firebase not configured - returning empty unsubscribe function');
      return () => {};
    }
    
    const employeesRef = ref(database, EMPLOYEES_PATH);
    
    const unsubscribe = onValue(employeesRef, (snapshot) => {
      const employees: Employee[] = [];
      
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const employee = childSnapshot.val() as Employee;
          employees.push(employee);
        });
      }
      
      callback(employees);
    });

    // Return unsubscribe function
    return () => off(employeesRef, 'value', unsubscribe);
  },

  // Real-time listener for site-specific employees
  onSiteEmployeesChange(site: Site, callback: (employees: Employee[]) => void): () => void {
    if (!database) {
      console.warn('Firebase not configured - returning empty unsubscribe function');
      return () => {};
    }
    
    const employeesRef = ref(database, EMPLOYEES_PATH);
    const siteQuery = query(employeesRef, orderByChild('site'), equalTo(site));
    
    const unsubscribe = onValue(siteQuery, (snapshot) => {
      const employees: Employee[] = [];
      
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const employee = childSnapshot.val() as Employee;
          employees.push(employee);
        });
      }
      
      callback(employees);
    });

    return () => off(siteQuery, 'value', unsubscribe);
  }
};

// Team Management
export const TeamService = {
  async create(team: Omit<Team, 'teamId'>): Promise<string> {
    if (!database) {
      console.warn('Firebase not configured - team create operation skipped');
      return 'demo-team-' + Date.now().toString();
    }
    
    try {
      const teamsRef = ref(database, TEAMS_PATH);
      const newTeamRef = push(teamsRef);
      const teamId = newTeamRef.key!;
      
      const teamData: Team = {
        ...team,
        teamId
      };
      
      await set(newTeamRef, teamData);
      return teamId;
    } catch (error) {
      console.error('Error creating team:', error);
      throw new Error('Failed to create team');
    }
  },

  async getAll(): Promise<Team[]> {
    if (!database) {
      console.warn('Firebase not configured - returning empty teams array');
      return [];
    }
    
    try {
      const teamsRef = ref(database, TEAMS_PATH);
      const snapshot = await get(teamsRef);
      
      if (!snapshot.exists()) {
        return [];
      }
      
      const teams: Team[] = [];
      snapshot.forEach((childSnapshot) => {
        const team = childSnapshot.val() as Team;
        teams.push(team);
      });
      
      return teams;
    } catch (error) {
      console.error('Error fetching teams:', error);
      throw new Error('Failed to fetch teams');
    }
  },

  async update(teamId: string, updates: Partial<Team>): Promise<void> {
    if (!database) {
      console.warn('Firebase not configured - team update operation skipped');
      return;
    }
    
    try {
      const teamRef = ref(database, `${TEAMS_PATH}/${teamId}`);
      await update(teamRef, updates);
    } catch (error) {
      console.error('Error updating team:', error);
      throw new Error('Failed to update team');
    }
  },

  async delete(teamId: string): Promise<void> {
    if (!database) {
      console.warn('Firebase not configured - team delete operation skipped');
      return;
    }
    
    try {
      const teamRef = ref(database, `${TEAMS_PATH}/${teamId}`);
      await remove(teamRef);
    } catch (error) {
      console.error('Error deleting team:', error);
      throw new Error('Failed to delete team');
    }
  }
};

// Exit survey operations
export const exitSurveyService = {
  getAll: () => {
    if (!database) {
      console.warn('Firebase not configured - returning empty promise');
      return Promise.resolve({ exists: () => false, val: () => null });
    }
    return get(ref(database, 'exitSurveys'));
  },
  
  getById: (surveyId: string) => {
    if (!database) {
      console.warn('Firebase not configured - returning empty promise');
      return Promise.resolve({ exists: () => false, val: () => null });
    }
    return get(ref(database, `exitSurveys/${surveyId}`));
  },
  
  create: (survey: Omit<ExitSurvey, 'surveyId'>) => {
    if (!database) {
      console.warn('Firebase not configured - create operation skipped');
      return Promise.resolve();
    }
    const surveyRef = push(ref(database, 'exitSurveys'));
    const newSurvey = { ...survey, surveyId: surveyRef.key! };
    return set(surveyRef, newSurvey);
  },
  
  update: (surveyId: string, updates: Partial<ExitSurvey>) => {
    if (!database) {
      console.warn('Firebase not configured - update operation skipped');
      return Promise.resolve();
    }
    return update(ref(database, `exitSurveys/${surveyId}`), updates);
  },
  
  delete: (surveyId: string) => {
    if (!database) {
      console.warn('Firebase not configured - delete operation skipped');
      return Promise.resolve();
    }
    return remove(ref(database, `exitSurveys/${surveyId}`));
  },
  
  getByEmployee: async (employeeId: string) => {
    if (!database) {
      console.warn('Firebase not configured - returning empty array');
      return [];
    }
    const snapshot = await get(ref(database, 'exitSurveys'));
    const surveys = snapshot.val() || {};
    return Object.values(surveys).filter((survey: any) => survey.employeeId === employeeId);
  }
};

// Change log operations
export const changeLogService = {
  getAll: () => {
    if (!database) {
      console.warn('Firebase not configured - returning empty promise');
      return Promise.resolve({ exists: () => false, val: () => null });
    }
    return get(ref(database, 'changeLog'));
  },
  
  create: (change: Omit<ChangeLogEntry, 'changeId'>) => {
    if (!database) {
      console.warn('Firebase not configured - create operation skipped');
      return Promise.resolve();
    }
    const changeRef = push(ref(database, 'changeLog'));
    const newChange = { ...change, changeId: changeRef.key! };
    return set(changeRef, newChange);
  },
  
  getByEmployee: async (employeeId: string) => {
    if (!database) {
      console.warn('Firebase not configured - returning empty array');
      return [];
    }
    const snapshot = await get(ref(database, 'changeLog'));
    const changes = snapshot.val() || {};
    return Object.values(changes).filter((change: any) => change.employeeId === employeeId);
  },
  
  getRecent: async (limit: number = 50) => {
    if (!database) {
      console.warn('Firebase not configured - returning empty array');
      return [];
    }
    const snapshot = await get(ref(database, 'changeLog'));
    const changes = snapshot.val() || {};
    return Object.values(changes)
      .sort((a: any, b: any) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
};

// Data initialization and seeding
export const DataService = {
  // Seed initial data (for first-time setup)
  async seedInitialData(): Promise<void> {
    if (!database) {
      console.warn('Firebase not configured - seed operation skipped');
      return;
    }
    
    try {
      const employees = await EmployeeService.getAll();
      
      // Only seed if no employees exist
      if (employees.length === 0) {
        console.log('Seeding initial data...');
        
        // Sample employees data (you can import from your existing sampleData)
        const sampleEmployees: Omit<Employee, 'id'>[] = [
          {
            name: 'Sarah Johnson',
            role: 'Sales Director',
            site: 'Austin',
            startDate: new Date('2022-01-15').getTime(),
            status: 'active',
            notes: 'Experienced leader with 10+ years in sales'
          },
          {
            name: 'Michael Chen',
            role: 'Sales Manager',
            site: 'Austin',
            startDate: new Date('2022-03-01').getTime(),
            status: 'active',
            managerId: '', // Will be updated after director is created
            notes: 'Former team lead, recently promoted'
          }
          // Add more sample employees as needed
        ];

        // Create employees in sequence to maintain relationships
        for (const empData of sampleEmployees) {
          await EmployeeService.create(empData);
        }
        
        console.log('Initial data seeded successfully');
      }
    } catch (error) {
      console.error('Error seeding initial data:', error);
      throw new Error('Failed to seed initial data');
    }
  },

  // Export all data
  async exportData(): Promise<{ employees: Employee[], teams: Team[] }> {
    try {
      const [employees, teams] = await Promise.all([
        EmployeeService.getAll(),
        TeamService.getAll()
      ]);

      return { employees, teams };
    } catch (error) {
      console.error('Error exporting data:', error);
      throw new Error('Failed to export data');
    }
  },

  // Import data (for migration or bulk upload)
  async importEmployees(employees: Omit<Employee, 'id'>[]): Promise<string[]> {
    if (!database) {
      console.warn('Firebase not configured - import operation skipped');
      return [];
    }
    
    try {
      const createdIds: string[] = [];
      
      for (const employee of employees) {
        const id = await EmployeeService.create(employee);
        createdIds.push(id);
      }
      
      return createdIds;
    } catch (error) {
      console.error('Error importing employees:', error);
      throw new Error('Failed to import employees');
    }
  }
};

// Utility functions
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const getCurrentTimestamp = () => Date.now();

export const FirebaseUtils = {
  // Check if Firebase is configured and initialized
  isConfigured(): boolean {
    return database !== null && isFirebaseConfigured;
  },

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      // First check if configured
      if (!this.isConfigured()) {
        console.warn('Firebase not properly configured. Check your .env file.');
        return false;
      }
      
      // Test by trying to read the employees root - this is a simple, safe test
      const employeesRef = ref(database, EMPLOYEES_PATH);
      await get(employeesRef);
      return true;
    } catch (error) {
      console.error('Firebase connection test failed:', error);
      return false;
    }
  },

  // Get configuration status for debugging
  getConfigStatus(): { configured: boolean; missing: string[]; initialized: boolean } {
    const requiredFields = [
      'apiKey',
      'authDomain', 
      'databaseURL',
      'projectId'
    ];
    
    const missing = requiredFields.filter(field => {
      const value = firebaseConfig[field as keyof typeof firebaseConfig];
      return !value || value === '' || value === `your_${field.toLowerCase()}_here`;
    });
    
    return {
      configured: missing.length === 0,
      missing,
      initialized: database !== null
    };
  },

  // Get Firebase database instance (can be null)
  getDatabase() {
    return database;
  },

  // Check if we're in demo mode
  isDemoMode(): boolean {
    return !this.isConfigured();
  }
}; 