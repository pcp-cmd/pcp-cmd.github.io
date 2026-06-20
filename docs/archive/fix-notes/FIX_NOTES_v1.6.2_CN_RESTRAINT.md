# FIX_NOTES_v1.6.2_CN_RESTRAINT

本版针对 2026-06-17 反馈继续修正：

1. 移除 Protocol / Method Engine 中 02 左侧的橙色 current dot。这个点容易被误认为 UI 渲染错误，暂时不保留当前节点提示。
2. 收紧中文字号系统：中文标题、方法行、页面大标题整体降级，避免出现过大的展示字。中文正文保持 15px 左右，提高克制感和阅读稳定性。
3. 恢复 Works / Selected Works 的横向 carousel 轨道，不再是三列静态网格；保留自动滚动逻辑和横向滚动。
4. 删除本地字体文件和 @font-face 引用，改用系统字体与中文 fallback 栈，避免字体文件随交付包分发。

设计方向：中文主叙事 + 英文索引气质；参考 anthropic-style-cn 的克制中文排版逻辑，转译为 Aleksi Lab dark manuscript archive。
