/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#080c14",
          card: "rgba(13, 20, 35, 0.45)",
          border: "rgba(255, 255, 255, 0.06)",
          activeBorder: "rgba(59, 130, 246, 0.4)",
          green: "#10b981",
          amber: "#f59e0b",
          red: "#ef4444",
          blue: "#3b82f6",
          purple: "#8b5cf6"
        }
      },
      boxShadow: {
        'glow-green': '0 0 15px rgba(16, 185, 129, 0.25)',
        'glow-amber': '0 0 15px rgba(245, 158, 11, 0.25)',
        'glow-red': '0 0 15px rgba(239, 68, 68, 0.35)',
        'glow-blue': '0 0 15px rgba(59, 130, 246, 0.25)',
        'glow-purple': '0 0 15px rgba(139, 92, 246, 0.25)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'Outfit', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
