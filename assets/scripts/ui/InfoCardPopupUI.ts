import { AppRegistry } from '../core/AppRegistry';
import * as fgui from 'fairygui-cc';
import { GameManager, GamePhase } from '../core/GameManager';
import { GuestSystem, Guest } from '../system/GuestSystem';
import { OrderSystem } from '../system/OrderSystem';
import { UI_COMPONENTS } from './UIPackageLoader';

/** 客人信息卡弹窗（普通类，由 GameApp 持有） */
export class InfoCardPopupUI {

    private popup: fgui.GComponent | null = null;
    private selectedGuestId: string | null = null;

    show(guest: Guest): void {
        const gm = GameManager.instance;
        if (!gm || gm.phase !== GamePhase.Playing) return;

        if (this.popup && !this.popup.isDisposed) {
            this.updateData(guest);
            this.setButtonsEnabled(true);
            return;
        }

        const loader = this.getLoader();
        // const popup = loader?.createComp<fgui.GComponent>(UI_COMPONENTS.infoCardPopup);
        // if (!popup) return;

        // this.popup = popup;
        // fgui.GRoot.inst.addChild(popup);
        // popup.setSize(fgui.GRoot.inst.width, popup.height);
        // popup.setPosition(0, fgui.GRoot.inst.height - popup.height);

        this.bindAction('btnAccept', 'accept');
        this.bindAction('btnReject', 'reject');
        this.bindAction('btnReport', 'report');

        this.updateData(guest);
        this.setButtonsEnabled(true);
    }

    close(): void {
        if (this.popup && !this.popup.isDisposed) {
            fgui.GRoot.inst.removeChild(this.popup);
            this.popup.dispose();
            this.popup = null;
        }
        this.selectedGuestId = null;
    }

    showFirstPending(): void {
        const gm = GameManager.instance;
        if (!gm || gm.phase !== GamePhase.Playing) return;
        const guest = GuestSystem.instance?.getFirstPendingGuest();
        if (!guest) return;
        this.selectedGuestId = guest.id;
        this.show(guest);
    }

    // --------------------------------------------------------

    private updateData(guest: Guest): void {
        if (!this.popup) return;
        this.selectedGuestId = guest.id;
        const n = this.popup.getChild('txtCardName') as fgui.GTextField;
        if (n) n.text = guest.cardName;
        const r = this.popup.getChild('txtCardRace') as fgui.GTextField;
        if (r) r.text = `种族:${guest.cardRace}`;
        const d = this.popup.getChild('txtCardDesc') as fgui.GTextField;
        if (d) d.text = guest.cardDesc;
    }

    private setButtonsEnabled(enabled: boolean): void {
        if (!this.popup) return;
        ['btnAccept', 'btnReject', 'btnReport'].forEach(name => {
            const btn = this.popup?.getChild(name) as fgui.GButton;
            if (btn) btn.enabled = enabled;
        });
    }

    private onAction(action: 'accept' | 'reject' | 'report'): void {
        if (GameManager.instance?.phase !== GamePhase.Playing) return;
        this.setButtonsEnabled(false);

        const guestId = this.selectedGuestId;
        if (!guestId) { this.close(); return; }

        const guest = GuestSystem.instance?.getGuest(guestId);
        if (!guest) { this.close(); return; }

        let result;
        switch (action) {
            case 'accept': result = OrderSystem.instance?.acceptGuest(guestId); break;
            case 'reject': result = OrderSystem.instance?.rejectGuest(guestId); break;
            case 'report': result = OrderSystem.instance?.reportGuest(guestId); break;
        }

        if (result) {
            this.getApp().showToast(result.message);
            this.getApp().gameMain.renderGuestList();
        }

        this.showFirstPending();
    }

    private bindAction(btnName: string, action: 'accept' | 'reject' | 'report'): void {
        const btn = this.popup?.getChild(btnName) as fgui.GButton;
        if (btn) btn.onClick(() => this.onAction(action));
    }

    private getLoader() { return this.getApp().loader; }
    private getApp()    { return AppRegistry.getApp(); }
}
