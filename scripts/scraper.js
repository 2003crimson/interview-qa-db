/**
 * 面试题爬虫脚本
 * 从多个来源获取面试题
 */

const fs = require('fs');
const path = require('path');

// 题库数据
const questions = {
  categories: [],
  questions: []
};

// 题库 ID 生成器
let questionId = 1;

function addQuestion(category, questionText, answer, difficulty = 'medium') {
  // 自动添加分类
  if (!questions.categories.includes(category)) {
    questions.categories.push(category);
  }

  questions.questions.push({
    id: `q${questionId++}`,
    category,
    question: questionText,
    answer: answer,
    difficulty
  });
}

// ==================== Redis 面试题 ====================
// 从 javastack.cn 获取的 Redis 面试题
const redisQuestions = [
  {
    q: 'Redis 是什么？',
    a: 'Redis 是一个基于内存的 key-value 存储系统，支持多种数据结构如 String、List、Set、Sorted Set、Hash 等。常用于缓存、分布式锁、消息队列等场景。'
  },
  {
    q: 'Redis 有哪些应用场景？',
    a: '1. 缓存热点数据减轻数据库压力\n2. 分布式锁实现\n3. 实时排行榜（ZSet）\n4. 消息队列（List）\n5. Session 共享\n6. 延迟队列'
  },
  {
    q: 'Redis 为什么这么快？',
    a: '1. 基于内存操作，读取速度极快\n2. 单线程模型，避免上下文切换和锁竞争\n3. IO 多路复用模型，高效处理并发\n4. 多种优化的数据结构（如跳表、哈希表）'
  },
  {
    q: 'Redis 单线程模型是怎样的？',
    a: 'Redis 4.0 之前完全是单线程模型，4.0 之后增加了后台线程处理持久化等操作。单线程指网络 IO 和命令执行是单线程，但定时任务、AOF 持久化等由其他线程处理。'
  },
  {
    q: 'Redis 6.0 为什么引入多线程？',
    a: 'Redis 6.0 引入多线程主要用于处理网络 IO（socket 读写、协议解析），而命令执行仍是单线程。这样可以充分利用多核提升并发处理能力。'
  },
  {
    q: 'Redis 和 Memcached 有什么区别？',
    a: '1. Redis 支持多种数据结构，Memcached 只支持 key-value\n2. Redis 支持持久化，Memcached 不支持\n3. Redis 支持主从复制，Memcached 不支持\n4. Redis 有事务支持（Pipeline）\n5. Memcached 使用多线程，Redis 使用单线程（IO 多路复用）'
  },
  {
    q: 'Redis 支持哪些数据类型？',
    a: 'String、List、Set、Sorted Set（ZSet）、Hash、Bitmap、HyperLogLog、Geospatial、GEO'
  },
  {
    q: 'Redis 的 String 类型底层实现原理？',
    a: 'Redis 3.2 之前使用 SDS（Simple Dynamic String），3.2 之后使用 intset 或 hashtable。String 类型最大存储 512MB。'
  },
  {
    q: 'Redis 的 List 底层实现原理？',
    a: 'Redis 3.2 之前使用 LinkedList 或 Ziplist，3.2 之后使用 QuickList（多个 Ziplist 组成的双向链表）。适用于消息队列、分页列表等场景。'
  },
  {
    q: 'Redis 的 Hash 是什么？适用场景？',
    a: 'Hash 是一个 field-value 映射的哈希表。适用场景：存储对象属性（如用户信息）、购物车数据。相比 String 存储对象，Hash 可以只更新部分字段。'
  },
  {
    q: 'Redis 的 Set 和 ZSet 有什么区别？',
    a: 'Set 是无序不重复集合，ZSet 是有序不重复集合（通过 score 排序）。Set 用于标签、好友关系，ZSet 用于排行榜、权重队列。'
  },
  {
    q: 'Redis 跳表是什么？为什么这么快？',
    a: '跳表是 一种多层链表结构，通过随机层高实现快速查找。Redis 的 ZSet 使用跳表实现，支持 O(log N) 查找。空间换时间的设计。'
  },
  {
    q: 'Redis 持久化机制有哪些？',
    a: '1. RDB：定时生成内存快照，性能好但可能丢失数据\n2. AOF：记录每个写命令到文件，有三种同步策略（always/everysec/no）\n3. 混合持久化（Redis 4.0+）：结合两者优点'
  },
  {
    q: 'RDB 和 AOF 优缺点？',
    a: 'RDB 优点：恢复快、文件紧凑；缺点：可能丢失数据、fork 耗时\nAOF 优点：数据安全性高；缺点：文件大、恢复慢'
  },
  {
    q: 'Redis 数据过期后的删除策略是什么？',
    a: '1. 惰性删除：访问时检查并删除，对 CPU 友好但可能堆积\n2. 定期删除：每隔一段时间随机检查删除，对内存友好\nRedis 两种策略结合使用。'
  },
  {
    q: 'Redis 有哪些内存淘汰策略？',
    a: 'volatile-lru、volatile-ttl、volatile-random、allkeys-lru、allkeys-random、allkeys-lfu、no-eviction'
  },
  {
    q: 'LRU 和 LFU 有什么区别？',
    a: 'LRU（Least Recently Used）：最近最少使用，淘汰最长时间未被访问的\nLFU（Least Frequently Used）：最不经常使用，淘汰访问频率最低的'
  },
  {
    q: '如何实现分布式锁？',
    a: '使用 SET key value NX PX timeout 命令获取锁。注意事项：1. value 要唯一（防止误删）2. 删除时验证 value 3. 设置合理的过期时间 4. 推荐使用 Redisson'
  },
  {
    q: 'Redisson 分布式锁实现原理？',
    a: '1. 使用 HSET 存储锁值\n2. 使用 Lua 脚本保证原子性\n3. 支持看门狗自动续期\n4. 支持公平锁、读写锁等'
  },
  {
    q: 'Redis 主从复制原理？',
    a: '1. 主节点写入后异步同步到从节点\n2. 全量同步：RDB + 命令传播\n3. 增量同步：基于 repl_backlog环形缓冲区\n4. 从节点默认只读'
  },
  {
    q: 'Redis 哨兵机制是什么？',
    a: '哨兵是一个独立进程，用于监控主从节点、故障自动切换。功能：1. 监控（心跳检测）2. 通知 3. 自动故障转移 4. 提供配置服务'
  },
  {
    q: 'Redis 集群是怎么实现的？',
    a: 'Redis Cluster 采用去中心化设计，16384 个哈希槽分布在多个主节点。客户端直连任意节点，通过 MOVED 重定向访问。'
  },
  {
    q: 'Redis 集群会丢失数据吗？',
    a: '1. 异步复制可能丢失数据\n2. 网络分区可能导致脑裂\n3. 可通过配置 min-slaves-to-write 减少丢失\n4. 无法保证强一致性'
  },
  {
    q: 'Redis 缓存穿透是什么？如何解决？',
    a: '缓存穿透：查询不存在的数据绕过缓存直接打到数据库。解决方案：1. 布隆过滤器 2. 缓存空值 3. 参数校验'
  },
  {
    q: 'Redis 缓存雪崩是什么？如何解决？',
    a: '缓存雪崩：大量缓存同时过期导致大量请求打到数据库。解决方案：1. 随机过期时间 2. 二级缓存 3. 限流熔断'
  },
  {
    q: 'Redis 缓存击穿是什么？如何解决？',
    a: '缓存击穿：热点 key 过期瞬间大量请求打到数据库。解决方案：1. 互斥锁 2. 逻辑过期（不过期，用后台线程更新）'
  },
  {
    q: 'Redis 如何保证缓存和数据库一致性？',
    a: '1. Cache Aside：读 cache-miss 查 DB 写缓存；写 DB 后删缓存\n2. 延迟双删：更新 DB 后删缓存，延迟一段时间再删一次\n3. 设置过期时间作为兜底'
  },
  {
    q: 'Redis 的 Lua 脚本有什么用？',
    a: '1. 原子性操作（事务）\n2. 实现分布式锁\n3. 复杂的限流算法\n4. 自定义命令'
  },
  {
    q: 'Redis Pipeline 是什么？',
    a: 'Pipeline 是将多个命令打包一次性发送执行，减少网络往返次数。适用于批量操作场景，不是事务，不保证原子性。'
  },
  {
    q: 'Redis Big Key 是什么？如何处理？',
    a: 'Big Key 是 value 很大的 key（如几 MB 的 string）。影响：内存不均、阻塞、复制超时。处理：拆分、压缩、异步删除。'
  },
  {
    q: '热点 Key 问题是什么？如何解决？',
    a: '热点 key：一个 key 请求量巨大。解决方案：1. 数据拆分 2. 本地缓存 3. 多级缓存 4. 使用 Redis Cluster 打散'
  },
  {
    q: 'Redis 集群槽位迁移过程中可以提供服务吗？',
    a: '可以。Redis Cluster 支持在线槽位迁移，使用 ASK 重定向（临时）和 MOVED 重定向（永久）两种机制。'
  },
  {
    q: 'Redis 慢查询如何排查？',
    a: '1. 使用 SLOWLOG GET 查看慢查询日志\n2. 分析 big key\n3. 使用 MONITOR 实时监控\n4. 检查持久化配置'
  }
];

