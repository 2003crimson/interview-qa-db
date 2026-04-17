const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const SESSIONS_DIR = path.join(DATA_DIR, 'practice-sessions');
const EXPORTS_DIR = path.join(DATA_DIR, 'exports');
const QUESTIONS_FILE = path.join(DATA_DIR, 'questions.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static('static'));

// ============ Data Helpers ============

function loadQuestions() {
  if (!fs.existsSync(QUESTIONS_FILE)) {
    return { version: '1.0', categories: [], questions: [] };
  }
  const data = fs.readFileSync(QUESTIONS_FILE, 'utf-8');
  return JSON.parse(data);
}

function saveQuestions(data) {
  fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    return { resume: '', customDirections: [] };
  }
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

function loadSession(sessionId) {
  const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function saveSession(session) {
  const filePath = path.join(SESSIONS_DIR, `${session.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf-8');
}

function listSessions() {
  if (!fs.existsSync(SESSIONS_DIR)) {
    return [];
  }
  return fs.readdirSync(SESSIONS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf-8'));
      return {
        id: data.id,
        createdAt: data.createdAt,
        totalQuestions: data.totalQuestions,
        answeredQuestions: data.questions.filter(q => q.userAnswer).length,
        categories: data.categories,
        completed: data.completed,
        duration: data.duration
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ============ AI Helpers ============

async function callDeepSeek(messages, temperature = 0.7) {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error('未配置 DeepSeek API Key');
  }

  const response = await fetch(`${process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      messages,
      temperature
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API 调用失败: ${errorText}`);
  }

  const result = await response.json();
  return result.choices[0].message.content;
}

// ============ Practice Logic ============

function getDifficultyForRound(round, totalRounds) {
  const ratio = round / totalRounds;
  if (ratio <= 0.3) return 'easy';
  if (ratio <= 0.6) return 'medium';
  return 'hard';
}

function selectQuestionsForPractice(categories, count, questions) {
  const filtered = categories.length > 0
    ? questions.filter(q => categories.includes(q.category))
    : questions;

  // 按难度分组
  const byDifficulty = { easy: [], medium: [], hard: [] };
  filtered.forEach(q => {
    const diff = q.difficulty || 'medium'; // 默认中等难度
    if (byDifficulty[diff]) {
      byDifficulty[diff].push(q);
    } else {
      byDifficulty.medium.push(q); // 未知难度归入中等
    }
  });

  const easyCount = Math.ceil(count * 0.3);
  const mediumCount = Math.ceil(count * 0.3);
  const hardCount = count - easyCount - mediumCount;

  const selected = [];

  // 简单题
  for (let i = 0; i < easyCount && byDifficulty.easy.length > 0; i++) {
    const idx = Math.floor(Math.random() * byDifficulty.easy.length);
    selected.push(byDifficulty.easy.splice(idx, 1)[0]);
  }

  // 中等题
  for (let i = 0; i < mediumCount && byDifficulty.medium.length > 0; i++) {
    const idx = Math.floor(Math.random() * byDifficulty.medium.length);
    selected.push(byDifficulty.medium.splice(idx, 1)[0]);
  }

  // 困难题
  for (let i = 0; i < hardCount && byDifficulty.hard.length > 0; i++) {
    const idx = Math.floor(Math.random() * byDifficulty.hard.length);
    selected.push(byDifficulty.hard.splice(idx, 1)[0]);
  }

  // 如果还不够，随机补充
  const remaining = filtered.filter(q => !selected.find(s => s.id === q.id));
  while (selected.length < count && remaining.length > 0) {
    const idx = Math.floor(Math.random() * remaining.length);
    selected.push(remaining.splice(idx, 1)[0]);
  }

  return selected;
}

async function generateQuestion(session, resumeContext, customDirections) {
  const currentQ = session.questions[session.currentIndex];
  const difficulty = getDifficultyForRound(session.currentIndex + 1, session.totalQuestions);

  const systemPrompt = `你是一个专业的面试教练，负责为用户生成针对性的面试练习题目。

根据以下信息生成面试题：
- 目标难度：${difficulty}
- 题目序号：${session.currentIndex + 1}/${session.totalQuestions}
- 练习的分类：${session.categories.join(', ') || '所有分类'}
${resumeContext ? `- 用户简历信息：\n${resumeContext}` : ''}
${customDirections ? `- 用户想重点练习的方向：\n${customDirections}` : ''}

要求：
1. 题目要有针对性，结合用户背景
2. 难度要符合当前轮次要求
3. 每道题要有明确的考察点
4. 返回格式为JSON：
{
  "question": "题目内容",
  "expectedPoints": ["期望用户提到的关键点1", "关键点2"],
  "depth": 1-3（1为基础，2为进阶，3为深入）,
  "followUp": ["可能的追问1", "可能的追问2"]
}`;

  try {
    const reply = await callDeepSeek([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: '请生成这道面试题' }
    ], 0.8);

    // 尝试解析JSON
    let parsed;
    try {
      parsed = JSON.parse(reply);
    } catch {
      // 如果不是JSON，当作普通题目处理
      parsed = {
        question: reply,
        expectedPoints: [],
        depth: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3,
        followUp: []
      };
    }

    currentQ.question = parsed.question;
    currentQ.expectedPoints = parsed.expectedPoints || [];
    currentQ.depth = parsed.depth || (difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3);
    currentQ.followUp = parsed.followUp || [];
    currentQ.difficulty = difficulty;

    return currentQ;
  } catch (error) {
    console.error('生成题目失败:', error);
    throw error;
  }
}

async function evaluateAnswer(session) {
  // 如果没有配置 API Key，直接返回默认评价
  if (!process.env.DEEPSEEK_API_KEY) {
    const currentQ = session.questions[session.currentIndex];
    currentQ.aiComment = '感谢回答。由于AI服务未配置，无法进行详细评价。';
    currentQ.score = 50;
    currentQ.needFollowUp = false;
    currentQ.followUpAnswer = null;
    currentQ.followUpCount = currentQ.followUpCount || 0;
    saveSession(session);
    return currentQ;
  }

  const currentQ = session.questions[session.currentIndex];

  const systemPrompt = `你是一个专业的面试教练，负责点评用户的技术回答。

题目：${currentQ.question}
期望的关键点：${currentQ.expectedPoints.join(', ') || '无特定要求'}
题目难度：${currentQ.difficulty}

用户的回答：
${currentQ.userAnswer}

请分析用户回答的优劣，给出：
1. 点评（指出回答得好和不足的地方）
2. 给分（0-100）
3. 是否需要追问（如果回答得好，可以追问深入；如果回答有问题，指出并给机会补充）

请以JSON格式返回：
{
  "comment": "点评内容",
  "score": 85,
  "needFollowUp": true,
  "followUpQuestion": "追问内容（如果需要）"
}`;

  try {
    const reply = await callDeepSeek([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: '请点评我的回答' }
    ], 0.5);

    let parsed;
    try {
      parsed = JSON.parse(reply);
    } catch {
      parsed = {
        comment: reply,
        score: 50,
        needFollowUp: false,
        followUpQuestion: null
      };
    }

    currentQ.aiComment = parsed.comment;
    currentQ.score = parsed.score;
    // 检查追问深度限制
    if (parsed.needFollowUp && currentQ.followUpCount < session.maxFollowUpDepth) {
      currentQ.needFollowUp = true;
      currentQ.followUpAnswer = parsed.followUpQuestion;
    } else {
      currentQ.needFollowUp = false;
      currentQ.followUpAnswer = null;
    }

    return currentQ;
  } catch (error) {
    console.error('评价回答失败:', error);
    throw error;
  }
}

async function generateReport(session) {
  // 如果没有配置 API Key，直接返回默认报告
  if (!process.env.DEEPSEEK_API_KEY) {
    const mastery = {};
    const suggestions = [];

    // 按分类统计
    const questionsByCategory = {};
    session.questions.forEach(q => {
      if (!questionsByCategory[q.category]) {
        questionsByCategory[q.category] = [];
      }
      questionsByCategory[q.category].push(q);
    });

    for (const [category, questions] of Object.entries(questionsByCategory)) {
      const scores = questions.map(q => q.score || 0);
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

      const weakPoints = questions
        .filter(q => (q.score || 0) < 60)
        .flatMap(q => q.expectedPoints || []);

      mastery[category] = {
        score: Math.round(avgScore),
        weak: [...new Set(weakPoints)],
        strong: [],
        totalQuestions: questions.length
      };

      if (avgScore < 70) {
        suggestions.push({
          topic: category,
          priority: avgScore < 50 ? 'high' : 'medium',
          points: weakPoints.slice(0, 3),
          advice: `建议重点复习${category}的以下知识点：${weakPoints.slice(0, 3).join('、')}`
        });
      }
    }

    return {
      mastery,
      summary: '由于AI服务未配置，无法生成详细报告。请配置 DeepSeek API Key 后再试。',
      suggestions,
      totalScore: Math.round(
        session.questions.reduce((sum, q) => sum + (q.score || 0), 0) / session.questions.length
      )
    };
  }

  const questionsByCategory = {};
  session.questions.forEach(q => {
    if (!questionsByCategory[q.category]) {
      questionsByCategory[q.category] = [];
    }
    questionsByCategory[q.category].push(q);
  });

  const mastery = {};
  const suggestions = [];

  for (const [category, questions] of Object.entries(questionsByCategory)) {
    const scores = questions.map(q => q.score || 0);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    const weakPoints = questions
      .filter(q => (q.score || 0) < 60)
      .flatMap(q => q.expectedPoints || []);

    const strongPoints = questions
      .filter(q => (q.score || 0) >= 80)
      .flatMap(q => q.expectedPoints || []);

    mastery[category] = {
      score: Math.round(avgScore),
      weak: [...new Set(weakPoints)],
      strong: [...new Set(strongPoints)],
      totalQuestions: questions.length
    };

    if (avgScore < 70) {
      suggestions.push({
        topic: category,
        priority: avgScore < 50 ? 'high' : 'medium',
        points: weakPoints.slice(0, 3),
        advice: `建议重点复习${category}的以下知识点：${weakPoints.slice(0, 3).join('、')}`
      });
    }
  }

  const systemPrompt = `你是一个专业的面试教练，负责生成练习报告。

练习统计：
- 总题目数：${session.questions.length}
- 分类掌握情况：${JSON.stringify(mastery)}

请生成：
1. 整体总结（评价用户的整体表现）
2. 详细建议（针对薄弱环节的具体学习建议）
3. 学习资源推荐（可以简略提及需要深入学习的方向）

请以Markdown格式返回报告。`;

  try {
    const summary = await callDeepSeek([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: '请生成我的练习报告' }
    ], 0.5);

    return {
      mastery,
      summary,
      suggestions,
      totalScore: Math.round(
        session.questions.reduce((sum, q) => sum + (q.score || 0), 0) / session.questions.length
      )
    };
  } catch (error) {
    console.error('生成报告失败:', error);
    throw error;
  }
}

function generateMarkdownReport(session, report) {
  let md = `# 面试练习报告\n\n`;
  md += `**练习时间**: ${new Date(session.createdAt).toLocaleString('zh-CN')}\n`;
  md += `**练习时长**: ${Math.round(session.duration / 60000)}分钟\n`;
  md += `**题目数量**: ${session.questions.length}题\n`;
  md += `**总体得分**: ${report.totalScore}分\n\n`;

  md += `## 分类掌握情况\n\n`;
  for (const [category, data] of Object.entries(report.mastery)) {
    const status = data.score >= 80 ? '✅' : data.score >= 60 ? '⚠️' : '❌';
    md += `### ${status} ${category}: ${data.score}分\n\n`;
    if (data.strong.length > 0) {
      md += `**掌握良好**: ${data.strong.join('、')}\n\n`;
    }
    if (data.weak.length > 0) {
      md += `**需要加强**: ${data.weak.join('、')}\n\n`;
    }
  }

  md += `## 整体评价\n\n`;
  md += `${report.summary}\n\n`;

  md += `## 改进建议\n\n`;
  report.suggestions.forEach((s, i) => {
    md += `${i + 1}. **${s.topic}** (${s.priority === 'high' ? '高优先级' : '中优先级'})\n`;
    md += `   - ${s.advice}\n\n`;
  });

  md += `## 题目详情\n\n`;
  session.questions.forEach((q, i) => {
    md += `### 第${i + 1}题 [${q.difficulty}] [得分: ${q.score || '-'}]\n\n`;
    md += `**题目**: ${q.question}\n\n`;
    md += `**你的回答**: ${q.userAnswer || '未回答'}\n\n`;
    md += `**AI点评**: ${q.aiComment || '无'}\n\n`;
    if (q.followUpAnswer) {
      md += `**追问**: ${q.followUpAnswer}\n\n`;
    }
    md += `---\n\n`;
  });

  md += `---\n*由 Interview QA DB 生成*\n`;

  return md;
}

// ============ API Routes ============

// 获取配置
app.get('/api/config', (req, res) => {
  try {
    const config = loadConfig();
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 保存配置（简历和自定义方向）
app.post('/api/config', (req, res) => {
  try {
    const config = loadConfig();
    if (req.body.resume !== undefined) {
      config.resume = req.body.resume;
    }
    if (req.body.customDirections !== undefined) {
      config.customDirections = req.body.customDirections;
    }
    saveConfig(config);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取题库
app.get('/api/questions', (req, res) => {
  try {
    const data = loadQuestions();
    const { category, difficulty, source } = req.query;

    let filtered = data.questions;

    if (category && category !== 'all') {
      filtered = filtered.filter(q => q.category === category);
    }
    if (difficulty) {
      filtered = filtered.filter(q => q.difficulty === difficulty);
    }
    if (source) {
      filtered = filtered.filter(q => q.source === source);
    }

    res.json({
      categories: data.categories,
      total: filtered.length,
      questions: filtered
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取预设题库分类
app.get('/api/questions/categories', (req, res) => {
  try {
    const data = loadQuestions();
    const categoryStats = data.categories.map(cat => ({
      name: cat,
      count: data.questions.filter(q => q.category === cat).length
    }));
    res.json(categoryStats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 添加自定义题目
app.post('/api/questions', (req, res) => {
  try {
    const { category, question, answer, difficulty, tags } = req.body;

    if (!category || !question) {
      return res.status(400).json({ error: 'category 和 question 是必填项' });
    }

    const data = loadQuestions();

    // 自动添加分类
    if (!data.categories.includes(category)) {
      data.categories.push(category);
    }

    const newQuestion = {
      id: `custom-${uuidv4()}`,
      category,
      question,
      answer: answer || '',
      difficulty: difficulty || 'medium',
      tags: tags || [],
      source: 'custom',
      depth: 1,
      followUp: []
    };

    data.questions.push(newQuestion);
    saveQuestions(data);

    res.json(newQuestion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新题目
app.put('/api/questions/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { category, question, answer, difficulty, tags } = req.body;

    const data = loadQuestions();
    const index = data.questions.findIndex(q => q.id === id);

    if (index === -1) {
      return res.status(404).json({ error: '题目不存在' });
    }

    if (category && !data.categories.includes(category)) {
      data.categories.push(category);
    }

    data.questions[index] = {
      ...data.questions[index],
      category: category || data.questions[index].category,
      question: question || data.questions[index].question,
      answer: answer !== undefined ? answer : data.questions[index].answer,
      difficulty: difficulty || data.questions[index].difficulty,
      tags: tags || data.questions[index].tags
    };

    saveQuestions(data);
    res.json(data.questions[index]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 删除题目
app.delete('/api/questions/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = loadQuestions();

    const initialLength = data.questions.length;
    data.questions = data.questions.filter(q => q.id !== id);

    if (data.questions.length === initialLength) {
      return res.status(404).json({ error: '题目不存在' });
    }

    saveQuestions(data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 导入题目
app.post('/api/questions/import', (req, res) => {
  try {
    const { questions, format } = req.body;

    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'questions 必须是数组' });
    }

    const data = loadQuestions();
    let imported = 0;

    questions.forEach(q => {
      if (q.category && q.question) {
        const newQuestion = {
          id: `custom-${uuidv4()}`,
          category: q.category,
          question: q.question,
          answer: q.answer || '',
          difficulty: q.difficulty || 'medium',
          tags: q.tags || [],
          source: 'custom',
          depth: 1,
          followUp: []
        };
        data.questions.push(newQuestion);
        if (!data.categories.includes(q.category)) {
          data.categories.push(q.category);
        }
        imported++;
      }
    });

    saveQuestions(data);
    res.json({ success: true, imported });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 导出题目
app.get('/api/questions/export', (req, res) => {
  try {
    const { format, category, source } = req.query;
    const data = loadQuestions();

    let filtered = data.questions;
    if (category) {
      filtered = filtered.filter(q => q.category === category);
    }
    if (source) {
      filtered = filtered.filter(q => q.source === source);
    }

    if (format === 'markdown') {
      let md = `# 面试题库\n\n`;
      const byCategory = {};
      filtered.forEach(q => {
        if (!byCategory[q.category]) {
          byCategory[q.category] = [];
        }
        byCategory[q.category].push(q);
      });

      for (const [cat, questions] of Object.entries(byCategory)) {
        md += `## ${cat}\n\n`;
        questions.forEach((q, i) => {
          md += `### ${i + 1}. ${q.question}\n\n`;
          md += `**难度**: ${q.difficulty}  **标签**: ${(q.tags || []).join(', ')}\n\n`;
          if (q.answer) {
            md += `**答案**: ${q.answer}\n\n`;
          }
          md += `---\n\n`;
        });
      }

      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=questions.md');
      return res.send(md);
    }

    res.json({ questions: filtered, total: filtered.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ Practice API ============

// 开始练习
app.post('/api/practice/start', (req, res) => {
  try {
    const { categories, totalQuestions, resume, customDirections } = req.body;

    if (!totalQuestions || totalQuestions < 1) {
      return res.status(400).json({ error: '请指定题目数量' });
    }

    const data = loadQuestions();
    const config = loadConfig();

    // 确保 categories 是数组
    const cats = Array.isArray(categories) ? categories : [];

    // 选择题目
    const selectedQuestions = selectQuestionsForPractice(
      cats,
      totalQuestions,
      data.questions
    );

    if (selectedQuestions.length === 0) {
      return res.status(400).json({ error: '题库为空或没有符合分类的题目' });
    }

    // 创建会话
    const maxFollowUpDepth = req.body.maxFollowUpDepth || 2;
    const session = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      startTime: Date.now(),
      totalQuestions: selectedQuestions.length,
      categories: categories || [],
      resumeContent: resume || config.resume || '',
      customDirections: customDirections || config.customDirections || [],
      maxFollowUpDepth: maxFollowUpDepth,
      questions: selectedQuestions.map(q => ({
        questionId: q.id,
        question: q.question,
        category: q.category,
        expectedPoints: q.expectedPoints || [],
        followUp: q.followUp || [],
        difficulty: q.difficulty,
        depth: q.depth || 1,
        userAnswer: null,
        aiComment: null,
        score: null,
        needFollowUp: false,
        followUpAnswer: null,
        followUpCount: 0,
        followUpUserAnswer: null
      })),
      currentIndex: 0,
      currentRound: 'question', // 'question' | 'followUp' | 'waiting_report'
      completed: false,
      report: null
    };

    saveSession(session);

    // 返回第一题
    const firstQuestion = session.questions[0];
    res.json({
      sessionId: session.id,
      progress: {
        current: 1,
        total: session.totalQuestions,
        difficulty: firstQuestion.difficulty
      },
      question: firstQuestion.question,
      category: firstQuestion.category,
      difficulty: firstQuestion.difficulty,
      hint: '仔细思考后回答'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取当前题目
app.get('/api/practice/:sessionId/question', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = loadSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: '练习会话不存在' });
    }

    if (session.currentIndex >= session.totalQuestions) {
      return res.status(400).json({ error: '所有题目已回答完毕' });
    }

    const currentQ = session.questions[session.currentIndex];

    // 如果是追问轮次，返回追问
    if (session.currentRound === 'followUp') {
      return res.json({
        progress: {
          current: session.currentIndex + 1,
          total: session.totalQuestions,
          difficulty: currentQ.difficulty
        },
        question: currentQ.question,
        category: currentQ.category,
        difficulty: currentQ.difficulty,
        hint: '请回答追问'
      });
    }

    // 如果有未完成的追问，返回追问
    if (currentQ.needFollowUp && currentQ.followUpAnswer) {
      return res.json({
        progress: {
          current: session.currentIndex + 1,
          total: session.totalQuestions,
          difficulty: currentQ.difficulty
        },
        question: currentQ.question,
        category: currentQ.category,
        difficulty: currentQ.difficulty,
        hint: '请回答追问'
      });
    }

    // 正常轮次：推进到下一题
    session.currentIndex++;
    saveSession(session);

    if (session.currentIndex >= session.totalQuestions) {
      return res.json({
        progress: {
          current: session.totalQuestions,
          total: session.totalQuestions,
          difficulty: currentQ.difficulty
        },
        question: currentQ.question,
        category: currentQ.category,
        difficulty: currentQ.difficulty,
        hint: '所有题目已回答完毕',
        completed: true
      });
    }

    const nextQ = session.questions[session.currentIndex];
    res.json({
      progress: {
        current: session.currentIndex + 1,
        total: session.totalQuestions,
        difficulty: nextQ.difficulty
      },
      question: nextQ.question,
      category: nextQ.category,
      difficulty: nextQ.difficulty,
      hint: '仔细思考后回答'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 提交回答
app.post('/api/practice/:sessionId/answer', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { answer } = req.body;

    if (!answer || !answer.trim()) {
      return res.status(400).json({ error: '请输入回答' });
    }

    const session = loadSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: '练习会话不存在' });
    }

    const currentQ = session.questions[session.currentIndex];

    if (session.currentRound === 'question') {
      // 第一轮回答
      currentQ.userAnswer = answer;
      saveSession(session);

      // 异步评价，保存后立即返回
      evaluateAnswer(session).then(evaluated => {
        session.questions[session.currentIndex] = evaluated;
        saveSession(session);
      }).catch(err => {
        console.error('评价失败:', err.message);
        // 如果评价失败，生成一个默认评价
        currentQ.aiComment = '感谢回答。由于AI服务未配置，无法进行详细评价。';
        currentQ.score = 50;
        currentQ.needFollowUp = false;
        currentQ.followUpAnswer = null;
        saveSession(session);
      });

      res.json({
        received: true,
        evaluating: true,
        message: '回答已收到，正在分析...'
      });
    } else if (session.currentRound === 'followUp') {
      // 追问回答
      currentQ.followUpUserAnswer = answer;
      currentQ.followUpCount = (currentQ.followUpCount || 0) + 1;
      currentQ.followUpAnswer = null;
      currentQ.needFollowUp = false;
      session.currentRound = 'question';
      session.currentIndex++;
      saveSession(session);

      if (session.currentIndex >= session.totalQuestions) {
        res.json({
          completed: true,
          message: '所有题目已回答完毕，正在生成报告...',
          readyForReport: true,
          progress: {
            current: session.totalQuestions,
            total: session.totalQuestions
          }
        });
      } else {
        const nextQ = session.questions[session.currentIndex];
        res.json({
          completed: false,
          readyForReport: false,
          progress: {
            current: session.currentIndex + 1,
            total: session.totalQuestions,
            difficulty: nextQ.difficulty
          },
          nextQuestion: nextQ.question,
          category: nextQ.category,
          difficulty: nextQ.difficulty
        });
      }
    } else {
      res.status(400).json({ error: '当前状态不允许提交回答' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取当前回答的评价
app.get('/api/practice/:sessionId/evaluation', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = loadSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: '练习会话不存在' });
    }

    const currentQ = session.questions[session.currentIndex];

    // 如果还没有评价，返回等待状态
    if (!currentQ.aiComment) {
      return res.json({
        ready: false,
        message: '正在分析你的回答...'
      });
    }

    res.json({
      ready: true,
      comment: currentQ.aiComment,
      score: currentQ.score,
      needFollowUp: currentQ.needFollowUp,
      followUpQuestion: currentQ.followUpAnswer,
      followUpCount: currentQ.followUpCount || 0,
      maxFollowUpDepth: session.maxFollowUpDepth
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 处理追问
app.post('/api/practice/:sessionId/followup', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = loadSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: '练习会话不存在' });
    }

    const currentQ = session.questions[session.currentIndex];

    if (!currentQ.needFollowUp || !currentQ.followUpAnswer) {
      return res.status(400).json({ error: '当前题目不需要追问' });
    }

    session.currentRound = 'followUp';
    saveSession(session);

    res.json({
      followUpQuestion: currentQ.followUpAnswer
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 结束练习
app.post('/api/practice/:sessionId/finish', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = loadSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: '练习会话不存在' });
    }

    session.completed = true;
    session.duration = Date.now() - session.startTime;
    saveSession(session);

    // 生成报告（异步，不阻塞响应）
    generateReport(session).then(report => {
      session.report = report;
      saveSession(session);
    }).catch(err => {
      console.error('生成报告失败:', err.message);
    });

    res.json({
      sessionId: session.id,
      completed: true,
      generatingReport: true
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取报告
app.get('/api/practice/:sessionId/report', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = loadSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: '练习会话不存在' });
    }

    if (!session.report) {
      return res.status(400).json({ error: '报告尚未生成' });
    }

    res.json({
      sessionId: session.id,
      createdAt: session.createdAt,
      duration: session.duration,
      totalQuestions: session.totalQuestions,
      report: session.report
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 导出报告
app.get('/api/practice/:sessionId/export', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { format } = req.query;
    const session = loadSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: '练习会话不存在' });
    }

    if (!session.report) {
      return res.status(400).json({ error: '报告尚未生成' });
    }

    const markdown = generateMarkdownReport(session, session.report);

    if (format === 'json') {
      return res.json({
        session: {
          id: session.id,
          createdAt: session.createdAt,
          categories: session.categories,
          questions: session.questions
        },
        report: session.report
      });
    }

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=report-${sessionId}.md`);
    res.send(markdown);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取练习历史
app.get('/api/practice/history', (req, res) => {
  try {
    const sessions = listSessions();
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取练习详情
app.get('/api/practice/history/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = loadSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: '练习记录不存在' });
    }

    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 删除练习记录
app.delete('/api/practice/history/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '练习记录不存在' });
    }

    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI 对话（用于自由练习）
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, mode, resumeContent } = req.body;

    if (!process.env.DEEPSEEK_API_KEY) {
      return res.status(500).json({ error: '未配置 DeepSeek API Key' });
    }

    let systemPrompt = '你是一个专业的面试教练。';

    if (mode === 'resume' && resumeContent) {
      systemPrompt = `你是一个专业的面试教练，负责根据候选人的简历进行技术追问。
请仔细阅读以下简历内容，然后生成有针对性的技术问题。
问题应该：
1. 深入考察简历中提到的技术栈和项目经验
2. 从基础到深入，循序渐进
3. 结合实际项目场景提问
4. 每个问题后可以适当追问细节

简历内容：
${resumeContent}`;
    } else if (mode === 'question') {
      systemPrompt = '你是一个专业的面试教练，基于给出的题目进行深入讨论和追问。';
    }

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const reply = await callDeepSeek(apiMessages);
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Interview QA DB 已启动: http://localhost:${PORT}`);
  console.log(`📁 数据目录: ${DATA_DIR}`);

  // Ensure directories exist
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
  if (!fs.existsSync(EXPORTS_DIR)) {
    fs.mkdirSync(EXPORTS_DIR, { recursive: true });
  }
});
