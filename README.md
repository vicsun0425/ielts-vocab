# 雅思词汇工具 (IELTS Vocabulary Tool)

一个帮助你从英文文章中提取生词的学习工具。粘贴文章或上传截图，自动识别超出初中水平的单词，提供音标、中英释义、例句和英式发音。

## 功能特点

- **文本分析** — 粘贴英文文章，自动过滤初中水平词汇，只列出新单词
- **OCR 截图识别** — 上传截图或粘贴图片，自动提取文字
- **单词卡片** — 每个单词展示：音标、词性、英文释义、中文翻译、例句
- **英式发音** — 点击 UK 按钮播放英音（macOS 内置语音合成）
- **日历管理** — 按日期保存和查看历史文章
- **离线导出** — 导出为单个 HTML 文件，内嵌音频数据，无需网络即可播放发音
- **本地数据库** — PostgreSQL 存储所有文章和单词数据

## 技术栈

- **前端框架**: Next.js 16 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **数据库**: PostgreSQL (本地)
- **OCR**: Tesseract.js
- **发音**: macOS `say` 命令 (Daniel 英音)

## 快速开始

### 前置要求

- Node.js 20+
- PostgreSQL 14+
- macOS（发音功能依赖 macOS 的 `say` 命令）

### 安装

```bash
# 克隆仓库
git clone https://github.com/vicsun0425/ielts-vocab.git
cd ielts-vocab

# 安装依赖
npm install

# 创建数据库
createdb ielts_vocab

# 启动开发服务器
npm run dev
```

打开 http://localhost:3000 即可使用。

## 数据库结构

```sql
CREATE TABLE articles (
  id         SERIAL PRIMARY KEY,
  title      TEXT      NOT NULL DEFAULT '',
  content    TEXT      NOT NULL,
  words      JSONB     NOT NULL DEFAULT '[]',
  date       DATE      NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | SERIAL | 主键，自增 |
| `title` | TEXT | 文章标题（前50个字符） |
| `content` | TEXT | 文章原文 |
| `words` | JSONB | 单词数据数组 |
| `date` | DATE | 文章日期 |
| `created_at` | TIMESTAMP | 创建时间 |

### words 字段结构示例

```json
[
  {
    "word": "proliferation",
    "phonetic": "/prəˌlɪfəreɪʃən/",
    "definition": "The process by which an organism produces others of its kind.",
    "definitionZh": "生物产生同类的过程；繁殖。",
    "example": "",
    "pos": "noun"
  }
]
```

## 导出格式

### Export (Web) — 轻量版
纯 HTML 文件，使用浏览器 Web Speech API 发音，文件体积小。

### Export (Audio) — 离线完整版
单个 HTML 文件，内嵌所有单词的 `.m4a` 音频（base64 编码）。完全离线可用，发给别人用浏览器打开就能点击听发音。

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/analyze` | 分析文本，返回新单词列表 |
| GET | `/api/articles?date=YYYY-MM-DD` | 获取指定日期的文章 |
| POST | `/api/articles` | 保存文章 |
| DELETE | `/api/articles?id=N` | 删除文章 |
| GET | `/api/articles?export=html` | 导出所有单词为 HTML |
| POST | `/api/export` | 导出指定单词列表为带音频的 HTML |

## 项目结构

```
src/
  app/
    page.tsx                    # 首页（服务端组件）
    layout.tsx                  # 根布局
    api/
      analyze/route.ts          # 文本分析接口
      articles/route.ts         # 文章 CRUD 接口
      export/route.ts           # 导出接口
  components/
    client-app.tsx              # 主客户端组件
    calendar.tsx                # 日历组件
    word-list.tsx               # 单词列表组件
    ocr-upload.tsx              # OCR 上传组件
  lib/
    dictionary.ts               # 单词提取 + 词典 API
    known-words.ts              # 初中水平词汇表
    db.ts                       # 数据库操作
    pdf-export.ts               # HTML 导出（含音频嵌入）
```

## License

MIT
