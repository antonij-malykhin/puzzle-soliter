import { GameState } from '../Core/Enums/GameState';
import { EventBus } from '../Core/Events/EventBus';
import { GameEventMap } from '../Core/Events/GameEventMap';

export class GameManager {
    private state = GameState.Idle;

    public constructor(private readonly eventBus: EventBus<GameEventMap>) {}

    public getState(): GameState {
        return this.state;
    }

    public startLevel(levelNumber: string): void {
        this.transitionTo(GameState.Loading);
        this.eventBus.emit('GameStarted', { levelNumber: levelNumber });
        this.transitionTo(GameState.Playing);
    }

    public pause(): void {
        if (this.state !== GameState.Playing) {
            return;
        }

        this.transitionTo(GameState.Paused);
    }

    public resume(): void {
        if (this.state !== GameState.Paused) {
            return;
        }

        this.transitionTo(GameState.Playing);
    }

    public completeLevel(levelId: string, levelNumber: number): void {
        this.transitionTo(GameState.Completed);
        this.eventBus.emit('PuzzleCompleted', {
            levelId,
            levelNumber: levelNumber,
        });
    }

    private transitionTo(nextState: GameState): void {
        const previousState = this.state;
        this.state = nextState;
        this.eventBus.emit('GameStateChanged', {
            previous: previousState,
            current: nextState,
        });
    }
}
