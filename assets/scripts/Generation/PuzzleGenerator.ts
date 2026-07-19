import { IPuzzleGenerationStrategy } from './IPuzzleGenerationStrategy';
import { PuzzleGenerationRequest, PuzzleGenerationResult } from './GenerationTypes';

export class PuzzleGenerator {
    public constructor(private readonly strategy: IPuzzleGenerationStrategy) {}

    public generate(request: PuzzleGenerationRequest): PuzzleGenerationResult {
        return this.strategy.generate(request);
    }
}
