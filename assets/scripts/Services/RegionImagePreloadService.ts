import { log, warn } from 'cc';
import { ProgressionManager } from '../Managers/ProgressionManager';
import { LevelService } from './LevelService';
import { ImageService } from './ImageService';

const PRELOAD_BATCH_SIZE = 4;
const PRELOAD_BATCH_YIELD_MS = 30;

type RegionPreloadState = 'idle' | 'loading' | 'loaded';

export class RegionImagePreloadService {
    private readonly stateByRegion = new Map<number, RegionPreloadState>();
    private readonly inFlightByRegion = new Map<number, Promise<void>>();

    public constructor(
        private readonly progressionManager: ProgressionManager,
        private readonly levelService: LevelService,
        private readonly imageService: ImageService,
    ) {}

    public preloadCurrentRegionInBackground(): void {
        const regionNumber = this.progressionManager.getCurrentRegionNumber();
        if (this.stateByRegion.get(regionNumber) === 'loaded' || this.inFlightByRegion.has(regionNumber)) {
            return;
        }

        const startTimestamp = Date.now();
        this.stateByRegion.set(regionNumber, 'loading');

        const preloadPromise = (async () => {
            try {
                const imageCount = await this.preloadRegionLevelImages(regionNumber);
                this.stateByRegion.set(regionNumber, 'loaded');
                const elapsedMs = Date.now() - startTimestamp;
                log(
                    `RegionImagePreloadService: region-${regionNumber} preloaded ${imageCount} level images in ${elapsedMs}ms`,
                );
            } catch (error: unknown) {
                this.stateByRegion.set(regionNumber, 'idle');
                warn(`RegionImagePreloadService: preload failed for region-${regionNumber}`, error);
            } finally {
                this.inFlightByRegion.delete(regionNumber);
            }
        })();

        this.inFlightByRegion.set(regionNumber, preloadPromise);
    }

    private async preloadRegionLevelImages(regionNumber: number): Promise<number> {
        const catalog = await this.levelService.getLevelCatalog(regionNumber);
        const levelDataList = await Promise.all(
            catalog.levels.map((catalogLevel) => this.levelService.getLevel(catalogLevel.levelId)),
        );

        const imageIds = levelDataList
            .map((levelData) => levelData.imageId)
            .filter((imageId) => Boolean(imageId));

        await this.imageService.preloadImagesByIds(imageIds, {
            batchSize: PRELOAD_BATCH_SIZE,
            batchYieldMs: PRELOAD_BATCH_YIELD_MS,
        });

        return new Set(imageIds).size;
    }
}
