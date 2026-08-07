import { _decorator, Button, Component, Label } from 'cc';
import { YandexConfig } from '../../Core/Config/YandexConfig';
import { ServiceContainer } from '../../Core/ServiceContainer';
import { YandexAdManager } from '../../Managers/YandexAdManager';

const { ccclass, property } = _decorator;

/**
 * Кнопка просмотра reward-рекламы за бонусные монеты.
 * Сама кнопка и подпись подключаются через инспектор.
 */
@ccclass('AdButtonUI')
export class AdButtonUI extends Component {
    @property(Button)
    private rewardButton: Button | null = null;

    @property(Label)
    private rewardLabel: Label | null = null;

    private onRewardedHandler: ((granted: boolean) => void) | null = null;

    protected onLoad(): void {
        if (!this.rewardButton) {
            throw new Error('Reward button is not assigned.');
        }

        this.rewardButton.node.on(Button.EventType.CLICK, this.onRewardClicked, this);

        if (this.rewardLabel) {
            this.rewardLabel.string = `+${YandexConfig.rewardBonusCoins}`;
        }
    }

    protected onDestroy(): void {
        this.rewardButton?.node.off(Button.EventType.CLICK, this.onRewardClicked, this);
    }

    public setRewardedHandler(handler: (granted: boolean) => void): void {
        this.onRewardedHandler = handler;
    }

    private onRewardClicked(): void {
        ServiceContainer.get(YandexAdManager).showRewardForCoins((granted) => {
            this.onRewardedHandler?.(granted);
        });
    }
}