redisQuestions.forEach(item => {
  addQuestion('Redis', item.q, item.a);
});

// ==================== MySQL 面试题 ====================
const mysqlQuestions = [
  {
    q: 'MySQL 有哪些存储引擎？',
    a: 'InnoDB（默认）、MyISAM、MEMORY、ARCHIVE、CSV 等。InnoDB 支持事务和行锁，MyISAM 不支持事务但支持全文索引。'
  },
  {
    q: 'InnoDB 和 MyISAM 的区别？',
    a: '1. InnoDB 支持事务，MyISAM 不支持\n2. InnoDB 支持行锁，MyISAM 只支持表锁\n3. InnoDB 支持外键，MyISAM 不支持\n4. InnoDB 使用聚集索引，MyISAM 使用非聚集索引\n5. InnoDB 支持崩溃恢复，MyISAM 不支持'
  },
  {
    q: 'MySQL 事务的隔离级别有哪些？',
    a: '1. READ UNCOMMITTED - 读未提交，可能脏读\n2. READ COMMITTED - 读已提交，可能不可重复读\n3. REPEATABLE READ - 可重复读（MySQL默认），可能幻读\n4. SERIALIZABLE - 串行化，最高隔离级别'
  },
  {
    q: 'MVCC 是什么？如何实现的？',
    a: 'MVCC（多版本并发控制）通过隐藏列、Undo Log、Read View 实现。读操作不加锁，通过版本号避免脏读。InnoDB 在 READ COMMITTED 和 REPEATABLE READ 级别使用 MVCC。'
  },
  {
    q: 'MySQL 索引底层数据结构是什么？',
    a: 'InnoDB 使用 B+ 树作为索引结构。B+ 树所有数据都在叶子节点，叶子节点之间用链表连接，利于范围查询。'
  },
  {
    q: 'B+ 树和 B 树的区别？',
    a: '1. B+ 树非叶子节点不存储数据，只存储索引\n2. B+ 树叶子节点包含所有数据，用链表连接\n3. B+ 树查询效率更稳定（都要到叶子）\n4. B+ 树更利于范围查询'
  },
  {
    q: '聚簇索引和非聚簇索引的区别？',
    a: '聚簇索引：数据行存储在索引叶子节点中，一个表只能有一个。非聚簇索引：叶子节点存储数据地址，一个表可以有多个。'
  },
  {
    q: '什么是索引最左前缀匹配原则？',
    a: '对于复合索引，查询条件从左向右依次匹配，遇到范围查询（>、<、between）停止匹配。例如 index(a,b,c) 可以用于 a、ab、abc 查询。'
  },
  {
    q: '什么情况下索引会失效？',
    a: '1. 使用函数或运算\n2. 类型转换\n3. LIKE 前缀匹配\n4. OR 连接不同字段\n5. NOT、!=、<> 操作\n6. 统计信息不准确'
  },
  {
    q: '如何分析 SQL 是否使用索引？',
    a: '使用 EXPLAIN 查看执行计划。关键字段：type（访问类型）、key（使用索引）、rows（扫描行数）、Extra（额外信息）。'
  },
  {
    q: 'SQL 优化有哪些常用手段？',
    a: '1. 避免 SELECT *，只查需要的字段\n2. WHERE 条件使用索引列，避免函数\n3. 批量操作代替循环单条\n4. 合理使用分页，避免大偏移量\n5. 使用 EXPLAIN 分析\n6. 避免子查询，用 JOIN 代替'
  },
  {
    q: '什么是慢查询？如何优化？',
    a: '慢查询是执行时间超过阈值的 SQL。优化：1. 分析执行计划 2. 添加合适索引 3. 优化 SQL 结构 4. 读写分离 5. 分库分表'
  },
  {
    q: 'MySQL 主从复制原理？',
    a: '1. 主库记录数据变更到 binlog\n2. 从库连接主库拉取 binlog\n3. 从库 relay log 回放执行\n4. 异步复制，有延迟'
  },
  {
    q: '主从延迟如何处理？',
    a: '1. 读从库前延迟检查\n2. 强制走主库（重要数据）\n3. 延迟复制（从库延迟 n 秒）\n4. 业务层降级'
  },
  {
    q: '什么是读写分离？',
    a: '主库处理写操作，从库处理读操作。通过配置主从复制实现，可以减轻数据库压力，提高系统吞吐量。'
  },
  {
    q: '什么是分库分表？适用场景？',
    a: '分库：按业务拆分到不同数据库。分表：单表数据量大时拆分为多张表。适用：数据量超过千万级或单表索引效率下降。'
  },
  {
    q: '分库分表有哪些方案？',
    a: '1. 垂直拆分：按业务/字段拆分\n2. 水平拆分：按数据拆分（哈希、取模）\n3. 常用中间件：ShardingSphere、MyCat'
  },
  {
    q: '分库分表的问题？',
    a: '1. 跨库查询困难\n2. 分布式事务问题\n3. 跨表分页困难\n4. ID 生成问题\n5. 运维复杂度增加'
  },
  {
    q: '什么是分布式 ID？如何实现？',
    a: '分布式 ID 是分布式系统中唯一标识。方案：1. UUID 2. Snowflake 算法 3. 数据库自增 4. Redis 自增 5. 美团 Leaf'
  },
  {
    q: 'MySQL 如何实现分布式事务？',
    a: '1. 两阶段提交（2PC）\n2. TCC 补偿事务\n3. 本地消息表\n4. 最大努力通知\n5. Seata 框架'
  },
  {
    q: '什么是锁？MySQL 有哪些锁？',
    a: '锁是数据库并发控制机制。分类：\n1. 共享锁/排他锁\n2. 表锁/行锁\n3. 意向锁\n4. 间隙锁/临键锁\n5. 乐观锁/悲观锁'
  },
  {
    q: '什么是死锁？如何避免？',
    a: '死锁：两个及以上事务互相等待对方释放资源。解决：1. 按固定顺序访问表\n2. 减少锁范围\n3. 设置锁超时\n4. InnoDB 自动检测回滚'
  },
  {
    q: 'MVCC 能解决幻读吗？',
    a: '在 REPEATABLE READ 级别，MVCC + Next-Key Lock 可以解决幻读。MVCC 解决快照读幻读，Next-Key Lock 解决当前读幻读。'
  },
  {
    q: '一条 SQL 在 MySQL 中的执行流程？',
    a: '1. 连接器（连接管理、权限验证）\n2. 查询缓存（8.0 移除）\n3. 分析器（词法/语法分析）\n4. 优化器（执行计划生成）\n5. 执行器（调用存储引擎）\n6. 存储引擎（数据读写）'
  }
];

