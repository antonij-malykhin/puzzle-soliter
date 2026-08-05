import { LobbyUI } from '../UI/Screens/LobbyUI';
import { LobbyLevelCardPresentation } from '../Data/Models/LobbyLevelCardPresentation';

export class LobbyController {
    private lobbyUI!: LobbyUI;

    async initialize(lobbyUI: LobbyUI, spacingX: number, spacingY: number, cols: number, rows: number, options: { onPlayRequested: () => void; lobbyCards: ReadonlyArray<LobbyLevelCardPresentation>; }) {
        this.lobbyUI = lobbyUI;
        this.lobbyUI.setPlayHandler(options.onPlayRequested);
		await this.lobbyUI.setCards(options.lobbyCards, spacingX, spacingY, cols, rows);
    }

    async startLobby() {
        await this.lobbyUI.show();
    }
}