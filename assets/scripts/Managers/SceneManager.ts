import { director } from 'cc';
import { LOBBY_SCENE_NAME } from '../Core/Config/GameConstants';
import { LoadingService } from '../Services/LoadingService';
import { ServiceContainer } from '../Core/ServiceContainer';

export class SceneManager {
    public async loadScene(sceneName: string): Promise<void> {
        ServiceContainer.get(LoadingService).show();
        await new Promise<void>((resolve) => {
            director.loadScene(sceneName, () => resolve());
        });
    }

    public async loadGameplayScene(sceneName: string): Promise<void> {
        await this.loadScene(sceneName);
    }

    public async loadLobbyScene(): Promise<void> {
        await this.loadScene(LOBBY_SCENE_NAME);
    }
}
