// 统计分析功能

async function loadStats() {
    if (!currentUser) return;

    const statsContent = document.getElementById('stats-content');
    statsContent.innerHTML = '<p style="text-align: center; color: #888;">分析中...</p>';

    try {
        // 获取最近30天的数据
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data, error } = await supabase
            .from('daily_records')
            .select('*')
            .eq('user_id', currentUser.id)
            .gte('record_date', thirtyDaysAgo.toISOString().split('T')[0])
            .order('record_date', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            statsContent.innerHTML = '<p style="text-align: center; color: #888;">数据不足，至少需要几天的记录才能进行分析</p>';
            return;
        }

        // 进行统计分析
        const insights = analyzeData(data);

        // 显示分析结果
        displayInsights(insights, data.length);
    } catch (error) {
        console.error('分析失败:', error);
        statsContent.innerHTML = '<p style="text-align: center; color: #f44;">分析失败: ' + error.message + '</p>';
    }
}

// 分析数据
function analyzeData(records) {
    const insights = {
        avgItch: 0,
        avgSleep: 0,
        foodCorrelations: {},
        sleepCorrelation: null,
        exerciseCorrelation: null,
        moodCorrelation: null,
        totalRecords: records.length
    };

    // 计算平均值
    insights.avgItch = (records.reduce((sum, r) => sum + r.itch_level, 0) / records.length).toFixed(1);
    insights.avgSleep = (records.reduce((sum, r) => sum + r.sleep_quality, 0) / records.length).toFixed(1);

    // 分析食物相关性
    const foodItchMap = {};
    records.forEach(record => {
        if (record.food_items && record.food_items.length > 0) {
            record.food_items.forEach(food => {
                if (!foodItchMap[food]) {
                    foodItchMap[food] = { count: 0, totalItch: 0 };
                }
                foodItchMap[food].count++;
                foodItchMap[food].totalItch += record.itch_level;
            });
        }
    });

    // 计算每种食物的平均瘙痒程度
    for (const food in foodItchMap) {
        const avgItch = foodItchMap[food].totalItch / foodItchMap[food].count;
        if (foodItchMap[food].count >= 2) { // 至少出现2次才统计
            insights.foodCorrelations[food] = {
                avgItch: avgItch.toFixed(1),
                count: foodItchMap[food].count
            };
        }
    }

    // 分析睡眠与症状的相关性
    const sleepGroups = {
        good: [], // 睡眠质量4-5分
        poor: []  // 睡眠质量1-2分
    };

    records.forEach(record => {
        if (record.sleep_quality >= 4) {
            sleepGroups.good.push(record.itch_level);
        } else if (record.sleep_quality <= 2) {
            sleepGroups.poor.push(record.itch_level);
        }
    });

    if (sleepGroups.good.length > 0 && sleepGroups.poor.length > 0) {
        const avgItchGoodSleep = sleepGroups.good.reduce((a, b) => a + b, 0) / sleepGroups.good.length;
        const avgItchPoorSleep = sleepGroups.poor.reduce((a, b) => a + b, 0) / sleepGroups.poor.length;
        insights.sleepCorrelation = {
            goodSleep: avgItchGoodSleep.toFixed(1),
            poorSleep: avgItchPoorSleep.toFixed(1),
            difference: (avgItchPoorSleep - avgItchGoodSleep).toFixed(1)
        };
    }

    // 分析运动与症状的相关性
    const exerciseGroups = {
        yes: [],
        no: []
    };

    records.forEach(record => {
        if (record.exercise_type && record.exercise_type !== '') {
            exerciseGroups.yes.push(record.itch_level);
        } else {
            exerciseGroups.no.push(record.itch_level);
        }
    });

    if (exerciseGroups.yes.length > 0 && exerciseGroups.no.length > 0) {
        const avgItchWithExercise = exerciseGroups.yes.reduce((a, b) => a + b, 0) / exerciseGroups.yes.length;
        const avgItchNoExercise = exerciseGroups.no.reduce((a, b) => a + b, 0) / exerciseGroups.no.length;
        insights.exerciseCorrelation = {
            withExercise: avgItchWithExercise.toFixed(1),
            noExercise: avgItchNoExercise.toFixed(1),
            difference: (avgItchNoExercise - avgItchWithExercise).toFixed(1)
        };
    }

    // 分析心情与症状的相关性
    const moodGroups = {
        good: [],
        bad: []
    };

    records.forEach(record => {
        if (record.mood === 'good') {
            moodGroups.good.push(record.itch_level);
        } else if (record.mood === 'bad') {
            moodGroups.bad.push(record.itch_level);
        }
    });

    if (moodGroups.good.length > 0 && moodGroups.bad.length > 0) {
        const avgItchGoodMood = moodGroups.good.reduce((a, b) => a + b, 0) / moodGroups.good.length;
        const avgItchBadMood = moodGroups.bad.reduce((a, b) => a + b, 0) / moodGroups.bad.length;
        insights.moodCorrelation = {
            goodMood: avgItchGoodMood.toFixed(1),
            badMood: avgItchBadMood.toFixed(1)
        };
    }

    return insights;
}

