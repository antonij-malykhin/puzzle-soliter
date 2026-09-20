import { _decorator, Button, Component, EditBox, Label, Node } from 'cc';
import { ProgressionManager } from '../../Managers/ProgressionManager';

const { ccclass, property } = _decorator;

type DebugTargetChangedCallback = () => Promise<void> | void;

@ccclass('LobbyDebugPanel')
export class LobbyDebugPanel extends Component {
    @property(Node)
    private rootNode: Node | null = null;

    @property(EditBox)
    private levelIdInput: EditBox | null = null;

    @property(Button)
    private applyButton: Button | null = null;

    @property(Button)
    private resetButton: Button | null = null;

    @property(Label)
    private targetLevelLabel: Label | null = null;

    @property(Label)
    private statusLabel: Label | null = null;

    @property(Button)
    private closeButton: Button | null = null;

    @property(Button)
    private openButton: Button | null = null;

    private progressionManager: ProgressionManager | null = null;
    private onTargetChanged: DebugTargetChangedCallback = () => {};

    public initialize(
        progressionManager: ProgressionManager,
        onTargetChanged: DebugTargetChangedCallback,
    ): void {
        this.progressionManager = progressionManager;
        this.onTargetChanged = onTargetChanged;
        this.setInputValue(progressionManager.getDebugTargetLevelId() ?? progressionManager.getSavedCurrentLevelId());
        this.bindButtons();
        this.refreshView();
    }

    protected onDestroy(): void {
        this.unbindButtons();
    }

    private bindButtons(): void {
        if (!this.levelIdInput || !this.applyButton || !this.resetButton || !this.closeButton || !this.openButton) {
            return;
        }

        this.unbindButtons();
        this.applyButton.node.on(Button.EventType.CLICK, this.onApplyClicked, this);
        this.resetButton.node.on(Button.EventType.CLICK, this.onResetClicked, this);
        this.closeButton.node.on(Button.EventType.CLICK, this.onCloseClicked, this);
        this.openButton.node.on(Button.EventType.CLICK, this.onOpenClicked, this);
    }

    private unbindButtons(): void {
        if (this.applyButton) {
            this.applyButton.node.off(Button.EventType.CLICK, this.onApplyClicked, this);
        }

        if (this.resetButton) {
            this.resetButton.node.off(Button.EventType.CLICK, this.onResetClicked, this);
        }
        if (this.closeButton) {
            this.closeButton.node.off(Button.EventType.CLICK, this.onCloseClicked, this);
        }
        if (this.openButton) {
            this.openButton.node.off(Button.EventType.CLICK, this.onOpenClicked, this);
        }
    }

    private onCloseClicked(): void {
        this.rootNode!.active = false;
    }
    
    private onOpenClicked(): void {
        this.rootNode!.active = true;
    }

    private async onApplyClicked(): Promise<void> {
        if (!this.progressionManager) {
            this.setStatus('Debug panel is not initialized.');
            return;
        }

        const selectedLevelId = this.getInputValue();
        if (!selectedLevelId) {
            this.setStatus('Enter a level id first.');
            return;
        }

        const applied = await this.progressionManager.setDebugTargetLevelId(selectedLevelId);
        if (!applied) {
            this.setStatus(`Invalid target: ${selectedLevelId}`);
            return;
        }

        this.setStatus(`Applied debug target: ${selectedLevelId}`);
        await this.onTargetChanged();
        this.refreshView();
    }

    private async onResetClicked(): Promise<void> {
        if (!this.progressionManager) {
            return;
        }

        this.progressionManager.clearDebugTargetLevelId();
        this.setInputValue(this.progressionManager.getSavedCurrentLevelId());
        this.setStatus('Debug target cleared.');
        await this.onTargetChanged();
        this.refreshView();
    }

    private refreshView(): void {
        if (!this.targetLevelLabel || !this.statusLabel) {
            return;
        }

        const debugTargetLevelId = this.progressionManager?.getDebugTargetLevelId();
        const selectedLevelId = this.getInputValue() ?? 'none';
        const activeLevelId = debugTargetLevelId ?? this.progressionManager?.getCurrentLevelId() ?? 'none';

        this.targetLevelLabel.string = `Selected: ${selectedLevelId}`;
        this.statusLabel.string = debugTargetLevelId
            ? `Active debug target: ${activeLevelId}`
            : `Debug target disabled. Current level: ${activeLevelId}`;
    }

    private getInputValue(): string | null {
        if (!this.levelIdInput) {
            return null;
        }

        const value = this.levelIdInput.string.trim();
        return value.length > 0 ? value : null;
    }

    private setInputValue(levelId: string | null): void {
        if (!this.levelIdInput) {
            return;
        }

        this.levelIdInput.string = levelId ?? '';
    }

    private setStatus(message: string): void {
        if (this.statusLabel) {
            this.statusLabel.string = message;
        }
    }
}