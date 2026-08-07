import {
	_decorator,
	Button,
	instantiate,
	Label,
	Node,
	ParticleSystem2D,
	Prefab,
	Sprite,
	SpriteFrame,
	tween,
	Vec3,
} from 'cc';

import { UIView } from '../Base/UIView';
import { LobbyLevelCardPresentation } from '../../Data/Models/LobbyLevelCardPresentation';
import { LobbyLevelCardUI } from './LobbyLevelCardUI';
import { LevelGridManager } from './LevelGridManager';
import { SettingsUI } from './SettingsUI';
import { WalletUI } from './WalletUI';
import { GameEventMap } from '../../Core/Events/GameEventMap';
import { EventBus } from '../../Core/Events/EventBus';
import { ServiceContainer } from '../../Core/ServiceContainer';
import { LocalizationManager } from '../../Managers/LocalizationManager';

const { ccclass, property } = _decorator;

@ccclass('LobbyUI')
export class LobbyUI extends UIView {
	@property
	private flipHalfDuration: number = 0.16;
	
	@property(LevelGridManager)
	private levelGridManager: LevelGridManager | null = null;
	
	@property(Label)
	private levelLabel: Label | null = null;

	@property(Button)
	private playButton: Button | null = null;
	
	@property(Node)
	private gridRoot: Node | null = null;
	
	@property(Sprite)
	private regionCompleteSprite: Sprite | null = null;
	
	@property(Button)
	private nextRegionButton: Button | null = null;
	
	@property(SettingsUI)
	private settingsUI!: SettingsUI;

	@property(WalletUI)
	private walletUI!: WalletUI;
	
	@property([ParticleSystem2D])
	private particlesEffect: Array<ParticleSystem2D> = [];
	
	private playHandler: (() => void) | null = null;
	
	private nextRegionHandler: (() => void) | null = null;
	
	@property(Prefab)
	public cardPrefab: Prefab | null = null;
	
	private disposables: Array<() => void> = [];
	
	protected onLoad(): void {
		super.onLoad();
		this.bindButtons();
		this.hideRegionCompleteNodes();
	}

	initialize(eventBus: EventBus<GameEventMap>, onPlayRequested: () => void, spacingX: number, spacingY: number, cols: number, rows: number) {
		if (!this.levelGridManager || !this.walletUI) {
			throw new Error('LobbyUI: required components are not set.');
		}

		this.playHandler = onPlayRequested;

		this.disposables.push(eventBus.on('SettingsChanged', ({ settings }) => {
			this.settingsUI.setSettings(settings);
		}));

		this.walletUI.initialize(eventBus);
		this.levelGridManager.initGrid(spacingX, spacingY, cols, rows);
	}
	
	public async setCards(cards: ReadonlyArray<LobbyLevelCardPresentation>): Promise<void> {
		if (!this.gridRoot || !this.cardPrefab || !this.levelLabel) {
			throw new Error('LobbyUI: required components are not set for setCards.');
		}
		
		this.gridRoot.removeAllChildren();
		for (const card of cards) {
			await this.createCardNode(card, this.cardPrefab);
		}
		
		const currentCard = cards.find((card) => card.isCurrent);
		const localization = ServiceContainer.get(LocalizationManager);
		this.levelLabel.string = currentCard
		? localization.t('lobbyLevel', { number: currentCard.levelNumber })
		: localization.t('lobbyLevelNotSelected');

		this.showLevelGrid();
	}

	public showRegionComplete(regionImage: SpriteFrame, onNextRegion: () => void): void {
		if (!this.gridRoot || !this.playButton || !this.levelLabel || !this.regionCompleteSprite || !this.nextRegionButton) {
			throw new Error('LobbyUI: required components are not set for showRegionComplete.');
		}

		this.nextRegionHandler = onNextRegion;
		
		this.gridRoot.active = false;
		this.playButton.node.active = false;
		this.levelLabel.node.active = false;
		this.regionCompleteSprite.node.active = true;
		this.regionCompleteSprite.spriteFrame = regionImage;
		this.nextRegionButton.node.active = true;
		this.nextRegionButton.node.off(Button.EventType.CLICK, this.onNextRegionClicked, this);
		this.nextRegionButton.node.on(Button.EventType.CLICK, this.onNextRegionClicked, this);
		this.particlesEffect.forEach(effect => effect.resetSystem());
	}

	public showLevelGrid(): void {
		if (!this.gridRoot || !this.playButton || !this.levelLabel) {
			throw new Error('LobbyUI: required components are not set for showLevelGrid.');
		}

		this.gridRoot.active = true;
		this.playButton.node.active = true;
		this.levelLabel.node.active = true;
		this.hideRegionCompleteNodes();
	}

	private hideRegionCompleteNodes(): void {
		if (!this.regionCompleteSprite || !this.nextRegionButton) {
			throw new Error('LobbyUI: required components are not set for hideRegionCompleteNodes.');
		}

		this.regionCompleteSprite.node.active = false;
		this.nextRegionButton.node.active = false;
	}

	private bindButtons(): void {
		if (!this.playButton) {
			throw new Error('Play button is not set.');
		}

		this.playButton.node.off(Button.EventType.CLICK, this.onPlayClicked, this);
		this.playButton.node.on(Button.EventType.CLICK, this.onPlayClicked, this);
	}

	private onPlayClicked(): void {
		this.playHandler?.();
	}

	private onNextRegionClicked(): void {
		this.nextRegionHandler?.();
	}

	private async createCardNode(card: LobbyLevelCardPresentation, cardPrefab: Prefab): Promise<void> {
		if (!this.gridRoot) {
			throw new Error('Grid root is not set.');
		}

		const cardNode = instantiate(cardPrefab);
		const lobbyCardComponent = cardNode.getComponent(LobbyLevelCardUI);
		cardNode.name = `LevelCard_${card.levelId}`;
		cardNode.setParent(this.gridRoot);
		lobbyCardComponent!.render(card);

		if (card.isCurrent) {
			lobbyCardComponent!.playCurrentLevelAnimation();
		}

		if (card.isCompleted && card.shouldAnimateFlip) {
			await this.playCompletedFlipAnimation(cardNode);
		}
	}

	private async playCompletedFlipAnimation(cardNode: Node): Promise<void> {
		await new Promise<void>((resolve) => {
			tween(cardNode)
				.to(this.flipHalfDuration, { scale: new Vec3(0.05, 1, 1) })
				.to(this.flipHalfDuration, { scale: new Vec3(1, 1, 1) })
				.call(() => resolve())
				.start();
		});
	}
}
