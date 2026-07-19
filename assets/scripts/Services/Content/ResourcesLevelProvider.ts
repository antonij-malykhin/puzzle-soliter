import { ILevelProvider } from '../../Data/Interfaces/ILevelProvider';
import { LevelData } from '../../Data/Models/LevelData';
import { JsonAsset, resources } from 'cc';
import { TRAINING_LEVEL_ID, TRAINING_LEVEL_RESOURCE_PATH } from '../../Core/Config/GameConstants';

export class ResourcesLevelProvider implements ILevelProvider {
    public async getLevel(levelId: string): Promise<LevelData> {
        const requestedLevelPath = this.resolveLevelPath(levelId);

        const levelData = await new Promise<LevelData>((resolve, reject) => {
            resources.load(requestedLevelPath, JsonAsset, (error, jsonAsset) => {
                if (error || !jsonAsset) {
                    reject(error ?? new Error(`Level json not found: ${requestedLevelPath}`));
                    return;
                }

                resolve(jsonAsset.json as LevelData);
            });
        });

        return levelData;
    }

    public getTrainingLevelId(): string {
        return TRAINING_LEVEL_ID;
    }

    private resolveLevelPath(levelId: string): string {
        if (levelId === TRAINING_LEVEL_ID) {
            return TRAINING_LEVEL_RESOURCE_PATH;
        }

        return `levels/${levelId}`;
    }
}
