import { EventTarget, sys } from 'cc';

// ============================================================
// 游戏事件 — 集中定义，避免魔法字符串
// ============================================================
export enum GameEvent {
    CoinChanged     = 'game:coin-changed',
    LevelUp         = 'game:level-up',
    GuestArrived    = 'game:guest-arrived',
    OrderCreated    = 'game:order-created',
    ReputationChanged = 'game:reputation-changed',
    DayStarted      = 'game:day-started',
    DayEnded        = 'game:day-ended',
    GuestServed     = 'game:guest-served',
    AllGuestsDone   = 'game:all-guests-done',
    PatienceChanged  = 'game:patience-changed',
    GuestTimeout     = 'game:guest-timeout',
    SaveLoaded      = 'game:save-loaded',
    SaveCompleted   = 'game:save-completed',
    WantedListUpdated = 'game:wanted-list-updated',
}

/** 游戏阶段 */
export enum GamePhase {
    MainMenu       = 'main-menu',      // 主菜单（开始/继续）
    GameMenu       = 'game-menu',      // 游戏主菜单（开店/缉妖）
    DayStart       = 'day-start',      // 今日通缉令展示
    Playing        = 'playing',        // 营业中
    DayEnd         = 'day-end',        // 今日结算
    Transition     = 'transition',     // 过场动画
}

/** 声誉等级 */
export enum RepLevel {
    Black   = 'black',    // 0-20  黑店
    Bad     = 'bad',      // 21-40 差评店
    Normal  = 'normal',   // 41-60 普通店
    Good    = 'good',     // 61-80 好评店
    Famous  = 'famous',   // 81-100 名店
}

/** 声誉等级配置 */
const REP_CONFIG: Record<RepLevel, { label: string; minRep: number; guestCount: [number, number]; wantedMax: number; incomeMul: number; }> = {
    [RepLevel.Black]:  { label: '黑店',   minRep: 0,   guestCount: [2, 3],   wantedMax: 1, incomeMul: 0.5 },
    [RepLevel.Bad]:    { label: '差评店', minRep: 21,  guestCount: [4, 5],   wantedMax: 1, incomeMul: 0.8 },
    [RepLevel.Normal]: { label: '普通店', minRep: 41,  guestCount: [6, 7],   wantedMax: 2, incomeMul: 1.0 },
    [RepLevel.Good]:   { label: '好评店', minRep: 61,  guestCount: [8, 10],  wantedMax: 3, incomeMul: 1.2 },
    [RepLevel.Famous]: { label: '名店',   minRep: 81,  guestCount: [12, 15], wantedMax: 4, incomeMul: 1.5 },
};

/** 存档数据结构 */
export interface SaveData {
    coin: number;
    level: number;
    reputation: number;
    currentDay: number;
    timestamp: number;
    version: string;
}

const SAVE_KEY = 'monster_inn_save_v1';
const SAVE_VERSION = '1.0';

export class GameManager {

    static instance: GameManager | null = null;

    readonly events = new EventTarget();

    // ---- 核心数值 ----
    private _coin: number = 500;
    private _level: number = 1;
    private _reputation: number = 50;
    private _phase: GamePhase = GamePhase.MainMenu;

    // ---- 每日数据 ----
    private _currentDay: number = 0;
    private _todayGuestLimit: number = 0;
    private _todayGuestSpawned: number = 0;
    private _todayGuestServed: number = 0;
    private _todayCoinEarned: number = 0;
    private _todayRepDelta: number = 0;
    private _todayWantedCaught: number = 0;
    private _todayWantedTotal: number = 0;
    private _todayCorrectCount: number = 0;
    private _todayWrongCount: number = 0;

    // ---- 存档状态 ----
    private _hasSaveData: boolean = false;

    // --------------------------------------------------------
    // 生命周期
    // --------------------------------------------------------

    /** 构造函数 — 由 GameApp 调用 */
    constructor() {
        GameManager.instance = this;
        this.checkSaveData();
        console.log('[GameManager] 妖怪客栈启动');
    }

    // --------------------------------------------------------
    // 存档系统
    // --------------------------------------------------------

    /** 检查是否有存档 */
    private checkSaveData(): void {
        const saveJson = sys.localStorage.getItem(SAVE_KEY);
        this._hasSaveData = saveJson !== null && saveJson !== '';
    }

    /** 是否有存档 */
    get hasSaveData(): boolean {
        return this._hasSaveData;
    }

