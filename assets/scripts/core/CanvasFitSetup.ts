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
import * as fgui from 'fairygui-cc'; // 修复fgui导入
const { ccclass, property } = _decorator;

@ccclass('CanvasFitSetup') 
export class CanvasFitSetup extends Component {

    onLoad() {
        // 标准横屏适配
        view.setDesignResolutionSize(1280, 720, ResolutionPolicy.SHOW_ALL);
        window.addEventListener('resize', () => {
            view.resizeWithBrowserSize(true);
            fgui.GRoot.inst.makeFullScreen();
        });

        fgui.GRoot.inst.makeFullScreen();
    }
}