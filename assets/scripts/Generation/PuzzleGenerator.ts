import { IPuzzleGenerationStrategy } from './IPuzzleGenerationStrategy';
import { PuzzleGenerationRequest, PuzzleGenerationResult } from './GenerationTypes';
import { PuzzleGameplayMode } from '../Data/Models/PuzzleGameplayMode';

/**
 * Orchestrates puzzle generation by delegating to the strategy
 * selected for the active gameplay mode.
 */
export class PuzzleGenerator {
    public constructor(
        private readonly rectSwapStrategy: IPuzzleGenerationStrategy,
        private readonly backtrackingStrategy: IPuzzleGenerationStrategy,
    ) {}

    public generate(request: PuzzleGenerationRequest, mode: PuzzleGameplayMode): PuzzleGenerationResult {
        const strategy = mode === PuzzleGameplayMode.RectSwapMerge
            ? this.rectSwapStrategy
            : this.backtrackingStrategy;

        return strategy.generate(request);
    }
}
