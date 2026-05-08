import * as fgui from 'fairygui-cc';

/** 单包名称 */
export const PACKAGE_NAME = 'MainUI';

/** 组件名映射 */
export const UI_COMPONENTS = {
    mainMenu:        'MainMenu',
    gameMain:        'GameMain',
    openShopMain:    'OpenShopMainUI',
    dayStartPopup:   'DayStartPopup',
    dayEndPopup:     'DayEndPopup',
    transitionScene: 'TransitionScene',
    // infoCardPopup:   'InfoCardPopup',
    toastPopup:      'ToastPopup',
} as const;

/** FairyGUI 包加载器（普通类，由 GameApp 持有） */
export class UIPackageLoader {

    pkg: fgui.UIPackage | null = null;

    /** 加载 MainUI 包 */
    load(callback?: (pkg: fgui.UIPackage) => void): void {
        if (this.pkg) {
            callback?.(this.pkg);
            return;
        }

        console.log(`[UIPackageLoader] 加载包: ${PACKAGE_NAME}`);
        fgui.UIPackage.loadPackage(PACKAGE_NAME, (err, pkg) => {
            if (err) {
                console.error(`[UIPackageLoader] 包 "${PACKAGE_NAME}" 加载失败:`, err.message);
                return;
            }
            this.pkg = pkg;
            console.log(`[UIPackageLoader] ✅ 包 "${PACKAGE_NAME}" 加载成功`);
            callback?.(pkg);
        });
    }

    /** 从已加载的包中创建组件 */
    createComp<T extends fgui.GObject>(name: string): T | null {
        if (!this.pkg) {
            console.warn('[UIPackageLoader] 包未加载，无法创建组件:', name);
            return null;
        }
        return this.pkg.createObject(name) as T | null;
    }
}