mysqlQuestions.forEach(item => {
  addQuestion('数据库', item.q, item.a);
});

// ==================== Java 面试题 ====================
const javaQuestions = [
  {
    q: 'HashMap 的底层实现原理是什么？',
    a: 'JDK 1.8 之后，HashMap 底层采用数组+链表+红黑树。当桶中元素超过8个时，链表转为红黑树，低于6个时转回链表。数组+链表实现 O(1) 查找，红黑树保证最坏 O(log N)。'
  },
  {
    q: 'HashMap 和 Hashtable 有什么区别？',
    a: '1. HashMap 线程不安全，Hashtable 线程安全\n2. HashMap 允许 null key/value，Hashtable 不允许\n3. HashMap 初始容量 16，Hashtable 11\n4. HashMap 继承 AbstractMap，Hashtable 继承 Dictionary'
  },
  {
    q: 'ConcurrentHashMap 1.7 和 1.8 区别？',
    a: '1.7：Segment 分段锁，每个 Segment 继承 ReentrantLock。1.8：采用 CAS + synchronized，锁住链表头节点或红黑树根节点，粒度更细。'
  },
  {
    q: 'synchronized 和 ReentrantLock 有什么区别？',
    a: '1. synchronized 是 JVM 内置关键字，ReentrantLock 是 JDK 类\n2. ReentrantLock 支持公平锁/非公平锁\n3. ReentrantLock 支持 tryLock\n4. synchronized 自动释放锁，ReentrantLock 需手动释放'
  },
  {
    q: 'volatile 关键字的作用是什么？',
    a: '1. 保证可见性：一个线程修改对其他线程立即可见\n2. 禁止指令重排序\n注意：volatile 不能保证原子性（如 i++）'
  },
  {
    q: '什么是 happens-before 原则？',
    a: 'JMM 规定了两条线程间的偏序关系。如果 A happens-before B，则 A 的操作对 B 可见。包括：程序顺序规则、锁规则、volatile 规则等。'
  },
  {
    q: 'JVM 内存区域划分？',
    a: '堆：对象实例、数组\n栈：方法调用、局部变量\n方法区：类信息、常量、静态变量（JDK 8 后移至元空间）\n本地方法栈：native 方法\n程序计数器：字节码行号'
  },
  {
    q: '什么是 OOM？如何排查？',
    a: 'OOM（OutOfMemoryError）内存溢出。排查：1. 添加 -XX:+HeapDumpOnOutOfMemoryError 生成堆快照\n2. 使用 MAT、JProfiler 分析\n3. 检查对象是否被正确释放'
  },
  {
    q: 'JVM 垃圾回收算法有哪些？',
    a: '1. 标记-清除：效率低、产生碎片\n2. 复制算法：用于新生代，效率高但空间利用率低\n3. 标记-整理：老年代使用，无碎片'
  },
  {
    q: '常见的垃圾收集器有哪些？',
    a: '新生代：Serial、ParNew、Parallel Scavenge\n老年代：Serial Old、Parallel Old、CMS\n整堆：G1、ZGC、Shenandoah'
  },
  {
    q: 'CMS 和 G1 的区别？',
    a: 'CMS：老年代并发收集，标记-清除算法，产生碎片。G1：面向整堆，标记-整理，可预测停顿时间，将堆分为多个 Region。'
  },
  {
    q: '类加载过程？',
    a: '加载 -> 验证 -> 准备 -> 解析 -> 初始化\n加载：读取 class 文件\n验证：文件格式、元数据验证\n准备：分配内存、初始化零值\n解析：符号引用转直接引用\n初始化：执行 static 代码块'
  },
  {
    q: '什么是双亲委派模型？',
    a: '类加载器先委托父类加载器处理，只有父类无法加载时才自己加载。优点：避免类被重复加载、防止核心 API 被篡改。'
  },
  {
    q: '线程池核心参数有哪些？',
    a: '1. corePoolSize：核心线程数\n2. maximumPoolSize：最大线程数\n3. keepAliveTime：空闲线程存活时间\n4. workQueue：任务队列\n5. threadFactory：线程工厂\n6. handler：拒绝策略'
  },
  {
    q: '线程池工作流程？',
    a: '1. 任务到来先检查核心线程\n2. 核心线程满则进入队列\n3. 队列满则创建临时线程\n4. 达到最大线程数则执行拒绝策略'
  },
  {
    q: 'AQS 是什么？',
    a: 'AQS（AbstractQueuedSynchronizer）是 Java 并发包核心，定义了锁的模板。核心：state 变量 + CLH 队列。ReentrantLock、Semaphore、CountDownLatch 都基于 AQS。'
  },
  {
    q: 'CAS 是什么？有什么问题？',
    a: 'CAS（Compare-And-Swap）乐观锁实现：比较预期值和内存值，相同则更新。问题：1. ABA 问题（加版本号）2. 自旋开销 3. 只能保证单个变量原子性'
  },
  {
    q: 'ThreadLocal 是什么？有什么问题？',
    a: 'ThreadLocal 为每个线程提供独立变量副本。问题：1. 内存泄漏（使用后要 remove）2. 线程池复用线程可能导致数据残留'
  },
  {
    q: 'Spring Bean 生命周期？',
    a: '实例化 -> 属性填充 -> 初始化 -> 销毁\n初始化：BeanNameAware、BeanFactoryAware、InitializingBean、postConstruct\n销毁：DisposableBean、preDestroy'
  },
  {
    q: 'Spring 循环依赖如何解决？',
    a: 'Spring 使用三级缓存解决：\n1. singletonObjects（一级）\n2. earlySingletonObjects（二级）\n3. singletonFactories（三级）\n通过提前暴露 bean 解决构造器循环依赖问题。'
  },
  {
    q: 'Spring 事务传播行为有哪些？',
    a: 'REQUIRED（默认）、REQUIRES_NEW、SUPPORTS、NOT_SUPPORTED、MANDATORY、NEVER、NESTED'
  },
  {
    q: 'Spring MVC 工作流程？',
    a: '1. 请求到 DispatcherServlet\n2. HandlerMapping 找处理器\n3. 执行拦截器 preHandle\n4. HandlerAdapter 调用处理器\n5. 返回 ModelAndView\n6. 拦截器 postHandle\n7. ViewResolver 渲染视图\n8. 执行拦截器 afterCompletion'
  },
  {
    q: 'MyBatis 缓存机制？',
    a: '一级缓存：SqlSession 级别，默认开启，作用域为 SqlSession\n二级缓存：Mapper 级别，需手动开启，作用域为 Mappernamespace，可以跨 SqlSession'
  },
  {
    q: 'Spring Boot 自动配置原理？',
    a: '1. @SpringBootApplication 包含 @EnableAutoConfiguration\n2. Spring Boot 通过 SPI 加载 META-INF/spring.factories\n3. 根据条件注解（@Conditional）判断是否生效\n4. 通过 @ConfigurationProperties 绑定配置'
  }
];

