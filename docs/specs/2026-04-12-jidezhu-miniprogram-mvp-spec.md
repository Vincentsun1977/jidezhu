# 记得住 微信小程序 MVP Spec

## 1. 文档信息

- 工作名：记得住
- 产品形态：微信原生小程序
- 文档日期：2026-04-12
- 文档目标：作为 MVP 立项、设计、研发拆解与联调的统一依据

## 2. 产品定义

### 2.1 产品定位

记得住是一款面向老年用户的微信小程序，核心价值不是通用聊天，而是帮助用户：

- 说出来
- 记下来
- 想起来
- 到点提醒

它是一款“会记住”的生活记忆与提醒工具，而不是“大而全 AI 助手”。

### 2.2 目标用户

主要用户：

- 老年人
- 视力不佳、记忆力下降用户
- 不喜欢复杂界面与打字输入的用户

次级相关用户：

- 子女
- 陪护人员
- 社区或养老机构工作人员

MVP 以老人端为主，家属协助能力进入后续版本。

### 2.3 核心原则

- 微信小程序优先：所有设计与开发遵循微信小程序规范与能力边界
- 语音优先：录音、播报、确认优先于文字输入
- 极简交互：少页面、少跳转、少打扰
- 老人友好：大字号、高对比、大按钮、温和反馈
- 结果先播报再展示：关键结果优先语音反馈
- 收敛范围：只聚焦记事、回忆、提醒三条主线

## 3. 市场与产品判断

### 3.1 需求判断

该产品解决的是老年用户的生活刚需，而非娱乐需求。主要问题包括：

- 容易忘记吃药、购物、出行、约定
- 不习惯键盘输入
- 难以理解复杂数字产品界面
- 需要把碎片信息沉淀成可回忆、可提醒的结构化内容

### 3.2 差异化定位

相比系统助手、通用 AI 助手和微信生态已有工具，记得住的差异化在于：

- 更适老
- 更少步骤
- 更强记忆结构
- 更适合后续扩展家属协助

一句话定义：通用 AI 是“会回答”，本产品是“会记住”。

### 3.3 风险约束

- 老人自主付费意愿可能有限
- 初次使用门槛仍需控制
- AI 识别稳定性直接影响信任
- 医疗健康表达应避免越界到诊断建议
- 功能一旦发散，容易削弱主价值

## 4. 版本范围

### 4.1 P0 / MVP 必做

- 语音记录
- 文本记录
- 自动摘要
- 自动分类
- 语音确认
- 创建提醒
- 提醒播报
- 时间范围回忆

### 4.2 P1

- 家属协助模式
- 每日摘要
- 每周回顾
- 重要记忆收藏
- 订阅消息

### 4.3 P2

- 方言优化
- 图片记忆
- 家庭共享
- 药品模板
- 社区服务接入

### 4.4 本期不做

- 通用聊天入口
- 复杂社交功能
- 多端复杂协作
- 广告与复杂会员体系
- 医疗诊断与健康建议
- 自动拨号或救援类功能

## 5. 用户场景

### 5.1 记录场景

- 记一下，我晚上要吃药
- 帮我记住，我想买鸡蛋和牛奶
- 下个月我想去苏州旅游

### 5.2 回忆场景

- 上周我说了什么
- 我昨天记过什么
- 最近几天我都记了哪些事

### 5.3 提醒场景

- 今天有什么提醒
- 现在要做什么
- 帮我稍后提醒

## 6. 产品信息架构

页面总数建议控制为 3 个主页面 + 1 个设置页。

### 6.1 首页

首页承担 80% 核心使用场景，包含：

- 顶部问候
- 今日提醒摘要
- 超大按住说话按钮
- 四个快捷入口
- 最近 3 条重要记忆卡片
- 温和提示文案

四个快捷入口建议固定为：

- 说一句
- 听今天提醒
- 回顾上周
- 重要事情

首页设计约束：

- 核心动作一步可达
- 不超过两层跳转
- 默认支持语音播报
- 所有关键动作有确认反馈

### 6.2 回忆页

面向时间范围回忆，MVP 聚焦时间维度，主题回忆放入后续迭代。

首批时间入口：

- 今天
- 昨天
- 最近三天
- 上周
- 本月

展示方式：

- 先给摘要
- 再给明细
- 支持读给我听

### 6.3 提醒页

提醒分组：

- 现在要做
- 今天稍后
- 最近几天

每条提醒动作：

- 完成
- 稍后提醒
- 读给我听

### 6.4 设置页

默认隐藏在次级入口，避免干扰首页主链路。

设置项：

- 长者模式
- 字体大小
- 语音播报开关
- 语速
- 每日摘要时间
- 提醒偏好
- 订阅消息授权入口

## 7. 微信小程序规范约束

本项目必须围绕微信小程序生态实现，不按 Web App 方式设计。

