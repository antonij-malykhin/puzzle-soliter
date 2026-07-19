import { PuzzleGenerationRequest, PuzzleGenerationResult } from './GenerationTypes';

export interface IPuzzleGenerationStrategy {
    generate(request: PuzzleGenerationRequest): PuzzleGenerationResult;
}