javaQuestions.forEach(item => {
  addQuestion('Java', item.q, item.a);
});

// ==================== 并发编程 面试题 ====================
const concurrencyQuestions = [
  {
    q: '创建线程的方式有哪些？',
    a: '1. 继承 Thread 类\n2. 实现 Runnable 接口\n3. 实现 Callable 接口配合 FutureTask\n4. 使用线程池（推荐）'
  },
  {
    q: 'start() 和 run() 有什么区别？',
    a: 'start() 是启动新线程，线程进入就绪状态，等待 CPU 调度。run() 是普通方法调用，在主线程执行，不会创建新线程。'
  },
  {
    q: 'sleep() 和 wait() 有什么区别？',
    a: '1. sleep 是 Thread 方法，wait 是 Object 方法\n2. sleep 不释放锁，wait 释放锁\n3. sleep 时间到自动唤醒，wait 需要 notify/notifyAll 唤醒'
  },
  {
    q: 'notify() 和 notifyAll() 有什么区别？',
    a: 'notify() 随机唤醒一个等待的线程，notifyAll() 唤醒所有等待的线程。被唤醒的线程需要重新竞争锁。'
  },
  {
    q: 'synchronized 锁升级过程？',
    a: '无锁 -> 偏向锁 -> 轻量级锁 -> 重量级锁\n偏向锁：对象头存储线程 ID\n轻量级锁：CAS 自旋\n重量级锁：阻塞线程，操作系统 mutex'
  },
  {
    q: '什么是偏向锁？为什么要废除？',
    a: '偏向锁在无竞争情况下减少同步开销。但偏向锁撤销需要 STW，所以 JDK 15 废除偏向锁，改为直接使用轻量级锁。'
  },
  {
    q: '死锁的四个必要条件？',
    a: '1. 互斥条件：资源只能被一个线程持有\n2. 请求并持有：持有资源同时请求其他资源\n3. 不可剥夺：资源不可强行夺走\n4. 循环等待：线程间形成环形链'
  },
  {
    q: '如何避免死锁？',
    a: '1. 按固定顺序获取锁\n2. 设置锁超时时间\n3. 使用可打断锁\n4. 减少锁使用范围\n5. 避免嵌套锁'
  },
  {
    q: '什么是守护线程？',
    a: '守护线程是为其他线程服务的线程，如 GC 线程。当所有用户线程结束，守护线程自动终止。设置：thread.setDaemon(true)。'
  },
  {
    q: '线程的状态有哪些？',
    a: 'NEW（新建）、RUNNABLE（就绪/运行）、BLOCKED（阻塞）、WAITING（等待）、TIMED_WAITING（超时等待）、TERMINATED（终止）'
  },
  {
    q: 'Future 和 CompletableFuture 区别？',
    a: 'Future 不能组合操作，get() 阻塞。CompletableFuture 支持流式调用、任务组合、回调，更适合异步编程。'
  },
  {
    q: '什么是伪共享？如何解决？',
    a: '伪共享：缓存行中多个变量被不同线程修改，导致缓存行失效。解决：1. 使用 @Contended 注解\n2. 字节填充让变量独占缓存行'
  },
  {
    q: '什么是 Fork/Join 框架？',
    a: 'Fork/Join 是并行计算框架，使用分治算法。将大任务拆分为小任务并行处理，最后合并结果。WorkStealing 模式，空闲线程偷任务。'
  },
  {
    q: '什么是 Phaser？',
    a: 'Phaser 是 JDK 7 的同步屏障，支持动态注册 parties。适用于多线程分阶段任务，比 CountDownLatch 和 CyclicBarrier 更灵活。'
  },
  {
    q: 'StampedLock 是什么？',
    a: 'StampedLock 是 JDK 8 的锁实现，支持乐观读、悲观读、写锁三种模式。比 ReadWriteLock 性能更好，支持锁降级。'
  }
];

