import { director } from 'cc';

export class SceneManager {
    public async loadGameplayScene(sceneName: string): Promise<void> {
        await new Promise<void>((resolve) => {
            director.loadScene(sceneName, () => resolve());
        });
    }
}
