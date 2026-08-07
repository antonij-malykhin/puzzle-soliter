import { LobbyUI } from '../UI/Screens/LobbyUI';
import { LobbyLevelCardPresentation } from '../Data/Models/LobbyLevelCardPresentation';
import { EventBus } from '../Core/Events/EventBus';
import { GameEventMap } from '../Core/Events/GameEventMap';
export class LobbyController {
    private lobbyUI!: LobbyUI;

    async initialize(
        eventBus: EventBus<GameEventMap>,
        lobbyUI: LobbyUI, spacingX: number, 
        spacingY: number, 
        cols: number, 
        rows: number, 
        options: { onPlayRequested: () => void; lobbyCards: ReadonlyArray<LobbyLevelCardPresentation>; }
    ) : Promise<void> {
        this.lobbyUI = lobbyUI;
        this.lobbyUI.initialize(eventBus, options.onPlayRequested, spacingX, spacingY, cols, rows);
		await this.lobbyUI.setCards(options.lobbyCards);
    }

    async startLobby() {
        await this.lobbyUI.show();
    }
}