concurrencyQuestions.forEach(item => {
  addQuestion('并发编程', item.q, item.a);
});

// ==================== 微服务 面试题 ====================
const microserviceQuestions = [
  {
    q: 'Spring Cloud 和 Dubbo 有什么区别？',
    a: '1. Spring Cloud 是全家桶方案，Dubbo 是 RPC 框架\n2. Dubbo 使用 RPC 调用性能高，Spring Cloud 使用 HTTP REST\n3. Spring Cloud 生态更完善\n4. 注册中心：Nacos/Eureka vs Zookeeper'
  },
  {
    q: 'Nacos 的实现原理？',
    a: '1. 服务注册：Provider 启动时向 Nacos 注册\n2. 服务发现：Consumer 从 Nacos 获取 Provider 列表\n3. 负载均衡：集成 Ribbon 实现客户端负载\n4. 配置管理：配置变更推送到客户端'
  },
  {
    q: 'Sentinel 和 Hystrix 区别？',
    a: '1. Sentinel 是面向流量控制，Hystrix 是面向隔离\n2. Sentinel 支持更丰富的流量控制策略\n3. Sentinel 基于滑动窗口统计，Sentinel 性能更好'
  },
  {
    q: '什么是服务雪崩？如何处理？',
    a: '服务雪崩：服务依赖链中某个服务不可用，导致级联失败。处理：1. 限流 2. 熔断 3. 隔离 4. 超时控制 5. 服务降级'
  },
  {
    q: '熔断和降级有什么区别？',
    a: '熔断：下游服务不可用时快速失败，保护调用方\n降级：服务不可用时返回兜底数据\n熔断是保护调用方，降级是保护被调用方'
  },
  {
    q: '什么是流量控制？有哪些策略？',
    a: '流量控制限制请求速率。策略：1. 直接拒绝 2. 冷启动 3. 匀速排队。Sentinel 基于响应时间、QPS、并发数等多维度控制。'
  },
  {
    q: 'Seata 分布式事务模式？',
    a: '1. AT 模式：自动生成回滚 SQL，无需业务代码\n2. TCC 模式：手动编写 try/confirm/cancel\n3. SAGA 模式：长事务处理\n4. XA 模式：强一致性'
  },
  {
    q: '什么是幂等性？如何实现？',
    a: '幂等性：同一操作执行一次和多次结果相同。实现：1. 数据库唯一约束 2. 分布式锁 3. 状态机 4. Token 机制'
  },
  {
    q: '网关的作用是什么？',
    a: '1. 路由转发\n2. 限流熔断\n3. 认证授权\n4. 日志监控\n5. 协议转换\n常用网关：Spring Cloud Gateway、Kong、Zuul'
  },
  {
    q: '什么是链路追踪？有哪些实现？',
    a: '链路追踪追踪请求在分布式系统的完整调用链。实现：Skywalking、Jaeger、Zipkin、Sleuth+Zipkin'
  }
];

