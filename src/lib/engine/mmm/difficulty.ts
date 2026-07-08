export type Division = 'upper-primary' | 'lower-secondary' | 'upper-secondary';

export interface DifficultyPreset {
	id: Division;
	label: string;
	grades: string;
	cornerMin: number;
	cornerMax: number;
	targetMin: number;
	targetMax: number;
	/** Bias corner draws toward times-table friendly numbers (2-12). */
	timesTableBias: boolean;
	/** Reject targets solvable with a single +/- of two corners (too easy). */
	rejectTrivial: boolean;
	/** Require the stored solution to contain a multiply or divide. */
	requireMulDiv: boolean;
	/** Seconds per question in timed sets. */
	secondsPerQuestion: number;
}

export const PRESETS: Record<Division, DifficultyPreset> = {
	'upper-primary': {
		id: 'upper-primary',
		label: 'Upper Primary',
		grades: 'Grades 4–6',
		cornerMin: 1,
		cornerMax: 12,
		targetMin: 2,
		targetMax: 60,
		timesTableBias: true,
		rejectTrivial: true,
		requireMulDiv: false,
		secondsPerQuestion: 60
	},
	'lower-secondary': {
		id: 'lower-secondary',
		label: 'Lower Secondary',
		grades: 'Grades 7–8',
		cornerMin: 1,
		cornerMax: 25,
		targetMin: 10,
		targetMax: 150,
		timesTableBias: false,
		rejectTrivial: true,
		requireMulDiv: false,
		secondsPerQuestion: 45
	},
	'upper-secondary': {
		id: 'upper-secondary',
		label: 'Upper Secondary',
		grades: 'Grades 9–12',
		cornerMin: 2,
		cornerMax: 50,
		targetMin: 20,
		targetMax: 400,
		timesTableBias: false,
		rejectTrivial: true,
		requireMulDiv: true,
		secondsPerQuestion: 45
	}
};

export const DIVISIONS: Division[] = ['upper-primary', 'lower-secondary', 'upper-secondary'];
