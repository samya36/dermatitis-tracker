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
