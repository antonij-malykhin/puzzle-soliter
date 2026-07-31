import { LobbyUI } from '../UI/Screens/LobbyUI';

export class LobbyController {
    private lobbyUI!: LobbyUI;

    async initialize(lobbyUI: LobbyUI, options: { onPlayRequested: () => void; lobbyCards: ReadonlyArray<any>; imageService: any; }) {
        this.lobbyUI = lobbyUI;
        this.lobbyUI.setPlayHandler(options.onPlayRequested);
        await this.lobbyUI.setCards(options.lobbyCards, options.imageService);
    }

    async startLobby() {
        await this.lobbyUI.show();
    }
}