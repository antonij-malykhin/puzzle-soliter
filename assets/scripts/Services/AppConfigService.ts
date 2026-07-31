export interface IAppConfigData {
    windowSize: {x: number, y: number};
    boardSize: {x: number, y: number};
}

export class AppConfigService {
    private appConfigData: IAppConfigData = {
        windowSize: {x: 1920, y: 1080},
        boardSize: {x: 900, y: 900},
    };

    public getAppConfig(): IAppConfigData {
        return this.appConfigData;
    }

    public setAppConfig(config: IAppConfigData): void {
        this.appConfigData = config;
    }
}