import { database } from './firebase';
import { ref, set, remove } from 'firebase/database';
import { generateEmployeeData } from '../utils/dataImporter';

export const importRealDataToFirebase = async (): Promise<void> => {
  try {
    console.log('🚀 Starting Firebase data import...');
    
    // Generate employee data from JSON
    const employees = generateEmployeeData();
    
    console.log(`📊 Generated ${employees.length} employees from organizational data`);
    
    // Clear existing data (optional - comment out if you want to keep existing data)
    const employeesRef = ref(database, 'employees');
    await remove(employeesRef);
    console.log('🗑️ Cleared existing employee data');
    
    // Import each employee
    const importPromises = employees.map(async (employee) => {
      const employeeRef = ref(database, `employees/${employee.id}`);
      await set(employeeRef, employee);
    });
    
    await Promise.all(importPromises);
    
    console.log('✅ Successfully imported all employee data to Firebase!');
    
    // Log summary
    const summary = {
      total: employees.length,
      directors: employees.filter(e => e.role === 'Sales Director').length,
      managers: employees.filter(e => e.role === 'Sales Manager').length,
      teamLeads: employees.filter(e => e.role === 'Team Lead').length,
      agents: employees.filter(e => e.role === 'Agent').length,
      austin: employees.filter(e => e.site === 'Austin').length,
      charlotte: employees.filter(e => e.site === 'Charlotte').length
    };
    
    console.log('📈 Import Summary:', summary);
    
    return Promise.resolve();
    
  } catch (error) {
    console.error('❌ Error importing data to Firebase:', error);
    throw error;
  }
};

export const validateFirebaseConnection = async (): Promise<boolean> => {
  try {
    // Try to write a test value
    const testRef = ref(database, 'test');
    await set(testRef, { timestamp: Date.now() });
    await remove(testRef);
    console.log('✅ Firebase connection validated');
    return true;
  } catch (error) {
    console.error('❌ Firebase connection failed:', error);
    return false;
  }
};

export const getEmployeeCount = async (): Promise<number> => {
  try {
    const employees = generateEmployeeData();
    return employees.length;
  } catch (error) {
    console.error('Error counting employees:', error);
    return 0;
  }
}; 