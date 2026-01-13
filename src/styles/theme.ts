export const colors = {
  primary: '#06B6D4',
  secondary: '#FB7185',
  accent: '#FBBF24',
  success: '#34D399',
  background: '#FEF3E2',
  text: '#1F2937',
  white: '#FFFFFF',
  gray: {
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
  },
} as const;

export const fonts = {
  display: "'Nunito', 'Quicksand', system-ui, sans-serif",
  body: "'Inter', 'Nunito Sans', system-ui, sans-serif",
} as const;

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
} as const;

export const borderRadius = {
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.5rem',
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
} as const;

export const animations = {
  spring: {
    type: 'spring',
    stiffness: 300,
    damping: 20,
  },
  bounce: {
    type: 'spring',
    stiffness: 400,
    damping: 10,
  },
  gentle: {
    type: 'spring',
    stiffness: 200,
    damping: 25,
  },
} as const;

export const theme = {
  colors,
  fonts,
  spacing,
  borderRadius,
  shadows,
  animations,
} as const;

export default theme;
