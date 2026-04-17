# Interview QA DB

一个基于 AI 的面试练习系统，支持多种技术领域的面试题目练习、AI 评价和报告生成。

## 功能特性

- **题库管理**：支持多分类题目（Java集合、Java并发、Redis、SpringBoot、MySQL、JVM、ElasticSearch等）
- **AI 生成题目**：根据用户简历和方向定制面试题
- **AI 评价回答**：实时点评用户回答，给出分数和改进建议
- **追问机制**：根据回答质量进行深入追问
- **练习报告**：生成详细的掌握情况报告和改进建议
- **Markdown 导出**：支持导出题库和报告为 Markdown 格式

## 技术栈

- **后端**：Node.js + Express.js
- **前端**：原生 HTML/CSS/JavaScript（无框架）
- **AI 服务**：DeepSeek API
- **数据存储**：JSON 文件（轻量级，无需数据库）

## 项目结构

```
interview-qa-db/
├── server.js              # Express 服务器主文件
├── package.json            # npm 依赖配置
├── .env.example           # 环境变量示例
├── static/
│   └── index.html         # 前端页面（单页应用）
├── data/
│   ├── questions.json     # 题库数据
│   ├── config.json        # 用户配置（简历、自定义方向）
│   ├── practice-sessions/ # 练习会话存储
│   └── exports/           # 导出的报告
└── README.md              # 本文档
```

## 快速启动

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，并填入 DeepSeek API Key：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
PORT=3000
```

### 3. 启动服务器

```bash
node server.js
```

服务器启动后访问：http://localhost:3000

## 维护指南

### 题库管理

题库数据存储在 `data/questions.json`，结构如下：

```json
{
  "version": "1.0",
  "categories": ["Java集合", "Java并发", "Redis"],
  "questions": [
    {
      "id": "unique-id",
      "category": "Java集合",
      "question": "HashMap 的实现原理？",
      "answer": "参考答案...",
      "difficulty": "medium",
      "tags": ["HashMap", "数据结构"],
      "source": "预设"
    }
  ]
}
```

**手动添加题目**：
直接编辑 `data/questions.json`，在对应分类下添加新题目。

**通过 API 添加**：
```bash
curl -X POST http://localhost:3000/api/questions \
  -H "Content-Type: application/json" \
  -d '{"category":"Java集合","question":"新题目","answer":"答案","difficulty":"medium"}'
```

### 练习会话

会话数据存储在 `data/practice-sessions/` 目录下，每个会话一个 JSON 文件。

**查看历史会话**：
```bash
curl http://localhost:3000/api/practice/history
```

**查看会话详情**：
```bash
curl http://localhost:3000/api/practice/history/{sessionId}
```

**删除会话**：
```bash
curl -X DELETE http://localhost:3000/api/practice/history/{sessionId}
```

### 配置管理

用户配置（简历、自定义方向）存储在 `data/config.json`。

```json
{
  "resume": "用户简历内容...",
  "customDirections": ["想重点练习的方向1", "方向2"]
}
```

## API 接口

### 题库相关

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/questions` | 获取题库 |
| GET | `/api/questions/categories` | 获取分类统计 |
| POST | `/api/questions` | 添加题目 |
| PUT | `/api/questions/:id` | 更新题目 |
| DELETE | `/api/questions/:id` | 删除题目 |
| GET | `/api/questions/export` | 导出题库（?format=markdown） |

### 练习相关

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/practice/start` | 开始练习 |
| GET | `/api/practice/:id/question` | 获取当前题目 |
| POST | `/api/practice/:id/answer` | 提交回答 |
| GET | `/api/practice/:id/evaluation` | 获取评价 |
| POST | `/api/practice/:id/finish` | 结束练习 |
| GET | `/api/practice/:id/report` | 获取报告 |
| GET | `/api/practice/:id/export` | 导出报告（?format=markdown） |
| GET | `/api/practice/history` | 获取历史记录 |

### 配置相关

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/config` | 获取配置 |
| POST | `/api/config` | 保存配置 |

## 练习流程

1. **开始练习**：选择分类和题目数量，系统按难度分布选题
2. **回答问题**：阅读题目，输入回答，提交
3. **AI 评价**：AI 实时点评，给出分数和建议
4. **追问（如需要）**：AI 根据回答质量决定是否追问
5. **继续下一题**：重复步骤 2-4，直到所有题目完成
6. **生成报告**：汇总所有评价，生成详细报告和改进建议

## 开发相关

### 端口修改

修改 `.env` 文件中的 `PORT` 值，或启动时指定：

```bash
PORT=8080 node server.js
```

### 前端调试

前端代码在 `static/index.html` 中，为单文件应用，无需构建。

### 日志查看

控制台输出服务器日志，包括：
- 题目生成
- 回答评价
- API 错误

### 数据备份

题库和会话数据均为 JSON 文件，可直接备份 `data/` 目录。

## 常见问题

**Q: AI 评价失败？**
A: 检查 `.env` 中的 `DEEPSEEK_API_KEY` 是否正确配置。

**Q: 题目无法加载？**
A: 检查 `data/questions.json` 是否存在且格式正确。

**Q: 练习中途卡住？**
A: 刷新页面重新开始，或查看 `data/practice-sessions/` 删除残留会话。

## 版本历史

### v1.0 (当前版本)
- 基础题库管理功能
- AI 生成面试题
- AI 评价回答
- 追问机制
- 练习报告生成与导出
