import { GameManager, GameEvent, RepLevel } from '../core/GameManager';


// ============================================================
// 客人数据结构
// ============================================================

/** 客人类型：良民 / 信息错误 / 通缉犯 */
export enum GuestType {
    Normal = 'normal',     // 良民：信息正确
    WrongInfo = 'wrong-info', // 信息错误：某项信息被篡改
    Wanted = 'wanted',     // 通缉犯
}

/** 客人信息卡 */
export interface Guest {
    id: string;
    name: string;          // 卡面上的名字（可能伪造）
    type: string;          // 种族标签（如 oni, slime, fox）
    patience: number;      // 耐心值
    guestType: GuestType;  // 实际类型

    // ---- 信息卡字段（用于核验）----
    cardName: string;      // 信息卡显示的名字
    cardRace: string;      // 信息卡显示的种族
    cardDesc: string;      // 信息卡显示的描述
    realName: string;      // 真实名字
    realRace: string;      // 真实种族

    // ---- 通缉犯专属 ----
    isWanted: boolean;
    bounty?: number;       // 悬赏金额

    // ---- 状态 ----
    served: boolean;       // 是否已处理
}

// ============================================================
// 妖怪数据库
// ============================================================

interface MonsterTemplate {
    name: string;
    race: string;
    desc: string;
    raceMultiplier: number; // 种族奖励倍率
}

const MONSTER_DB: MonsterTemplate[] = [
    { name: '鬼力少年', race: 'oni', desc: '身负巨力的年轻鬼族', raceMultiplier: 1.0 },
    { name: '妖狐书生', race: 'fox', desc: '有书生气的狐狸精', raceMultiplier: 1.5 },
    { name: '幽灵君', race: 'slime', desc: '半透明的灵态妖怪', raceMultiplier: 1.2 },
    { name: '暗夜狸猫', race: 'tanuki', desc: '嗜酒如命的狸猫', raceMultiplier: 1.0 },
    { name: '河童博士', race: 'kappa', desc: '沉迷研究的河童学者', raceMultiplier: 1.3 },
    { name: '天狗长老', race: 'tengu', desc: '德高望重的山岳天狗', raceMultiplier: 2.0 },
    { name: '雪女', race: 'yuki', desc: '冰寒之地的雪之精灵', raceMultiplier: 1.8 },
    { name: '灯笼小龙', race: 'chochin', desc: '提灯引路的顽皮小妖', raceMultiplier: 1.1 },
];

/** 种族显示名映射 */
const RACE_LABELS: Record<string, string> = {
    oni: '鬼族', fox: '妖狐', slime: '幽灵', tanuki: '狸妖',
    kappa: '河童', tengu: '天狗', yuki: '雪女', chochin: '灯妖',
};

/** 种族 → guesticon 图片序号（对应 resources/guesticon/N.jpg） */
const RACE_ICON_INDEX: Record<string, number> = {
    oni: 1,      // 鬼力少年 → 1.jpg
    fox: 2,      // 妖狐书生 → 2.jpg
    slime: 3,    // 幽灵君 → 3.jpg
    tanuki: 4,   // 暗夜狸猫 → 4.jpg
    kappa: 5,    // 河童博士 → 5.jpg
    tengu: 6,    // 天狗长老 → 6.jpg
    yuki: 7,     // 雪女 → 7.jpg
    chochin: 8,  // 灯笼小龙 → 8.jpg
};

// /** 错误信息类型 */
// enum WrongInfoType {
//     NameMismatch = 'name-mismatch',   // 种族标签错误（名字正确，种族标签与名字不匹配）
//     RaceMismatch = 'race-mismatch',   // 种族标签错误（名字正确，种族标签与名字不匹配）
//     DescMismatch = 'desc-mismatch',   // 描述错误（名字+种族标签正确，描述来自另一个种族）
// }

const gm = GameManager.instance!;

export class GuestSystem {

    static instance: GuestSystem | null = null;

    /** 当前在店内的客人 */
    private guests: Guest[] = [];

    /** 自增 ID 计数器 */
    private nextId: number = 0;

    /** 今日通缉名单 */
    private todayWantedList: Guest[] = [];

    /** 耐心递减定时器 */
    private patienceTimer: number | null = null;

    /** 耐心递减间隔（秒） */
    static readonly PATIENCE_TICK = 0.1;

    /** 每次递减的耐心值 */
    static readonly PATIENCE_DECAY = 1;

    // --------------------------------------------------------
    // 生命周期
    // --------------------------------------------------------

    constructor() {
        GuestSystem.instance = this;
    }

