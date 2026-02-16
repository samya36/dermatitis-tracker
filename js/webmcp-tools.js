// WebMCP Tool Registration for Dermatitis Tracker
// Registers AI browser agent tools via the WebMCP standard
// Requires Chrome 146+ with chrome://flags/#enable-webmcp-testing

if ('modelContext' in navigator && navigator.modelContext) {

  function _jsonResponse(data) {
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }

  // Helper: programmatic tab switch (the inline switchTab uses event.target)
  function _switchToTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabName + '-tab').classList.add('active');
    const tabs = document.querySelectorAll('.tab');
    const tabMap = { record: 0, history: 1, stats: 2 };
    if (tabs[tabMap[tabName]]) tabs[tabMap[tabName]].classList.add('active');
    if (tabName === 'history') loadHistory();
    else if (tabName === 'stats') loadStats();
  }

  // 1. search_records — Query history by date range
  navigator.modelContext.registerTool({
    name: "search_records",
    description: "Search dermatitis health records by date range. Returns records with diet, exercise, sleep, and symptom data. Use when user asks about past records, patterns, or wants to review specific dates.",
    inputSchema: {
      type: "object",
      properties: {
        days: { type: "number", description: "Number of days to look back. Use 7/30/90. Defaults to 30." },
        start_date: { type: "string", description: "Start date YYYY-MM-DD. Overrides 'days' if provided." },
        end_date: { type: "string", description: "End date YYYY-MM-DD. Defaults to today." }
      }
    },
    execute: async ({ days, start_date, end_date }) => {
      if (!currentUser) return _jsonResponse({ success: false, error: "User not logged in" });

      let startDate;
      if (start_date) {
        startDate = start_date;
      } else {
        const d = new Date();
        d.setDate(d.getDate() - (days || 30));
        startDate = d.toISOString().split('T')[0];
      }
      const endDate = end_date || new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('daily_records')
        .select('*')
        .eq('user_id', currentUser.id)
        .gte('record_date', startDate)
        .lte('record_date', endDate)
        .order('record_date', { ascending: false });

      if (error) return _jsonResponse({ success: false, error: error.message });

      _switchToTab('history');

      return _jsonResponse({
        success: true,
        count: data.length,
        date_range: { from: startDate, to: endDate },
        records: data.map(r => ({
          date: r.record_date,
          meal_type: r.meal_type,
          food_items: r.food_items,
          food_notes: r.food_notes,
          exercise_type: r.exercise_type,
          exercise_duration: r.exercise_duration,
          exercise_intensity: r.exercise_intensity,
          sleep_quality: r.sleep_quality,
          sleep_duration: r.sleep_duration,
          itch_level: r.itch_level,
          affected_areas: r.affected_areas,
          mood: r.mood,
          symptom_notes: r.symptom_notes
        }))
      });
    }
  });

  // 2. get_today_records — View today's data
  navigator.modelContext.registerTool({
    name: "get_today_records",
    description: "Get all health records for today or a specific date. Returns meal, exercise, sleep, and symptom data. Use when user asks what they've recorded today.",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format. Defaults to today." }
      }
    },
    annotations: { readOnlyHint: "true" },
    execute: async ({ date }) => {
      if (!currentUser) return _jsonResponse({ success: false, error: "User not logged in" });

      const targetDate = date || new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('daily_records')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('record_date', targetDate)
        .order('record_time', { ascending: true });

      if (error) return _jsonResponse({ success: false, error: error.message });

      _switchToTab('record');

      return _jsonResponse({
        success: true,
        date: targetDate,
        count: (data || []).length,
        records: (data || []).map(r => ({
          time: r.record_time,
          meal_type: r.meal_type,
          food_items: r.food_items,
          food_notes: r.food_notes,
          exercise_type: r.exercise_type,
          exercise_duration: r.exercise_duration,
          sleep_quality: r.sleep_quality,
          sleep_duration: r.sleep_duration,
          itch_level: r.itch_level,
          affected_areas: r.affected_areas,
          mood: r.mood,
          symptom_notes: r.symptom_notes
        }))
      });
    }
  });

  // 3. get_statistics — Correlation analysis
  navigator.modelContext.registerTool({
    name: "get_statistics",
    description: "Get statistical analysis of dermatitis health data for the last 30 days. Returns average itch level, sleep quality, food/exercise/mood correlations. Use when user asks for patterns or summary.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: "true" },
    execute: async () => {
      if (!currentUser) return _jsonResponse({ success: false, error: "User not logged in" });

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('daily_records')
        .select('*')
        .eq('user_id', currentUser.id)
        .gte('record_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('record_date', { ascending: false });

      if (error) return _jsonResponse({ success: false, error: error.message });
      if (!data || data.length === 0) {
        return _jsonResponse({ success: false, error: "No data available. Need at least a few days of records." });
      }

      const insights = analyzeData(data);
      _switchToTab('stats');

      return _jsonResponse({
        success: true,
        total_records: data.length,
        avg_itch_level: insights.avgItch,
        avg_sleep_quality: insights.avgSleep,
        food_correlations: insights.foodCorrelations,
        sleep_correlation: insights.sleepCorrelation,
        exercise_correlation: insights.exerciseCorrelation,
        mood_correlation: insights.moodCorrelation
      });
    }
  });

  // 4. trigger_ai_analysis — Run Gemini AI analysis
  navigator.modelContext.registerTool({
    name: "trigger_ai_analysis",
    description: "Trigger a deep AI analysis of health data using Google Gemini. Analyzes trends, triggers, and provides personalized recommendations. Daily limit of 5 uses. Use when user asks for AI insights.",
    inputSchema: { type: "object", properties: {} },
    execute: async () => {
      if (!currentUser) return _jsonResponse({ success: false, error: "User not logged in" });

      const usageCheck = await checkDailyUsage();
      if (!usageCheck.canUse) {
        return _jsonResponse({
          success: false,
          error: "Daily AI analysis limit reached (" + usageCheck.usedCount + "/" + DAILY_AI_LIMIT + "). Try again tomorrow."
        });
      }

      _switchToTab('stats');
      analyzeWithGemini();

      return _jsonResponse({
        success: true,
        message: "AI analysis triggered. Results will appear on the Statistics tab.",
        remaining_uses_today: (usageCheck.remaining || DAILY_AI_LIMIT) - 1
      });
    }
  });

  console.log('WebMCP: 4 imperative + 1 declarative = 5 tools registered for Dermatitis Tracker');

} else {
  console.log('WebMCP: navigator.modelContext not available');
}