microserviceQuestions.forEach(item => {
  addQuestion('微服务', item.q, item.a);
});

// ==================== 系统设计 面试题 ====================
const systemDesignQuestions = [
  {
    q: '如何设计一个短链接系统？',
    a: '1. 短码生成：哈希或自增 ID 转 62 进制\n2. 存储：Redis + MySQL（Redis 缓存热点数据）\n3. 302 重定向\n4. 考虑并发和存储成本'
  },
  {
    q: '如何设计一个秒杀系统？',
    a: '1. 页面静态化，减少服务端压力\n2. 验证码，控制请求频率\n3. 消息队列削峰\n4. 库存预扣减，防止超卖\n5. 分布式锁保证一致性\n6. 限流熔断保护'
  },
  {
    q: '如何设计一个分布式 ID 生成器？',
    a: '1. UUID：简单但无序、占用空间大\n2. Snowflake：时间戳 + 机器 ID + 序列号，有序\n3. 数据库自增：性能瓶颈\n4. Redis 自增：依赖 Redis 可用性'
  },
  {
    q: '如何设计一个排行榜？',
    a: '1. Redis ZSet：score 为积分，ZREVRANGE 获取 TopN\n2. 定期持久化到数据库\n3. 分桶：将排行榜按分数段分桶'
  },
  {
    q: '如何设计一个延时任务系统？',
    a: '1. Redis ZSet + 定时轮询\n2. RabbitMQ 延迟队列\n3. 时间轮算法\n4. JDK ScheduledThreadPool'
  },
  {
    q: '如何设计一个接口幂等性方案？',
    a: '1. 唯一 Token 机制\n2. 悲观锁：select where id = ? for update\n3. 乐观锁：version 字段\n4. 分布式锁'
  },
  {
    q: '如何设计一个分布式锁？',
    a: '1. Redis SET NX PX + value 唯一\n2. Redisson 实现\n3. Zookeeper 临时有序节点\n4. 数据库唯一索引'
  },
  {
    q: '什么是 CAP 理论？',
    a: 'CAP 理论：分布式系统只能同时满足 Consistency（一致性）、Availability（可用性）、Partition tolerance（分区容错性）中的两个。\nCP：Redis、HBase、Zookeeper\nAP：Eureka、Cassandra'
  },
  {
    q: '什么是 Base 理论？',
    a: 'Base 理论是对 CAP 中一致性和可用性权衡的结果：\nBasically Available：基本可用\nSoft state：软状态\nEventually consistent：最终一致'
  },
  {
    q: '如何保证接口限流？',
    a: '1. 计数器算法：简单但不平滑\n2. 滑动窗口算法：更精确\n3. 漏桶算法：匀速处理\n4. 令牌桶算法：允许突发流量（Guava RateLimiter）'
  }
];

systemDesignQuestions.forEach(item => {
  addQuestion('系统设计', item.q, item.a);
});

// 保存题库
const outputPath = path.join(__dirname, '..', 'data', 'questions.json');
fs.writeFileSync(outputPath, JSON.stringify(questions, null, 2), 'utf-8');

console.log(`题库生成完成！`);
console.log(`分类数：${questions.categories.length}`);
console.log(`题目数：${questions.questions.length}`);
console.log(`保存路径：${outputPath}`);
