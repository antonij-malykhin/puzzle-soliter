import {
	_decorator,
	Button,
	instantiate,
	Label,
	Node,
	Prefab,
	tween,
	Vec3,
} from 'cc';

import { ImageService } from '../../Services/ImageService';
import { UIView } from '../Base/UIView';
import { LobbyLevelCard } from '../../Data/Models/LobbyLevelCard';
import { LobbyLevelCardUI } from './LobbyLevelCardUI';

const { ccclass, property } = _decorator;

@ccclass('LobbyUI')
export class LobbyUI extends UIView {
	@property
	private flipHalfDuration: number = 0.16;

	@property(Label)
	private levelLabel: Label | null = null;

	@property(Button)
	private playButton: Button | null = null;

	@property(Node)
	private gridRoot: Node | null = null;

	private playHandler: (() => void) | null = null;

	@property(Prefab)
	public cardPrefab: Prefab | null = null;

	protected onLoad(): void {
		super.onLoad();
		this.bindButtons();
	}

	public setPlayHandler(handler: () => void): void {
		this.playHandler = handler;
	}

	public async setCards(cards: ReadonlyArray<LobbyLevelCard>, imageService: ImageService): Promise<void> {
		if (!this.gridRoot) {
			throw new Error('Grid root is not set.');
		}

		this.gridRoot.removeAllChildren();
		for (const card of cards) {
			await this.createCardNode(card, this.cardPrefab!, imageService);
		}

		const currentCard = cards.find((card) => card.isCurrent);
		this.levelLabel!.string = currentCard
			? `Current level: ${currentCard.levelNumber}`
			: 'Current level: not selected';
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

	private async createCardNode(card: LobbyLevelCard, cardPrefab: Prefab, imageService: ImageService): Promise<void> {
		if (!this.gridRoot) {
			throw new Error('Grid root is not set.');
		}

		const cardNode = instantiate(cardPrefab);
		const lobbyCardComponent = cardNode.getComponent(LobbyLevelCardUI);
		cardNode.name = `LevelCard_${card.levelId}`;
		cardNode.setParent(this.gridRoot);
		let completedSpriteFrame = null;
		let placeholderSpriteFrame = null;

		if (card.isCompleted && card.cardImageId) {
			try {
				completedSpriteFrame = await imageService.getImage(card.cardImageId);
			} catch {
				throw new Error(`Failed to load image for card with ID: ${card.cardImageId}`);
			}
		}

		if (!card.isCompleted && card.cardImageId) {
			try {
				placeholderSpriteFrame = await imageService.getImage(card.cardImageId);
			} catch {
				throw new Error(`Failed to load image for card with ID: ${card.cardImageId}`);
			}
		}

		if (card.isCompleted && !card.shouldAnimateFlip) {
			lobbyCardComponent!.applyFrontSide(completedSpriteFrame);
		} else {
			lobbyCardComponent!.applyBackSide(placeholderSpriteFrame);
		}

		if (card.isCompleted && !card.shouldAnimateFlip) {
			lobbyCardComponent!.setLevelNumberLabel('');
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
