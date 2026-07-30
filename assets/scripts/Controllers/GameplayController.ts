import { _decorator, Component } from 'cc';
import { EventBus } from '../Core/Events/EventBus';
import { GameEventMap } from '../Core/Events/GameEventMap';

const { ccclass } = _decorator;

@ccclass('GameplayController')
export class GameplayController extends Component {

    public async initialize(
        eventBus: EventBus<GameEventMap>, 
        options: { 
            activeLevelId: string; 
            onVictoryNextRequested: () => void; 
        }
    ): Promise<void> {
        // Initialization logic here
    }

}