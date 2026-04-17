/**
 * 将output目录下的markdown文件解析为题库
 * 格式：## 问题标题 -> 答案
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const QUESTIONS_FILE = path.join(__dirname, '..', 'data', 'questions.json');

// 分类映射：根据文件名确定分类
function getCategoryFromFilename(filename) {
  // 忽略拆分后的part文件
  if (filename.includes('_p') || filename.includes('_part')) {
    return null;
  }

  // Java 200题特殊处理
  if (filename.includes('Java 热门面试题 200 道')) {
    return 'Java热门200题';
  }

  // 其他文件：去掉"面试题速记通关版 _ 面试刷题 mianshiya.com.md"后缀
  const suffix = '面试题速记通关版 _ 面试刷题 mianshiya.com.md';
  const name = filename.endsWith(suffix)
    ? filename.substring(0, filename.length - suffix.length).trim()
    : filename.replace(/\.(md|txt)$/, '').trim();

  const categoryMap = {
    'Java 集合': 'Java集合',
    'Java 并发': 'Java并发',
    'Java 虚拟机': 'JVM',
    'Java 基础': 'Java基础',
    'MySQL': 'MySQL',
    'Redis': 'Redis',
    'Spring': 'Spring',
    'SpringBoot': 'SpringBoot',
    'SpringCloud': 'SpringCloud',
    '消息队列': '消息队列',
    '设计模式': '设计模式',
    'AI大模型原理和应用': 'AI大模型'
  };
  return categoryMap[name] || (name || null);
}

// 估算难度（根据答案长度）
function estimateDifficulty(answer) {
  const len = answer.length;
  if (len < 100) return 'easy';
  if (len < 300) return 'medium';
  return 'hard';
}

// 解析markdown文件
function parseMarkdownFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf-8');
  const filename = path.basename(filepath);
  const category = getCategoryFromFilename(filename);

  const questions = [];

  // 按 ## 分割问题
  const parts = content.split(/\n## /);

  for (const part of parts) {
    if (!part.trim() || part.includes('本资源来自面试鸭') || part.includes('推荐更多免费')) {
      continue;
    }

    // 第一部分可能没有 ## 前缀
    const firstLineEnd = part.indexOf('\n');
    if (firstLineEnd === -1) continue;

    const title = part.startsWith('## ') ? part.substring(3, firstLineEnd) : part.substring(0, firstLineEnd);
    const body = part.startsWith('## ') ? part.substring(firstLineEnd + 1) : part.substring(firstLineEnd + 1);

    if (!title.trim()) continue;

    // 清理标题中的特殊字符
    const cleanTitle = title.replace(/[#*`]/g, '').trim();
    if (cleanTitle.length < 5) continue;

    // 清理答案内容
    let answer = body.trim();
    // 移除代码块标记但保留内容
    answer = answer.replace(/```[\s\S]*?```/g, (match) => {
      return match.replace(/```\w*\n?/g, '').trim();
    });
    // 移除残留的markdown标记
    answer = answer.replace(/[#*`_]/g, '').trim();

    if (answer.length < 10) continue;

    questions.push({
      question: cleanTitle,
      answer: answer,
      category: category
    });
  }

  return questions;
}

// 加载现有题库
function loadExistingQuestions() {
  if (fs.existsSync(QUESTIONS_FILE)) {
    return JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf-8'));
  }
  return { version: '1.0', categories: [], questions: [] };
}

// 保存题库
function saveQuestions(data) {
  fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// 主函数
function main() {
  // 加载现有题库
  const existingData = loadExistingQuestions();
  const existingIds = new Set(existingData.questions.map(q => q.id));
  const existingQuestions = new Map(existingData.questions.map(q => [q.question, q]));

  // 获取所有markdown文件
  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.md'));

  let newQuestionsCount = 0;
  let existingQuestionsCount = 0;

  const allNewQuestions = [];

  for (const file of files) {
    const filepath = path.join(OUTPUT_DIR, file);
    const questions = parseMarkdownFile(filepath);

    for (const q of questions) {
      // 检查是否已存在
      if (existingQuestions.has(q.question)) {
        existingQuestionsCount++;
        continue;
      }

      // 跳过无效分类
      if (!q.category) continue;

      // 生成ID
      const categoryPrefix = q.category.replace(/[^a-zA-Z\u4e00-\u9fa5]/g, '').substring(0, 10);
      const id = `${categoryPrefix.toLowerCase()}-${Date.now().toString(36)}${Math.random().toString(36).substring(2, 5)}`;

      allNewQuestions.push({
        id: id,
        category: q.category,
        question: q.question,
        answer: q.answer,
        difficulty: estimateDifficulty(q.answer),
        tags: [q.category],
        source: 'pdf',
        depth: 1,
        followUp: []
      });
      newQuestionsCount++;
    }
  }

  // 更新categories
  const allCategories = new Set(existingData.categories);
  allNewQuestions.forEach(q => allCategories.add(q.category));

  // 合并
  const mergedData = {
    version: existingData.version || '1.0',
    categories: Array.from(allCategories).sort(),
    questions: [...existingData.questions, ...allNewQuestions]
  };

  // 保存
  saveQuestions(mergedData);

  console.log('='.repeat(50));
  console.log('题库更新完成！');
  console.log(`  - 新增题目: ${newQuestionsCount}`);
  console.log(`  - 已有题目: ${existingQuestionsCount}`);
  console.log(`  - 总题目数: ${mergedData.questions.length}`);
  console.log(`  - 分类数: ${mergedData.categories.length}`);
  console.log(`  - 分类列表: ${mergedData.categories.join(', ')}`);
}

main();
