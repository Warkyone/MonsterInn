import { AppRegistry } from '../core/AppRegistry';
import * as fgui from 'fairygui-cc';
// // @ts-ignore
// import { resources, SpriteFrame } from 'cc';
import { GameManager, GameEvent, GamePhase } from '../core/GameManager';
import { GuestSystem, Guest } from '../system/GuestSystem';
import { OrderSystem } from '../system/OrderSystem';
import { UI_COMPONENTS } from './UIPackageLoader';

/** 游戏主界面（普通类，由 GameApp 持有） */
export class OpenShopMainUI {

    private panel: fgui.GComponent | null = null;
    private guestList: fgui.GList | null = null;
    private wantedList: fgui.GList | null = null;
    private infoCard: fgui.GComponent | null = null;
    private btnOpenShop: fgui.GButton | null = null;
    //选择按钮
    private btnA: fgui.GButton | null = null;
    private btnB: fgui.GButton | null = null;
    private btnC: fgui.GButton | null = null;
    private btnGroup: fgui.GGroup | null = null;
    private guestIcon: fgui.GLoader | null = null;  // 怪物形象装载器

    show(): void {
        console.log('[OpenShopMainUI] show');
        const loader = this.getLoader();
        if (!loader) return;

        const panel = loader.createComp(UI_COMPONENTS.openShopMain) as fgui.GComponent;
        if (!panel) {
            console.warn('[OpenShopMainUI] OpenShopMain 组件不存在');
            return;
        }

        this.hide();
        this.panel = panel;
        GameManager.instance!.phase = GamePhase.GameMenu;

        panel.setSize(fgui.GRoot.inst.width, fgui.GRoot.inst.height);
        fgui.GRoot.inst.addChild(panel);


        //UI
        this.cacheRefs(panel);
        this.refreshInfoCard();
        this.refreshInfo();

        this.bindButtons();
        this.bindEvents();
        this.showDayStartPopup();//加载客人和开场弹窗


        console.log('[OpenShopMainUI] 开店主界面显示完成');

    }

    hide(): void {
        if (this.panel && !this.panel.isDisposed) {
            fgui.GRoot.inst.removeChild(this.panel);
            this.panel.dispose();
            this.panel = null;
        }
    }

    showDayStartPopup(): void {
        GameManager.instance!.startDay();
        this.getApp().showDayStartPopup();
        // 渲染通缉列表（开店前先显示今日通缉）
        this.renderWantedList();
    }

    enterBusinessMode(): void {
        if (this.btnOpenShop) this.btnOpenShop.visible = false;
        if (this.btnGroup) this.btnGroup.visible = true;
        // 显示先到客人的怪物形象图
        this.showFirstGuestIcon();
        // 更新通缉列表（可能已有新的通缉信息）
        this.renderWantedList();
    }

    refreshInfoCard(): void {
        const gm = GameManager.instance;
        if (!gm) return;

        this.infoCard = this.panel?.getChild('infoCard') as fgui.GComponent;
        let txtCoin;
        let txtRep;
        let txtDay;
        txtCoin = this.infoCard?.getChild('txtCoin') as fgui.GTextField;
        txtRep = this.infoCard?.getChild('txtRep') as fgui.GTextField;
        txtDay = this.infoCard?.getChild('txtDay') as fgui.GTextField;
        if (txtCoin) txtCoin.text = `金币：${gm.coin}`;
        if (txtRep) txtRep.text = `声誉：${gm.reputation}`;
        if (txtDay) txtDay.text = `第${gm.currentDay + 1}天`;
    }

    refreshInfo(): void {
        let txtGuestTitle = this.panel?.getChild('txtGuestTitle') as fgui.GTextField;
        if (txtGuestTitle) txtGuestTitle.text = `客人列表(如遇种族不符需拒接)`;
        let txtWantedTitle = this.panel?.getChild('txtWantedTitle') as fgui.GTextField;
        if (txtWantedTitle) txtWantedTitle.text = `通缉名单(如遇通缉客人需报警)`;

        if (this.btnOpenShop) this.btnOpenShop.getChild("text").text = '开始营业';

        if (this.btnGroup) this.btnGroup.visible = false;
        if (this.btnA) this.btnA.getChild("text").text = '接待';
        if (this.btnB) this.btnB.getChild("text").text = '拒接';
        if (this.btnC) this.btnC.getChild("text").text = '报警';
    }

    /** 显示第一个（先到的）客人形象图 */
    showFirstGuestIcon(): void {
        if (!this.guestIcon) return;
        const guests = GuestSystem.instance?.getGuestList() ?? [];
        if (guests.length === 0) {
            this.guestIcon.url = '';
            return;
        }
        // 自动选中第一个到达的客人并显示其图片
        const firstGuest = guests[0];
        GuestSystem.instance?.selectGuest(firstGuest);
        const iconIdx = GuestSystem.getGuestIconIndex(firstGuest.realRace);
        this.guestIcon.url = `guestIcon/${iconIdx}`;
    }

    clearGuestIcon(): void {
        if (this.guestIcon) {
            this.guestIcon.url = '';
        }
    }

    renderGuestList(): void {
        if (!this.guestList) return;
        const guests = GuestSystem.instance?.getGuestList() ?? [];

        // 清空列表
        this.guestList.removeChildren(0, -1, true);

        for (const g of guests) {
            // 用 addItem 创建列表项（不依赖对象池）
            const item = this.guestList.addItem() as fgui.GComponent;
            if (!item) continue;

            const n = item.getChild('txtLeft') as fgui.GTextField;
            if (n) n.text = `${g.cardName} [${g.cardRace}]`;
            const p = item.getChild('txtRight') as fgui.GTextField;
            if (p) p.text = `耐心:${g.patience}`;
        }
    }

