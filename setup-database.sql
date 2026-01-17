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

-- 创建API使用记录表（用于限制AI分析次数）
CREATE TABLE IF NOT EXISTS api_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 确保每个用户每天只有一条记录
    UNIQUE(user_id, usage_date)
);

-- 创建索引
CREATE INDEX idx_api_usage_user_date ON api_usage(user_id, usage_date);

-- 启用Row Level Security
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- RLS策略：用户只能查看和修改自己的记录
CREATE POLICY "Users can view their own api usage"
    ON api_usage FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own api usage"
    ON api_usage FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own api usage"
    ON api_usage FOR UPDATE
    USING (auth.uid() = user_id);
