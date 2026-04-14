# 记得住 微信小程序 Implementation Plan

## 1. 文档目标

本计划用于将 MVP Spec 转化为可执行研发任务，优先覆盖：

- Phase 0 工程底座
- Phase 1 记录闭环

计划默认约束：

- 以微信原生小程序为第一约束
- 前端与数据结构按上线标准设计
- AI 与消息能力先以 mock 和可替换接口推进

## 2. 实施策略

采用以下总体策略：

- 架构先定边界
- 开发按场景闭环推进
- AI 与消息先 mock 后替换

执行顺序：

1. 建立 monorepo 结构与共享契约
2. 打通首页记录闭环
3. 补齐时间回忆能力
4. 补齐提醒能力
5. 完成长者模式和消息增强

## 3. 里程碑

### M0 工程可运行

验收标准：

- 小程序工程可在微信开发者工具运行
- FastAPI 服务可本地启动
- mock 接口可返回固定数据
- 目录结构、类型、错误码已建立

### M1 记录闭环可演示

验收标准：

- 首页可录音
- 录音后能走上传与 mock 识别
- 能返回摘要与确认话术
- 能自动播报确认
- 首页可展示最近 3 条记忆

### M2 时间回忆可演示

验收标准：

- 回忆页可按时间范围查询
- 能返回摘要与列表
- 能播报回忆结果

### M3 提醒闭环可演示

验收标准：

- 可创建提醒
- 首页可展示今日提醒摘要
- 提醒页可完成或稍后提醒

## 4. 仓库初始化任务

### 4.1 目录创建

需要创建：

- `miniprogram/`
- `cloudfunctions/`
- `ai-service/`
- `shared/`
- `docs/specs/`

### 4.2 工程初始化

#### miniprogram

- 初始化微信原生小程序 TypeScript 项目
- 配置 `app.json` 页面路由
- 配置全局样式变量
- 配置开发环境与 mock 开关

#### ai-service

- 初始化 Python FastAPI 项目
- 配置 `requirements.txt`
- 配置 `Dockerfile`
- 提供 `/health` 接口

#### shared

- 建立通用类型定义
- 建立错误码定义
- 建立枚举与 mock 数据

## 5. Phase 0 详细任务

### 5.1 共享契约

任务：

- 定义 `ApiResponse<T>`
- 定义 `User / Memory / Reminder / VoiceReply / FeedbackEvent` 类型
- 定义 `memoryType`、`timeScope`、`reminderAction` 枚举
- 建立 mock 响应数据

产出：

- `shared/schemas/`
- `shared/constants/`
- `shared/mocks/`

### 5.2 小程序基础能力

任务：

- 建立页面目录：`home / recall / reminders / settings`
- 建立组件目录
- 建立服务层目录
- 建立全局配置与主题 token

产出：

- 页面空壳可访问
- 公共组件占位可渲染

### 5.3 CloudBase 接入预留

任务：

- 明确环境变量与环境 ID 配置方式
- 设计 `openid -> userId` 初始化逻辑
- 建立云函数目录骨架

说明：

Phase 0 只建立骨架与约定，不强制当天接通全部真实能力。

### 5.4 FastAPI 骨架

任务：

- 创建 `main.py`
- 创建 `api/` 路由模块
- 创建 `schemas/` 请求响应模型
- 创建 `services/` mock 服务

首批接口：

- `GET /health`
- `POST /api/v1/memory/from-voice`
- `POST /api/v1/memory/from-text`
- `POST /api/v1/recall/query`

## 6. Phase 1 详细任务

### 6.1 首页页面开发

任务：

- 实现顶部问候区
- 实现今日提醒摘要横幅
- 实现超大录音按钮
- 实现四个快捷入口
- 实现最近 3 条记忆卡片
- 实现文字补录入口

验收标准：

- 首页静态内容完整
- mock 数据可驱动页面
- 长者模式样式默认生效

### 6.2 录音能力封装

任务：

- 封装录音管理器
- 支持按住开始、松开结束
- 支持录音中视觉反馈
- 支持录音取消与错误提示

注意点：

- 必须基于微信小程序录音 API
- 不按浏览器录音方式设计

