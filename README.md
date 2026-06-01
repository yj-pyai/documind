# DocuMind — AI 智能知识库问答平台

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.13-blue)](https://www.python.org/)

基于 **RAG（检索增强生成）** 技术栈的智能知识库平台。上传你的 PDF、Word 或 Markdown 文档，AI 即刻理解全部内容，提供精准的语义搜索与带来源引用的智能问答。

## 🎯 核心功能

- 📄 **多格式文档管理** — 支持 PDF、Word、Markdown、TXT，拖拽上传，自动解析
- 🧠 **智能分块与向量化** — 语义感知文本分块 + 向量嵌入 + 相似度检索
- 💬 **RAG 智能问答** — 基于文档内容的精准问答，每个回答标注引用来源
- 🔍 **语义搜索** — 理解查询意图，搜索最相关内容片段
- 📊 **知识库管理** — 创建多个知识库，按主题组织文档
- 🌐 **流式响应** — SSE 实时流式输出，首字响应快速
- 🌙 **深色模式** — 内置浅色/深色主题切换
- 📱 **响应式设计** — 适配桌面和移动端

## 🏗️ 技术架构

```
浏览器 (Next.js 16 SSR + 客户端)
        │
        ▼
  Next.js 16 App Router
  ├── React Server Components
  ├── Client Components (Chat, Dashboard)
  └── API Routes (BFF Proxy → FastAPI)
        │
        ▼
  Python FastAPI
  ├── Document Parsing (PyMuPDF, python-docx)
  ├── Text Chunking (semantic sliding window)
  ├── Vector Embeddings (hash-based, pgvector-ready)
  ├── RAG Pipeline (search → build prompt → generate)
  └── DeepSeek API (LLM chat + streaming)

   Database: SQLite (dev) / PostgreSQL + pgvector (prod)
```

## 🚀 快速开始

### 环境要求

- Python 3.11+
- Node.js 20+
- DeepSeek API Key ([获取地址](https://platform.deepseek.com))

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/documind.git
cd documind
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入你的 DeepSeek API Key
```

`.env` 文件内容：

```env
DATABASE_URL=sqlite+aiosqlite:///./documind.db
SECRET_KEY=your-random-secret-key
DEEPSEEK_API_KEY=sk-your-api-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com
ENVIRONMENT=development
DEBUG=true
```

### 3. 启动后端

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

后端运行在 http://localhost:8000

API 文档: http://localhost:8000/docs

### 4. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端运行在 http://localhost:3000

### 5. 使用 Docker（生产部署）

```bash
docker compose up -d
```

## 📁 项目结构

```
documind/
├── README.md
├── .env.example
├── docker-compose.yml
│
├── backend/                    # Python FastAPI
│   ├── app/
│   │   ├── main.py            # 应用入口
│   │   ├── config.py          # 配置管理
│   │   ├── database.py        # 数据库连接
│   │   ├── models/            # ORM 模型
│   │   ├── schemas/           # Pydantic 验证
│   │   ├── routers/           # API 路由
│   │   ├── services/          # 业务逻辑
│   │   │   ├── auth_service.py
│   │   │   ├── document_service.py  # 文档处理管线
│   │   │   ├── rag_service.py       # RAG 核心
│   │   │   ├── embedding_service.py # 向量嵌入
│   │   │   └── llm_service.py       # DeepSeek API
│   │   ├── core/
│   │   │   ├── chunker.py     # 文本分块引擎
│   │   │   ├── parser.py      # 文档解析器
│   │   │   └── prompts.py     # RAG Prompt 模板
│   │   └── middleware/
│   │       └── auth.py        # JWT 认证
│   └── tests/
│
├── frontend/                   # Next.js 16 + React 19
│   └── src/
│       ├── app/               # App Router 页面
│       │   ├── layout.tsx
│       │   ├── page.tsx       # Landing page
│       │   ├── (auth)/        # 登录/注册
│       │   ├── (dashboard)/   # 工作台布局
│       │   │   ├── dashboard/ # 首页工作台
│       │   │   ├── kb/        # 知识库管理
│       │   │   ├── conversations/ # 对话历史
│       │   │   └── settings/  # 个人设置
│       │   └── api/           # BFF API Proxy
│       ├── components/        # React 组件
│       ├── hooks/             # 自定义 Hooks
│       └── lib/               # API 客户端 & 工具
│
└── docker/                    # Docker 配置
```

## 🔌 API 概览

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| GET | `/api/auth/me` | 当前用户信息 |
| POST | `/api/knowledge-bases` | 创建知识库 |
| GET | `/api/knowledge-bases` | 知识库列表 |
| GET | `/api/knowledge-bases/:id` | 知识库详情 |
| PUT | `/api/knowledge-bases/:id` | 更新知识库 |
| DELETE | `/api/knowledge-bases/:id` | 删除知识库 |
| POST | `/api/knowledge-bases/:id/documents` | 上传文档 |
| GET | `/api/knowledge-bases/:id/documents` | 文档列表 |
| DELETE | `/api/knowledge-bases/:id/documents/:did` | 删除文档 |
| POST | `/api/knowledge-bases/:id/chat` | RAG 问答 (SSE) |
| GET | `/api/conversations` | 对话列表 |
| GET | `/api/conversations/:id` | 对话详情 |
| DELETE | `/api/conversations/:id` | 删除对话 |
| GET | `/api/knowledge-bases/:id/search?q=` | 语义搜索 |
| GET | `/api/health` | 健康检查 |

## 🧠 RAG 核心流程

```
用户提问 → 向量化问题 → pgvector 语义检索 Top-K
    → 构建 Prompt：系统指令 + 检索片段 + 对话历史 + 用户问题
    → DeepSeek Chat API 流式生成回答
    → SSE 逐 Token 推送 + 引用标记 [1] [2]
    → 保存完整消息到数据库
```

## 🔜 路线图

- [ ] pgvector 升级（从 hash-based 到真实 embedding）
- [ ] 对话重命名
- [ ] 文档预览
- [ ] 知识库导出
- [ ] 多用户协作
- [ ] OCR 图片文字识别
- [ ] 音视频转录
- [ ] LangChain 集成

## 📄 License

MIT License © 2026 yj-pyai
