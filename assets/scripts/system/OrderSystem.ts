import { GameManager, GameEvent } from '../core/GameManager';
import { GuestSystem, Guest, GuestType } from './GuestSystem';

// ============================================================
// 订单数据结构
// ============================================================
export interface Order {
    id: string;
    guestId: string;
    guestName: string;
    guestType: string;      // 种族
    guestGuestType: GuestType; // 良民/错误/通缉
    reward: number;         // 基础奖励
    bounty: number;         // 悬赏金（仅通缉犯）
    status: OrderStatus;
}

export enum OrderStatus {
    Pending   = 'pending',   // 等待处理
    Accepted  = 'accepted',  // 接待（正确/错误）
    Rejected  = 'rejected',  // 拒绝（正确/错误）
    Reported  = 'reported',  // 报警（正确/错误）
    Expired   = 'expired',   // 超时
}

// ============================================================
// 声誉奖惩配置
// ============================================================
const REP_REWARDS = {
    acceptNormal:     +2,   // 正确接待良民
    rejectWrongInfo:  +3,   // 识破信息错误
    reportWanted:     +5,   // 缉拿通缉犯
    acceptWanted:    -15,   // 漏抓通缉犯
    rejectNormal:     -5,   // 误拒良民
    reportInnocent:  -10,   // 诬陷良民
    acceptWrongInfo:  -8,   // 接待了信息错误的客人
};

export class OrderSystem {

    static instance: OrderSystem | null = null;

    private orders: Order[] = [];
    private nextOrderId: number = 0;

    // --------------------------------------------------------
    // 生命周期
    // --------------------------------------------------------

    constructor() {
        OrderSystem.instance = this;
    }

    // --------------------------------------------------------
    // 订单管理
    // --------------------------------------------------------

    /** 为客人创建订单 */
    createOrder(guest: Guest): Order {
        const gm = GameManager.instance!;
        const multiplier = GuestSystem.getRaceMultiplier(guest.realRace) * gm.incomeMultiplier;

        const order: Order = {
            id: `order_${++this.nextOrderId}`,
            guestId: guest.id,
            guestName: guest.realName,
            guestType: guest.realRace,
            guestGuestType: guest.guestType,
            reward: Math.floor(100 * multiplier),
            bounty: guest.bounty ?? 0,
            status: OrderStatus.Pending,
        };

        this.orders.push(order);
        GameManager.instance?.events.emit(GameEvent.OrderCreated, { order });
        return order;
    }

    /** 接待客人 */
    acceptGuest(guestId: string): { success: boolean; coinDelta: number; repDelta: number; message: string } {
        const guest = GuestSystem.instance?.getGuest(guestId);
        const order = this.orders.find(o => o.guestId === guestId && o.status === OrderStatus.Pending);
        if (!guest || !order) return { success: false, coinDelta: 0, repDelta: 0, message: '客人还没来，请耐心等待' };

        const gm = GameManager.instance!;
        let coinDelta = 0;
        let repDelta = 0;
        let message = '';

        switch (guest.guestType) {
            case GuestType.Normal:
                // ✅ 正确接待良民
                order.status = OrderStatus.Accepted;
                coinDelta = order.reward;
                repDelta = REP_REWARDS.acceptNormal;
                message = `✅ 接待成功！+${coinDelta}金币 +${repDelta}声誉`;
                break;

            case GuestType.WrongInfo:
                // ❌ 接待了信息错误的客人
                order.status = OrderStatus.Accepted;
                coinDelta = Math.floor(order.reward * 0.3); // 只给少部分钱
                repDelta = REP_REWARDS.acceptWrongInfo;
                message = `❌ 伪装者！收入减少！+${coinDelta}金币 ${repDelta}声誉`;
                break;

            case GuestType.Wanted:
                // ❌❌ 漏抓通缉犯！
                order.status = OrderStatus.Accepted;
                coinDelta = order.reward;
                repDelta = REP_REWARDS.acceptWanted;
                message = `🚨 通缉犯逍遥法外！${repDelta}声誉！`;
                break;
        }

        gm.addCoin(coinDelta);
        gm.changeRep(repDelta);
        GuestSystem.instance?.markServed(guestId);
        GuestSystem.instance?.removeGuest(guestId);
        gm.onGuestServed(guest.guestType === GuestType.Normal);

        return { success: true, coinDelta, repDelta, message };
    }