### 6.3 上传与处理链路

任务：

- 封装音频上传服务
- 封装 `memory/from-voice` 调用
- 支持 mock / live 双模式
- 统一处理上传失败、接口失败、超时失败

状态流：

- `idle`
- `recording`
- `uploading`
- `processing`
- `playing`
- `error`

### 6.4 确认播报能力

任务：

- 封装音频播放器
- 支持自动播放确认音频
- 支持暂停与重播
- 支持播放失败反馈

### 6.5 文字补录

任务：

- 提供简单文本输入弹层或次级入口
- 调用 `memory/from-text`
- 刷新首页最近记忆
- 返回温和确认文案

### 6.6 最近记忆刷新

任务：

- 首页展示最新 3 条重要记忆
- 保存成功后局部刷新
- 支持空态与加载态

## 7. 页面与组件任务映射

### 页面

- `pages/home/`：Phase 1 主战场
- `pages/recall/`：Phase 2 主战场
- `pages/reminders/`：Phase 3 主战场
- `pages/settings/`：Phase 4 主战场

### 组件

- `voice-record-button/`：录音主入口
- `audio-reply-player/`：播报能力
- `summary-banner/`：首页提醒摘要
- `memory-card/`：记忆卡片
- `reminder-card/`：提醒项
- `quick-recall-grid/`：快捷入口
- `senior-mode-layout/`：长者模式容器

## 8. 服务层任务映射

建议创建以下服务：

- `services/homeService.ts`
- `services/memoryService.ts`
- `services/recallService.ts`
- `services/reminderService.ts`
- `services/audioService.ts`
- `services/recorderService.ts`
- `services/uploadService.ts`

职责：

- 发起请求
- 适配返回结构
- 处理 mock/live 切换
- 映射错误码

## 9. mock 策略

### 9.1 mock 目标

保证在 CloudBase 与 AI 服务未完全接通前，小程序仍能独立联调主流程。

### 9.2 mock 内容

- 首页摘要
- 语音记忆创建
- 文本记忆创建
- 时间回忆查询
- 提醒列表

### 9.3 样本语料

- 我晚上要吃降压药
- 记一下，我想买鸡蛋和牛奶
- 下个月我想去苏州旅游

### 9.4 mock 切换

采用配置控制：

- `env = mock`
- `env = live`

页面层不得手写分支切换。

## 10. 建议分工

### 前端

- 小程序工程
- 页面组件
- 录音播放
- 页面状态流

### 后端 / 云开发

- CloudBase 集合
- 云函数
- 用户初始化
- 数据写入与查询

### AI 服务

- FastAPI
- mock parser
- mock tts
- 后续真实 ASR/TTS 替换

### 测试 / 产品

- 场景验收
- 文案校对
- 真机体验验证

## 11. 首周排期

### Day 1

- 建立目录结构
- 初始化小程序工程
- 初始化 FastAPI 工程
- 初始化 shared 契约

### Day 2

- 首页静态搭建
- 长者模式基础主题
- 组件占位开发
- 首页 mock 渲染

### Day 3

- 接入录音能力
- 接入音频播放能力
- 打通 mock 语音记忆创建

### Day 4

- 补齐文字补录
- 补齐最近记忆刷新
- 补齐错误态

### Day 5

- 接入用户初始化
- 接入 memories 入库
- 真机联调
- 输出问题列表

## 12. 风险与应对

### 风险 1：录音与上传链路在真机表现不稳定

应对：

- 优先真机验证
- 录音、上传、播放分别封装并可单独调试

### 风险 2：AI mock 与真服务字段漂移

应对：

- 共享 schema 先行
- 所有接口返回先过 adapter

### 风险 3：页面过早复杂化

应对：

- Phase 1 只做首页主闭环
- 不提前扩展复杂搜索与协同能力

## 13. Phase 1 完成定义

以下路径完整跑通，即视为 Phase 1 达标：

`打开首页 -> 按住说话 -> 结束录音 -> 上传 -> 返回“我记住了” -> 自动播报 -> 首页出现新记忆卡片`

这是产品从 0 到 1 的第一个成立闭环。
