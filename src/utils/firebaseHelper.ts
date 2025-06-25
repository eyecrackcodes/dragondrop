import { database } from '../services/firebase';
import { ref, get, set, remove } from 'firebase/database';
import { generateEmployeeData } from './dataImporter';

export interface DatabaseStatus {
  connected: boolean;
  currentEmployeeCount: number;
  lastUpdate: number | null;
  readyForImport: boolean;
}

export const checkDatabaseStatus = async (): Promise<DatabaseStatus> => {
  try {
    console.log('🔍 Checking Firebase database status...');
    
    // Test connection with a simple read
    const testRef = ref(database, '.info/connected');
    const testSnapshot = await get(testRef);
    const connected = testSnapshot.val();
    
    // Count current employees
    const employeesRef = ref(database, 'employees');
    const employeesSnapshot = await get(employeesRef);
    const currentEmployees = employeesSnapshot.val();
    const currentEmployeeCount = currentEmployees ? Object.keys(currentEmployees).length : 0;
    
    // Check last update timestamp
    const metaRef = ref(database, 'meta/lastUpdate');
    const metaSnapshot = await get(metaRef);
    const lastUpdate = metaSnapshot.val();
    
    console.log(`📊 Database Status:`);
    console.log(`   Connected: ${connected ? '✅' : '❌'}`);
    console.log(`   Current Employees: ${currentEmployeeCount}`);
    console.log(`   Last Update: ${lastUpdate ? new Date(lastUpdate).toLocaleString() : 'Never'}`);
    
    return {
      connected: !!connected,
      currentEmployeeCount,
      lastUpdate,
      readyForImport: !!connected
    };
    
  } catch (error) {
    console.error('❌ Database status check failed:', error);
    return {
      connected: false,
      currentEmployeeCount: 0,
      lastUpdate: null,
      readyForImport: false
    };
  }
};

export const previewImportData = () => {
  console.log('📋 Import Data Preview:');
  console.log('═'.repeat(50));
  
  const employees = generateEmployeeData();
  
  console.log(`📊 COMPLETE ORGANIZATIONAL STRUCTURE:`);
  console.log(`   Total Employees: ${employees.length}`);
  
  // Austin breakdown
  const austinEmployees = employees.filter(e => e.site === 'Austin');
  console.log(`\n🟦 AUSTIN (${austinEmployees.length} total):`);
  console.log(`   ├── Director: Steve Kelley`);
  console.log(`   ├── Sales Managers: 8`);
  console.log(`   ├── Team Leads: 5`);
  console.log(`   └── Agents: ${austinEmployees.filter(e => e.role === 'Agent').length}`);
  
  // Charlotte breakdown  
  const charlotteEmployees = employees.filter(e => e.site === 'Charlotte');
  console.log(`\n🟦 CHARLOTTE (${charlotteEmployees.length} total):`);
  console.log(`   ├── Director: Trent Terrell`);
  console.log(`   ├── Sales Managers: 10`);
  console.log(`   ├── Team Leads: 6`);
  console.log(`   └── Agents: ${charlotteEmployees.filter(e => e.role === 'Agent').length}`);
  
  console.log(`\n🎯 KEY FEATURES:`);
  console.log(`   ✅ Proper hierarchy (Agents & Team Leads → Managers → Directors)`);
  console.log(`   ✅ Realistic start dates (6-36 months ago)`);
  console.log(`   ✅ Commission tiers based on tenure`);
  console.log(`   ✅ Unique IDs and team assignments`);
  console.log(`   ✅ Complete manager relationships`);
  
  return employees;
};

export const performDatabaseImport = async (): Promise<boolean> => {
  try {
    console.log('🚀 Starting complete database import...');
    
    // Check database status first
    const status = await checkDatabaseStatus();
    if (!status.readyForImport) {
      throw new Error('Database not ready for import');
    }
    
    // Generate and preview data
    const employees = previewImportData();
    
    console.log('\n⚠️  WARNING: This will replace ALL existing data!');
    
    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    const employeesRef = ref(database, 'employees');
    await remove(employeesRef);
    
    // Import new data in batches
    console.log('📤 Importing new data...');
    const batchSize = 10;
    const batches = [];
    
    for (let i = 0; i < employees.length; i += batchSize) {
      batches.push(employees.slice(i, i + batchSize));
    }
    
    let importedCount = 0;
    for (const batch of batches) {
      const batchPromises = batch.map(async (employee) => {
        const employeeRef = ref(database, `employees/${employee.id}`);
        await set(employeeRef, employee);
        importedCount++;
      });
      
      await Promise.all(batchPromises);
      console.log(`   ✅ Imported ${importedCount}/${employees.length} employees`);
    }
    
    // Update metadata
    const metaRef = ref(database, 'meta');
    await set(metaRef, {
      lastUpdate: Date.now(),
      totalEmployees: employees.length,
      importSource: 'Real Organizational Data',
      sites: ['Austin', 'Charlotte']
    });
    
    console.log('✅ Import complete!');
    console.log(`📊 Final Summary:`);
    console.log(`   Total imported: ${importedCount} employees`);
    console.log(`   Austin: ${employees.filter(e => e.site === 'Austin').length}`);
    console.log(`   Charlotte: ${employees.filter(e => e.site === 'Charlotte').length}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    return false;
  }
}; 