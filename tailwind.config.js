/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        'sales-director': '#7C3AED',
        'sales-manager': '#3B82F6',
        'team-lead': '#10B981',
        'agent': '#6B7280',
        'agent-new': '#F59E0B',
      },
    },
  },
  plugins: [],
} 