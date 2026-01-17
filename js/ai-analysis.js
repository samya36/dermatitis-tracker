// AI智能分析功能（使用Gemini API）

// 每日使用限额配置
const DAILY_AI_LIMIT = 5; // 每天最多使用5次

// 调用Gemini API进行分析
async function analyzeWithGemini() {
    if (!currentUser) {
        alert('请先登录');
        return;
    }

    // 检查API密钥是否配置
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
        alert('请先配置Gemini API密钥。\n\n1. 访问 https://aistudio.google.com/app/apikey\n2. 获取API密钥\n3. 在 js/config.js 中配置');
        return;
    }

    const aiResultDiv = document.getElementById('ai-analysis-result');
    const aiButton = document.getElementById('ai-analysis-btn');

    // 检查今日使用次数
    const usageCheck = await checkDailyUsage();
    if (!usageCheck.canUse) {
        alert(`⚠️ 今日AI分析次数已用完\n\n每天限制：${DAILY_AI_LIMIT}次\n已使用：${usageCheck.usedCount}次\n明天再来吧！`);
        return;
    }

    // 显示加载状态
    aiButton.disabled = true;
    aiButton.textContent = 'AI分析中...';
    aiResultDiv.innerHTML = '<p style="text-align: center; color: #667eea;">🤖 AI正在分析你的健康数据，请稍候...</p>';

    try {
        // 获取最近30天的数据
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: records, error } = await supabase
            .from('daily_records')
            .select('*')
            .eq('user_id', currentUser.id)
            .gte('record_date', thirtyDaysAgo.toISOString().split('T')[0])
            .order('record_date', { ascending: true });

        if (error) throw error;

        if (!records || records.length < 3) {
            aiResultDiv.innerHTML = '<p style="text-align: center; color: #888;">数据不足。请至少记录3天的数据后再使用AI分析。</p>';
            return;
        }

        // 整理数据为可读格式
        const dataSummary = prepareDataForAI(records);

        // 调用Gemini API
        const analysis = await callGeminiAPI(dataSummary);

        // 记录使用次数
        await recordUsage();

        // 显示分析结果
        displayAIAnalysis(analysis);

        // 更新剩余次数显示
        updateUsageDisplay();

    } catch (error) {
        console.error('AI分析失败:', error);
        aiResultDiv.innerHTML = `<p style="text-align: center; color: #f44;">分析失败: ${error.message}</p>`;
    } finally {
        aiButton.disabled = false;
        aiButton.textContent = '🤖 开始AI智能分析';
    }
}

// 准备数据给AI分析
function prepareDataForAI(records) {
    let summary = `以下是一位神经性皮炎患者最近${records.length}天的健康记录数据：\n\n`;

    records.forEach((record, index) => {
        const date = new Date(record.record_date).toLocaleDateString('zh-CN');
        summary += `【第${index + 1}天 - ${date}】\n`;
        summary += `- 瘙痒程度: ${record.itch_level}/10分\n`;

        if (record.food_items && record.food_items.length > 0) {
            summary += `- 饮食: ${record.food_items.join('、')}`;
            if (record.food_notes) summary += ` (${record.food_notes})`;
            summary += '\n';
        }

        if (record.exercise_type) {
            summary += `- 运动: ${record.exercise_type}, ${record.exercise_duration}分钟, 强度${record.exercise_intensity}\n`;
        }

        if (record.sleep_duration) {
            summary += `- 睡眠: ${record.sleep_duration}小时, 质量${record.sleep_quality}/5分\n`;
        }

        if (record.affected_areas && record.affected_areas.length > 0) {
            summary += `- 受影响部位: ${record.affected_areas.join('、')}\n`;
        }

        summary += `- 心情: ${record.mood}\n`;

        if (record.symptom_notes) {
            summary += `- 备注: ${record.symptom_notes}\n`;
        }

        summary += '\n';
    });

    return summary;
}

// 调用Gemini API
async function callGeminiAPI(dataToAnalyze) {
    const prompt = `${dataToAnalyze}

作为一位专业的健康顾问，请分析以上数据并提供：

1. **数据趋势总结**：瘙痒程度的整体趋势（改善/稳定/恶化）

2. **可能的触发因素**：
   - 从饮食角度分析：哪些食物可能与症状加重相关？
   - 从睡眠角度分析：睡眠质量对症状的影响
   - 从运动角度分析：运动对症状的影响
   - 从情绪角度分析：心情与症状的关系

3. **改善建议**：
   - 饮食建议（应该避免什么，可以多吃什么）
   - 生活习惯建议（睡眠、运动、压力管理等）
   - 其他注意事项

4. **重要提示**：需要特别关注的症状或建议就医的情况

请用中文回答，语气温和专业，给出具体可操作的建议。`;

    const requestBody = {
        contents: [{
            parts: [{
                text: prompt
            }]
        }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
        }
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
        throw new Error('AI未返回分析结果');
    }

    return data.candidates[0].content.parts[0].text;
}

