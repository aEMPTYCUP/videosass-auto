# VideoSaaS 代码审查规范

基于 VDH×VDP 逆向分析报告的架构标准。

## 安全审查
- [ ] 是否遵守最小权限原则（只申请 tabs, storage, declarativeNetRequest）？
- [ ] 禁止使用 scripting, webRequest, webNavigation, offscreen
- [ ] 是否处理 URL 参数隐私（剥离 qyTrace, e2 等追踪参数）？
- [ ] DOM 扫描不泄露用户数据到第三方

## 架构一致性
- [ ] 遵循 Manifest V3 规范？
- [ ] content script / service worker / options 分离？
- [ ] BroadcastChannel 通信模式（FNV-1a hash per-tab key）？
- [ ] Option/Result 单子错误处理模式？

## 错误处理
- [ ] 所有异步操作有 try/catch 或 .catch()
- [ ] 使用 Option/Result 单子而非 null/undefined
- [ ] 用户提示清晰（无网络、权限不足、无视频发现）

## 性能
- [ ] MutationObserver 防抖（300ms）？
- [ ] URL 去重避免重复处理？
- [ ] Service Worker 生命周期管理？

## 代码质量
- [ ] 日志前缀统一 `[VideoSaaS]`？
- [ ] TypeScript 类型定义完整？
- [ ] 无硬编码敏感信息（API Key 用环境变量）？