    // 渲染通缉犯列表（开店时预览，抓捕后刷新）
    renderWantedList(): void {
        if (!this.wantedList) return;
        const list = GuestSystem.instance?.getWantedList() ?? [];

        this.wantedList.removeChildren(0, -1, true);

        if (list.length === 0) {
            const item = this.wantedList.addItem() as fgui.GComponent;
            const n = item?.getChild('txtLeft') as fgui.GTextField;
            if (n) n.text = '暂无通缉犯';
        } else {
            for (const w of list) {
                const item = this.wantedList.addItem() as fgui.GComponent;
                if (!item) continue;
                const n = item.getChild('txtLeft') as fgui.GTextField;
                if (n) n.text = `${w.realName}`;
                const p = item.getChild('txtRight') as fgui.GTextField;
                if (p) p.text = `赏金:${w.bounty}`;
            }
        }
    }

    /** 获取当前操作目标：默认取列表第一个客人（先到的） */
    private getTargetGuest(): Guest | undefined {
        const guests = GuestSystem.instance?.getGuestList() ?? [];
        return guests.length > 0 ? guests[0] : undefined;
    }

    // --------------------------------------------------------

    private cacheRefs(panel: fgui.GComponent): void {
        this.guestList = panel.getChild('guestList') as fgui.GList;
        this.wantedList = panel.getChild('wantedList') as fgui.GList;
        this.btnOpenShop = panel.getChild('btnOpenShop') as fgui.GButton;
        this.btnA = panel.getChild('btnA') as fgui.GButton;
        this.btnB = panel.getChild('btnB') as fgui.GButton;
        this.btnC = panel.getChild('btnC') as fgui.GButton;
        this.btnGroup = panel.getChild('btnGroup') as fgui.GGroup;
        this.guestIcon = panel.getChild('guestIcon') as fgui.GLoader;
    }

    private bindButtons(): void {
        this.bindBtn(this.btnOpenShop, () => {
            this.getApp().beginBusiness();
        });
        this.bindBtn(this.btnA, () => {
            const guest = this.getTargetGuest();
            if (!guest) { this.getApp().showToast('没有客人'); return; }
            const result = OrderSystem.instance?.acceptGuest(guest.id);
            if (result) this.getApp().showToast(result.message);
            this.refreshAfterAction();
        });
        this.bindBtn(this.btnB, () => {
            const guest = this.getTargetGuest();
            if (!guest) { this.getApp().showToast('没有客人'); return; }
            const result = OrderSystem.instance?.rejectGuest(guest.id);
            if (result) this.getApp().showToast(result.message);
            this.refreshAfterAction();
        });
        this.bindBtn(this.btnC, () => {
            const guest = this.getTargetGuest();
            if (!guest) { this.getApp().showToast('没有客人'); return; }
            const result = OrderSystem.instance?.reportGuest(guest.id);
            if (result) {
                this.getApp().showToast(result.message);
                this.renderWantedList();
            }
            this.refreshAfterAction();
        });
    }

    /** 操作后刷新列表和怪物形象（无客人时清空） */
    private refreshAfterAction(): void {
        this.renderGuestList();
        this.renderWantedList();  // 通缉犯被抓后刷新通缉列表
        const guests = GuestSystem.instance?.getGuestList() ?? [];
        if (guests.length === 0) {
            if (this.guestIcon) {
                this.guestIcon.icon = null;
                console.log('[OpenShopMainUI] 客人已清空，清除怪物形象');
            }
        } else {
            this.showFirstGuestIcon();
        }
    }

    private bindEvents(): void {
        const gm = GameManager.instance;
        if (!gm) return;
        gm.events.on(GameEvent.CoinChanged, () => {
            if (this.infoCard) this.refreshInfoCard();
        }, this);
        gm.events.on(GameEvent.ReputationChanged, () => {
            if (this.infoCard) this.refreshInfoCard();
        }, this);
        // 有人进店时刷新怪物图片
        gm.events.on(GameEvent.GuestArrived, () => {
            this.showFirstGuestIcon();
            this.renderGuestList();
        }, this);
        // 客人超时离店时刷新图片和列表
        gm.events.on(GameEvent.PatienceChanged, (data: { leftGuests?: Guest[] }) => {
            const leftGuests = data?.leftGuests ?? [];
            const selected = GuestSystem.instance?.getSelectedGuest();
            // 如果离店的是当前显示的客人，清空图片
            if (selected && leftGuests.some(g => g.id === selected.id)) {
                this.clearGuestIcon();
            }
            this.renderGuestList();
        }, this);
    }

    private bindBtn(btn: fgui.GObject | null, cb: () => void): void {
        if (!btn) return;
        btn.on(fgui.Event.TOUCH_BEGIN, () => {
            fgui.GTween.to(1, 0.9, 0.08).setTarget(btn).onUpdate((t: any) => btn.setScale(t.value.x, t.value.x));
        });
        btn.on(fgui.Event.TOUCH_END, () => {
            fgui.GTween.to(0.9, 1, 0.12).setEase(fgui.EaseType.BackOut).onUpdate((t: any) => btn.setScale(t.value.x, t.value.x));
        });
        // btn.on(fgui.Event.TOUCH_CANCEL, () => {
        //     fgui.GTween.to(0.9, 1, 0.12).setEase(fgui.EaseType.BackOut).onUpdate((t: any) => btn.setScale(t.value.x, t.value.x));
        // });
        btn.onClick(cb);
    }

    private getLoader() { return this.getApp().loader; }
    private getApp() { return AppRegistry.getApp(); }
}
