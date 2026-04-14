/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'biyani-red': '#C62828',
                'biyani-red-dark': '#B71C1C',
                'biyani-red-500': '#E53935',
                'biyani-red-100': '#FDECEC',
                'primary-soft': '#FFE9E9',
                'accent-orange': '#FF9800',
                'accent-yellow': '#FFD54F',
                'success-green': '#22C55E',
                'info-blue': '#3B82F6',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                heading: ['"Plus Jakarta Sans"', 'sans-serif'],
            },
            keyframes: {
                'slide-in-right': {
                    '0%': { transform: 'translateX(100%)' },
                    '100%': { transform: 'translateX(0)' },
                },
            },
            animation: {
                'slide-in-right': 'slide-in-right 0.3s ease-out',
            },
        },
    },
    plugins: [],
}