    /** 保存游戏 */
    saveGame(): void {
        const saveData: SaveData = {
            coin: this._coin,
            level: this._level,
            reputation: this._reputation,
            currentDay: this._currentDay,
            timestamp: Date.now(),
            version: SAVE_VERSION,
        };

        try {
            sys.localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
            this._hasSaveData = true;
            console.log('[GameManager] 💾 游戏已保存');
            this.events.emit(GameEvent.SaveCompleted, { success: true });
        } catch (e) {
            console.error('[GameManager] 存档失败:', e);
            this.events.emit(GameEvent.SaveCompleted, { success: false, error: e });
        }
    }

    /** 读取存档 */
    loadGame(): boolean {
        const saveJson = sys.localStorage.getItem(SAVE_KEY);
        if (!saveJson) {
            console.log('[GameManager] 无存档数据');
            return false;
        }

        try {
            const saveData: SaveData = JSON.parse(saveJson);
            
            // 版本检查
            if (saveData.version !== SAVE_VERSION) {
                console.warn('[GameManager] 存档版本不匹配，尝试兼容加载');
            }

            this._coin = saveData.coin ?? 500;
            this._level = saveData.level ?? 1;
            this._reputation = saveData.reputation ?? 50;
            this._currentDay = saveData.currentDay ?? 0;

            this._hasSaveData = true;
            console.log(`[GameManager] 📂 存档已加载 | 第${this._currentDay}天 | 💰${this._coin} | ⭐${this._reputation}`);
            this.events.emit(GameEvent.SaveLoaded, { success: true, data: saveData });
            return true;
        } catch (e) {
            console.error('[GameManager] 读档失败:', e);
            return false;
        }
    }

    /** 删除存档 */
    deleteSave(): void {
        sys.localStorage.removeItem(SAVE_KEY);
        this._hasSaveData = false;
        console.log('[GameManager] 存档已删除');
    }

    /** 获取存档信息（用于显示） */
    getSaveInfo(): { day: number; coin: number; timestamp: number } | null {
        const saveJson = sys.localStorage.getItem(SAVE_KEY);
        if (!saveJson) return null;

        try {
            const saveData: SaveData = JSON.parse(saveJson);
            return {
                day: saveData.currentDay,
                coin: saveData.coin,
                timestamp: saveData.timestamp,
            };
        } catch {
            return null;
        }
    }

    // --------------------------------------------------------
    // Getter
    // --------------------------------------------------------

    get coin(): number { return this._coin; }
    get level(): number { return this._level; }
    get reputation(): number { return this._reputation; }
    get phase(): GamePhase { return this._phase; }
    set phase(v: GamePhase) { this._phase = v; }

    get currentDay(): number { return this._currentDay; }
    get todayGuestLimit(): number { return this._todayGuestLimit; }
    get todayGuestSpawned(): number { return this._todayGuestSpawned; }
    get todayGuestServed(): number { return this._todayGuestServed; }
    get todayCoinEarned(): number { return this._todayCoinEarned; }
    get todayRepDelta(): number { return this._todayRepDelta; }
    get todayWantedCaught(): number { return this._todayWantedCaught; }
    get todayWantedTotal(): number { return this._todayWantedTotal; }
    get todayCorrectCount(): number { return this._todayCorrectCount; }
    get todayWrongCount(): number { return this._todayWrongCount; }

    get isPlaying(): boolean { return this._phase === GamePhase.Playing; }

    // --------------------------------------------------------
    // 声誉系统
    // --------------------------------------------------------

    get repLevel(): RepLevel {
        if (this._reputation <= 20) return RepLevel.Black;
        if (this._reputation <= 40) return RepLevel.Bad;
        if (this._reputation <= 60) return RepLevel.Normal;
        if (this._reputation <= 80) return RepLevel.Good;
        return RepLevel.Famous;
    }

    get repLabel(): string {
        return REP_CONFIG[this.repLevel].label;
    }

    get incomeMultiplier(): number {
        return REP_CONFIG[this.repLevel].incomeMul;
    }

    /** 获取声誉等级配置 */
    getRepConfig() {
        return REP_CONFIG[this.repLevel];
    }

    /** 声誉变化，自动 clamp 到 0~100 */
    changeRep(delta: number): void {
        const oldLevel = this.repLevel;
        this._reputation = Math.max(0, Math.min(100, this._reputation + delta));
        this._todayRepDelta += delta;
        const newLevel = this.repLevel;

        this.events.emit(GameEvent.ReputationChanged, {
            reputation: this._reputation,
            delta,
            oldLevel,
            newLevel,
        });
    }

    // --------------------------------------------------------
    // 金币
    // --------------------------------------------------------

