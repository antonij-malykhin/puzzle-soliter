import { __private, _decorator, Button, Component, instantiate, Label, Node, Prefab } from 'cc';
import type { YandexGames } from 'ysdk';
import { YandexConfig } from '../../Core/Config/YandexConfig';
import { ServiceContainer } from '../../Core/ServiceContainer';
import { YandexService } from '../../Services/YandexService';
import { LeaderboardRowUI } from './LeaderboardRowUI';
import { LocalizationManager } from '../../Managers/LocalizationManager';

const { ccclass, property } = _decorator;

@ccclass('LeaderboardUI')
export class LeaderboardUI extends Component {
    @property(Node)
    private rootNode: Node | null = null;

    @property(Prefab)
    private rowPrefab: Prefab | null = null;

    @property(Prefab)
    private dividerPrefab: Prefab | null = null;

    @property(Node)
    private listRoot: Node | null = null;

    @property(Button)
    private closeButton: Button | null = null;

    @property(Button)
    private openButton: Button | null = null;

    @property(Label)
    private titleLabel: Label | null = null;

    protected onLoad(): void {
        this.requireCloseButton().node.on(Button.EventType.CLICK, this.hidePanel, this);
        this.requireOpenButton().node.on(Button.EventType.CLICK, this.showPanel, this);
    }
    
    private showPanel(): void {
        this.requireRootNode().active = true;
    }
    
    private requireOpenButton(): Button {
        if (!this.openButton) {
            throw new Error('Open button is not assigned.');
        }
        return this.openButton;
    }

    protected onEnable(): void {
        this.requireTitleLabel().string = ServiceContainer.get(LocalizationManager).t('leaderboardTitle');
        void this.refresh();
    }

    private requireTitleLabel(): Label {
        if (!this.titleLabel) {
            throw new Error('Title label is not assigned.');
        }
        return this.titleLabel;
    }

    protected onDestroy(): void {
        if (this.closeButton?.node) {
            this.closeButton.node.off(Button.EventType.CLICK, this.hidePanel, this);
        }
    }

    private requireCloseButton(): Button {
        if (!this.closeButton) {
            throw new Error('Close button is not assigned.');
        }
        return this.closeButton;
    }

    public async refresh(): Promise<void> {
        if (!this.rowPrefab || !this.listRoot) {
            return;
        }

        const result = await ServiceContainer.get(YandexService).getLeaderboard(YandexConfig.leaderboards.leaderboard);
        const entriesByRank = this.indexByRank(result.entries);

        const displayRanks = this.buildDisplayRanks(result.userRank);
        this.listRoot.removeAllChildren();

        for (let index = 0; index < displayRanks.length; index += 1) {
            const rank = displayRanks[index];
            this.mountRow(rank, entriesByRank.get(rank), rank === result.userRank);

            if (index === 2 && result.userRank !== null && index < displayRanks.length - 1) {
                this.mountDivider();
            }
        }
    }

    private indexByRank(entries: ReadonlyArray<YandexGames.LeaderboardEntry>): Map<number, YandexGames.LeaderboardEntry> {
        const byRank = new Map<number, YandexGames.LeaderboardEntry>();
        for (const entry of entries) {
            if (!byRank.has(entry.rank)) {
                byRank.set(entry.rank, entry);
            }
        }
        return byRank;
    }

    private buildDisplayRanks(userRank: number | null): number[] {
        const ranks: number[] = [];
        for (let rank = 1; rank <= 3; rank += 1) {
            ranks.push(rank);
        }

        if (userRank === null) {
            return ranks;
        }

        for (let rank = userRank - 3; rank <= userRank + 3; rank += 1) {
            if (rank >= 1 && !ranks.find(r => r === rank)) {
                ranks.push(rank);
            }
        }

        return ranks;
    }

    private mountRow(rank: number, entry: YandexGames.LeaderboardEntry | undefined, isPlayer: boolean): void {
        if (!this.rowPrefab || !this.listRoot) {
            return;
        }

        const rowNode = instantiate(this.rowPrefab);
        rowNode.setParent(this.listRoot);

        const row = rowNode.getComponent(LeaderboardRowUI);
        if (entry) {
            row?.setData(entry.rank, entry.player.publicName, entry.score.toString());
        } else {
            row?.setData(rank, '—', '—');
        }
        row?.setHighlighted(isPlayer);
    }

    private mountDivider(): void {
        if (!this.dividerPrefab || !this.listRoot) {
            return;
        }

        const dividerNode = instantiate(this.dividerPrefab);
        dividerNode.setParent(this.listRoot);
    }

    private hidePanel(): void {
        this.requireRootNode().active = false;
    }

    private requireRootNode(): Node {
        if (!this.rootNode) {
            throw new Error('Root node is not assigned.');
        }
        return this.rootNode;
    }
}