    onDestroy() {
        this.stopPatienceTimer();
    }

    // --------------------------------------------------------
    // 通缉名单
    // --------------------------------------------------------

    /** 生成今日通缉名单（开店时预生成并直接加入客人队列） */
    generateWantedList(): Guest[] {
        this.todayWantedList = [];
        this.tempWantedList = [];
        const wantedCount = 1 + Math.floor(Math.random() * 3); // 0~2 个通缉犯

        // 打乱 MONSTER_DB，确保通缉犯之间信息不重复
        const shuffled = [...MONSTER_DB].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, Math.min(wantedCount, MONSTER_DB.length));

        for (const tmpl of selected) {
            const bounty = 200 + Math.floor(Math.random() * 800);// 随机悬赏金额 200~1000

            const wanted: Guest = {
                id: `wanted_${++this.nextId}`,
                name: tmpl.name,
                type: tmpl.race,
                patience: 100,
                guestType: GuestType.Wanted,
                cardName: tmpl.name,
                cardRace: RACE_LABELS[tmpl.race] ?? tmpl.race,
                cardDesc: tmpl.desc,
                realName: tmpl.name,
                realRace: tmpl.race,
                isWanted: true,
                bounty,// 悬赏金额
                served: false,// 标记为未处理，等生成客人时再加入队列
            };

            this.todayWantedList.push(wanted);
            // gm._todayGuestLimit++; // 增加客人总数限制，确保通缉犯也算入当日总客人数量
        }