    /** 拒绝客人 */
    rejectGuest(guestId: string): { success: boolean; coinDelta: number; repDelta: number; message: string } {
        const guest = GuestSystem.instance?.getGuest(guestId);
        const order = this.orders.find(o => o.guestId === guestId && o.status === OrderStatus.Pending);
        if (!guest || !order) return { success: false, coinDelta: 0, repDelta: 0, message: '客人不存在' };

        const gm = GameManager.instance!;
        let repDelta = 0;
        let message = '';

        switch (guest.guestType) {
            case GuestType.WrongInfo:
                // ✅ 识破信息错误
                order.status = OrderStatus.Rejected;
                repDelta = REP_REWARDS.rejectWrongInfo;
                message = `🔍 识破伪装！+${repDelta}声誉`;
                break;

            case GuestType.Normal:
                // ❌ 误拒良民
                order.status = OrderStatus.Rejected;
                repDelta = REP_REWARDS.rejectNormal;
                message = `😢 误拒良民！${repDelta}声誉`;
                break;

            case GuestType.Wanted:
                // 拒绝通缉犯 — 不扣也不加，但没抓到
                order.status = OrderStatus.Rejected;
                repDelta = 0;
                message = `⚠️ 通缉犯被放走了...`;
                break;
        }

        gm.changeRep(repDelta);
        GuestSystem.instance?.markServed(guestId);
        GuestSystem.instance?.removeGuest(guestId);
        gm.onGuestServed(guest.guestType === GuestType.WrongInfo);

        return { success: true, coinDelta: 0, repDelta, message };
    }

    /** 报警（通缉犯） */
    reportGuest(guestId: string): { success: boolean; coinDelta: number; repDelta: number; message: string } {
        const guest = GuestSystem.instance?.getGuest(guestId);
        const order = this.orders.find(o => o.guestId === guestId && o.status === OrderStatus.Pending);
        if (!guest || !order) return { success: false, coinDelta: 0, repDelta: 0, message: '客人不存在' };

        const gm = GameManager.instance!;
        let coinDelta = 0;
        let repDelta = 0;
        let message = '';

        switch (guest.guestType) {
            case GuestType.Wanted:
                // ✅ 缉拿通缉犯！
                order.status = OrderStatus.Reported;
                coinDelta = guest.bounty ?? 300;
                repDelta = REP_REWARDS.reportWanted;
                message = `🚔 缉拿成功！+${coinDelta}悬赏金 +${repDelta}声誉！`;
                gm.onWantedCaught();
                break;

            case GuestType.Normal:
            case GuestType.WrongInfo:
                // ❌ 诬陷良民
                order.status = OrderStatus.Reported;
                repDelta = REP_REWARDS.reportInnocent;
                message = `😱 诬陷良民！${repDelta}声誉！`;
                break;
        }

        gm.addCoin(coinDelta);
        gm.changeRep(repDelta);
        GuestSystem.instance?.markServed(guestId);
        GuestSystem.instance?.removeGuest(guestId);
        gm.onGuestServed(guest.guestType === GuestType.Wanted,true);

        return { success: true, coinDelta, repDelta, message };
    }

    /** 获取指定客人的订单 */
    getOrder(guestId: string): Order | undefined {
        return this.orders.find(o => o.guestId === guestId);
    }

    /** 清空今日订单（闭店时） */
    clearTodayOrders(): void {
        this.orders = [];
    }
}
