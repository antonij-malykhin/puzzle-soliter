import {
	_decorator,
	Button,
	Component,
	instantiate,
	Label,
	Layout,
	Node,
	Prefab,
	ScrollView,
	Size,
	Sprite,
	SpriteFrame
} from 'cc';
import { CollectionImagePresentation } from '../../Data/Models/CollectionImagePresentation';
import { CollectionLevelCellUI } from './CollectionLevelCellUI';
import { ServiceContainer } from '../../Core/ServiceContainer';
import { ProgressionManager } from '../../Managers/ProgressionManager';
import { LevelService } from '../../Services/LevelService';
import { ImageService } from '../../Services/ImageService';
import { LocalizationManager } from '../../Managers/LocalizationManager';
import { LoadingService } from '../../Services/LoadingService';

const { ccclass, property } = _decorator;

const COLLECTION_CELL_WIDTH = 325;
const COLLECTION_CELL_HEIGHT = 650;
const COLLECTION_CELL_SPACING = 0;
const COLLECTION_COLUMN_COUNT = 2;
const DEFAULT_MAX_REGION_NUMBER = 10;

interface CollectionCellBlueprint {
	readonly item: CollectionImagePresentation;
	readonly prefab: Prefab;
}

@ccclass('CollectionUI')
export class CollectionUI extends Component {
	@property(Node)
	public rootCollections: Node | null = null;

	@property(Node)
	public fullScreenRoot: Node | null = null;

	@property(Node)
	public content: Node | null = null;

	@property(ScrollView)
	public scrollView: ScrollView | null = null;

	@property(Button)
	public collectionButton: Button | null = null;

	@property(Button)
	public closeButton: Button | null = null;

	@property(Button)
	public closeFullImageButton: Button | null = null;

	@property(Button)
	public previousRegionButton: Button | null = null;

	@property(Button)
	public nextRegionButton: Button | null = null;

	@property(Boolean)
	public showOnlyAvailableRegions = false;

	@property(Number)
	public maxRegionNumber = DEFAULT_MAX_REGION_NUMBER;

	@property(Sprite)
	public fullImageSprite: Sprite | null = null;

	@property(Prefab)
	public commonLevelImagePrefab: Prefab | null = null;

	@property(Prefab)
	public regionLevelImagePrefab: Prefab | null = null;

	@property(Label)
	public regionTitleLabel: Label | null = null;

	private isOpening = false;
	private selectedRegionNumber = 1;
	private userRegionNumber: number = 1;

	protected onLoad(): void {
		this.collectionButton?.node.on(Button.EventType.CLICK, this.open, this);
		this.closeButton?.node.on(Button.EventType.CLICK, this.closeCollections, this);
		this.closeFullImageButton?.node.on(Button.EventType.CLICK, this.closeFullImage, this);
		this.previousRegionButton?.node.on(Button.EventType.CLICK, this.onPreviousRegionClicked, this);
		this.nextRegionButton?.node.on(Button.EventType.CLICK, this.onNextRegionClicked, this);
		this.closeCollections();
	}

	protected onDestroy(): void {
		if (this.collectionButton?.node) {
			this.collectionButton?.node.off(Button.EventType.CLICK, this.open, this);
		}

		if (this.closeButton?.node) {
			this.closeButton?.node.off(Button.EventType.CLICK, this.closeCollections, this);
		}

		if (this.closeFullImageButton?.node) {
			this.closeFullImageButton?.node.off(Button.EventType.CLICK, this.closeFullImage, this);
		}

		if (this.previousRegionButton?.node) {
			this.previousRegionButton.node.off(Button.EventType.CLICK, this.onPreviousRegionClicked, this);
		}

		if (this.nextRegionButton?.node) {
			this.nextRegionButton.node.off(Button.EventType.CLICK, this.onNextRegionClicked, this);
		}
	}

	private async open(): Promise<void> {
		if (this.isOpening) {
			return;
		}

		this.isOpening = true;

		try {
			const currentRegionNumber = ServiceContainer.get(ProgressionManager).getCurrentRegionNumber();
			this.userRegionNumber = currentRegionNumber;
			this.regionTitleLabel!.string = ServiceContainer.get(LocalizationManager).t("regionNumber", { number: currentRegionNumber });
			this.selectedRegionNumber = Math.min(
				Math.max(1, currentRegionNumber),
				this.getLastSelectableRegionNumber(),
			);
			await this.loadRegion(this.selectedRegionNumber);
		} finally {
			this.isOpening = false;
		}
	}

