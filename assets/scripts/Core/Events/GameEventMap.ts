import { GameState } from '../Enums/GameState';
import { GameSettings } from '../../Data/Models/GameSettings';

export interface GameEventMap {
    GameStarted: { levelId: string };
    GameStateChanged: { previous: GameState; current: GameState };
    LevelLoaded: { levelId: string; gridWidth: number; gridHeight: number; gridCellSize: number };
    PiecePicked: { pieceId: string };
    PiecePlaced: { pieceId: string; lockedPieces: number; totalPieces: number };
    PieceRotated: { pieceId: string; rotation: number };
    PuzzleCompleted: { levelId: string; elapsedSeconds: number };
    SettingsChanged: { settings: GameSettings };
}
