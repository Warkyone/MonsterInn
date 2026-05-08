import { AppRegistry } from '../core/AppRegistry';
import * as fgui from 'fairygui-cc';
import { GTween, EaseType } from 'fairygui-cc';
import { UI_COMPONENTS } from './UIPackageLoader';

/** Toast 提示（普通类，由 GameApp 持有） */
export class ToastUI {

    private currentToast: fgui.GComponent | null = null;

    show(text: string, duration: number = 2.0): void {
        const loader = this.getLoader();
        if (!loader?.pkg || !fgui.GRoot.inst) return;

        this.hide();

        const toast = loader.createComp<fgui.GComponent>(UI_COMPONENTS.toastPopup);
        if (!toast) return;

        const txt = toast.getChild('txtMsg') as fgui.GTextField;
        if (txt) txt.text = text;

        fgui.GRoot.inst.addChild(toast);
        const sw = fgui.GRoot.inst.width;
        const sh = fgui.GRoot.inst.height;
        toast.setPosition((sw - toast.width) / 2, sh - 150);

        this.currentToast = toast;
        toast.alpha = 0;
        toast.setScale(0.7, 0.7);

        const startY = toast.y;
        const floatY = startY - 80;

        GTween.to2(0, 0, 1, 1, 0.3).setEase(EaseType.BackOut)
            .onUpdate((t: any) => {
                if (!toast.isDisposed) {
                    toast.alpha = t.value.x;
                    toast.setScale(0.7 + t.value.x * 0.3, 0.7 + t.value.x * 0.3);
                    toast.y = startY + (floatY - startY) * t.value.x;
                }
            })
            .onComplete(() => {
                GTween.delayedCall(duration - 0.6).onComplete(() => {
                    if (toast.isDisposed) return;
                    GTween.to2(1, 1, 0, 0, 0.4).setEase(EaseType.QuadIn)
                        .onUpdate((t: any) => {
                            if (!toast.isDisposed) {
                                toast.alpha = t.value.x;
                                toast.y = floatY + (startY - floatY) * (1 - t.value.x) - 20;
                            }
                        })
                        .onComplete(() => {
                            if (!toast.isDisposed && toast.parent) {
                                toast.removeFromParent();
                                toast.dispose();
                            }
                            if (this.currentToast === toast) this.currentToast = null;
                        });
                });
            });
    }

    hide(): void {
        if (this.currentToast && !this.currentToast.isDisposed) {
            const t = this.currentToast;
            this.currentToast = null;
            GTween.to2(t.alpha, t.alpha, 0, 0, 0.2)
                .onUpdate((tw: any) => { if (!t.isDisposed) t.alpha = tw.value.x; })
                .onComplete(() => { if (!t.isDisposed && t.parent) { t.removeFromParent(); t.dispose(); } });
        }
    }

    private getLoader() { return this.getApp()?.loader ?? null; }
    private getApp()    { return AppRegistry.getApp(); }
}
