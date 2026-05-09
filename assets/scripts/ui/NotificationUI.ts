import { AppRegistry } from '../core/AppRegistry';
import * as fgui from 'fairygui-cc';
import { GTween, EaseType } from 'fairygui-cc';
import { UI_COMPONENTS } from './UIPackageLoader';

interface NotificationEntry {
    obj: fgui.GComponent; // 新增：toast组件对象
    baseY: number;        // 已有的：Y轴位置
    phase: 'entering' | 'staying' | 'leaving'; // 已有的：状态
}
/** 进店通知动画（普通类，由 GameApp 持有） */
export class NotificationUI {

    private notifications: {
        obj: fgui.GComponent;
        baseY: number;
        phase: 'entering' | 'staying' | 'leaving';
    }[] = [];

    private readonly BASE_X  = 20;
    private readonly START_Y = fgui.GRoot.inst.height * 0.65;
    private readonly GAP     = 10;
    private readonly ENTER_S = 0.35;
    private readonly STAY_MS = 3500;
    private readonly LEAVE_S = 0.4;

    showGuestNotification(name: string, race: string): void {
        const loader = this.getLoader();
        if (!loader?.pkg || !fgui.GRoot.inst) return;

        const notif = loader.createComp(UI_COMPONENTS.toastPopup) as fgui.GComponent;
        if (!notif) return;

        fgui.GRoot.inst.addChild(notif);
        const txt = notif.getChild('txtMsg') as fgui.GTextField;
        if (txt) txt.text = `${name} [${race}] 进店了`;

        const entry:NotificationEntry = { obj: notif, baseY: fgui.GRoot.inst.height * 0.45, phase: 'entering' as const };
        this.notifications.push(entry);
        this.rearrange();

        const startX = -notif.width - 10;
        notif.setPosition(startX, entry.baseY);

        GTween.to2(startX, 0, this.BASE_X, 1, this.ENTER_S).setEase(EaseType.QuadOut)
            .onUpdate((t: any) => {
                if (!notif.isDisposed) {
                    notif.setPosition(t.value.x, entry.baseY);
                    notif.alpha = t.value.y;
                }
            })
            .onComplete(() => { if (!notif.isDisposed) entry.phase = 'staying'; });

        setTimeout(() => {
            if (!notif.isDisposed && entry.phase === 'staying') {
                entry.phase = 'leaving';
                this.dismiss(entry);
            }
        }, this.ENTER_S * 1000 + this.STAY_MS);
    }

    // --------------------------------------------------------

    private rearrange(): void {
        let y = this.START_Y;
        for (const e of this.notifications) {
            e.baseY = y;
            y += e.obj.height + this.GAP;
        }
    }

    private dismiss(entry: typeof this.notifications[0]): void {
        GTween.to2(1, 1, 0, 0, this.LEAVE_S).setEase(EaseType.QuadIn)
            .onUpdate((t: any) => { if (!entry.obj.isDisposed) entry.obj.alpha = t.value.x; })
            .onComplete(() => {
                if (!entry.obj.isDisposed && entry.obj.parent) {
                    entry.obj.removeFromParent();
                    entry.obj.dispose();
                }
            });

        const idx = this.notifications.indexOf(entry);
        if (idx !== -1) this.notifications.splice(idx, 1);
        setTimeout(() => this.rearrange(), this.LEAVE_S * 1000);
    }

    private getLoader() { return this.getApp().loader; }
    private getApp()    { return AppRegistry.getApp(); }
}