	private async onPreviousRegionClicked(): Promise<void> {
		await this.changeRegion(-1);
	}

	private async onNextRegionClicked(): Promise<void> {
		await this.changeRegion(1);
	}

	private async changeRegion(offset: number): Promise<void> {
		if (this.isOpening) {
			return;
		}

		const targetRegionNumber = this.selectedRegionNumber + offset;
		if (!this.isRegionSelectable(targetRegionNumber)) {
			return;
		}

		this.isOpening = true;
		const previousRegionNumber = this.selectedRegionNumber;
		this.selectedRegionNumber = targetRegionNumber;

		try {
			await this.loadRegion(targetRegionNumber);
		} catch (error) {
			this.selectedRegionNumber = previousRegionNumber;
			throw error;
		} finally {
			this.isOpening = false;
		}

		if (this.selectedRegionNumber == this.userRegionNumber) {
			this.nextRegionButton!.node.active = false;
		} else {
			this.nextRegionButton!.node.active = true;
		}

		if (this.selectedRegionNumber == 1) {
			this.previousRegionButton!.node.active = false;
		} else {
			this.previousRegionButton!.node.active = true;
		}
	}

	private async loadRegion(regionNumber: number): Promise<void> {
		const loadingService = ServiceContainer.get(LoadingService);
		const localization = ServiceContainer.get(LocalizationManager);
		loadingService.setMessage(localization.t('loadingCollection'));
		loadingService.show();

		try {
			await this.populate(regionNumber);
			this.showCollections();
			this.requireScrollView().scrollToTop(0);
		} finally {
			loadingService.hide();
		}
	}

	private requireScrollView(): ScrollView {
		if (!this.scrollView) {
			throw new Error('Scroll view is not assigned.');
		}
		return this.scrollView;
	}

	private showCollections(): void {
		this.requireRootCollections().active = true;
		this.requireFullScreenRoot().active = false;
	}

	private closeCollections(): void {
		this.requireRootCollections().active = false;
		this.requireFullScreenRoot().active = false;
	}

	private closeFullImage(): void {
		this.requireRootCollections().active = true;
		this.requireFullScreenRoot().active = false;
	}

	private async populate(regionNumber: number): Promise<void> {
		const progressionManager = ServiceContainer.get(ProgressionManager);
		const levelService = ServiceContainer.get(LevelService);
		const imageService = ServiceContainer.get(ImageService);
		const localization = ServiceContainer.get(LocalizationManager);

		const catalog = await levelService.getLevelCatalog(regionNumber);
		const regionImage = await imageService.getImageById(catalog.regionImageId);
		const levelDataById = new Map(
			await Promise.all(
				catalog.levels.map(async (level) => {
					const levelData = await levelService.getLevel(level.levelId);
					return [level.levelId, levelData] as const;
				}),
			),
		);

		const spriteByLevelId = new Map(
			await Promise.all(
				catalog.levels.map(async (level) => {
					const levelData = levelDataById.get(level.levelId);
					const spriteFrame = levelData?.imageId ? await imageService.getImageById(levelData.imageId) : null;
					return [level.levelId, spriteFrame] as const;
				}),
			),
		);

		const blueprints: CollectionCellBlueprint[] = [];

		for (const level of catalog.levels) {
			const spriteFrame = spriteByLevelId.get(level.levelId) ?? null;

			blueprints.push({
				prefab: this.requireCommonLevelImagePrefab(),
				item: {
					cellId: level.levelId,
					isRegion: false,
					spriteFrame,
					isCompleted: progressionManager.isCompleted(level.levelId),
					levelNumber: level.levelNumber,
					label: String(level.levelNumber),
				},
			});
		}

		blueprints.push({
			prefab: this.requireRegionLevelImagePrefab(),
			item: {
				cellId: `region-${regionNumber}`,
				isRegion: true,
				spriteFrame: regionImage,
				isCompleted:
					catalog.levels.length > 0 &&
					catalog.levels.every((level) => progressionManager.isCompleted(level.levelId)),
				levelNumber: null,
				label: localization.t('collectionRegionLabel'),
			},
		});

		const content = this.requireContent();
		content.removeAllChildren();

		for (const blueprint of blueprints) {
			const cellNode = instantiate(blueprint.prefab);
			cellNode.setParent(content);

			const cellUI = cellNode.getComponent(CollectionLevelCellUI);
			if (!cellUI) {
				throw new Error('CollectionLevelCellUI component is missing on the cell prefab.');
			}

			cellUI.render(blueprint.item);
			this.bindCellClick(cellNode, blueprint.item);
		}

		this.updateRegionButtons();
	}

