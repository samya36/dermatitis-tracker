-- 创建API使用记录表
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
