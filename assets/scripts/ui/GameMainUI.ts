import { AppRegistry } from '../core/AppRegistry';
import * as fgui from 'fairygui-cc';
import { GameManager, GameEvent, GamePhase } from '../core/GameManager_base';
import { GuestSystem, Guest } from '../system/GuestSystem';
import { UI_COMPONENTS } from './UIPackageLoader';

/** 游戏主界面（普通类，由 GameApp 持有） */
export class GameMainUI {

    private panel: fgui.GComponent | null = null;

    // private txtDay: fgui.GTextField | null = null;
    // private guestList: fgui.GList | null = null;
    // private wantedList: fgui.GList | null = null;
    private btnOpenShop: fgui.GButton | null = null;
    private btnCatchDemon: fgui.GButton | null = null;
    private text1: fgui.GTextField | null = null;
    private text2: fgui.GTextField | null = null;

    private infoCard: fgui.GComponent | null = null;

    show(): void {
        console.log('[GameMainUI] show');
        const loader = this.getLoader();
        if (!loader) return;

        const panel = loader.createComp<fgui.GComponent>(UI_COMPONENTS.gameMain);
        if (!panel) {
            console.warn('[GameMainUI] GameMain 组件不存在');
            return;
        }

        this.hide();
        this.panel = panel;
        GameManager.instance!.phase = GamePhase.GameMenu;

        panel.setSize(fgui.GRoot.inst.width, fgui.GRoot.inst.height);
        fgui.GRoot.inst.addChild(panel);

        this.cacheRefs(panel);
        this.refreshInfoCard();
        this.bindButtons();
        // this.bindEvents();

        console.log('[GameMainUI] 游戏主界面显示完成');
    }

    hide(): void {
        if (this.panel && !this.panel.isDisposed) {
            fgui.GRoot.inst.removeChild(this.panel);
            this.panel.dispose();
            this.panel = null;
        }
    }

    refreshInfoCard(): void {
        const gm = GameManager.instance;
        if (!gm) return;

        this.infoCard = this.panel?.getChild('infoCard') as fgui.GComponent ?? null;
        let txtCoin;
        let txtRep;
        let txtDay;
        txtCoin = this.infoCard?.getChild('txtCoin') as fgui.GTextField ?? null;
        txtRep = this.infoCard?.getChild('txtRep') as fgui.GTextField ?? null;
        txtDay = this.infoCard?.getChild('txtDay') as fgui.GTextField ?? null;
        if (txtCoin) txtCoin.text = `💰金币：${gm.coin}`;
        if (txtRep) txtRep.text = `⭐声誉：${gm.reputation}`;
        if (txtDay) txtDay.text = `第${gm.currentDay + 1}天`;
    }

    // --------------------------------------------------------

    private cacheRefs(panel: fgui.GComponent): void {
        // this.guestList  = panel.getChild('guestList')   as fgui.GList ?? null;
        // this.wantedList = panel.getChild('wantedList')  as fgui.GList ?? null;
        this.btnOpenShop = panel.getChild('btnOpenShop') as fgui.GButton ?? null;
        this.btnCatchDemon = panel.getChild('btnCatchDemon') as fgui.GButton ?? null;
        this.btnOpenShop.getChild("text").text = "开店营业";
        this.btnCatchDemon.getChild("text").text = "缉妖除魔";

        this.text1 = panel.getChild('text1') as fgui.GTextField ?? null;
        this.text2 = panel.getChild('text2') as fgui.GTextField ?? null;
        this.text1.text = "开店营业，接待妖怪赚取金币、增加声誉，金币用于购买装备，提升战力，声誉影响客流。";
        this.text2.text = "缉妖除魔，捕捉通缉的恶人，获取赏金和声誉，赏金可用于购买特殊物品，声誉提升后可解锁更多内容。";
    }

    private bindButtons(): void {
        this.bindBtn(this.btnOpenShop, () => {
            this.getApp()?.showOpenShopMain();
        });

        const btnCatch = this.panel?.getChild('btnCatchDemon') as fgui.GButton;
        if (btnCatch) {
            btnCatch.grayed = true;
            this.bindBtn(btnCatch, () => this.getApp()?.showToast('缉妖功能开发中...'));
        }
    }


    private bindBtn(btn: fgui.GObject | null, cb: () => void): void {
        if (!btn) return;
        btn.on(fgui.Event.TOUCH_BEGIN, () => {
            fgui.GTween.to(1, 0.9, 0.08).setTarget(btn).onUpdate((t: any) => btn.setScale(t.value.x, t.value.x));
        });
        btn.on(fgui.Event.TOUCH_END, () => {
            fgui.GTween.to(0.9, 1, 0.12).setEase(fgui.EaseType.BackOut).onUpdate((t: any) => btn.setScale(t.value.x, t.value.x));
        });
        btn.on(fgui.Event.TOUCH_CANCEL, () => {
            fgui.GTween.to(0.9, 1, 0.12).setEase(fgui.EaseType.BackOut).onUpdate((t: any) => btn.setScale(t.value.x, t.value.x));
        });
        btn.onClick(cb);
    }

    private getLoader() { return this.getApp()?.loader ?? null; }
    private getApp() { return AppRegistry.getApp(); }
}
