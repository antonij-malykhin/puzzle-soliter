import { GameState } from '../Enums/GameState';
import { GameSettings } from '../../Data/Models/GameSettings';

export interface GameEventMap {
    GameStarted: { levelId: string };
    GameStateChanged: { previous: GameState; current: GameState };
    LevelLoaded: { levelId: string; gridWidth: number; gridHeight: number; gridCellWidth: number; gridCellHeight: number;};
    PiecePicked: { pieceId: string };
    PieceMoved: { pieceId: string; origin: { x: number; y: number } };
    PiecePlaced: { pieceId: string; lockedPieces: number; totalPieces: number };
    PiecesSwapped: {
        firstPieceId: string;
        firstOrigin: { x: number; y: number };
        secondPieceId: string;
        secondOrigin: { x: number; y: number };
    };
    PiecesMerged: {
        groupId: string;
        pieceIds: string[];
    };
    PieceRotated: { pieceId: string; rotation: number };
    PuzzleCompleted: { levelId: string; elapsedSeconds: number };
    SettingsChanged: { settings: GameSettings };
}
