// import { _decorator, Component, ResolutionPolicy, view } from 'cc';
// const { ccclass, executionOrder } = _decorator;

// /**
//  * CanvasFitSetup
//  * 挂到 Canvas 节点上
//  * 竖屏适配模式：按宽度缩放（Fit Width）
//  * 设计分辨率 720x1280（9:16 手机竖屏）
//  */
// @ccclass('CanvasFitSetup')
// @executionOrder(-1000)
// export class CanvasFitSetup extends Component {

//     onLoad() {
//         // 设计分辨率 720x1280（竖屏）
//         // FIXED_WIDTH = 按宽度铺满，高度自适应（完整显示，不裁切）
//         view.setDesignResolutionSize(720, 1280, ResolutionPolicy.FIXED_HEIGHT);
//         console.log('[CanvasFitSetup] 竖屏适配: 720x1280 FIXED_HEIGHT');
//     }
// }
// @ts-ignore
import { _decorator, Component, view, ResolutionPolicy } from 'cc';
// @ts-ignore
import { fgui } from 'fairygui-cc';
const { ccclass, property } = _decorator;

@ccclass('GameApp')
export class GameApp extends Component {
    onLoad() {
        // 1. 设置适配策略：固定高度，宽度自适应（16:9横屏不变形）
        view.setDesignResolutionSize(1280, 720, ResolutionPolicy.FIXED_HEIGHT);

        // 2. 监听窗口变化，自动重新适配
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    onWindowResize() {
        // 让Cocos重新适配分辨率
        view.resizeWithBrowserSize(true);
        // 关键：让FairGUI重新计算UI布局，防止按钮错位
        fgui.GRoot.inst.makeFullScreen();
        fgui.GRoot.inst.ensureCorrectSize();
    }
}