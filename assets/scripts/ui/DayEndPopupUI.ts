import { AppRegistry } from '../core/AppRegistry';
import * as fgui from 'fairygui-cc';
import { GTween, EaseType } from 'fairygui-cc';
import { GameManager } from '../core/GameManager';
import { UI_COMPONENTS } from './UIPackageLoader';

/** 每日结算弹窗（普通类，由 GameApp 持有） */
export class DayEndPopupUI {

    private popup: fgui.GComponent | null = null;

    show(): void {
        const gm = GameManager.instance!;
        const accuracy = gm.todayGuestServed > 0
            ? Math.floor((gm.todayCorrectCount / gm.todayGuestServed) * 100)
            : 0;

        const loader = this.getLoader();
        const popup = loader?.createComp(UI_COMPONENTS.dayEndPopup) as fgui.GComponent;

        if (!popup) {
            console.warn('[DayEndPopupUI] DayEndPopup 不存在，直接过场');
            setTimeout(() => this.getApp().showTransition(), 500);
            return;
        }

        this.close();
        this.popup = popup;
        fgui.GRoot.inst.addChild(popup);
        popup.center();
        this.popupAnim(popup);

        this.setText('txtTitle',       `📊 第${gm.currentDay}天结算`);
        this.setText('txtServed',      `接待: ${gm.todayGuestServed}/${gm.todayGuestLimit}`);
        this.setText('txtAccuracy',    `正确率: ${accuracy}%`);
        this.setText('txtCoinEarned',  `💰 收入: +${gm.todayCoinEarned}`);
        this.setText('txtRepDelta',    `⭐ 声誉: ${gm.todayRepDelta >= 0 ? '+' : ''}${gm.todayRepDelta}`);
        this.setText('txtWantedCaught',`⚠️ 遭遇并缉拿: ${gm.todayWantedCaught}/${gm.todayWantedTotal}`);

        const btnContinue = popup.getChild('btnContinue') as fgui.GButton;
        btnContinue.getChild('text').text = '闭店休息';

        if (btnContinue) {
            btnContinue.onClick(() => {
                this.close();
                this.getApp().showTransition();
            });
        }

        console.log(`[DayEndPopupUI] 第${gm.currentDay}天结算 | 接待:${gm.todayGuestServed} 正确率:${accuracy}%`);
    }

    close(): void {
        if (this.popup && !this.popup.isDisposed) {
            fgui.GRoot.inst.removeChild(this.popup);
            this.popup.dispose();
            this.popup = null;
        }
    }

    private setText(name: string, text: string): void {
        const tf = this.popup?.getChild(name) as fgui.GTextField;
        if (tf) tf.text = text;
    }

    private popupAnim(popup: fgui.GObject): void {
        popup.setScale(0.3, 0.3);
        GTween.to2(0.3, 0.3, 1, 1, 0.35).setEase(EaseType.BackOut)
            .onUpdate((t: any) => { if (!popup.isDisposed) popup.setScale(t.value.x, t.value.y); });
    }

    private getLoader() { return this.getApp().loader; }
    private getApp()    { return AppRegistry.getApp(); }
}
