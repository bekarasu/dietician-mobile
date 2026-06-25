import { Platform } from 'react-native'

export const theme = {
	colors: {
		background: '#F6F8FB',
		surface: '#FFFFFF',
		secondarySurface: '#EEF2F7',
		primary: '#0F766E',
		text: '#0B1320',
		muted: '#5B6473',
		border: '#E2E8F0',
		warningSurface: '#FEF3C7',
		danger: '#EF4444',
	},
	spacing: {
		xs: 6,
		sm: 10,
		md: 16,
		lg: 20,
		xl: 28,
	},
	radii: {
		lg: 18,
		xl: 26,
		round: 999,
	},
	typography: {
		hero: {
			fontSize: 34,
			fontWeight: '700' as const,
			lineHeight: 40,
			fontFamily: Platform.select({
				ios: 'System',
				android: 'sans-serif',
				default: 'System',
			}),
		},
		title: {
			fontSize: 24,
			fontWeight: '700' as const,
			lineHeight: 30,
			fontFamily: Platform.select({
				ios: 'System',
				android: 'sans-serif-medium',
				default: 'System',
			}),
		},
		body: {
			fontSize: 16,
			fontWeight: '500' as const,
			lineHeight: 24,
			fontFamily: Platform.select({
				ios: 'System',
				android: 'sans-serif',
				default: 'System',
			}),
		},
		caption: {
			fontSize: 12,
			fontWeight: '500' as const,
			lineHeight: 16,
			fontFamily: Platform.select({
				ios: 'System',
				android: 'sans-serif',
				default: 'System',
			}),
		},
	},
	shadows: {
		card: {
			shadowColor: '#0B1320',
			shadowOpacity: 0.08,
			shadowRadius: 18,
			shadowOffset: { width: 0, height: 8 },
			elevation: 3,
		},
	},
}
