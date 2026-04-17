# V2 版本规划：Python FastAPI 方案

> 当前为 V1 实现，采用 Node.js + 前后端分离架构
> 本文档记录 V2 版本的备选方案

## V2 方案概述

### 技术栈
- 后端: Python FastAPI（单文件）
- 前端: 单页 HTML + 原生 JS
- 存储: JSON 文件（题库 + 对话历史）
- 模型: DeepSeek API

### 项目结构
```
interview-qa-db/
├── backend.py           # FastAPI 后端
├── config.py           # API 配置
├── requirements.txt    # 依赖
├── data/
│   ├── questions.json  # 题库
│   └── history/        # 对话历史
└── static/
    └── index.html      # 前端页面
```

### API 设计

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | 通用对话 |
| POST | `/api/ask-about-resume` | 简历问答模式 |
| GET | `/api/random-question` | 随机抽题 |
| GET/POST/PUT/DELETE | `/api/questions` | 题库 CRUD |
| GET/DELETE | `/api/history` | 对话历史 |

### 优点
- Python AI/数据处理生态丰富
- FastAPI 自动生成 API 文档
- 单文件后端，简单直接

### 缺点
- 需要维护 Python 环境
- 对于简单 API 略显重量

## 迁移到 V2 的条件
- 当需要更复杂的 AI 功能时
- 当需要更好的类型检查时
- 当团队有 Python 后端开发能力时
