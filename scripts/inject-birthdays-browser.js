// Browser console script to inject birthdays
// Run this in the browser console while on your Dragon Drop app

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

async function injectBirthdaysInBrowser() {
  console.log("🎂 Starting birthday injection from browser...\n");

  // Get Firebase from the window (should be available in your app)
  const { database } = await import("/src/services/firebase.ts");
  const { ref, get, update } = await import("firebase/database");

  if (!database) {
    console.error("❌ Firebase database not initialized");
    return;
  }

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
    let matchedList = [];

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

          matchedList.push({
            name: employee.name,
            birthday: `${birthday.month}/${birthday.day}`,
          });

          matchCount++;
          foundMatch = true;
          break;
        }
      }

      if (!foundMatch) {
        notFoundList.push(`${birthday.firstName} ${birthday.lastInitial}.`);
      }
    }

    // Show preview
    console.log("📋 Preview of matches:");
    matchedList.forEach((match) => {
      console.log(`   ✅ ${match.name} -> ${match.birthday}`);
    });

    if (notFoundList.length > 0) {
      console.log("\n⚠️  Not found:");
      notFoundList.forEach((name) => console.log(`   ❌ ${name}`));
    }

    // Confirm before applying
    const confirmMessage = `
Found ${matchCount} matches out of ${birthdayData.length} entries.

Do you want to update these ${matchCount} employees with their birthdays?
`;

    if (confirm(confirmMessage)) {
      // Apply all updates at once
      await update(ref(database), updates);
      console.log(
        `\n🎉 Successfully updated ${matchCount} employees with birthdays!`
      );
      alert(
        `Success! Updated ${matchCount} employees with birthdays. Refresh the page to see the changes.`
      );
    } else {
      console.log("❌ Update cancelled by user");
    }
  } catch (error) {
    console.error("❌ Error injecting birthdays:", error);
    alert("Error updating birthdays. Check the console for details.");
  }
}

// Run the function
injectBirthdaysInBrowser();
