tailwind.config = {
    theme: {
        extend: {
            colors: {
                primary: '#6366f1',
                secondary: '#a855f7',
                accent: '#ec4899',
                dark: '#0f172a',
                glass: 'rgba(255, 255, 255, 0.05)',
            },
            fontFamily: {
                sans: ['Plus Jakarta Sans', 'sans-serif'],
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 6s ease-in-out infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                }
            }
        }
    }
}
