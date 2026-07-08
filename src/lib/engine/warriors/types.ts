export type DieSides = 4 | 6 | 8 | 10 | 12 | 20;

export const DIE_SET: DieSides[] = [4, 6, 8, 10, 12, 20];

export interface Die {
	id: string;
	sides: DieSides;
	value: number;
}

export type PlayerId = 0 | 1;

export interface GameState {
	dice: [Die[], Die[]];
	turn: PlayerId;
	/** Who moved first — needed for the 1v1 endgame tie rule. */
	firstPlayer: PlayerId;
	consecutivePasses: number;
	winner: PlayerId | null;
}

export interface StrengthMove {
	type: 'strength';
	attackerId: string;
	targetId: string;
}

export interface MindMove {
	type: 'mind';
	/** IDs of the attacker's dice consumed by the expression. */
	attackerIds: string[];
	expr: string;
	targetId: string;
}

export interface PassMove {
	type: 'pass';
}

export type Move = StrengthMove | MindMove | PassMove;

export type Rng = () => number;
