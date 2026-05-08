import { AppRegistry } from '../core/AppRegistry';
import * as fgui from 'fairygui-cc';
import { GameManager, GamePhase } from '../core/GameManager_base';
import { GuestSystem } from '../system/GuestSystem';
import { OrderSystem } from '../system/OrderSystem';
import { UI_COMPONENTS } from './UIPackageLoader';

/** 过场动画（普通类，由 GameApp 持有） */
export class TransitionSceneUI {

    private scene: fgui.GComponent | null = null;

    show(): void {
        const gm = GameManager.instance!;
        gm.phase = GamePhase.Transition;

        // this.getApp()?.infoCard.close();

        const loader = this.getLoader();
        const scene = loader?.createComp<fgui.GComponent>(UI_COMPONENTS.transitionScene) ?? null;

        if (scene) {
            this.close();
            this.scene = scene;
            fgui.GRoot.inst.addChild(scene);
            scene.setSize(fgui.GRoot.inst.width, fgui.GRoot.inst.height);
            scene.setPosition(0, 0);

            const txt = scene.getChild('txtText') as fgui.GTextField;
            if (txt) txt.text = `🌙 第${gm.currentDay}天结束...\n💾 记录完成`;

            const btn = scene.getChild('btnContinue') as fgui.GButton;
            btn.getChild("text").text = '进入明日';
            if (btn) btn.onClick(() => this.onContinue());
        } else {
            this.onContinue();
        }
    }

    close(): void {
        if (this.scene && !this.scene.isDisposed) {
            fgui.GRoot.inst.removeChild(this.scene);
            this.scene.dispose();
            this.scene = null;
        }
    }

    private onContinue(): void {
        const gm = GameManager.instance!;
        gm.saveGame();
        this.close();
        GuestSystem.instance?.clearTodayGuests();
        OrderSystem.instance?.clearTodayOrders();
        gm.finishTransition();
        this.getApp()?.showGameMain();
    }

    private getLoader() { return this.getApp()?.loader ?? null; }
    private getApp()    { return AppRegistry.getApp(); }
}
