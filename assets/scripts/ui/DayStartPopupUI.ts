import { AppRegistry } from '../core/AppRegistry';
import * as fgui from 'fairygui-cc';
import { GTween, EaseType } from 'fairygui-cc';
import { GameManager } from '../core/GameManager';
import { GuestSystem } from '../system/GuestSystem';
import { UI_COMPONENTS } from './UIPackageLoader';

/** 今日开场弹窗（普通类，由 GameApp 持有） */
export class DayStartPopupUI {

    private popup: fgui.GComponent | null = null;

    show(): void {
        const gm = GameManager.instance!;
        // 生成今日通缉名单
        const wantedList = GuestSystem.instance?.generateWantedList() ?? [];
        // console.warn(GameManager.instance!._todayGuestLimit)
        // console.warn(wantedList)
        GameManager.instance!._todayGuestLimit += wantedList.length; // 确保通缉犯也算入当日总客人数量

        const loader = this.getLoader();
        const popup = loader?.createComp(UI_COMPONENTS.dayStartPopup) as fgui.GComponent;

        this.close();
        this.popup = popup;
        fgui.GRoot.inst.addChild(popup);
        popup.center();
        this.popupAnim(popup);

        this.setText('txtTitle', `📅 第${gm.currentDay}天`);
        this.setText('txtDayInfo', `今日预计客人: ${gm.todayGuestLimit} | 通缉犯: ${wantedList.length}`);

        //通缉犯预告列表
        const wList = popup.getChild('wantedList') as fgui.GList;
        if (wList) {
            wList.removeChildrenToPool();

            if (wantedList.length === 0) {
                this.addWantedListItem(wList, '😊 今日平安无事', '');
            } else {
                for (const w of wantedList) {
                    this.addWantedListItem(wList, `⚠️ ${w.realName}`, `¥${w.bounty}`);
                }
            }
        }

        const btnStart = popup.getChild('btnStart') as fgui.GButton;
        btnStart.getChild("text").text = '确认';
        if (btnStart) {
            btnStart.onClick(() => {
                this.close();
            });
        }

        gm.setTodayWantedTotal(wantedList.length);
        console.log(`[DayStartPopupUI] 第${gm.currentDay}天 | 通缉犯: ${wantedList.length}`);
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

    /**
     * 向 wantedList 添加一行通缉犯信息
     * 直接从包中创建 ListItem 组件（不依赖对象池）
     */
    private addWantedListItem(list: fgui.GList, nameText: string, bountyText: string): void {
        const item = list.addItemFromPool() as fgui.GComponent;
        if (!item) return;

        const n = item.getChild('txtLeft') as fgui.GTextField;
        if (n) n.text = nameText;

        const p = item.getChild('txtRight') as fgui.GTextField;
        if (p && bountyText) p.text = bountyText;
    }

    private getLoader() { return this.getApp().loader; }
    private getApp()    { return AppRegistry.getApp(); }
}
