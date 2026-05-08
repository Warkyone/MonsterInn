/**
 * 全局应用注册表 — 解决循环依赖问题
 * 各模块通过 AppRegistry.getApp() 获取 GameApp 实例
 * 避免使用 require()（浏览器不支持）
 */
export class AppRegistry {
    private static _app: any = null;

    static register(app: any): void {
        AppRegistry._app = app;
        console.log('[AppRegistry] GameApp 已注册');
    }

    static getApp(): any {
        return AppRegistry._app;
    }
}
