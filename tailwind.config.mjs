/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        secondary: '#a855f7',
        accent: '#ec4899',
        dark: '#0f172a',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: theme('colors.white / 80%'),
            fontSize: '1.25rem', // Larger base font for readability
            lineHeight: '1.85',
            maxWidth: 'none',
            p: {
              marginBottom: '2.5rem', // Even more spacing for clear alinea
              fontSize: '1.25rem',
              color: theme('colors.white / 70%'),
            },
            'p:first-of-type': {
              fontSize: '1.5rem', // Lead paragraph
              lineHeight: '1.6',
              color: theme('colors.white / 90%'),
              fontWeight: '500',
            },
            h1: {
              color: theme('colors.white'),
              fontWeight: '900',
              fontSize: '3rem', // Massive H1
              letterSpacing: theme('letterSpacing.tight'),
              marginBottom: theme('spacing.12'),
              lineHeight: '1.1',
            },
            h2: {
              color: theme('colors.white'),
              fontWeight: '800',
              fontSize: '2.25rem', // Distinct H2
              letterSpacing: theme('letterSpacing.tight'),
              marginTop: '4rem',
              marginBottom: '1.5rem',
              borderLeftWidth: '6px',
              borderLeftColor: theme('colors.primary'),
              paddingLeft: theme('spacing.6'),
              lineHeight: '1.2',
            },
            h3: {
              color: theme('colors.white'),
              fontWeight: '700',
              fontSize: '1.75rem', // Distinct H3
              marginTop: '3rem',
              marginBottom: '1rem',
              lineHeight: '1.3',
            },
            strong: {
              color: theme('colors.white'),
              fontWeight: '800',
            },
            a: {
              color: theme('colors.primary'),
              textDecoration: 'underline',
              textDecorationColor: theme('colors.primary / 30%'),
              textUnderlineOffset: '4px',
              fontWeight: '700',
              transition: 'all 0.2s',
              '&:hover': {
                color: theme('colors.secondary'),
                textDecorationColor: theme('colors.secondary'),
              },
            },
            blockquote: {
              borderLeftColor: theme('colors.primary'),
              borderLeftWidth: '4px',
              color: theme('colors.white / 90%'),
              fontStyle: 'italic',
              backgroundColor: theme('colors.white / 3%'),
              padding: theme('spacing.10'),
              borderRadius: '1.5rem',
              fontSize: '1.5rem',
              lineHeight: '1.6',
              marginTop: '3rem',
              marginBottom: '3rem',
            },
            ul: {
              listStyleType: 'none',
              paddingLeft: '0',
              marginTop: '2rem',
              marginBottom: '2rem',
            },
            'ul > li': {
              position: 'relative',
              paddingLeft: theme('spacing.10'),
              marginBottom: theme('spacing.6'),
              fontSize: '1.125rem',
            },
            'ul > li::before': {
              content: '""',
              position: 'absolute',
              left: '0',
              top: '0.85rem',
              width: theme('spacing.5'),
              height: '3px',
              backgroundColor: theme('colors.primary'),
              borderRadius: 'full',
            },
            ol: {
              listStyleType: 'decimal',
              paddingLeft: theme('spacing.6'),
              marginTop: '2rem',
              marginBottom: '2rem',
            },
            'ol > li': {
              paddingLeft: theme('spacing.4'),
              marginBottom: theme('spacing.6'),
              fontSize: '1.125rem',
              color: theme('colors.white / 70%'),
            },
            'ol > li::marker': {
              color: theme('colors.primary'),
              fontWeight: '900',
            },
            // Custom Tutorial Elements (Info & Warning Boxes)
            '.info-box': {
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              borderLeftWidth: '4px',
              borderLeftColor: '#38bdf8',
              padding: theme('spacing.8'),
              borderRadius: '1rem',
              marginTop: '2.5rem',
              marginBottom: '2.5rem',
              color: '#7dd3fc',
              fontSize: '1.125rem',
              lineHeight: '1.7',
            },
            '.warning-box': {
              backgroundColor: 'rgba(250, 204, 21, 0.1)',
              borderLeftWidth: '4px',
              borderLeftColor: '#facc15',
              padding: theme('spacing.8'),
              borderRadius: '1rem',
              marginTop: '2.5rem',
              marginBottom: '2.5rem',
              color: '#fef08a',
              fontSize: '1.125rem',
              lineHeight: '1.7',
            },
            '.tip-box': {
              backgroundColor: 'rgba(74, 222, 128, 0.1)',
              borderLeftWidth: '4px',
              borderLeftColor: '#4ade80',
              padding: theme('spacing.8'),
              borderRadius: '1rem',
              marginTop: '2.5rem',
              marginBottom: '2.5rem',
              color: '#86efac',
              fontSize: '1.125rem',
              lineHeight: '1.7',
            },
            figure: {
              marginTop: '3rem',
              marginBottom: '3rem',
            },
            figcaption: {
              textAlign: 'center',
              color: theme('colors.white / 40%'),
              fontSize: '0.875rem',
              marginTop: '1rem',
              fontStyle: 'italic',
            },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
