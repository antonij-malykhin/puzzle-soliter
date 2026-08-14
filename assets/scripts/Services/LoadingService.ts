import { LoadingHUD } from '../UI/HUD/LoadingHUD';

export class LoadingService {
    private hud: LoadingHUD | null = null;

    public register(hud: LoadingHUD): void {
        this.hud = hud;
    }

    public show(message?: string): void {
        if (!this.hud) {
            return;
        }

        this.hud.show(message);
    }

    public hide(): void {
        if (!this.hud) {
            return;
        }

        this.hud.hide();
    }

    public setMessage(text: string): void {
        if (!this.hud) {
            return;
        }

        this.hud.setMessage(text);
    }
}