// 显示AI分析结果
function displayAIAnalysis(analysisText) {
    const aiResultDiv = document.getElementById('ai-analysis-result');

    // 将AI的markdown格式文本转换为HTML
    let htmlContent = analysisText
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')  // 粗体
        .replace(/###\s(.+)/g, '<h4 style="color: #667eea; margin-top: 20px; margin-bottom: 10px;">$1</h4>')  // 三级标题
        .replace(/##\s(.+)/g, '<h3 style="color: #667eea; margin-top: 25px; margin-bottom: 15px;">$1</h3>')  // 二级标题
        .replace(/\n-\s/g, '\n• ')  // 列表项
        .replace(/\n\n/g, '</p><p style="line-height: 1.8;">')  // 段落
        .replace(/\n/g, '<br>');  // 换行

    htmlContent = `<p style="line-height: 1.8;">${htmlContent}</p>`;

    aiResultDiv.innerHTML = `
        <div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="display: flex; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #667eea;">
                <span style="font-size: 24px; margin-right: 10px;">🤖</span>
                <h3 style="margin: 0; color: #667eea;">AI智能分析报告</h3>
            </div>
            <div style="color: #333;">
                ${htmlContent}
            </div>
            <div style="margin-top: 25px; padding: 15px; background: #fff9f0; border-radius: 8px; border-left: 4px solid #ffa726;">
                <p style="margin: 0; color: #e67e22; font-size: 14px;">
                    ⚠️ <strong>免责声明：</strong>以上分析仅供参考，不能替代专业医疗建议。如症状严重或持续，请及时就医。
                </p>
            </div>
            <div style="margin-top: 15px; text-align: center; color: #888; font-size: 12px;">
                分析时间: ${new Date().toLocaleString('zh-CN')} | 由 Google Gemini AI 提供支持
            </div>
        </div>
    `;

    // 保存分析结果到数据库（可选）
    saveAIAnalysis(analysisText);
}

// 保存AI分析结果到数据库
async function saveAIAnalysis(analysisText) {
    try {
        // 创建ai_insights表（如果还没有）
        const { error } = await supabase
            .from('ai_insights')
            .insert([{
                user_id: currentUser.id,
                analysis_date: new Date().toISOString().split('T')[0],
                insights: analysisText,
                created_at: new Date().toISOString()
            }]);

        if (error) {
            // 如果表不存在，可能需要先创建表
            console.log('保存AI分析结果时出错（可能表不存在）:', error);
        }
    } catch (error) {
        console.log('保存AI分析结果失败:', error);
    }
}

// 检查今日使用次数
async function checkDailyUsage() {
    const today = new Date().toISOString().split('T')[0];

    try {
        const { data, error } = await supabase
            .from('api_usage')
            .select('usage_count')
            .eq('user_id', currentUser.id)
            .eq('usage_date', today)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
            console.error('检查使用次数失败:', error);
            // 出错时允许使用，避免影响用户体验
            return { canUse: true, usedCount: 0 };
        }

        const usedCount = data ? data.usage_count : 0;
        return {
            canUse: usedCount < DAILY_AI_LIMIT,
            usedCount: usedCount,
            remaining: DAILY_AI_LIMIT - usedCount
        };
    } catch (error) {
        console.error('检查使用次数异常:', error);
        return { canUse: true, usedCount: 0 };
    }
}

// 记录使用次数
async function recordUsage() {
    const today = new Date().toISOString().split('T')[0];

    try {
        // 先查询今天的记录
        const { data: existing } = await supabase
            .from('api_usage')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('usage_date', today)
            .single();

        if (existing) {
            // 更新现有记录
            await supabase
                .from('api_usage')
                .update({
                    usage_count: existing.usage_count + 1,
                    last_used_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id);
        } else {
            // 创建新记录
            await supabase
                .from('api_usage')
                .insert([{
                    user_id: currentUser.id,
                    usage_date: today,
                    usage_count: 1,
                    last_used_at: new Date().toISOString()
                }]);
        }
    } catch (error) {
        console.error('记录使用次数失败:', error);
    }
}

// 更新使用次数显示
async function updateUsageDisplay() {
    const usageCheck = await checkDailyUsage();
    const usageInfo = document.getElementById('ai-usage-info');

    if (usageInfo) {
        const remaining = usageCheck.remaining || 0;
        const used = usageCheck.usedCount || 0;

        let colorClass = '';
        if (remaining <= 0) {
            colorClass = 'color: #f44;';
        } else if (remaining <= 2) {
            colorClass = 'color: #ff9800;';
        } else {
            colorClass = 'color: #4caf50;';
        }

        usageInfo.innerHTML = `
            <span style="${colorClass}">
                今日已使用 ${used}/${DAILY_AI_LIMIT} 次，剩余 ${remaining} 次
            </span>
        `;
    }
}

// 页面加载时显示使用次数
document.addEventListener('DOMContentLoaded', function() {
    // 延迟执行，确保currentUser已加载
    setTimeout(() => {
        if (currentUser && document.getElementById('ai-usage-info')) {
            updateUsageDisplay();
        }
    }, 1000);
});