约束如下：

- 前端采用微信原生小程序 + TypeScript
- 页面路由、生命周期、组件通信遵循小程序原生模式
- 音频录制与播放通过小程序原生能力接入
- 登录身份基于微信 `openid` 与内部 `userId`
- 消息触达以小程序内提醒为主，订阅消息为授权后的增强能力
- 开发调试优先兼容微信开发者工具与真机
- 不引入与小程序能力冲突的重型前端框架

## 8. 技术架构

### 8.1 总体架构

采用面向微信小程序的三层结构：

1. `miniprogram-client`
2. `cloudbase-bff`
3. `ai-service`

### 8.2 分层职责

#### miniprogram-client

负责：

- 页面与组件渲染
- 录音与音频播放
- 页面状态管理
- 用户交互与播报体验
- 订阅消息授权入口

#### cloudbase-bff

负责：

- 微信登录态与用户初始化
- 数据库存取
- 文件上传与访问控制
- 提醒状态处理
- 小程序端聚合接口
- 调用 AI 服务

优先形态为 CloudBase 云函数。

#### ai-service

负责：

- ASR 语音转文字
- 记忆解析
- 时间理解
- 回忆摘要生成
- TTS 文本转语音

部署方式为云托管上的 Python FastAPI 服务。

### 8.3 数据流

主数据流建议为：

`小程序 -> 云存储/云函数 -> AI 服务 -> 云数据库/云存储 -> 小程序展示与播报`

这样可以保证：

- 小程序端足够轻
- AI 服务可替换
- 鉴权和数据权限在云开发侧统一收口

## 9. 建议目录结构

```text
Memory_assistant/
  docs/
    prd/
    specs/
    api/
    flows/
  miniprogram/
    app.ts
    app.json
    app.wxss
    project.config.json
    sitemap.json
    typings/
    config/
    constants/
    services/
    stores/
    utils/
    components/
      voice-record-button/
      audio-reply-player/
      summary-banner/
      memory-card/
      reminder-card/
      quick-recall-grid/
      senior-mode-layout/
    pages/
      home/
      recall/
      reminders/
      settings/
    packageMock/
  cloudfunctions/
    authLogin/
    getHomeSummary/
    createMemoryFromText/
    createReminder/
    updateReminderAction/
    shared/
  ai-service/
    app/
      main.py
      api/
      schemas/
      services/
      repositories/
      core/
      mocks/
    tests/
    requirements.txt
    Dockerfile
  shared/
    constants/
    schemas/
    mocks/
    prompts/
```

## 10. 数据模型

### 10.1 users

```json
{
  "_id": "u_xxx",
  "openid": "wx_openid",
  "nickname": "张阿姨",
  "seniorMode": true,
  "fontScale": "large",
  "voiceReplyEnabled": true,
  "ttsSpeed": 0.85,
  "dailyDigestTime": "19:00",
  "createdAt": "2026-04-12T10:00:00Z",
  "updatedAt": "2026-04-12T10:00:00Z"
}
```

### 10.2 memories

```json
{
  "_id": "mem_xxx",
  "userId": "u_xxx",
  "sourceType": "voice",
  "audioFileId": "cloud://bucket/audio/xxx.mp3",
  "contentRaw": "我晚上要吃降压药",
  "summary": "晚上要吃降压药",
  "memoryType": "medicine",
  "lifeCategory": "health",
  "timeScope": "today_evening",
  "tags": ["吃药", "降压药", "晚上"],
  "importance": 0.95,
  "longTerm": true,
  "needsReminder": true,
  "reminderCandidate": true,
  "embeddingStatus": "done",
  "createdAt": "2026-04-12T10:00:00Z",
  "updatedAt": "2026-04-12T10:00:00Z"
}
```

### 10.3 reminders

```json
{
  "_id": "rem_xxx",
  "userId": "u_xxx",
  "memoryId": "mem_xxx",
  "title": "晚上吃降压药",
  "triggerType": "explicit_time",
  "triggerAt": "2026-04-12T20:00:00Z",
  "status": "pending",
  "channel": "miniapp",
  "voiceText": "今晚八点记得吃降压药",
  "repeatRule": null,
  "createdBy": "user",
  "createdAt": "2026-04-12T10:00:00Z",
  "updatedAt": "2026-04-12T10:00:00Z"
}
```

### 10.4 voice_replies

```json
{
  "_id": "vr_xxx",
  "userId": "u_xxx",
  "requestId": "req_xxx",
  "replyText": "我记住了，你晚上要吃降压药",
  "audioFileId": "cloud://bucket/tts/xxx.mp3",
  "scene": "memory_confirm",
  "createdAt": "2026-04-12T10:00:00Z"
}
```

### 10.5 feedback_events

