import { GameState } from '../Enums/GameState';
import { GameSettings } from '../../Data/Models/GameSettings';

export interface GameEventMap {
    WalletBalanceChanged: { newBalance: number };
    GameStarted: { levelId: string };
    GameStateChanged: { previous: GameState; current: GameState };
    LevelLoaded: { levelId: string; gridColumnCount: number; gridRowCount: number; gridCellWidth: number; gridCellHeight: number;};
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
    PuzzleCompleted: { levelId: string; levelNumber: number };
    SettingsChanged: { settings: GameSettings };
    SuggestionProvided: { newCount : number };
    SuggestionResult: { firstPieceId: string; secondPieceId: string };
}
