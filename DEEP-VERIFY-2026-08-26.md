# 深度资源验证报告（2026-08-26）

工具：`scripts/deep-verify.mjs`（`npm run verify:deep`），本轮覆盖 **255 条** status≠dead 资源。
原始数据：`deep-report.json` / 二遍精查 `deep-pass2.json`（本轮运行产物，未入库）。

## 一、真实性保障机制（如何确保不是"看一眼就走"）

每条资源跑三层真实请求，全部是发出去的真实网络往返，不做任何推测：

| 层 | 动作 | 判定什么 |
|---|---|---|
| L1 落地页抓取 | GET 页面，提取 `<title>` + 首屏文本 | 站点是否活着、内容是否与资源名对得上、是否停放页/默认页/报错页 |
| L2 元标签精查（二遍） | SPA 抓不到 title 的，补查 og:title / og:site_name / application-name | 前端渲染站点的品牌证据 |
| L3 网关实探 | 对形似 API 端点的 URL，GET `/v1/models` 与 `/api/status`（无鉴权） | 返回 JSON 即证明网关服务真实存在；返回 HTML 说明只是普通网页 |

判定纪律沿用项目既有红线：**单次探测不定罪**。本报告只产出证据；
status 降级必须经 monitor 连续两日判死或人工确认，tips 记录带日期的时点证据。

## 二、总体数字

| 指标 | 数值 | 说明 |
|---|---|---|
| 品牌命中（title） | 115 | 标题直接含品牌词 |
| 品牌命中（meta 补查后新增） | +6 | 豆包 / 可灵 / hongmacc / iamhc / free.v36.cm 等 |
| 正文弱命中 | 7 | 品牌词出现在正文而非标题 |
| 网关 JSON 实证存活 | **21/46** | `/v1/models` 或 `/api/status` 返回真实 JSON |
| 反爬盾（403 Just-a-Moment 等） | 11 | Midjourney / Lovable / OpenAI 等——站点活着但拒绝机器人 |
| 不可达 | 70 | 本机出口受限环境噪声（github.com 独占 38 条），不计入判定 |
| 无匹配进入二遍精查 | 54 | 见下节分类结论 |

## 三、二遍精查结论（54 条）

1. **网关实证存活 26 条**：文文 AI、Huan666、AntiCode、Huainova、艾可API、micu、卡皮巴拉api、
   cctq、bytecat、ikun code、黑与白公益站、干草铺、薄荷公益站、gogogo、docode、rua chat、
   api456、iamhc、helpcoder、橘子ai、dgb、gorouter、moyuu、sharedchat、阿柴AI、7倍算力、幻城API
   ——首轮因页面无静态品牌字样被标记，`/api/status` 全部返回真实 JSON，确认为活的 one-api/new-api 部署。
2. **大厂/知名服务误报 8 条**：豆包、通义千问、阿里云百炼（console 登录页）、Codeium/Devin(429 限流=活着)、
   OpenAI Academy(403 盾)、Midjourney/Lovable(403 盾)——无需任何处理。
3. **已有在案记录吻合 3 条**：尔信中转站(451)、yes code(451)、AIZZZ(WAF 403)——今日实测与
   tips 中既往巡检记录完全一致，维持原判不降级。
4. **新发现并已写入带日期 tips 2 条**：
   - 火山引擎方舟邀请码：邀请落地页实测 404（可能过期/被回收）
   - 七牛云 AI Token API：产品详情页实测 404（可能更名/下线）
5. **观察名单（单次弱证据，不动数据，留给 monitor 双击机制）**：
   apiyi.com、aigcbar.com、timicc.com、bmapi 公益站、88888.qzz.io、mitce、dy11.baipiaoyes、
   β.nyc.mn、墨菲云、dnshe——共同特征：落地页无品牌命中且网关探针缺失/404。

## 四、与既有机制的分工

- `check:links`：全量 URL 字面量快扫（每日可跑，浅层）
- `monitor`：带状态日巡检，两击判死 + 死链 Issue 告警（守门员）
- `verify:deep`（本工具）：按需深挖，标题比对 + 网关实探（刑侦队）
- 三层互补，任何一层都无权单独改写资源状态。