```json
{
  "_id": "fb_xxx",
  "userId": "u_xxx",
  "targetType": "reminder",
  "targetId": "rem_xxx",
  "action": "snooze",
  "value": "30m",
  "createdAt": "2026-04-12T10:00:00Z"
}
```

## 11. 核心页面 ViewModel

### 11.1 首页

```ts
type HomeViewModel = {
  greetingText: string
  todayReminderCount: number
  todayReminderSummary: string
  promptText: string
  recentImportantMemories: MemoryCardViewModel[]
  quickActions: QuickActionItem[]
  isVoiceReplyEnabled: boolean
  isSeniorMode: boolean
  loading: boolean
  errorMessage?: string
}
```

首页关键录音状态：

```ts
type RecordingState = 'idle' | 'recording' | 'uploading' | 'processing' | 'playing' | 'error'
```

### 11.2 回忆页

```ts
type RecallViewModel = {
  activeFilterType: 'time' | 'topic'
  activeTimeRange?: 'today' | 'yesterday' | 'last3days' | 'lastWeek' | 'thisMonth'
  activeTopic?: 'medicine' | 'shopping' | 'travel' | 'family' | 'important'
  summaryText: string
  items: RecallItemViewModel[]
  loading: boolean
  playingAudio: boolean
  errorMessage?: string
}
```

说明：MVP 以时间范围回忆为核心，主题回忆作为数据与接口预留能力。

### 11.3 提醒页

```ts
type RemindersViewModel = {
  dueNow: ReminderCardViewModel[]
  laterToday: ReminderCardViewModel[]
  upcoming: ReminderCardViewModel[]
  loading: boolean
  errorMessage?: string
}
```

### 11.4 设置页

```ts
type SettingsViewModel = {
  seniorMode: boolean
  fontScale: 'medium' | 'large' | 'xlarge'
  voiceReplyEnabled: boolean
  ttsSpeed: 0.75 | 0.85 | 1
  dailyDigestTime: string
  reminderPreference: 'gentle' | 'normal'
  subscriptionAuthorized: boolean
}
```

## 12. 接口规范

建议接口统一返回：

```ts
type ApiResponse<T> = {
  success: boolean
  requestId: string
  data?: T
  error?: {
    code: string
    message: string
  }
}
```

### 12.1 POST /api/v1/voice/upload

用途：上传录音文件

请求：

- file: audio
- durationMs

返回：

```json
{
  "fileId": "cloud://bucket/audio/xxx.mp3"
}
```

### 12.2 POST /api/v1/memory/from-voice

用途：音频识别并保存记忆

请求：

```json
{
  "fileId": "cloud://bucket/audio/xxx.mp3",
  "userId": "u_xxx"
}
```

返回：

```json
{
  "memoryId": "mem_xxx",
  "summary": "晚上要吃降压药",
  "replyText": "我记住了，你晚上要吃降压药",
  "replyAudioFileId": "cloud://bucket/tts/confirm_xxx.mp3",
  "needsReminder": true
}
```

### 12.3 POST /api/v1/memory/from-text

请求：

```json
{
  "userId": "u_xxx",
  "text": "记一下，我想买鸡蛋和牛奶"
}
```

### 12.4 POST /api/v1/recall/query

请求：

```json
{
  "userId": "u_xxx",
  "query": "上周我说了什么"
}
```

返回：

```json
{
  "summary": "上周你记录了三件重要的事，包括吃药、购物和旅游计划。",
  "items": [
    {"memoryId": "mem_1", "summary": "晚上要吃降压药", "timeText": "上周二晚上"},
    {"memoryId": "mem_2", "summary": "想买鸡蛋和牛奶", "timeText": "上周三上午"},
    {"memoryId": "mem_3", "summary": "下个月想去苏州旅游", "timeText": "上周五下午"}
  ],
  "replyAudioFileId": "cloud://bucket/tts/recall_xxx.mp3"
}
```

### 12.5 POST /api/v1/reminder/create

```json
{
  "userId": "u_xxx",
  "title": "晚上吃药",
  "triggerAt": "2026-04-12T20:00:00Z",
  "memoryId": "mem_xxx"
}
```

### 12.6 POST /api/v1/reminder/action

```json
{
  "userId": "u_xxx",
  "reminderId": "rem_xxx",
  "action": "done"
}
```

支持动作：

- done
- snooze_30m
- snooze_tomorrow

### 12.7 GET /api/v1/home/summary

返回：

```json
{
  "greeting": "晚上好",
  "todayReminderCount": 2,
  "todayImportantMemories": [
    "今晚八点吃降压药",
    "记得买牛奶和鸡蛋"
  ],
  "replyAudioFileId": "cloud://bucket/tts/home_xxx.mp3"
}
```

## 13. Mock 数据策略

为支持小程序先行联调，开发阶段必须内置 mock/live 切换能力。

首批 mock 覆盖：

