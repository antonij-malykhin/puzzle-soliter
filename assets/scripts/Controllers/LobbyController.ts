import { LobbyUI } from '../UI/Screens/LobbyUI';
import { LobbyLevelCardPresentation } from '../Data/Models/LobbyLevelCardPresentation';

export class LobbyController {
    private lobbyUI!: LobbyUI;

    async initialize(lobbyUI: LobbyUI, options: { onPlayRequested: () => void; lobbyCards: ReadonlyArray<LobbyLevelCardPresentation>; }) {
        this.lobbyUI = lobbyUI;
        this.lobbyUI.setPlayHandler(options.onPlayRequested);
		await this.lobbyUI.setCards(options.lobbyCards);
    }

    async startLobby() {
        await this.lobbyUI.show();
    }
}