    addCoin(amount: number): void {
        this._coin += amount;
        this._todayCoinEarned += amount;
        this.events.emit(GameEvent.CoinChanged, { coin: this._coin, delta: amount });
    }

    spendCoin(amount: number): boolean {
        if (this._coin < amount) return false;
        this._coin -= amount;
        this.events.emit(GameEvent.CoinChanged, { coin: this._coin, delta: -amount });
        return true;
    }

    // --------------------------------------------------------
    // 等级
    // --------------------------------------------------------

    levelUp(): void {
        this._level++;
        this.events.emit(GameEvent.LevelUp, { level: this._level });
    }

    // --------------------------------------------------------
    // 每日系统
    // --------------------------------------------------------

    /** 新游戏 — 重置所有数据 */
    newGame(): void {
        this._coin = 500;
        this._level = 1;
        this._reputation = 50;
        this._currentDay = 0;
        this._phase = GamePhase.GameMenu;
        console.log('[GameManager] 🎮 新游戏开始');
    }

    /** 进入游戏主菜单 */
    enterGameMenu(): void {
        this._phase = GamePhase.GameMenu;
    }

    /** 开店 — 开始新的一天 */
    startDay(): void {
        this._currentDay++;
        this._phase = GamePhase.DayStart;

        // 根据声誉计算今日客人数
        const cfg = this.getRepConfig();
        const [min, max] = cfg.guestCount;
        this._todayGuestLimit = min + Math.floor(Math.random() * (max - min + 1));
        this._todayGuestSpawned = 0;
        this._todayGuestServed = 0;
        this._todayCoinEarned = 0;
        this._todayRepDelta = 0;
        this._todayWantedCaught = 0;
        this._todayWantedTotal = 0;
        this._todayCorrectCount = 0;
        this._todayWrongCount = 0;

        console.log(`[GameManager] 📅 第 ${this._currentDay} 天 | 声誉 ${this._reputation} [${this.repLabel}] | 今日客人: ${this._todayGuestLimit}`);
        this.events.emit(GameEvent.DayStarted, { day: this._currentDay });
    }

    /** 营业开始 — 通缉令确认后调用 */
    beginBusiness(): void {
        this._phase = GamePhase.Playing;
    }

    /** 客人已生成，计数 */
    onGuestSpawned(): void {
        this._todayGuestSpawned++;
    }

    /** 客人处理完毕（接待/拒绝/报警任一操作），检查是否所有客人处理完 */
    onGuestServed(correct: boolean): void {
        this._todayGuestServed++;
        if (correct) {
            this._todayCorrectCount++;
        } else {
            this._todayWrongCount++;
        }

        // 检查是否今天所有客人都处理完了
        // 延迟 2.5 秒发射事件，让 Toast 消失后再弹出结算界面
        if (this._todayGuestServed >= this._todayGuestLimit) {
            setTimeout(() => {
                this.events.emit(GameEvent.AllGuestsDone);
            }, 2500);
        }
    }

    /** 闭店 */
    endDay(): void {
        this._phase = GamePhase.DayEnd;
        this.events.emit(GameEvent.DayEnded);

        // 每天结束检查升级（每接待 10 个客人升一级）
        if (this._todayGuestServed >= 10) {
            this.levelUp();
        }
    }

    /** 过场动画结束 → 回到游戏菜单 */
    finishTransition(): void {
        this._phase = GamePhase.GameMenu;
    }

    /** 还有几个客人没来 */
    get remainingGuests(): number {
        return this._todayGuestLimit - this._todayGuestSpawned;
    }

    /** 还有几个客人没处理 */
    get pendingGuests(): number {
        return this._todayGuestLimit - this._todayGuestServed;
    }

    /** 通缉犯被缉拿 */
    onWantedCaught(): void {
        this._todayWantedCaught++;
    }

    /** 设置今日通缉犯总数 */
    setTodayWantedTotal(count: number): void {
        this._todayWantedTotal = count;
    }

    /** 客人耐心耗尽，愤怒离店 */
    onGuestTimeout(guest: import('./GuestSystem').Guest): void {
        this._todayGuestServed++;
        this._todayWrongCount++;
        // 耐心耗尽扣声誉
        this.changeRep(-5);
        console.log(`[GameManager] 😤 ${guest.cardName} 愤怒离店，声誉 -5`);
        this.events.emit(GameEvent.GuestTimeout, { guest });

        // 检查是否所有客人都处理完了（包括愤怒离店的）
        if (this._todayGuestServed >= this._todayGuestLimit) {
            this.events.emit(GameEvent.AllGuestsDone);
        }
    }
}
