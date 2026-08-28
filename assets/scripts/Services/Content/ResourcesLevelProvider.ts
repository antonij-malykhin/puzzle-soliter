import { ILevelProvider } from '../../Data/Interfaces/ILevelProvider';
import { LevelData } from '../../Data/Models/LevelData';
import { LevelCatalogData, LevelCatalogEntry } from '../../Data/Models/LevelCatalog';
import { JsonAsset, resources } from 'cc';
import {
    LEVELS_PER_REGION,
    LEVEL_CATALOG_RESOURCE_PATH,
    TRAINING_LEVEL_ID,
    TRAINING_LEVEL_RESOURCE_PATH,
} from '../../Core/Config/GameConstants';

export class ResourcesLevelProvider implements ILevelProvider {
    private readonly levelCache = new Map<string, LevelData>();
    private readonly catalogCache = new Map<number, LevelCatalogData>();

    public async getLevel(levelId: string): Promise<LevelData> {
        const cachedLevel = this.levelCache.get(levelId);
        if (cachedLevel) {
            return cachedLevel;
        }

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

        this.levelCache.set(levelId, levelData);
        return levelData;
    }

    public getTrainingLevelId(): string {
        return TRAINING_LEVEL_ID;
    }

    public async getLevelCatalog(regionNumber: number): Promise<LevelCatalogData> {
        const cachedCatalog = this.catalogCache.get(regionNumber);
        if (cachedCatalog) {
            return cachedCatalog;
        }

        const catalogPath = `${LEVEL_CATALOG_RESOURCE_PATH}-${regionNumber}/region-${regionNumber}`;
        const catalog = await new Promise<LevelCatalogData>((resolve, reject) => {
            resources.load(catalogPath, JsonAsset, (error, jsonAsset) => {
                if (error || !jsonAsset) {
                    reject(error ?? new Error(`Level catalog json not found: ${catalogPath}`));
                    return;
                }

                resolve(jsonAsset.json as LevelCatalogData);
            });
        });

        const levels = Array.isArray(catalog.levels) ? catalog.levels : [];
        const result: LevelCatalogData = {
            regionImageId: catalog.regionImageId,
            cols: catalog.cols,
            rows: catalog.rows,
            spacingX: catalog.spacingX,
            spacingY: catalog.spacingY,
            levels: levels
                .filter((entry) => Boolean(entry.levelId))
                .sort((left, right) => {
                    if (left.gridY !== right.gridY) {
                        return left.gridY - right.gridY;
                    }

                    return left.gridX - right.gridX;
                }),
        };

        this.catalogCache.set(regionNumber, result);
        return result;
    }

    private resolveLevelPath(levelId: string): string {
        if (levelId === TRAINING_LEVEL_ID) {
            return TRAINING_LEVEL_RESOURCE_PATH;
        }

        const levelNumber = Number(levelId.replace('level-', ''));
        const regionNumber = Math.floor((levelNumber - 1) / LEVELS_PER_REGION) + 1;
        return `levels/region-${regionNumber}/${levelId}`;
    }
}
