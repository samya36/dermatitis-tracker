# 神经性皮炎管理工具

一个帮助神经性皮炎患者记录和分析日常数据的Web应用，帮助你找出症状的触发因素。

## 功能特点

- ✅ 快速记录：饮食、运动、睡眠、症状
- ✅ 语音输入：支持语音记录
- ✅ 数据可视化：趋势图表展示
- ✅ 基础统计：找出相关性模式
- 🤖 **AI智能分析**：使用Google Gemini AI深度分析健康数据，找出触发因素并提供专业建议
- ✅ 云端同步：多设备访问数据
- ✅ 导出报告：生成PDF给医生查看

## 快速开始

### 第一步：注册Supabase账号

Supabase是一个免费的云数据库服务，我们用它来存储你的健康数据。

1. 访问 [https://supabase.com](https://supabase.com)
2. 点击 "Start your project" 注册账号（可以用GitHub账号登录）
3. 创建一个新项目：
   - 项目名称：`dermatitis-tracker`（或任意名称）
   - 数据库密码：设置一个强密码并记住
   - 区域：选择 `Southeast Asia (Singapore)` 或离你最近的区域
   - 点击 "Create new project"，等待2-3分钟项目创建完成

### 第二步：获取Supabase配置信息

1. 在Supabase项目主页，点击左侧菜单的 **Settings**（齿轮图标）
2. 选择 **API** 选项
3. 你会看到两个重要信息：
   - **Project URL**（例如：`https://xxxxx.supabase.co`）
   - **anon public**密钥（一长串字符）
4. 复制这两个信息

### 第三步：配置项目

1. 打开项目文件夹中的 `js/config.js` 文件
2. 将以下内容替换为你的Supabase信息：

```javascript
const SUPABASE_URL = 'https://xxxxx.supabase.co'; // 替换为你的Project URL
const SUPABASE_ANON_KEY = 'eyJhb...'; // 替换为你的anon public密钥
```

### 第四步：配置Gemini AI（可选但推荐）

如果你想使用AI智能分析功能，需要配置Google Gemini API：

1. 访问 [Google AI Studio](https://aistudio.google.com/app/apikey)
2. 使用Google账号登录
3. 点击 **Create API Key** 创建新的API密钥
4. 复制生成的API密钥

5. 在 `js/config.js` 文件中，找到这一行：
   ```javascript
   const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY';
   ```
   替换为：
   ```javascript
   const GEMINI_API_KEY = '你复制的API密钥';
   ```

**重要提示：**
- Gemini API有免费额度（每分钟15次请求）
- 如果不配置，应用仍可正常使用，只是没有AI分析功能
- AI分析可以帮你找出症状触发因素并提供专业建议

### 第五步：创建数据库表

1. 在Supabase项目中，点击左侧菜单的 **SQL Editor**
2. 点击 **New query**
3. 复制以下SQL代码并粘贴：

```sql
-- 创建daily_records表
CREATE TABLE daily_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    record_date DATE NOT NULL,
    record_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 饮食相关
    meal_type TEXT,
    food_items TEXT[],
    food_notes TEXT,

    -- 运动相关
    exercise_type TEXT,
    exercise_duration INTEGER,
    exercise_intensity TEXT,

    -- 睡眠相关
    sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 5),
    sleep_duration DECIMAL(3,1),
    sleep_notes TEXT,

    -- 症状相关
    itch_level INTEGER CHECK (itch_level >= 1 AND itch_level <= 10),
    affected_areas TEXT[],
    symptom_notes TEXT,
    mood TEXT,

    -- 语音输入
    voice_input TEXT,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX idx_daily_records_user_id ON daily_records(user_id);
CREATE INDEX idx_daily_records_date ON daily_records(record_date DESC);

-- 启用Row Level Security (RLS)
ALTER TABLE daily_records ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略：用户只能查看和修改自己的数据
CREATE POLICY "Users can view their own records"
    ON daily_records FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own records"
    ON daily_records FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own records"
    ON daily_records FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own records"
    ON daily_records FOR DELETE
    USING (auth.uid() = user_id);
```

4. 点击 **Run** 按钮执行SQL

### 第六步：运行应用

1. 在项目文件夹中，双击打开 `index.html` 文件（会在浏览器中打开）
2. 或者，推荐使用本地服务器（避免跨域问题）：
   - 如果你安装了Python：
     ```bash
     # Python 3
     python -m http.server 8000

     # Python 2
     python -m SimpleHTTPServer 8000
     ```
   - 或者使用Node.js的http-server：
     ```bash
     npx http-server
     ```
   - 然后在浏览器访问 `http://localhost:8000`

3. 注册一个新账号并登录

## 使用指南

### 记录数据

1. 登录后会看到"今日记录"标签页
2. 填写当天的数据：
   - **饮食**：选择餐次，点击常用食物按钮或手动输入
   - **运动**：选择运动类型和时长
   - **睡眠**：评分1-5，输入睡眠时长
   - **症状**：拖动滑块评估瘙痒程度（1-10），选择受影响部位
3. 点击"保存记录"

### 查看历史

- 切换到"历史记录"标签页
- 查看所有历史记录和趋势图表

### 统计分析

- 切换到"统计分析"标签页
- 查看症状与饮食、运动、睡眠的相关性分析

### AI智能分析

1. 切换到"统计分析"标签页
2. 滚动到底部，点击"🤖 开始AI智能分析"按钮
3. AI将分析你的数据并提供：
   - 数据趋势总结
   - 可能的触发因素（饮食、睡眠、运动、情绪）
   - 个性化改善建议
   - 需要注意的症状或就医建议
4. 分析结果可以参考，但不能替代医生建议

**注意**：
- 至少需要3天的记录数据才能使用AI分析
- 数据越多，分析越准确（建议至少7天）
- 需要配置Gemini API才能使用（参见配置步骤）

### 导出报告

- 在"历史记录"页面点击"导出PDF"
- 生成的报告可以打印或发送给医生

## 项目结构

```
dermatitis-tracker/
├── index.html          # 登录/注册页面
├── app.html           # 应用主界面
├── css/
│   └── style.css      # 样式文件
├── js/
│   ├── config.js      # Supabase配置
│   ├── auth.js        # 认证逻辑
│   ├── record.js      # 记录功能
│   ├── display.js     # 数据展示
│   └── stats.js       # 统计分析
└── README.md          # 本文件
```

## 隐私和安全

- ✅ 所有数据仅你本人可见（通过Supabase RLS保护）
- ✅ 数据加密存储在Supabase云端
- ✅ 不会分享你的任何数据给第三方
- ✅ 你可以随时删除自己的账号和所有数据

## 技术栈

- **前端**：纯HTML + CSS + JavaScript（无构建工具）
- **数据库**：Supabase（PostgreSQL）
- **图表**：Chart.js
- **PDF导出**：jsPDF

## 常见问题

### Q: 为什么需要注册Supabase？

A: Supabase提供免费的云数据库服务，让你的数据可以在多个设备间同步，并且永久保存。完全免费，无需信用卡。

### Q: 数据安全吗？

A: 非常安全。我们使用Supabase的Row Level Security (RLS)功能，确保只有你本人可以访问自己的数据。

### Q: 可以离线使用吗？

A: 目前需要联网使用。未来版本可能会添加离线支持。

### Q: 如何备份数据？

A: 你可以在Supabase控制台导出数据，或使用应用的导出PDF功能。

### Q: 如何部署到互联网？

A: 你可以使用免费的托管服务：
- **Vercel**: [https://vercel.com](https://vercel.com)
- **Netlify**: [https://netlify.com](https://netlify.com)
- **GitHub Pages**: [https://pages.github.com](https://pages.github.com)

详细部署教程请参考这些平台的文档。

## 下一步计划

- [ ] 添加AI分析功能（需要Claude API）
- [ ] 添加提醒功能
- [ ] 添加离线支持
- [ ] 支持导入历史数据
- [ ] 多语言支持

## 反馈和建议

如果你有任何问题或建议，欢迎提出！

## 许可证

MIT License - 自由使用和修改