- home summary
- memory from voice
- memory from text
- recall query
- reminders list

mock 样本应至少包含以下表达：

- 我晚上要吃降压药
- 记一下，我想买鸡蛋和牛奶
- 下个月我想去苏州旅游

## 14. 状态管理方案

采用三层状态管理，保持贴近原生小程序能力：

### 14.1 App 全局状态

仅存放：

- 用户信息
- 长者模式配置
- 环境配置

### 14.2 页面级状态

每个页面独立维护：

- loading
- data
- error
- ui state

### 14.3 service 层

通过 `services/` 统一处理：

- 接口请求
- mock/live 切换
- 响应适配
- 错误码映射
- 音频能力封装

约束：

- 页面只消费 ViewModel
- 页面不直接消费后端原始数据
- 录音与播放逻辑单独封装，不能散落页面

## 15. 核心业务流程

### 15.1 语音记录

1. 用户首页按住说话
2. 小程序录音并上传
3. 调用 `/api/v1/memory/from-voice`
4. 后端完成 ASR、解析、入库
5. 返回确认文案与确认音频
6. 小程序自动播报确认内容

### 15.2 回忆上周

1. 用户点击“回顾上周”
2. 调用 `/api/v1/recall/query`
3. 服务端解析时间范围
4. 检索对应记忆
5. 生成摘要与播报
6. 小程序展示结果并可语音播放

### 15.3 处理提醒

1. 首页加载今日提醒摘要
2. 用户点击“听今天提醒”
3. 播放提醒语音
4. 用户点击“完成”或“稍后提醒”
5. 后端更新提醒状态

## 16. MVP 分阶段计划

### 16.1 Phase 0 工程底座

- 初始化微信原生小程序 TypeScript 工程
- 建立 CloudBase 环境接入方案
- 搭建 FastAPI 项目骨架
- 建立 shared contracts 与 mock 数据
- 建立本地联调说明

### 16.2 Phase 1 记录闭环

目标：说出来、记下来、读回来

交付：

- 首页
- 语音记录
- 文字记录
- 自动摘要与分类
- 语音确认播报
- 最近记忆展示

### 16.3 Phase 2 回忆闭环

目标：帮用户按时间想起来

交付：

- 回忆页
- 时间范围回忆
- 回忆结果语音播报
- 首页“回顾上周”入口打通

### 16.4 Phase 3 提醒闭环

目标：到点提醒并能处理动作

交付：

- 提醒页
- 创建提醒
- 首页提醒摘要
- 完成/稍后提醒

### 16.5 Phase 4 体验完善

- 长者模式细化
- 字号与语速设置
- 每日摘要
- 订阅消息接入

## 17. 首周开发计划

### Day 1

- 初始化 monorepo 目录
- 初始化小程序工程
- 搭建 FastAPI 骨架
- 定义共享类型和错误码

### Day 2

- 完成首页静态布局
- 完成长者模式样式基线
- 完成首页 mock 渲染

### Day 3

- 接入录音能力
- 接入音频播放能力
- 完成 `from-voice` mock 联调

### Day 4

- 完成文字补录
- 完成确认播报
- 完成最近记忆刷新
- 补齐异常态

### Day 5

- 接入 CloudBase 登录和用户初始化
- 接入 memories 入库
- 真机联调
- 输出问题清单

## 18. 任务拆解建议

### 18.1 前端

- 页面骨架
- 组件开发
- 页面状态
- 录音与播放适配

### 18.2 CloudBase

- 集合设计
- 云函数骨架
- 鉴权
- 数据访问

### 18.3 AI 服务

- FastAPI 接口
- mock ASR/TTS/Parser
- 响应 schema

### 18.4 联调测试

- 核心流程测试
- 异常路径测试
- 微信开发者工具与真机验证

## 19. 非功能要求

### 19.1 可用性

- 首页主要功能一步可达
- 核心任务不超过两次点击
- 语音优先，文字辅助

### 19.2 性能

- 首页首屏目标小于 2 秒
- 普通语音确认目标小于 6 秒
- 回忆查询目标小于 8 秒

### 19.3 无障碍

- 大字体
- 高对比
- 大触控区域
- 语音回复默认开启

### 19.4 安全与隐私

- 数据按用户隔离
- 音频访问受控
- 支持敏感记忆删除
- 日志不记录完整敏感明文

## 20. 后续扩展建议

在 MVP 验证通过后，优先考虑：

- 家属协助模式
- 家庭版订阅路径
- 每周回顾
- 重要记忆收藏
- 方言与噪音场景识别优化

## 21. 当前结论

记得住项目的正确开局方式，不是先追求最聪明的 AI，而是先把以下三个闭环打磨顺畅：

- 说出来
- 记下来
- 读回来

只要这三个闭环顺，产品就具备继续验证留存、家属协同和商业化路径的基础。