// 显示分析结果
function displayInsights(insights, totalRecords) {
    const statsContent = document.getElementById('stats-content');

    let html = `
        <div style="background: #e8ecff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #667eea; margin-bottom: 15px;">📊 数据概览（最近30天）</h3>
            <p><strong>总记录数：</strong>${totalRecords} 条</p>
            <p><strong>平均瘙痒程度：</strong>${insights.avgItch} 分（满分10分）</p>
            <p><strong>平均睡眠质量：</strong>${insights.avgSleep} 分（满分5分）</p>
        </div>
    `;

    // 睡眠相关性
    if (insights.sleepCorrelation) {
        const diff = parseFloat(insights.sleepCorrelation.difference);
        const advice = diff > 0 ? '睡眠质量差时症状更严重' : '睡眠质量好时症状反而更严重（这不太常见）';
        const icon = diff > 0 ? '⚠️' : '💡';

        html += `
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #667eea;">
                <h3 style="color: #667eea; margin-bottom: 15px;">😴 睡眠与症状关系</h3>
                <p><strong>睡眠质量好（4-5分）时：</strong>平均瘙痒 ${insights.sleepCorrelation.goodSleep} 分</p>
                <p><strong>睡眠质量差（1-2分）时：</strong>平均瘙痒 ${insights.sleepCorrelation.poorSleep} 分</p>
                <p style="margin-top: 15px; padding: 10px; background: #f9f9f9; border-radius: 4px;">
                    ${icon} <strong>发现：</strong>${advice}
                </p>
            </div>
        `;
    }

    // 运动相关性
    if (insights.exerciseCorrelation) {
        const diff = parseFloat(insights.exerciseCorrelation.difference);
        const advice = diff > 0 ? '运动可能有助于缓解症状' : '运动后症状可能加重（可能是出汗导致）';
        const icon = diff > 0 ? '✓' : '⚠️';

        html += `
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #4c9;
                <h3 style="color: #4c9; margin-bottom: 15px;">🏃 运动与症状关系</h3>
                <p><strong>有运动时：</strong>平均瘙痒 ${insights.exerciseCorrelation.withExercise} 分</p>
                <p><strong>无运动时：</strong>平均瘙痒 ${insights.exerciseCorrelation.noExercise} 分</p>
                <p style="margin-top: 15px; padding: 10px; background: #f9f9f9; border-radius: 4px;">
                    ${icon} <strong>发现：</strong>${advice}
                </p>
            </div>
        `;
    }

    // 食物相关性
    if (Object.keys(insights.foodCorrelations).length > 0) {
        // 按平均瘙痒程度排序
        const sortedFoods = Object.entries(insights.foodCorrelations)
            .sort((a, b) => parseFloat(b[1].avgItch) - parseFloat(a[1].avgItch));

        const topWorst = sortedFoods.slice(0, 5);
        const topBest = sortedFoods.slice(-5).reverse();

        html += `
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f44;">
                <h3 style="color: #f44; margin-bottom: 15px;">🍽️ 食物与症状关系</h3>
                <p style="color: #666; margin-bottom: 15px;">以下食物在记录中出现时的平均瘙痒程度：</p>

                <div style="margin-bottom: 20px;">
                    <h4 style="color: #f44; font-size: 16px; margin-bottom: 10px;">⚠️ 需要注意的食物</h4>
                    ${topWorst.map(([food, data]) => `
                        <p style="padding: 8px; background: #fff5f5; border-radius: 4px; margin-bottom: 5px;">
                            <strong>${food}：</strong>${data.avgItch}分（记录${data.count}次）
                        </p>
                    `).join('')}
                </div>

                <div>
                    <h4 style="color: #4c9; font-size: 16px; margin-bottom: 10px;">✓ 相对安全的食物</h4>
                    ${topBest.map(([food, data]) => `
                        <p style="padding: 8px; background: #f0fff4; border-radius: 4px; margin-bottom: 5px;">
                            <strong>${food}：</strong>${data.avgItch}分（记录${data.count}次）
                        </p>
                    `).join('')}
                </div>

                <p style="margin-top: 15px; padding: 10px; background: #fff9f0; border-radius: 4px; color: #e67e22;">
                    💡 <strong>提示：</strong>这只是基于你的记录的初步分析。每个人对食物的反应不同，建议咨询医生。
                </p>
            </div>
        `;
    }

    // 心情相关性
    if (insights.moodCorrelation) {
        html += `
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
                <h3 style="color: #e67e22; margin-bottom: 15px;">😊 心情与症状关系</h3>
                <p><strong>心情好时：</strong>平均瘙痒 ${insights.moodCorrelation.goodMood} 分</p>
                <p><strong>心情不好时：</strong>平均瘙痒 ${insights.moodCorrelation.badMood} 分</p>
                <p style="margin-top: 15px; padding: 10px; background: #f9f9f9; border-radius: 4px;">
                    💡 <strong>发现：</strong>情绪状态可能影响症状感知或实际病情
                </p>
            </div>
        `;
    }

    // 总结建议
    html += `
        <div style="background: #f0f0f0; padding: 20px; border-radius: 8px;">
            <h3 style="margin-bottom: 15px;">💡 建议</h3>
            <ul style="padding-left: 20px; line-height: 1.8;">
                <li>继续坚持记录，数据越多分析越准确</li>
                <li>观察上述发现的相关性，尝试调整生活习惯</li>
                <li>如果某种食物多次与症状加重相关，考虑减少摄入</li>
                <li>保持良好的睡眠质量对缓解症状很重要</li>
                <li>可以将分析结果导出为PDF，与医生讨论</li>
            </ul>
        </div>
    `;

    statsContent.innerHTML = html;
}
