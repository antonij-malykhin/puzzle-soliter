import { _decorator, Button, Component, instantiate, Node, Prefab } from 'cc';
import type { YandexGames } from 'ysdk';
import { YandexConfig } from '../../Core/Config/YandexConfig';
import { ServiceContainer } from '../../Core/ServiceContainer';
import { YandexService } from '../../Services/YandexService';
import { LeaderboardRowUI } from './LeaderboardRowUI';

const { ccclass, property } = _decorator;

/**
 * Отображает лидерборд. Строки инстансируются из префаба строки, разделитель —
 * из префаба разделителя, а контейнер и кнопки подключаются через инспектор.
 * Код не создаёт элементы UI вручную.
 *
 * Структура списка:
 *   1) три строки призёров,
 *   2) разделительная полоса,
 *   3) три игрока выше, сам игрок и три игрока ниже.
 */
@ccclass('LeaderboardUI')
export class LeaderboardUI extends Component {
    @property(Prefab)
    private rowPrefab: Prefab | null = null;

    @property(Prefab)
    private dividerPrefab: Prefab | null = null;

    @property(Node)
    private listRoot: Node | null = null;

    @property(Button)
    private refreshButton: Button | null = null;

    @property(Button)
    private closeButton: Button | null = null;

    protected onLoad(): void {
        this.refreshButton?.node.on(Button.EventType.CLICK, this.refresh, this);
        this.closeButton?.node.on(Button.EventType.CLICK, this.hidePanel, this);
    }

    protected onEnable(): void {
        void this.refresh();
    }

    protected onDestroy(): void {
        this.refreshButton?.node.off(Button.EventType.CLICK, this.refresh, this);
        this.closeButton?.node.off(Button.EventType.CLICK, this.hidePanel, this);
    }

    public async refresh(): Promise<void> {
        if (!this.rowPrefab || !this.listRoot) {
            return;
        }

        const result = await ServiceContainer.get(YandexService).getLeaderboard(YandexConfig.leaderboards.bestTime);
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
            if (rank >= 1 && !ranks.includes(rank)) {
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
            row?.setData(entry.rank, entry.player.publicName, this.formatTime(entry.score));
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

    private formatTime(totalSeconds: number): string {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.round(totalSeconds % 60);
        const secondsText = seconds < 10 ? `0${seconds}` : `${seconds}`;
        return `${minutes}:${secondsText}`;
    }

    private hidePanel(): void {
        this.node.active = false;
    }
}