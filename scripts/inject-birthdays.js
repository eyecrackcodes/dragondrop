const { initializeApp } = require("firebase/app");
const { getDatabase, ref, get, update } = require("firebase/database");

// Birthday data to inject
const birthdayData = [
  { firstName: "Adelina", lastInitial: "G", month: 8, day: 20 },
  { firstName: "Alana", lastInitial: "T", month: 7, day: 17 },
  { firstName: "Andy", lastInitial: "N", month: 10, day: 24 },
  { firstName: "Aquil", lastInitial: "M", month: 4, day: 22 },
  { firstName: "Ashley", lastInitial: "M", month: 12, day: 28 },
  { firstName: "Autra", lastInitial: "O", month: 5, day: 22 },
  { firstName: "Camryn", lastInitial: "A", month: 4, day: 30 },
  { firstName: "Chris", lastInitial: "C", month: 6, day: 25 },
  { firstName: "David", lastInitial: "D", month: 9, day: 25 },
  { firstName: "Gee", lastInitial: "G", month: 3, day: 10 },
  { firstName: "Ilya", lastInitial: "M", month: 11, day: 22 },
  { firstName: "Jaime", lastInitial: "V", month: 3, day: 14 },
  { firstName: "Jenny", lastInitial: "D", month: 12, day: 9 },
  { firstName: "John", lastInitial: "P", month: 9, day: 7 },
  { firstName: "John", lastInitial: "S", month: 4, day: 3 },
  { firstName: "Karlee", lastInitial: "B", month: 11, day: 15 },
  { firstName: "Katelyn", lastInitial: "H", month: 2, day: 23 },
  { firstName: "Kevin", lastInitial: "G", month: 3, day: 23 },
  { firstName: "Khadijia", lastInitial: "E", month: 11, day: 15 },
  { firstName: "Keyanna", lastInitial: "H", month: 8, day: 3 },
  { firstName: "Kyle", lastInitial: "W", month: 6, day: 6 },
  { firstName: "Marc", lastInitial: "G", month: 10, day: 23 },
  { firstName: "Mario", lastInitial: "H", month: 2, day: 22 },
  { firstName: "Mark", lastInitial: "G", month: 10, day: 23 },
  { firstName: "Melisa", lastInitial: "H", month: 2, day: 16 },
  { firstName: "Melisa", lastInitial: "S", month: 10, day: 9 },
  { firstName: "Miguel", lastInitial: "P", month: 5, day: 10 },
  { firstName: "Monica", lastInitial: "A", month: 10, day: 17 },
  { firstName: "Montrell", lastInitial: "M", month: 2, day: 15 },
  { firstName: "Romey", lastInitial: "K", month: 1, day: 18 },
  { firstName: "Sandi", lastInitial: "D", month: 3, day: 19 },
  { firstName: "Sara", lastInitial: "G", month: 7, day: 21 },
  { firstName: "Shanaya", lastInitial: "A", month: 8, day: 16 },
  { firstName: "Sonya", lastInitial: "K", month: 8, day: 17 },
  { firstName: "Steve", lastInitial: "B", month: 4, day: 25 },
  { firstName: "Tesha", lastInitial: "J", month: 10, day: 30 },
  { firstName: "Wenny", lastInitial: "G", month: 9, day: 19 },
  { firstName: "Krystal", lastInitial: "R", month: 9, day: 26 },
];

// Firebase configuration - read from environment or .env file
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

async function injectBirthdays() {
  console.log("🎂 Starting birthday injection process...\n");

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const database = getDatabase(app);

  try {
    // Get all employees
    const employeesRef = ref(database, "employees");
    const snapshot = await get(employeesRef);

    if (!snapshot.exists()) {
      console.error("❌ No employees found in database");
      return;
    }

    const employees = snapshot.val();
    const updates = {};
    let matchCount = 0;
    let notFoundList = [];

    // Process each birthday entry
    for (const birthday of birthdayData) {
      let foundMatch = false;

      // Search through all employees
      for (const [employeeId, employee] of Object.entries(employees)) {
        const employeeName = employee.name.toLowerCase();
        const firstName = birthday.firstName.toLowerCase();
        const lastInitial = birthday.lastInitial.toLowerCase();

        // Check if first name matches and last name starts with the initial
        if (
          employeeName.startsWith(firstName) &&
          employeeName.split(" ").pop()[0].toLowerCase() === lastInitial
        ) {
          // Create birthdate (using year 2000 as placeholder since we only care about month/day)
          const birthDate = new Date(
            2000,
            birthday.month - 1,
            birthday.day,
            12,
            0,
            0
          ).getTime();

          updates[`employees/${employeeId}/birthDate`] = birthDate;

          console.log(
            `✅ Matched: ${employee.name} -> ${birthday.month}/${birthday.day}`
          );
          matchCount++;
          foundMatch = true;
          break;
        }
      }

      if (!foundMatch) {
        notFoundList.push(`${birthday.firstName} ${birthday.lastInitial}.`);
      }
    }

    // Apply all updates at once
    if (Object.keys(updates).length > 0) {
      await update(ref(database), updates);
      console.log(
        `\n🎉 Successfully updated ${matchCount} employees with birthdays!`
      );
    }

    if (notFoundList.length > 0) {
      console.log(
        `\n⚠️  Could not find matches for ${notFoundList.length} entries:`
      );
      notFoundList.forEach((name) => console.log(`   - ${name}`));
    }

    console.log("\n📊 Summary:");
    console.log(`   - Total birthday entries: ${birthdayData.length}`);
    console.log(`   - Successful matches: ${matchCount}`);
    console.log(`   - Not found: ${notFoundList.length}`);
  } catch (error) {
    console.error("❌ Error injecting birthdays:", error);
  }

  process.exit(0);
}

// Load environment variables if running locally
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: "../.env" });
}

// Run the injection
injectBirthdays();
