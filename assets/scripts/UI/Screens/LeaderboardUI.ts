import { __private, _decorator, Button, Component, instantiate, Label, Node, Prefab, SpriteFrame } from 'cc';
import type { YandexGames } from 'ysdk';
import { YandexConfig } from '../../Core/Config/YandexConfig';
import { ServiceContainer } from '../../Core/ServiceContainer';
import { LeaderboardResult, YandexService } from '../../Services/YandexService';
import { LeaderboardRowUI } from './LeaderboardRowUI';
import { LocalizationManager } from '../../Managers/LocalizationManager';
import { ImageService } from '../../Services/ImageService';
import { LoadingService } from '../../Services/LoadingService';

const { ccclass, property } = _decorator;

const MOCK_AVATAR_URL = "C:\\Users\\Antonij\\Projects\\PuzzleMozaic\\assets\\sprites\\settings-button.png";

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

    @property(SpriteFrame)
    private defaultAvatarSpriteFrame: SpriteFrame | null = null;

    protected onLoad(): void {
        this.requireCloseButton().node.on(Button.EventType.CLICK, this.hidePanel, this);
        this.requireOpenButton().node.on(Button.EventType.CLICK, this.showPanel, this);
    }
    
    private async showPanel(): Promise<void> {
        ServiceContainer.get(LoadingService).setMessage(ServiceContainer.get(LocalizationManager).t('loadingLeaderboard'));
        ServiceContainer.get(LoadingService).show();
        await this.refresh();
        this.requireRootNode().active = true;
        ServiceContainer.get(LoadingService).hide();
    }
    
    private requireOpenButton(): Button {
        if (!this.openButton) {
            throw new Error('Open button is not assigned.');
        }
        return this.openButton;
    }

    protected onEnable(): void {
        this.requireTitleLabel().string = ServiceContainer.get(LocalizationManager).t('leaderboardTitle');
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

        //const result = await ServiceContainer.get(YandexService).getLeaderboard(YandexConfig.leaderboards.leaderboard);
        const result = this.getMockLeaderboard();
        this.listRoot.removeAllChildren();
        //const spriteFrames = await this.getSpriteFramesFromEntries(result.entries);
        const spriteFrames: SpriteFrame[] = result.entries.map(() => this.defaultAvatarSpriteFrame!);

        for (let index = 0; index < result.entries.length; index += 1) {
            const entity = result.entries[index];
            this.mountRow(entity.rank, entity, entity.rank === result.userRank, spriteFrames[index]);

            if (index === 2 && result.userRank !== null && index < result.entries.length - 1) {
                this.mountDivider();
            }
        }
    }

    private async getSpriteFramesFromEntries(entries: readonly YandexGames.LeaderboardEntry[]): Promise<SpriteFrame[]> {
        return await Promise.all(entries.map(async entry => await ServiceContainer.get(ImageService).getImageByUrl(entry.player.getAvatarSrc('small'))));
    }

    private getMockLeaderboard(): LeaderboardResult {
        return {
            entries: [
                {
                    score: 100,
                    rank: 1,
                    player: {
                        getAvatarSrc(size: "small" | "medium" | "large"): string { return MOCK_AVATAR_URL; },
                        getAvatarSrcSet(size: "small" | "medium" | "large"): string { return MOCK_AVATAR_URL; },
                        lang: "ru",
                        publicName: "Антоний",
                        scopePermissions: {
                            avatar: "",
                            public_name: "",
                        },
                        uniqueID: "Антоний",
                    },
                    formattedScore: "100",
                },
                {
                    score: 10,
                    rank: 2,
                    player: {
                        getAvatarSrc(size: "small" | "medium" | "large"):string { return MOCK_AVATAR_URL; },
                        getAvatarSrcSet(size: "small" | "medium" | "large"): string {return MOCK_AVATAR_URL;},
                        lang: "ru",
                        publicName: "Player1",
                        scopePermissions: {
                            avatar: "",
                            public_name: "",
                        },
                        uniqueID: "Player1",
                    },
                    formattedScore: "10",
                },
                {
                    score: 9,
                    rank: 3,
                    player: {
                        getAvatarSrc(size: "small" | "medium" | "large"): string { return MOCK_AVATAR_URL; },
                        getAvatarSrcSet(size: "small" | "medium" | "large"): string { return MOCK_AVATAR_URL; },
                        lang: "ru",
                        publicName: "Player2",
                        scopePermissions: {
                            avatar: "",
                            public_name: "",
                        },
                        uniqueID: "Player2",
                    },
                    formattedScore: "9",
                },
                {
                    score: 8,
                    rank: 4,
                    player: {
                        getAvatarSrc(size: "small" | "medium" | "large"): string { return MOCK_AVATAR_URL; },
                        getAvatarSrcSet(size: "small" | "medium" | "large"): string { return MOCK_AVATAR_URL; },
                        lang: "ru",
                        publicName: "Player3",
                        scopePermissions: {
                            avatar: "",
                            public_name: "",
                        },
                        uniqueID: "Player3",
                    },
                    formattedScore: "8",
                },
                {
                    score: 5,
                    rank: 200000,
                    player: {
                        getAvatarSrc(size: "small" | "medium" | "large"): string { return MOCK_AVATAR_URL; },
                        getAvatarSrcSet(size: "small" | "medium" | "large"): string { return MOCK_AVATAR_URL; },
                        lang: "ru",
                        publicName: "Player4",
                        scopePermissions: {
                            avatar: "",
                            public_name: "",
                        },
                        uniqueID: "Player4",
                    },
                    formattedScore: "5",
                }
            ],
            userRank: 1
        }
    }

    private mountRow(rank: number, entry: YandexGames.LeaderboardEntry | undefined, isPlayer: boolean, avatarImage: SpriteFrame): void {
        if (!this.rowPrefab || !this.listRoot) {
            return;
        }

        const rowNode = instantiate(this.rowPrefab);
        rowNode.setParent(this.listRoot);

        const row = rowNode.getComponent(LeaderboardRowUI);
        if (entry) {
            row?.setData(entry.rank, entry.player.publicName, entry.score.toString(), avatarImage);
        } else {
            row?.setData(rank, '—', '—', avatarImage);
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