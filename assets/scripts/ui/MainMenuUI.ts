import { AppRegistry } from '../core/AppRegistry';
import * as fgui from 'fairygui-cc';
import { GameManager, GamePhase } from '../core/GameManager';
import { UI_COMPONENTS } from './UIPackageLoader';

/** 主菜单界面（普通类，由 GameApp 持有） */
export class MainMenuUI {

    private panel: fgui.GComponent | null = null;

    /** 显示主菜单 */
    show(): void {
        console.log('[MainMenuUI] show');

        // 获取 loader
        const loader = this.getLoader();
        if (!loader) return;

        const panel = loader.createComp(UI_COMPONENTS.mainMenu) as fgui.GComponent;
        if (!panel) {
            console.warn('[MainMenuUI] MainMenu 组件不存在');
            return;
        }

        this.hide();
        this.panel = panel;

        GameManager.instance!.phase = GamePhase.MainMenu;
        panel.setSize(fgui.GRoot.inst.width, fgui.GRoot.inst.height);
        fgui.GRoot.inst.addChild(panel);

        this.updateSaveInfo();//存档信息
        this.bindButtons();
        // this.setUI();

        console.log('[MainMenuUI] 主菜单显示完成');
    }

    /** 隐藏主菜单 */
    hide(): void {
        if (this.panel && !this.panel.isDisposed) {
            fgui.GRoot.inst.removeChild(this.panel);
            this.panel.dispose();
            this.panel = null;
        }
    }

    // --------------------------------------------------------

    private updateSaveInfo(): void {
        if (!this.panel) return;
        const gm = GameManager.instance!;
        const saveInfo = gm.getSaveInfo();
        const txt = this.panel.getChild('txtSaveInfo') as fgui.GTextField;
        if (txt) {
            if (saveInfo) {
                const d = new Date(saveInfo.timestamp);
                txt.text = `存档: 第${saveInfo.day}天 💰${saveInfo.coin} (${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')})`;
            } else {
                txt.text = '暂无存档';
            }
        }
    }

    private bindButtons(): void {
        if (!this.panel) return;
        const gm = GameManager.instance!;

        const btnNew = this.panel.getChild('btnNewGame') as fgui.GButton;
        const btnContinue = this.panel.getChild('btnContinue') as fgui.GButton;
        btnNew.getChild("text").text="开始游戏";
        btnContinue.getChild("text").text="继续游戏";

        this.bindBtn(btnNew, () => {
            gm.newGame();
            this.getApp().showGameMain();
        });

        this.bindBtn(btnContinue, () => {
            if (gm.loadGame()) {
                this.getApp().showGameMain();
            } else {
                this.getApp().showToast('读档失败');
            }
        });

        if (btnContinue) {
            btnContinue.enabled = gm.hasSaveData;
            btnContinue.grayed  = !gm.hasSaveData;
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
        // btn.on(fgui.Event.TOUCH_CANCEL, () => {
        //     fgui.GTween.to(0.9, 1, 0.12).setEase(fgui.EaseType.BackOut).onUpdate((t: any) => btn.setScale(t.value.x, t.value.x));
        // });
        btn.onClick(cb);
    }

    private getLoader() {
        return (this.getApp() as any)?.loader;
    }

    private getApp() {
        // 延迟 import 避免循环依赖
        return AppRegistry.getApp();
    }
}
