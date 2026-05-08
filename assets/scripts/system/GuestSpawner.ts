import { AppRegistry } from '../core/AppRegistry';
import * as fgui from 'fairygui-cc';
import { GTween, EaseType } from 'fairygui-cc';
import { GameManager, GameEvent, GamePhase } from '../core/GameManager_base';
import { GuestSystem, Guest } from './GuestSystem';
import { OrderSystem } from './OrderSystem';

const BASE_SPAWN_INTERVAL = 5;

/** 客人生成定时器（普通类，由 GameApp 持有） */
export class GuestSpawner {

    private spawnTimer: ReturnType<typeof setInterval> | null = null;

    constructor() {
        this.bindEvents();
    }

    start(): void {
        this.stop();
        const gm = GameManager.instance;
        if (!gm || !gm.isPlaying) return;

        this.spawnOnce();

        if (gm.remainingGuests > 0) {
            const interval = this.getInterval();
            this.spawnTimer = setInterval(() => this.spawnOnce(), interval * 1000);
        }
    }

    stop(): void {
        if (this.spawnTimer != null) {
            clearInterval(this.spawnTimer);
            this.spawnTimer = null;
        }
    }

    // --------------------------------------------------------

    private spawnOnce(): void {
        const gm = GameManager.instance;
        if (!gm || !gm.isPlaying) return;
        if (gm.remainingGuests <= 0) { this.stop(); return; }
        GuestSystem.instance?.spawnGuest();
    }

    private getInterval(): number {
        const rep = GameManager.instance?.reputation ?? 50;
        if (rep > 80) return 2;
        if (rep > 60) return 3;
        if (rep > 40) return BASE_SPAWN_INTERVAL;
        if (rep > 20) return 7;
        return 10;
    }

    private bindEvents(): void {
        const gm = GameManager.instance;
        if (!gm) return;

        gm.events.on(GameEvent.GuestArrived, (data: { guest: Guest }) => {
            OrderSystem.instance?.createOrder(data.guest);
            this.getApp()?.showGuestNotification(data.guest.cardName, data.guest.cardRace);
            // this.getApp()?.infoCard.showFirstPending();
            this.getApp()?.openShopMain.renderGuestList();
        }, this);

        gm.events.on(GameEvent.DayEnded, () => this.stop(), this);

        gm.events.on(GameEvent.PatienceChanged, (data: { leftGuests?: Guest[] }) => {
            if (gm.phase !== GamePhase.Playing) return;
            if (data?.leftGuests?.length) {
                for (const g of data.leftGuests) {
                    this.getApp()?.showToast(`😤 ${g.cardName} 愤怒离店，声誉 -5`);
                }
                // this.getApp()?.infoCard.showFirstPending();
            }
            this.getApp()?.openShopMain.renderGuestList();
        }, this);
    }

    private getApp() { return AppRegistry.getApp(); }
}