        this.tempWantedList = [...this.todayWantedList]; // 预存一份通缉名单副本，用于生成客人时从中取出
        // console.log(`[GuestSystem] 今日通缉名单 (${this.todayWantedList.length}人): ${this.todayWantedList.map(w => w.realName).join(', ')}`);
        return this.todayWantedList;
    }

    /** 获取今日通缉名单（过滤掉已离开的） */
    getWantedList(): ReadonlyArray<Guest> {
        // 过滤掉已服务（接待/拒绝/超时）的通缉犯
        return this.todayWantedList.filter(w => !w.served);
    }

    // /** 检查名字是否在通缉名单中 */
    // isWantedName(name: string): boolean {
    //     return this.todayWantedList.some(w => w.realName === name);
    // }

    // --------------------------------------------------------
    // 客人生成
    // --------------------------------------------------------

    //临时存储通缉犯名单，在生成客人时从中取出，确保通缉犯优先生成且不重复
    tempWantedList: Guest[] = [];

    /**
     * 生成一位新客人
     * 根据通缉名单和概率决定类型（良民/信息错误/通缉犯）
     */
    spawnGuest(): Guest | null {
        const gm = GameManager.instance;
        if (!gm || !gm.isPlaying) return null;
        if (gm.remainingGuests <= 0) return null;// 没有剩余名额生成新客人了

        // 决定客人类型
        const guestType = this.rollGuestType();

        let guest: Guest;
        if (gm.remainingGuests === 1 && this.tempWantedList.length !== 0) {
            // 最后一个客人，如果还有未生成的通缉犯，强制生成通缉犯
            guest = this.tempWantedList[0];
            this.tempWantedList.shift();
        } else {//正常生成
            if (guestType === GuestType.WrongInfo) {
                guest = this.createWrongInfoGuest();
            } else if (guestType === GuestType.Wanted) {
                // 通缉犯名单已用完时，降级为普通客人
                if (this.tempWantedList.length > 0) {
                    guest = this.tempWantedList[0];
                    this.tempWantedList.shift();
                } else {
                    // console.warn('[GuestSystem] Wanted类型但tempWantedList已空，降级为Normal');
                    guest = this.createNormalGuest();
                }
            } else {
                guest = this.createNormalGuest();
            }
        }


        // // 检查客人是否有效
        // if (!guest) {
        //     console.warn('[GuestSystem] spawnGuest: guest is null/undefined, skipping');
        //     console.log('tempWantedList:', this.tempWantedList);
        //     console.log('_todayGuestLimit:', gm._todayGuestLimit);
        //     console.log('todayWantedList:', this.todayWantedList);
        //     return null;
        // }

        // // 最终防线：确保 guest 有效
        // if (!guest) {
        //     console.warn('[GuestSystem] spawnGuest: guest 为空，降级创建普通客人');
        //     guest = this.createNormalGuest();
        // }

        this.guests.push(guest);

        // console.log(`[GuestSystem] ${guest.cardName} [${guest.cardRace}] 入店 (${guest.guestType})`);
        GameManager.instance?.events.emit(GameEvent.GuestArrived, { guest });// 通知系统有新客人入店

        // 第一个客人入店时启动耐心计时器
        if (!this.patienceTimer && this.guests.length > 0) {
            this.startPatienceTimer();
        }
        // 通知 GameManager 有新客人生成（用于统计和结算逻辑）
        GameManager.instance?.onGuestSpawned();

        return guest;
    }

    /** 概率决定客人类型 */
    private rollGuestType(): GuestType {
        const rand = Math.random();
        // 伪装: 20%, 良民: 80%
        const wantedList = GuestSystem.instance?.getWantedList() ?? [];//通缉犯已生成名单
        //增加通缉犯出现概率
        if (wantedList.length != 0) {
            const wantedChance = 0.3 * wantedList.length; // 每个通缉犯增加30%概率
            if (rand < wantedChance) {
                return GuestType.Wanted;
            }
        }
        if (rand < 0.20) {
            return GuestType.WrongInfo;
        }
        return GuestType.Normal;
    }

    /** 创建良民客人 */
    private createNormalGuest(): Guest {
        const tmpl = this.pickTemplate();
        return {
            id: `guest_${++this.nextId}`,
            name: tmpl.name,
            type: tmpl.race,
            patience: 100,
            guestType: GuestType.Normal,
            cardName: tmpl.name,
            cardRace: RACE_LABELS[tmpl.race] ?? tmpl.race,
            cardDesc: tmpl.desc,
            realName: tmpl.name,
            realRace: tmpl.race,
            isWanted: false,
            served: false,
        };
    }

    /** 创建伪装客人 */
    private createWrongInfoGuest(): Guest {
        const tmpl = this.pickTemplate();
        // 伪装者：名字和图片一致，但种族标签错误
        const other = this.pickOtherTemplate(tmpl);
        const cardRace = RACE_LABELS[other.race] ?? other.race;

        return {
            id: `guest_${++this.nextId}`,
            name: tmpl.name,
            type: tmpl.race,
            patience: 100,
            guestType: GuestType.WrongInfo,
            cardName: tmpl.name,           // 名字正确（与图片一致）
            cardRace,                       // 种族标签错误（与图片不一致）
            cardDesc: tmpl.desc,            // 描述正确
            realName: tmpl.name,
            realRace: tmpl.race,            // 图片基于真实种族（与名字一致）
            isWanted: false,
            served: false,
        };
    }

    // --------------------------------------------------------
    //  选中客人（供 UI 按钮操作使用）
    // --------------------------------------------------------

    /** 当前选中的客人（点击客人列表时设置） */
    private selectedGuest: Guest | null = null;

    /** 设置当前选中客人 */
    selectGuest(guest: any): void {
        this.selectedGuest = guest;
        // console.log(`[GuestSystem] 选中客人: ${guest.cardName} [${guest.cardRace}]`);
    }

    /** 获取当前选中客人 */
    getSelectedGuest(): Guest | null {
        return this.selectedGuest;
    }

    // --------------------------------------------------------
    // 客人管理
    // --------------------------------------------------------

    /** 客人离店（只标记，不移除） */
    markGuestLeft(guestId: string): void {
        const guest = this.guests.find(g => g.id === guestId);
        if (guest) {
            guest.served = true;
        }
    }

    /** 从队列中彻底移除客人（玩家操作后调用） */
    removeGuest(guestId: string): Guest | null {
        const idx = this.guests.findIndex(g => g.id === guestId);
        if (idx === -1) return null;
        const [guest] = this.guests.splice(idx, 1);
        return guest;
    }

    /** 获取当前所有【未处理】的客人（供 UI 显示） */
    getGuestList(): ReadonlyArray<Guest> {
        // if(!this.guests.length) return [];
        return this.guests.filter((g): g is Guest => !!g && !g.served);
    }

    /** 根据 ID 查找客人（即使已标记 served，只要还在队列中就能找到） */
    getGuest(id: string): Guest | undefined {
        return this.guests.find(g => g.id === id);
    }

    /** 获取队首未处理的客人（先来后到） */
    getFirstPendingGuest(): Guest | undefined {
        return this.guests.find(g => !g.served);
    }

    /** 标记客人已处理 */
    markServed(guestId: string): void {
        const guest = this.guests.find(g => g.id === guestId);
        if (guest) guest.served = true;

        // 如果是通缉犯，也标记 wanted list
        if (guest?.isWanted) {
            const wanted = this.todayWantedList.find(w => w.realName === guest.realName);
            if (wanted) wanted.served = true;
        }
    }

    /** 清空今日客人（闭店时） */
    clearTodayGuests(): void {
        this.guests = [];
        this.stopPatienceTimer();
    }

    // --------------------------------------------------------
    //  耐心值系统
    // --------------------------------------------------------

    /** 启动耐心递减定时器 */
    startPatienceTimer(): void {
        this.stopPatienceTimer();
        this.patienceTimer = setInterval(() => this.tickPatience(), GuestSystem.PATIENCE_TICK * 1000) as unknown as number;
        console.log('[GuestSystem] ⏱️ 耐心计时器已启动');
    }

    /** 停止耐心递减定时器 */
    stopPatienceTimer(): void {
        if (this.patienceTimer != null) {
            clearInterval(this.patienceTimer);
            this.patienceTimer = null;
        }
    }

    /** 每帧递减所有客人的耐心值 */
    tickPatience(): void {
        if (this.guests.length === 0) {// 没有客人了，停掉计时器
            this.stopPatienceTimer();
            return;
        }

        // 清理队列中的 undefined 残留（防御性）
        if (this.guests.some(g => !g)) {
            this.guests = this.guests.filter((g): g is Guest => !!g);
        }

        const leftGuests: Guest[] = [];

        for (const guest of this.guests) {
            if (!guest || guest.served) continue;

            guest.patience -= GuestSystem.PATIENCE_DECAY;

            if (guest.patience <= 0) {
                // 耐心耗尽，客人愤怒离店
                guest.patience = 0;
                guest.served = true;  // 标记为已处理
                leftGuests.push(guest);
                console.log(`[GuestSystem] 😤 ${guest.cardName} 耐心耗尽，愤怒离店！`);
                GameManager.instance?.onGuestTimeout(guest);
                // console.warn(this.todayWantedList)
                // console.warn(this.tempWantedList)
            }
        }

        // 通知 UI 刷新列表（显示最新耐心值 + 标记离店客人）
        // 每轮耐心衰减都刷新一次（让耐心条实时变化）
        GameManager.instance?.events.emit(GameEvent.PatienceChanged, { leftGuests });

        // 检查是否全部处理完（店内无人 且 所有预定客人都已生成）
        const remaining = this.guests.filter(g => !g.served).length;
        const gm = GameManager.instance;
        const allSpawned = !gm || gm.remainingGuests <= 0;
        if (remaining === 0 && allSpawned) {
            this.stopPatienceTimer();
            gm?.events.emit(GameEvent.AllGuestsDone, {});
            // console.warn("cccccccccc")
        } else if (remaining === 0 && !allSpawned) {
            // 店里暂时没人但还有客人要来，不要停计时器
            // console.log(`[tickPatience] 店内暂无客人，等待剩余 ${gm?.remainingGuests ?? '?'} 位客人到店`);
        }
    }

    // --------------------------------------------------------
    // 工具方法
    // --------------------------------------------------------

    /** 随机选模板 */
    private pickTemplate(): MonsterTemplate {
        const tmpl = MONSTER_DB[Math.floor(Math.random() * MONSTER_DB.length)];
        // 过滤掉和未出场的通缉犯信息完全一致的模板（名字+种族都相同则冲突）
        const unspawned = this.todayWantedList.filter(w => !w.served);
        if (unspawned.some(w => w.realName === tmpl.name && w.realRace === tmpl.race)) {
            const conflict = tmpl;
            const candidates = MONSTER_DB.filter(m => !(m.name === conflict.name && m.race === conflict.race));
            if (candidates.length > 0) {
                return candidates[Math.floor(Math.random() * candidates.length)];
            }
        }
        return tmpl;
    }

    /** 随机选一个不同于 exclude 的模板 */
    private pickOtherTemplate(exclude: MonsterTemplate): MonsterTemplate {
        const others = MONSTER_DB.filter(m => m.race !== exclude.race);
        return others[Math.floor(Math.random() * others.length)];
    }

    /** 获取种族显示名 */
    static getRaceLabel(race: string): string {
        return RACE_LABELS[race] ?? race;
    }

    /** 获取模板的奖励倍率 */
    static getRaceMultiplier(race: string): number {
        return MONSTER_DB.find(m => m.race === race)?.raceMultiplier ?? 1.0;
    }

    /** 获取种族对应的 guesticon 图片序号（1~8） */
    static getGuestIconIndex(race: string): number {
        return RACE_ICON_INDEX[race] ?? 1;
    }

    /** 获取种族对应的 guesticon 图片 URL（如 "guestIcon/3.jpg"） */
    static getGuestIconUrl(race: string): string {
        const idx = this.getGuestIconIndex(race);
        return `guestIcon/${idx}.jpg`;
    }
}
