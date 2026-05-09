// @ts-ignore
import { _decorator, Component } from 'cc';
import * as fgui from 'fairygui-cc';

import { GameManager, GameEvent } from './GameManager';
import { AppRegistry } from './AppRegistry';
import { GuestSystem } from '../system/GuestSystem';
import { OrderSystem } from '../system/OrderSystem';

// UI 模块（普通类，不继承 Component）
import { UIPackageLoader } from '../ui/UIPackageLoader';
import { MainMenuUI } from '../ui/MainMenuUI';
import { GameMainUI } from '../ui/GameMainUI';
import { OpenShopMainUI } from '../ui/OpenShopMainUI';
import { DayStartPopupUI } from '../ui/DayStartPopupUI';
import { DayEndPopupUI } from '../ui/DayEndPopupUI';
// import { InfoCardPopupUI } from '../ui/InfoCardPopupUI';
import { TransitionSceneUI } from '../ui/TransitionSceneUI';
import { ToastUI } from '../ui/ToastUI';
import { GuestSpawner } from '../system/GuestSpawner';
import { NotificationUI } from '../ui/NotificationUI';

const { ccclass } = _decorator;

/**
 * 🎮 GameApp — 唯一挂载脚本
 * 负责创建所有模块实例，并作为页面跳转中心
 */
@ccclass('GameApp')
export class GameApp extends Component {

    static instance: GameApp | null = null;

    // 所有模块实例由 GameApp 持有
    loader!: UIPackageLoader;
    mainMenu!: MainMenuUI;
    gameMain!: GameMainUI;
    openShopMain!: OpenShopMainUI;
    dayStartPopup!: DayStartPopupUI;
    dayEndPopup!: DayEndPopupUI;
    // infoCard!: InfoCardPopupUI;
    transition!: TransitionSceneUI;
    toast!: ToastUI;
    spawner!: GuestSpawner;
    notification!: NotificationUI;

    onLoad() {
        GameApp.instance = this;
        AppRegistry.register(this);  // 注册到全局，供各模块访问

        // 初始化 GRoot（FairyGUI 必须最先）
        fgui.GRoot.create();
        console.log('[GameApp] GRoot 创建完成');

        // 先初始化数据层（顺序很重要）
        new GameManager();
        new GuestSystem();
        new OrderSystem();
        console.log('[GameApp] 数据层初始化完成');

        // 手动创建所有 UI 模块实例
        this.loader       = new UIPackageLoader();
        this.toast        = new ToastUI();
        this.notification = new NotificationUI();
        this.mainMenu     = new MainMenuUI();
        this.gameMain     = new GameMainUI();
        this.openShopMain = new OpenShopMainUI();
        this.dayStartPopup = new DayStartPopupUI();
        this.dayEndPopup  = new DayEndPopupUI();
        // this.infoCard     = new InfoCardPopupUI();
        this.transition   = new TransitionSceneUI();
        this.spawner      = new GuestSpawner();

        // 绑定游戏事件
        this.bindGameEvents();

        console.log('[GameApp] 所有模块初始化完成，开始加载 UI 包...');

        // 加载 FairyGUI 包 → 完成后显示主菜单
        this.loader.load(() => {
            console.log('[GameApp] ✅ 包加载完成，显示主菜单');
            this.showMainMenu();
        });
    }

    // --------------------------------------------------------
    //  游戏事件绑定
    // --------------------------------------------------------

    private bindGameEvents(): void {
        const gm = GameManager.instance;
        if (!gm) return;

        // 所有客人处理完 → 结算
        gm.events.on(GameEvent.AllGuestsDone, () => {
            console.log('[GameApp] 所有客人处理完，自动结算');
            gm.endDay();
        }, this);

        // 每日结束 → 显示结算弹窗
        gm.events.on(GameEvent.DayEnded, () => {
            this.spawner.stop();
            this.dayEndPopup.show();
        }, this);
    }

    // ========================================================
    //  页面切换中心
    // ========================================================

    showMainMenu(): void {
        // this.infoCard.close();
        this.mainMenu.show();
    }

    showGameMain(): void {
        this.mainMenu.hide();
        this.gameMain.show();
    }

    showOpenShopMain(): void {
        this.mainMenu.hide();
        this.openShopMain.show();
    }

    showDayStartPopup(): void {
        this.dayStartPopup.show();
    }

    beginBusiness(): void {
        const gm = GameManager.instance;
        if (!gm) return;
        gm.beginBusiness();
        this.openShopMain.enterBusinessMode();
        this.spawner.start();// 开始生成客人
    }

    // showDayEnd(): void {
    //     this.spawner.stop();
    //     this.dayEndPopup.show();
    // }

    showTransition(): void {
        this.transition.show();
    }

    showToast(text: string, duration?: number): void {
        this.toast.show(text, duration);
    }

    showGuestNotification(name: string, race: string): void {
        this.notification.showGuestNotification(name, race);
    }
}
