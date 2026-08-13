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
	SpriteFrame,
	UITransform,
	Widget,
} from 'cc';
import { CollectionImagePresentation } from '../../Data/Models/CollectionImagePresentation';
import { CollectionLevelCellUI } from './CollectionLevelCellUI';
import { ServiceContainer } from '../../Core/ServiceContainer';
import { ProgressionManager } from '../../Managers/ProgressionManager';
import { LevelService } from '../../Services/LevelService';
import { ImageService } from '../../Services/ImageService';
import { SpriteFrameSliceService } from '../../Services/SpriteFrameSliceService';
import { LocalizationManager } from '../../Managers/LocalizationManager';

const { ccclass, property } = _decorator;

const COLLECTION_CELL_WIDTH = 325;
const COLLECTION_CELL_HEIGHT = 650;
const COLLECTION_CELL_SPACING = 0;
const COLLECTION_COLUMN_COUNT = 2;
const FULL_IMAGE_MAX_WIDTH = 1040;
const FULL_IMAGE_MAX_HEIGHT = 2300;

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

	@property(Sprite)
	public fullImageSprite: Sprite | null = null;

	@property(Prefab)
	public commonLevelImagePrefab: Prefab | null = null;

	@property(Prefab)
	public regionLevelImagePrefab: Prefab | null = null;

	@property(Label)
	public titleLabel: Label | null = null;

	private isOpening = false;

	protected onLoad(): void {
		this.collectionButton?.node.on(Button.EventType.CLICK, this.open, this);
		this.closeButton?.node.on(Button.EventType.CLICK, this.closeCollections, this);
		this.closeFullImageButton?.node.on(Button.EventType.CLICK, this.closeFullImage, this);
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
	}

	private async open(): Promise<void> {
		if (this.isOpening) {
			return;
		}

		this.isOpening = true;
		try {
			await this.populate();
			this.requireTitleLabel().string = ServiceContainer.get(LocalizationManager).t('collectionScreenTitle');
			this.showCollections();
			this.requireScrollView().scrollToTop(0);
		} finally {
			this.isOpening = false;
		}
	}

	private requireScrollView(): ScrollView {
		if (!this.scrollView) {
			throw new Error('Scroll view is not assigned.');
		}
		return this.scrollView;
	}

	private requireTitleLabel(): Label {
		if (!this.titleLabel) {
			throw new Error('Title label is not assigned.');
		}
		return this.titleLabel;
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

	private async populate(): Promise<void> {
		const progressionManager = ServiceContainer.get(ProgressionManager);
		const levelService = ServiceContainer.get(LevelService);
		const imageService = ServiceContainer.get(ImageService);
		const localization = ServiceContainer.get(LocalizationManager);

		const regionNumber = progressionManager.getCurrentRegionNumber();
		const catalog = await levelService.getLevelCatalog(regionNumber);
		const regionImage = await imageService.getImage(catalog.regionImageId);

		const blueprints: CollectionCellBlueprint[] = [];

		for (const level of catalog.levels) {
			const levelData = await levelService.getLevel(level.levelId);
			const spriteFrame = levelData.imageId ? await imageService.getImage(levelData.imageId) : null;

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
				isCompleted: progressionManager.isCurrentRegionCompleted(),
				levelNumber: null,
				label: localization.t('collectionRegionLabel'),
			},
		});

		//this.configureLayout();

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
	}

	private bindCellClick(cellNode: Node, item: CollectionImagePresentation): void {
		if (item.isCompleted && item.spriteFrame) {
			const spriteFrame = item.spriteFrame;
			cellNode.on(Button.EventType.CLICK, () => this.openFullImage(spriteFrame), this);
		}
	}

	private openFullImage(spriteFrame: SpriteFrame): void {
		const fullImageSprite = this.requireFullImageSprite();
		// const rect = spriteFrame.rect;
		// const aspectRatio = rect.width / rect.height;

		// const uiTransform = fullImageSprite.getComponent(UITransform);

		// const widget = fullImageSprite.getComponent(Widget);
		// const parentSize = fullImageSprite.node.parent?.getComponent(UITransform)?.contentSize;
		// let availableWidth = FULL_IMAGE_MAX_WIDTH;
		// let availableHeight = FULL_IMAGE_MAX_HEIGHT;

		// if (widget && parentSize) {
		// 	availableWidth = Math.max(1, parentSize.width - widget.left - widget.right);
		// 	availableHeight = Math.max(1, parentSize.height - widget.top - widget.bottom);
		// 	widget.enabled = false;
		// }

		// let width = availableWidth;
		// let height = width / aspectRatio;
		// if (height > availableHeight) {
		// 	height = availableHeight;
		// 	width = height * aspectRatio;
		// }

		// uiTransform?.setContentSize(width, height);

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