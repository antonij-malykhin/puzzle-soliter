import { ILevelProvider } from '../../Data/Interfaces/ILevelProvider';
import { LevelData } from '../../Data/Models/LevelData';
import { LevelCatalogData, LevelCatalogEntry } from '../../Data/Models/LevelCatalog';
import { JsonAsset, resources } from 'cc';
import {
    LEVEL_CATALOG_RESOURCE_PATH,
    TRAINING_LEVEL_ID,
    TRAINING_LEVEL_RESOURCE_PATH,
} from '../../Core/Config/GameConstants';

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

    public async getLevelCatalog(regionNumber: number): Promise<LevelCatalogData> {
        const catalog = await new Promise<LevelCatalogData>((resolve, reject) => {
            resources.load(LEVEL_CATALOG_RESOURCE_PATH + "-" + regionNumber, JsonAsset, (error, jsonAsset) => {
                if (error || !jsonAsset) {
                    reject(error ?? new Error(`Level catalog json not found: ${LEVEL_CATALOG_RESOURCE_PATH + "-" + regionNumber}`));
                    return;
                }

                resolve(jsonAsset.json as LevelCatalogData);
            });
        });

        const levels = Array.isArray(catalog.levels) ? catalog.levels : [];
        return {
            regionImageId: catalog.regionImageId,
            levels: levels
                .filter((entry) => Boolean(entry.levelId))
                .sort((left, right) => {
                    if (left.gridY !== right.gridY) {
                        return left.gridY - right.gridY;
                    }

                    return left.gridX - right.gridX;
                }),
        };
    }

    private resolveLevelPath(levelId: string): string {
        if (levelId === TRAINING_LEVEL_ID) {
            return TRAINING_LEVEL_RESOURCE_PATH;
        }

        return `levels/${levelId}`;
    }
}