	private isRegionSelectable(regionNumber: number): boolean {
		return regionNumber >= 1 && regionNumber <= this.getLastSelectableRegionNumber();
	}

	private getLastSelectableRegionNumber(): number {
		const configuredMaxRegionNumber = Math.max(1, Math.floor(this.maxRegionNumber));
		if (!this.showOnlyAvailableRegions) {
			return configuredMaxRegionNumber;
		}

		const currentRegionNumber = ServiceContainer.get(ProgressionManager).getCurrentRegionNumber();
		return Math.max(1, Math.min(configuredMaxRegionNumber, currentRegionNumber));
	}

	private updateRegionButtons(): void {
		const lastRegionNumber = this.getLastSelectableRegionNumber();
		if (this.previousRegionButton) {
			this.previousRegionButton.interactable = this.selectedRegionNumber > 1;
		}

		if (this.nextRegionButton) {
			this.nextRegionButton.interactable = this.selectedRegionNumber < lastRegionNumber;
		}
	}

	private bindCellClick(cellNode: Node, item: CollectionImagePresentation): void {
		if (item.isCompleted && item.spriteFrame) {
			const spriteFrame = item.spriteFrame;
			cellNode.on(Button.EventType.CLICK, () => this.openFullImage(spriteFrame), this);
		}
	}

	private openFullImage(spriteFrame: SpriteFrame): void {
		const fullImageSprite = this.requireFullImageSprite();
		fullImageSprite.spriteFrame = spriteFrame;
		this.requireRootCollections().active = false;
		this.requireFullScreenRoot().active = true;
	}

	private configureLayout(): void {
		const content = this.requireContent();
		const layout = content.getComponent(Layout) ?? content.addComponent(Layout);
		layout.type = Layout.Type.GRID;
		layout.resizeMode = Layout.ResizeMode.CONTAINER;
		//layout.constraintMode = Layout.ConstraintMode.FIXED_COL;
		layout.constraintNum = COLLECTION_COLUMN_COUNT;
		layout.cellSize = new Size(COLLECTION_CELL_WIDTH, COLLECTION_CELL_HEIGHT);
		layout.spacingX = COLLECTION_CELL_SPACING;
		layout.spacingY = COLLECTION_CELL_SPACING;
		layout.horizontalDirection = Layout.HorizontalDirection.LEFT_TO_RIGHT;
		layout.verticalDirection = Layout.VerticalDirection.TOP_TO_BOTTOM;
		layout.updateLayout();
	}

	private requireRootCollections(): Node {
		if (!this.rootCollections) {
			throw new Error('CollectionUI: rootCollections node is not assigned.');
		}

		return this.rootCollections;
	}

	private requireFullScreenRoot(): Node {
		if (!this.fullScreenRoot) {
			throw new Error('CollectionUI: fullScreenRoot node is not assigned.');
		}

		return this.fullScreenRoot;
	}

	private requireContent(): Node {
		if (!this.content) {
			throw new Error('CollectionUI: content node is not assigned.');
		}

		return this.content;
	}

	private requireFullImageSprite(): Sprite {
		if (!this.fullImageSprite) {
			throw new Error('CollectionUI: fullImageSprite is not assigned.');
		}

		return this.fullImageSprite;
	}

	private requireCommonLevelImagePrefab(): Prefab {
		if (!this.commonLevelImagePrefab) {
			throw new Error('CollectionUI: commonLevelImagePrefab is not assigned.');
		}

		return this.commonLevelImagePrefab;
	}

	private requireRegionLevelImagePrefab(): Prefab {
		if (!this.regionLevelImagePrefab) {
			throw new Error('CollectionUI: regionLevelImagePrefab is not assigned.');
		}

		return this.regionLevelImagePrefab;
	}
}
