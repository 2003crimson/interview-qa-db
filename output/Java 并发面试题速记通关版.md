# Java 并发⾯试题速记通关版



推荐更多免费学编程资源：

1.编程导航学习网站：学编程、做项目、拿Offer！

2.企业高频面试题库：开始刷题，面试遇原题！

3.精选简历模板大全：1分钟搞定简历！

4.AI资源导航网站：获取最新AI黑科技！

5.1对1模拟面试：随时随地提升面试能力

## 多线程并发同步数据时（数据库的数据同步到数仓中）需要注意什么问题？

多线程做数据库到数仓的数据同步，本质是在解决⼀致性和性能的平衡问题。你得先想清楚数据从哪来、怎么拉、怎么写。

1）拉取数据时别直接 SELECT \* FROM table ，⼤表⼀查就卡住，还可能把数据库连接池搞崩。⼀般⽤⾃增ID或时间戳做分⽚，⽐如按ID范围切任务，每个线程处理⼀段，这样能并⾏拉数据。如果是MySQL，可以考虑 WHEREid BETWEEN ? AND ? 配合索引。

2）多个线程往数仓写数据，必须避免重复写或漏写。常⻅做法是每个线程处理的数据块带唯⼀标识，在数仓侧做幂等，⽐如Hive或ClickHouse写⼊前先检查分区是否存在，或者⽤事务型表引擎（如Iceberg）提交时做原⼦替换。

3）共享状态要⼩⼼。⽐如有个全局计数器记录同步进度，多个线程更新它就得加锁，但其实更好的⽅式是让每个线程独⽴汇报进度，由协调者汇总，压根不经过临界区。

4）异常处理不能少。某个线程挂了，任务得能重试，但⼜要防⽌重复同步。通常把任务状态存到外部存储，⽐如ZooKeeper 或数据库⾥的任务表，失败后可恢复。

5）别忽视数据库的负载。并发太⼤，源库的 CPU、IOPS 可能扛不住。⼀般控制并发线程在 10\~20 个以内，配合限流，像Canal或DataX实际也是这么⼲的。

<!-- image-->

## Java线程安全的集合有哪些?

Java⾥线程安全的集合主要分两类，⼀类是⽼古董级别的同步容器，另⼀类是并发包⾥的⾼性能⽅案。

早期的 Vector 和 Hashtable 确实是线程安全的，⽅法都加了 synchronized，但问题是粒度太粗，同⼀时刻只能⼀个线程操作，性能差。Collections.synchronizedXxx 包装出来的集合也是类似机制，基本不推荐在新项⽬⾥⽤。

真正扛住⾼并发的是 java.util.concurrent（JUC）包⾥的家伙。⽐如 ConcurrentHashMap，它把数据分成多个segment（JDK 7）或者⽤ CAS + synchronized 控制桶（JDK 8+），写操作基本不阻塞读，吞吐量能到 HashMap 的80% 以上。实际开发中，只要涉及并发读写映射表，⼀律上 ConcurrentHashMap。

List ⽅⾯，CopyOnWriteArrayList 适合读多写少场景，⽐如监听器列表。每次修改都会复制整个数组，写代价⼤，但读完全⽆锁。Set 可以⽤ CopyOnWriteArraySet 或者⽤ ConcurrentHashMap 的 key 来模拟。

Queue 更丰富。BlockingQueue 接⼝下有⼀堆实现，ArrayBlockingQueue 是有界阻塞队列，基于数组；LinkedBlockingQueue 默认容量 2147483647，适合做⽣产者消费者缓冲；ConcurrentLinkedQueue 是⽆锁链表队列，⾮阻塞⾼吞吐。

<!-- image-->

Java创建线程池有哪些⽅式？

Java⾥创建线程池，最核⼼的⽅式就是通过 ThreadPoolExecutor 构造函数来搞，其他都是它的封装。

1）直接⽤ new ThreadPoolExecutor(...) ，把核⼼参数全配⼀遍：核⼼线程数、最⼤线程数、空闲存活时间、⼯作队列、拒绝策略。这种⽅式最灵活，Spring 的 @Async 底层就推荐⾃⼰定义这种线程池。

2）⽤ Executors ⼯⼚类，但它提供的⼏种快捷⽅式得⼩⼼：

newFixedThreadPool ：固定⼤⼩线程池，但⽤的是 LinkedBlockingQueue ，队列⽆界，请求⼀多内存容易炸。

newCachedThreadPool ：看似弹性强，但最⼤线程数是 Integer.MAX_VALUE ，瞬间⾼并发下会创建⼏万个线程，系统直接扛不住。

newSingleThreadExecutor ：本质就是单线程加⽆界队列，跟第⼀种⼀样有内存⻛险。

newScheduledThreadPool ：适合定时任务，类似 Timer 的升级版，可以⽤。

其实阿⾥巴巴规约⾥明确说了，禁⽌使⽤ Executors 创建线程池，就怕⼤家图省事踩坑。⽣产环境应该⼿动 newThreadPoolExecutor ，把每个参数都控制住。

new ThreadPoolExecutor(  
4, // 核⼼线程  
8, // 最⼤线程  
60L, // 空闲存活秒数  
TimeUnit.SECONDS,  
new ArrayBlockingQueue<>(100), // 有界队列  
new ThreadPoolExecutor.CallerRunsPolicy() // 拒绝策略  
);

队列选 ArrayBlockingQueue 这种有界的，拒绝策略根据业务选，⽐如记录⽇志或让调⽤者⾃⼰执⾏。

## Synchronized修饰静态⽅法和修饰普通⽅法有什么区别？

synchronized修饰普通⽅法时，锁的是当前实例对象，也就是 this 。多个线程访问同⼀个对象的这个⽅法时才会互斥，如果是不同对象，压根不经过同⼀把锁，⾃然不互斥。

修饰静态⽅法时，锁的是类的 Class 对象，⽐如 MyClass.class 。所有该类的实例调⽤这个静态⽅法时，都得竞争这⼀把锁。本质上是类级别的同步，和具体实例⽆关。

举个例⼦，你⽤ synchronized 修饰 UserService 的普通⽅法，那每个 UserService 实例都有⾃⼰的锁。  
但要是修饰的是静态⽅法，哪怕你 new 了 10 个 UserService ，这 10 个实例也共⽤⼀把锁。

代码上看：

public class UserService {   
public synchronized void instanceMethod() {   
// 锁 this   
}   
public static synchronized void staticMethod() {   
// 锁 UserService.class   
}   
}

所以关键在于锁的粒度。普通⽅法锁实例，适合保护实例级别的状态；静态⽅法锁类，适合保护类级别的共享资源，⽐如静态缓存、计数器等。搞不定并发问题的时候，先想清楚你要保护的是实例数据还是全局数据。

<!-- image-->

## Java 中 Thread.sleep(0) 的作⽤是什么？

让出 CPU 时间⽚，触发线程调度。

1） Thread.sleep(0) 并不会真正“睡”⼀段时间，⽽是向操作系统发出⼀个“我愿意放弃当前时间⽚”的信号。  
这时候调度器可以重新评估哪个线程该运⾏，避免当前线程⼀直霸占 CPU。

2）在JVM层⾯，这会直接调⽤底层系统的纳秒级睡眠接⼝，传0表⽰不强制休眠时⻓，但依然会进⼊调度流程。有些系统上等价于 yield() ，但更重量⼀点，因为它会进⼊阻塞状态再唤醒。

3）典型使⽤场景是：你在写⼀个⾼频率轮询的循环，⼜不想完全吃满CPU。⽐如早期AQS在抢锁失败时的⾃旋控制，或者某些⽆锁算法中主动降低竞争强度。

while (flag) {  
if (condition()) break;  
Thread.sleep(0); // 主动让出时间⽚，减少 CPU 消耗  
}

4）和 Thread.yield() 的区别在于， yield() 只是建议调度器切换，⽽ sleep(0) ⼀定会进⼊定时器等待队列再被唤醒，开销稍⼤，但⾏为更确定。

这个操作在现代并发编程⾥很少⼿动写了，像 LockSupport.park() 或者 synchronized 优化后的⾃旋机制都做得更智能了。但在理解线程调度逻辑时，它是个很好的切⼊点。

## Java中如何创建多线程？

创建多线程在Java⾥最常⽤的就两种⽅式：继承Thread类和实现Runnable接⼝。其实本质上都是靠Thread对象来启动线程，只是任务定义的⽅式不同。

## 1）直接 new Thread，重写 run ⽅法

这种⽅式简单直观，但⼀般不推荐，因为Java不⽀持多继承，你继承了Thread就没法再继承别的类了。

new Thread() {   
public void run() {   
System.out.println("我在⼦线程运⾏");   
}   
}.start();

2）实现 Runnable 接⼝，把任务传给 Thread

更灵活，解耦了任务和线程本⾝。你现在写的任务类可以交给 Thread，也可以交给线程池，⽐如提交给ThreadPoolExecutor。

```java
Runnable task = () -> System.out.println("通过 Runnable 执⾏");
new Thread(task).start();
```

## 3）⽤ Callable + FutureTask 拿返回值

如果需要线程执⾏完后返回结果，就得⽤ Callable。它能抛异常、有返回值，配合 FutureTask 使⽤。

```java
Callable<Integer> call = () -> {
return 42;
};
FutureTask<Integer> future = new FutureTask<>(call);
new Thread(future).start();
Integer result = future.get(); // 阻塞等待结
```

现在实际开发中，⼏乎不会⼿动newThread。⾼并发场景都⽤线程池，⽐如⽤Executors⼯⼚类创建，背后其实是封装了 ThreadPoolExecutor，能复⽤线程、控制资源，避免频繁创建线程把系统搞崩。

## 为什么 Netty 不使⽤ ThreadLocal ⽽是⾃定义了⼀个 FastThreadLocal ？

Netty对性能的要求⾮常极致，特别是在⾼并发场景下处理海量连接时，连 ThreadLocal 的微⼩开销都可能成为瓶颈。JDK原⽣的 ThreadLocal 在查找和写⼊时使⽤线性探测法，底层是哈希表结构，⼀旦发⽣哈希冲突就得不断探查，最坏情况时间复杂度接近O(n)。更关键的是，每个 ThreadLocal 实例都要计算hashcode，还要处理扩容、内存泄漏等问题。

FastThreadLocal换了个思路，它为每个 FastThreadLocal 分配⼀个唯⼀的索引下标，存储数据直接通过数组下标访问，相当于把哈希查找变成了数组寻址，操作是O(1)且稳定。这个数组挂在FastThreadLocalThread上，读写就像访问 thread.array[index] ⼀样快，压根不经过哈希计算和冲突处理。

这种设计在Netty这种需要频繁绑定上下⽂信息（⽐如事件循环中的任务上下⽂）的场景⾥优势明显。像在EventLoop 中每个任务都需要隔离状态，⽤ FastThreadLocal 能让每次获取上下⽂的速度保持恒定，不会因为 key 多

了变慢。

## 代码上体现也很简单：

```java
public class FastThreadLocal<T> {
private final int index;
public FastThreadLocal() {
}
public final void set(T value) {
InternalThreadLocalMap threadMap = InternalThreadLocalMap.get();
threadMap.setIndexedVariable(index, value);
}
}
```

整个机制依赖预分配索引+数组直接存取，牺牲了⼀点内存（每个线程持有较⼤数组），换来了极致的访问速度。对于Netty来说，这点内存代价完全值得。

## 说说 AQS 吧？

AQS，也就是 AbstractQueuedSynchronizer，是 Java 并发包⾥构建锁和同步器的底层基础。像 ReentrantLock、Semaphore、CountDownLatch 这些都是基于它实现的。

它的核⼼是⽤⼀个volatile修饰的int类型state来表⽰同步状态，⽐如加锁次数、信号量许可数。线程通过CAS去修改state，改成功就拿到资源，改失败就进等待队列。

这个等待队列是个双向链表，也叫CLH队列，每个节点代表⼀个线程。没抢到锁的线程会被包装成Node⼊队，然后挂起。前⾯的线程释放资源后，会唤醒后继节点，实现公平调度。

AQS把具体的获取和释放逻辑留给⼦类实现，⽐如tryAcquire和tryRelease，⾃⼰只管排队和阻塞这些脏活累活。这种模板模式让开发者能⽅便地定制⾃⼰的同步组件。

1）独占模式下，只有⼀个线程能拿到 state，⽐如 ReentrantLock

2）共享模式下，多个线程可以同时拿到，⽐如 Semaphore 控制并发数

3）⽀持公平和⾮公平策略，是否让新来的线程插队

<!-- image-->

注意AQS不是万能的，如果场景只是简单计数或⼀次性事件，直接⽤JDK提供的现成⼯具更稳妥，没必要重复造轮⼦。

## ThreadLocal 的缺点？

ThreadLocal看起来是个解决线程安全的银弹，但⽤不好反⽽会埋雷。最头疼的就是内存泄漏问题。每个线程的

ThreadLocalMap ⾥，键是弱引⽤指向 ThreadLocal 实例，值是强引⽤。⼀旦 ThreadLocal 实例被回收了，键变成null，但值还占着内存，GC拿它没辙。这种entry就成了“脏数据”，尤其在线程池场景下，线程⻓期存活，这些泄漏的对象越积越多，可能直接把堆撑爆。

1）线程池复⽤线程时，如果不⼿动调⽤remove，上⼀个任务的ThreadLocal数据可能被下⼀个任务误读，出现数据串扰。这在Web容器如Tomcat⾥特别常⻅，请求处理完不清理，下次可能拿到旧⽤户信息。

2）⼤量使⽤ThreadLocal会增加单个线程的内存开销，尤其是存了⼤对象。本来想避免共享，结果每个线程都持有⼀份副本，内存占⽤翻N倍，N就是活跃线程数，⼏百个线程就是⼏百份。

3）调试困难。ThreadLocal的数据隐式传递，堆栈⾥看不到上下⽂传递链，排查问题时得⼀层层去挖，⽇志也得⼿动注⼊上下⽂，否则trace不到源头。

```scss
// 正确姿势：务必 try-finally 中 remove
try {
userIdHolder.set(123L);
// 业务逻辑
} finally {
userIdHolder.remove(); // 清理，避免泄漏和污染
}
```

所以 ThreadLocal 适合传⽣命周期短、必清理的上下⽂，⽐如⼀次请求的⽤户⾝份、事务 ID。像TransmittableThreadLocal 这种能解决线程池传递的⼯具，底层也是靠包装任务做⾃动清理，本质还是补救措施。

## Java 中的 InheritableThreadLocal 是什么？

InheritableThreadLocal 解决的是⽗⼦线程间 ThreadLocal 数据传递的问题。普通 ThreadLocal 在⼦线程⾥是拿不到值的，因为每个线程的 threadLocals 是独⽴的 map。

但 InheritableThreadLocal 能让⼦线程创建时，把⽗线程当前的 inheritableThreadLocals ⾥的数据拷⻉⼀份到⾃⼰⾝上。这个动作发⽣在newThread()的时候，调⽤的是Thread类⾥的init⽅法。

有两个关键点要注意：1）它是⼀次性拷⻉，⽗线程后续修改不影响已创建的⼦线程。2）⼦线程再创建⼦⼦线程也能继续传递，但中间如果⽗线程变了，下层线程也不会感知。

常⻅于需要上下⽂透传的场景，⽐如⽇志链路追踪 ID、⽤户登录上下⽂。像阿⾥开源的 TLog 或 SkyWalking 的上下⽂传播，底层就会⽤到它做基础⽀撑。

不过在池化线程场景下会出问题，因为线程复⽤导致可能继承到上⼀个任务的脏数据。这时候就得靠Alibaba的TransmittableThreadLocal来补救，它通过重写线程池的提交逻辑来实现动态传递。

代码上看，其实就是重写了 childValue ⽅法：

public class InheritableThreadLocal<T> extends ThreadLocal<T> {   
protected T childValue(T parentValue) {   
return parentValue;

整个机制依赖 Thread 类内部两个字段：threadLocals 和 inheritableThreadLocals，都是由 ThreadLocalMap 持有。

<!-- image-->

## Java 中使⽤ ThreadLocal 的最佳实践是什么？

ThreadLocal本质是给每个线程提供独⽴的变量副本，避免共享带来的并发问题。⽤好了是神器，⽤不好就是内存泄漏的源头。

使⽤时第⼀个要注意的是初始化。别直接newThreadLocal()就⽤，尽量重写initialValue()⽅法，让第⼀次get时⾃动填充默认值。⽐如做⽇期格式化⼯具时，可以这样：

```cpp
private static final ThreadLocal<SimpleDateFormat> formatter =
new ThreadLocal<SimpleDateFormat>() {
@Override
protected SimpleDateFormat initialValue() {
return new SimpleDateFormat("yyyy-MM-dd");
}
};
```

重点在于清理。线程池⾥的线程会复⽤，如果不⼿动 remove，那这个 ThreadLocalMap ⾥的 Entry 就⼀直占着内存。尤其在Web服务这种基于线程池的场景下，请求⼀多，内存早晚被撑爆。所以通⽤做法是在finally块⾥执⾏remove。

1）⽤完⽴刻清理，尤其是在线程池环境中

2）优先使⽤静态final修饰ThreadLocal实例，防⽌到处乱声明

3）能⽤局部变量或⼊参传递解决的，就别上ThreadLocal

还有个坑是⽗⼦线程数据传递。原⽣ ThreadLocal 不⽀持，这时候得换 InheritableThreadLocal，但它对线程池也不友好。真要跨线程传上下⽂，推荐阿⾥开源的TransmittableThreadLocal，专⻔修了这问题。

最后提醒⼀点，别拿 ThreadLocal 当缓存⽤。它不是为⾼性能存储设计的，存⼤对象或者海量 key 肯定搞不定。

## 为什么 Java 中的 ThreadLocal 对 key 的引⽤为弱引⽤？

ThreadLocal 的 key 是弱引⽤，主要是为了解决内存泄漏的隐患。每个线程都有⾃⼰的 ThreadLocalMap，这个 map的key就是ThreadLocal实例，value是线程本地的值。如果这⾥⽤强引⽤，那么即使ThreadLocal实例在外部已经被置为null，只要线程还没结束，map⾥的key依然能被访问到，GC就没法回收它，造成内存泄漏。

使⽤弱引⽤后，当外部没有强引⽤指向ThreadLocal时，下⼀次GC就能把key回收掉，这时候key变成null，但value还在map⾥，这就是所谓的“脏entry”。如果不处理，value依然会累积。所以真正靠得住的做法是在调⽤remove()主动清理，像Tomcat复⽤线程池时就特别注意这点，不然可能⼏⼗个请求就搞不定内存。

虽然key是弱引⽤，但不能完全依赖它来避免内存泄漏。最佳实践是每次⽤完ThreadLocal都显式调⽤remove()，尤其是在⾼并发、⻓⽣命周期的线程场景下，⽐如使⽤线程池时。

1）弱引⽤让 key 可被回收，防⽌ ThreadLocal 实例本⾝泄漏

2）但 value 不会被⾃动清理，必须⼿动 remove()

3）不及时清理会导致Entry对象堆积，最终OOM

<!-- image-->

不要以为⽤了弱引⽤就万事⼤吉，弱引⽤只是减轻了泄漏⻛险，真正的安全还得靠主动清理。

Java 中的 ThreadLocal 是如何实现线程资源隔离的？

每个线程对 ThreadLocal 的访问都通过⼀个专属的 ThreadLocalMap 结构来存储数据，这就像是给每个线程配了⼀个独⽴的储物柜。

1） 每个 Thread 实例内部持有⼀个 ThreadLocalMap，key 是 ThreadLocal 实例的弱引⽤，value 是线程本地的值。

2） 调⽤ threadLocal.set(value) 时，JVM 会找到当前线程的 map，以当前 ThreadLocal 为 key 存⼊ value。

3） 调⽤ threadLocal.get() 时，也是从当前线程的 map ⾥取出对应 key 的值，⾃然拿不到其他线程的数据。

```java
private ThreadLocal<String> userId = new ThreadLocal<>();
// 线程 A
userId.set("user001");
System.out.println(userId.get()); // user001
// 线程 B
userId.set("user002");
System.out.println(userId.get()); // user002，不受 A 影响
```

这⾥的关键是内存结构隔离，不是靠锁或者同步机制。每个线程操作的是⾃⼰栈和堆中独⽴的部分，压根不经过共享区域。

常⻅坑是内存泄漏：虽然 key 是弱引⽤，但 value 是强引⽤。如果线程⻓期运⾏且 ThreadLocal 被置空，map ⾥的entry 可能 still hold 着 value，导致回收不了。所以⽤完记得调⽤ remove() 。

适⽤场景⽐如Web项⽬中⽤ThreadLocal存储⽤户登录信息（像SpringSecurity就这么⼲），或者数据库事务管理中绑定当前连接。但别滥⽤，尤其在线程池环境下，必须⼿动清理。

## 为什么在 Java 中需要使⽤ ThreadLocal？

ThreadLocal 的本质是给每个线程提供⼀个独⽴的变量副本，避免多线程下对共享变量的竞争。你不⽤加锁，也能实现线程安全。

1）每个线程访问⾃⼰的数据，彼此隔离。⽐如在Web应⽤⾥，⼀个请求对应⼀个线程，你想在整个调⽤链中传递⽤户信息或上下⽂，⼜不想⼀层层⼿动传参，就可以把⽤户信息存到ThreadLocal⾥。

2）典型场景是 Spring 的事务管理。同⼀个事务要求在同⼀线程内使⽤同⼀个数据库连接，Connection 就通过ThreadLocal绑定到当前线程，后续从数据源获取时直接命中，压根不经过重新创建。

3）内存泄漏是个⼤坑。ThreadLocal底层⽤了⼀个弱引⽤的Entry数组，但key是弱引⽤，value不是。如果ThreadLocal实例被回收了，key变成null，但value还占着内存，这时候就发⽣泄漏。所以⽤完⼀定要调remove()。

代码上很简单：

private static final ThreadLocal<UserInfo> context = new ThreadLocal<>();   
// 设置   
context.set(userInfo);   
// 获取   
UserInfo user = context.get();   
// 清理   
context.remove();

Tomcat线程池复⽤线程时，如果不清理，可能拿到的是上个请求的残留数据，出问题很难排查。所以set之后必须finally 块⾥ remove。

<!-- image-->

## Java中的final关键字是否能保证变量的可⻅性？

final关键字在Java中不仅能防⽌变量被重新赋值，还能在多线程环境下保证可⻅性，但这依赖于正确的使⽤场景。

1）对于引⽤类型，final能确保对象初始化完成后，其他线程看到的都是完全构造好的实例。⽐如单例模式中⽤private final 字段，配合构造完成后的发布，不需要额外同步就能安全共享。

2）Java内存模型规定，final字段的写操作不会被重排序到构造⽅法之外。这意味着⼀旦对象引⽤对其他线程可⻅，其所有final字段的值也⼀定可⻅。

3）⾮ final 字段则没有这个保障。即使主线程构造完对象并发布引⽤，其他线程仍可能读到未初始化或部分初始化的字段值。

## 代码⽰例：

public class FinalFieldExample {   
final int x;   
int y;   
public FinalFieldExample(int x, int y) {   
this.x = x; // final 写   
this.y = y; // 普通写   
}   
}

只要对象是正常构造（没有this逸出），x的值对所有线程都可⻅且⼀致。

但注意，final 不适⽤于后续修改。如果想让⾮ final 字段也有可⻅性，得靠 volatile 或 synchronized。

<!-- image-->

## Java中的线程安全是什么意思？

线程安全指的是多个线程同时访问某个类或⽅法时，其⾏为仍然正确，不会因为线程调度的交错⽽导致数据错误或状态不⼀致。关键在于共享变量和竞态条件。

1）如果⼀个类没有共享状态，⽐如全是局部变量，那它天⽣就是线程安全的。

2）如果有共享状态，⽐如成员变量或静态变量，就需要通过同步⼿段来保护，否则多个线程读写同⼀块内存就可能出问题。典型的例⼦是两个线程同时对 int counter 执⾏⾃增，结果可能只加了⼀次。

常⻅的保障⽅式包括：

使⽤ synchronized 关键字控制临界区

⽤ java.util.concurrent 包下的原⼦类，⽐如 AtomicInteger

采⽤ ThreadLocal 隔离变量副本

使⽤并发容器如 ConcurrentHashMap 替代 HashMap

public class Counter {   
private int count = 0;   
public synchronized void increment() {   
count++; // 操作需要原⼦性   
}   
}

上⾯这个例⼦中，synchronized 确保了 increment ⽅法在同⼀时刻只能被⼀个线程执⾏，压根不经过锁的线程进不来，从⽽避免了脏写。

反过来，像 ArrayList 就不是线程安全的，多线程下扩容可能引发死循环，这时候就得换成 CopyOnWriteArrayList 或者加锁处理。搞不定并发问题的代码，在⾼并发场景下很容易崩。

## 典型场景对⽐

<!-- image-->

## 你了解Java中的读写锁吗？

读写锁的核⼼在于允许多个读操作并发进⾏，但写操作必须独占。这种设计在读多写少的场景下能显著提升性能，⽐如缓存系统或配置中⼼。

Java⾥的 ReentrantReadWriteLock 就是典型实现。它内部维护了⼀对锁，⼀个读锁和⼀个写锁。读锁是共享的，写锁是排他的。多个线程可以同时持有读锁，只要没有线程在写。

1）当有线程持有写锁时，其他任何线程都⽆法获取读锁或写锁

2）当有线程持有读锁时，其他线程可以继续获取读锁，但不能获取写锁

3）写锁可以降级为读锁，但读锁不能升级为写锁，否则会死锁

## 代码上很简单：

ReentrantReadWriteLock lock = new ReentrantReadWriteLock();   
Lock readLock = lock.readLock();   
Lock writeLock = lock.writeLock();   
// 读操作   
readLock.lock();   
try {   
// 读取共享资源   
} finally {   
readLock.unlock();   
}   
// 写操作   
writeLock.lock();   
try {   
// 修改共享资源   
} finally {   
writeLock.unlock();   
}

要注意的是，锁降级需要⼿动控制顺序：先获取写锁，再获取读锁，然后释放写锁。反过来就不⾏。

使⽤不当容易造成饥饿问题，⽐如写线程⼀直抢不到锁，因为读线程太多。这时候可以考虑 StampedLock ，它⽀持乐观读，性能更好，但使⽤复杂度也更⾼。

## 什么是 Java 的 CAS（Compare-And-Swap）操作？

CAS（Compare-And-Swap）是 Java 并发编程⾥实现原⼦操作的⼀种底层机制，它直接由 CPU 提供指令⽀持，⽐如x86 的 cmpxchg 指令。这个操作包含三个参数：内存位置 V、预期旧值 A 和要更新的新值 B。只有当 V 位置的当前值等于A时，才会把V更新为B，否则什么都不做。整个过程是原⼦的，不会被线程调度打断。

Java ⾥的 Unsafe 类封装了这些底层操作，⽽我们⽇常⽤的 AtomicInteger 、 AtomicLong 等原⼦类就是基于它实现的。⽐如调⽤ incrementAndGet() ，底层其实就是不断⽤CAS尝试加1，直到成功为⽌。

<!-- image-->

这种机制避免了传统锁的阻塞问题，适合多读少写、竞争不激烈的场景。但也有⼏个坑得注意。1）ABA问题，就是值从 A 变成 B ⼜变回 A，CAS 会误判没变过，可以⽤ AtomicStampedReference 带版本号解决。2）⾃旋开销，如果冲突频繁，线程会⼀直重试，CPU占⽤可能飙⾼。3）只能保证单个变量的原⼦性，多个变量就得上锁或者⽤synchronized 。

代码上很简单：

```javascript
private AtomicInteger count = new AtomicInteger(0);
count.incrementAndGet(); // 底层就是 CAS ⾃旋
```

所以你看，像 ConcurrentHashMap 、 AQS 这些⾼并发组件，底层都⼤量依赖 CAS 来扛住并发压⼒，⼲的都是⽆锁同步的脏活累活。

## 什么是 Java 的 TransmittableThreadLocal？

ThreadLocal在⽗⼦线程间传递数据时会断掉，⽐如主线程set⼀个值，提交到线程池的⼦线程⾥就拿不到了。这在像 TraceId 透传、⽤户上下⽂传递这种全链路追踪场景下直接就搞不定了。

TransmittableThreadLocal就是为了解决这个问题⽣的。它能在任务提交到线程池时⾃动把当前线程的ThreadLocal值拷⻉到⼦线程，等任务执⾏完再恢复，整个过程对业务代码透明。

常⻅于像Hystrix、Dubbo、SkyWalking这些框架⾥做上下⽂透传。⽐如你⽤Alibaba的TTL库，只需要把原来的ThreadLocal 换成 TtlCallable 或 TtlRunnable 包⼀下提交的任务就⾏。

```javascript
TtlRunnable ttlRunnable = TtlRunnable.get(() -> {
System.out.println("child: " + TransmittableThreadLocalHolder.userId.get());
});
```

1）核⼼原理是在 submit 任务时 capture 当前线程的所有 TransmittableThreadLocal 值

2）执⾏前 re-play 到 worker 线程，执⾏完 clear 掉避免内存泄漏

3）底层靠的是重写线程池的 execute/submit ⽅法，或者⽤ Java Agent 字节码增强

<!-- image-->

注意别滥⽤，频繁提交短期任务时capture/copy开销不⼩。优先⽤于必须透传的场景，⽐如⽇志链路追踪、权限上下⽂。

## Java 中的 wait、notify 和 notifyAll ⽅法有什么作⽤？

wait 、 notify 和 notifyAll 是 Java 中⽤于线程间协作的机制，它们定义在 Object 类⾥，不是 Thread的⽅法，这点很多⼈⼀开始会搞混。

这三个⽅法必须在 synchronized 块或⽅法中调⽤，因为它们依赖于对象的内置锁（monitorlock）。⼀个线程只有持有该锁，才能安全地进⼊等待状态或唤醒其他等待者。

1） wait() 会让当前线程释放锁并进⼊阻塞状态，直到被其他线程通过 notify 或 notifyAll 唤醒。它相当于说“我暂时⼲不了活了，先歇着，有事叫我”。

2） notify() 会从该对象的等待队列中随机唤醒⼀个线程。注意是“⼀个”，不保证顺序，⽽且被唤醒的线程要重新竞争锁才能继续执⾏。

3） notifyAll() 则唤醒所有在该对象上等待的线程。虽然看起来浪费，但在⽣产者-消费者这类场景⾥更安全，⽐如 BlockingQueue 的实现通常就⽤ notifyAll 避免线程饥饿。

典型使⽤模式像这样：

synchronized (lock) {   
while (conditionNotMet) {   
lock.wait();   
}   
// 处理逻辑   
}

这⾥⽤ while ⽽不是 if ，是因为可能存在虚假唤醒（spurious wakeup），即使没⼈通知，线程也可能⾃⼰醒来。

如果多个线程等待不同条件，⽤ notify 可能只唤醒了⼀个⽆关线程，导致死锁。这种情况下必须⽤notifyAll ，或者改⽤ ReentrantLock 配合 Condition ，控制更精细。

<!-- image-->

Java中什么情况会导致死锁？如何避免？

死锁最经典的场景就是两个线程各⾃持有对⽅需要的锁，然后互相等。⽐如线程A拿了锁1，想去拿锁2；线程B拿了锁 2，却在等锁 1。结果谁也别想过去，卡死了。

这种情况要发⽣，得同时满⾜四个条件：

1）互斥：锁这东西本来就是排他的，同⼀时间只能⼀个线程⽤

2）占有并等待：我已经拿着⼀个锁了，还等着另⼀个

3）不可抢占：别⼈不能强⾏把我的锁拿⾛

4）循环等待：A等B，B等C，C⼜等A，形成闭环

只要打破其中⼀个，死锁就搞不定你。

最常⻅的避免⽅式是统⼀线程加锁顺序。⽐如⼤家都约定先申请ID⼩的锁，再申请ID⼤的。这样就不会出现A→B⽽B→A 的反向依赖。

还有⼀个办法是使⽤ tryLock 带超时，不傻等。⽐如⽤ ReentrantLock ，最多等5秒，拿不到就释放已有资源，退回来重试或者报错，⽽不是死磕。

<!-- image-->

实际开发⾥，像数据库的⾏锁、Redis分布式锁处理不当都容易出这问题。Spring⾥事务⽅法嵌套调⽤，如果加锁顺序乱来，也可能中招。最稳妥的还是设计阶段就想清楚资源依赖关系，别让锁的获取路径打结。

## Java 中 volatile 关键字的作⽤是什么？

volatile关键字主要解决多线程环境下的可⻅性和指令重排序问题。当⼀个变量被声明为volatile，JVM会保证这个变量的修改对所有线程⽴即可⻅，不会因为线程本地缓存导致读取到过期值。

1）每次读取volatile变量都会直接从主内存加载，每次写⼊也会⽴刻刷新回主内存，绕开了线程的⼯作内存。这使得⼀个线程的修改能被其他线程及时感知。

2）编译器和处理器不会对 volatile 写操作与其前⾯的读写操作进⾏重排序，同样也不会对 volatile 读操作与其后⾯的读写操作重排。这种内存屏障机制保证了代码执⾏顺序与程序逻辑⼀致。

但要注意，volatile不保证原⼦性。⽐如 i++ 这种复合操作，即使变量是volatile的，依然可能出错。需要原⼦性时得⽤ synchronized 或 AtomicInteger 这类⼯具。

<!-- image-->

典型使⽤场景是标志位控制，⽐如⽤ volatile boolean running = true; 来控制循环是否继续。像 Double-CheckedLocking模式中，单例对象引⽤也必须⽤volatile修饰，防⽌对象还没初始化完就被其他线程读到。

别拿它当 synchronized ⽤，搞不定复杂同步逻辑。简单状态标记、⼀次性安全发布，这些才是它的主战场。

## 什么是Java中的线程同步？

多个线程同时访问共享资源时，如果不加控制，数据就可能被改乱。⽐如两个线程同时对⼀个变量做 i++ ，结果可能只加了⼀次，这就是竞态条件。

要解决这个问题，就得让线程排队访问，这就是线程同步。Java 最常⽤的⼿段是 synchronized 关键字，它能保证同⼀时刻只有⼀个线程能执⾏某段代码。

⽐如⽤ synchronized 修饰⽅法或代码块：

synchronized (this) {   
count++;   
}

JVM会通过对象的监视器锁（Monitor）来实现，线程进⼊时尝试获取锁，拿不到就阻塞，拿到才能往下⾛，执⾏完⾃动释放。

除了 synchronized，还可以⽤ ReentrantLock 这种显式锁，灵活性更⾼，⽐如⽀持超时、可中断，但代码也更复杂。像 ConcurrentHashMap 就是⽤ CAS + synchronized 的组合来兼顾性能和安全。

1）synchronized 是 JVM 层⾯⽀持的，编译后会⽣成 monitorenter 和 monitorelease 指令

2）锁升级过程：⽆锁→偏向锁→轻量级锁→重量级锁，减少竞争不激烈时的开销

3）锁的是对象，不是代码，多个线程抢同⼀个对象的锁才会互斥

别忘了volatile，它不能保证原⼦性，但能禁⽌指令重排，适合状态标记场景。

<!-- image-->

## Synchronized 能不能禁⽌指令重排序？

synchronized 主要解决的是互斥性和可⻅性问题，它能保证同⼀时刻只有⼀个线程进⼊同步块，同时对共享变量的修改对后续进⼊的线程可⻅。⾄于指令重排序，它确实能限制⼀部分，但不是靠插⼊内存屏障那种精细控制。

Java 内存模型⾥，synchronized 的实现依赖于 monitor enter 和 exit，monitor enter 会触发⼀个 acquire 操作，exit 会触发 release 操作。acquire-release 语义能保证：在 monitor exit 之前的所有写操作，对下⼀次 acquire 同⼀把锁的线程来说都是可⻅的，并且不会被重排序到 exit 之后。同理，acquire 之后的操作也不会被重排序到它之前。

这相当于在锁释放时，把之前的写操作都“刷出去”，在获取锁时，强制重新加载共享变量。所以从效果上看，多个线程通过同⼀把锁同步时，不会看到彼此内部的指令重排结果。

但它不像 volatile 那样针对单个变量做读写屏障，它的边界是整个同步块。你不能指望 synchronized 去禁⽌某个特定变量的重排序，如果需要更细粒度控制，得⽤volatile或显式内存屏障。

1）锁的作⽤范围是代码块，不是变量

2）它靠 acquire-release 语义间接抑制重排

3）⽐volatile更重，但适合复合操作

<!-- image-->

说⽩了，它能“顺便”管住重排序，但不是为此设计的。

## Java 线程池内部任务出异常后，如何知道是哪个线程出了异常？

线程池⾥的任务抛了异常，如果没做特殊处理，异常信息会直接打印到控制台，但不会让线程池本⾝崩溃。默认情况下，ThreadPoolExecutor 会捕获任务执⾏中的 Throwable，然后调⽤ worker 的 afterExecute ⽅法。

想知道是哪个线程出了问题，最直接的办法就是重写afterExecute这个钩⼦⽅法。这个⽅法在任务执⾏完成后被调⽤，⽆论成功还是抛异常。你可以在这⾥拿到Runnable和可能抛出的Throwable。

1）可以在线程池提交任务前，把任务包装⼀下，在⾥⾯加 try-catch，⼿动记录线程名和堆栈。

2）更通⽤的做法是继承ThreadPoolExecutor，覆盖afterExecute⽅法，在⾥⾯打印当前线程名称和异常堆栈。

@Override   
protected void afterExecute(Runnable r, Throwable t) {if (t != null) {   
System.err.println("线程 [" + Thread.currentThread().getName() + "] 执⾏任务时   
出错: " + t);   
t.printStackTrace();   
}   
}

3）使⽤ submit 提交任务返回 Future，通过 future.get() 拿到 ExecutionException，再 getCause() 获取原始异常。  
这种⽅式适合需要精确控制异常处理的场景。

其实最常⻅的做法还是结合⽇志MDC，在任务开始时记录线程名、任务ID等上下⽂，这样即使异常被捕获，⽇志⾥也能对上号。像Dubbo、RocketMQ内部都是这么⼲的，出了问题⼀查⽇志就知道谁搞的。

## Java 线程池中 shutdown 与 shutdownNow 的区别是什么？

调⽤shutdown后，线程池状态变为SHUTDOWN，不再接受新任务，但会继续处理队列⾥的任务。正在执⾏的线程不会被中断，等它们跑完，队列空了，线程池才真正终⽌。

shutdownNow 则更激进，状态变成 STOP，同样不接收新任务，但它会尝试中断所有⼯作线程，包括正在运⾏的，并且把队列⾥还没处理的任务全部取出，返回给调⽤者。

所以关键区别在于是否中断进⾏中的任务，以及对任务队列的处理⽅式。

1）shutdown是优雅关闭，任务都能跑完，适合应⽤正常停机时使⽤，⽐如Spring容器关闭时触发。2）shutdownNow是强制关闭，可能有任务直接被打断，适⽤于需要快速响应终⽌的场景，⽐如服务健康检查失败要⽴即退出。 3）两者都不等线程池真正结束就返回，如果想同步等待，得配合 awaitTermination。

代码上⻓这样：

```javascript
executor.shutdown();
// 或
List<Runnable> remaining = executor.shutdownNow();
```

如果想确保清理彻底，⼀般先shutdown，再调⽤awaitTermination设定超时，超时后仍没结束再考虑shutdownNow 强制⼲预。

调用 shutdown 状态: SHUTDOWN 处理完队列任务后停止

调用shutdownNow 状态:STOP,中断线程 尝试中断所有任务

## Java 中 Thread.sleep 和 Thread.yield 的区别？

sleep 和 yield 都是线程让出执⾏权的⽅法，但⾏为完全不同。

1） Thread.sleep(long millis) 让当前线程强制进⼊阻塞状态，指定时间内不会参与CPU竞争。时间⼀到，线程进⼊就绪态，等待调度。这期间其他线程，包括优先级更低的，都能获得执⾏机会。⽐如你写个定时任务轮询，可以⽤ sleep 控制间隔。

try {   
Thread.sleep(1000); // 休眠 1 秒   
} catch (InterruptedException e) {   
Thread.currentThread().interrupt();   
}

2） Thread.yield() 只是建议当前线程让出CPU，从运⾏态回到就绪态，是否⽣效完全取决于操作系统调度器。它不保证任何时间的暂停，甚⾄可能被⽴刻再次选中。⼀般很少⽤，因为效果不可控。JVM 实现上，yield 通常会触发⼀次线程调度尝试，但不是阻塞。

关键区别在于：sleep会让线程阻塞⼀段时间，yield只是打个招呼说“我愿意让”。sleep会释放CPU但不释放锁，yield 同样不释放锁，但压根不经过阻塞队列。

实际开发中，sleep 常⽤于限流、重试间隔等场景，⽽ yield 基本⻅不到，除⾮在极特殊的性能调优场景下尝试减少线程竞争开销，但效果通常不如直接⽤并发⼯具类。

调用sleep 线程进入TIMED_WAITING 等待超时或中断 进入就绪态  
调用yield 线程回到就绪态 参与调度竞争 可能立即再次运行

在Java中主线程如何知晓创建的⼦线程是否执⾏成功？

主线程要感知⼦线程的执⾏结果，本质是做线程间通信，得靠共享状态或回调机制。

1）最直接的⽅式是⽤ Future + Callable 。⼦线程执⾏任务后返回结果，主线程通过 get() 拿结果或捕获异常。

Future<String> future = executor.submit(() -> {   
// ⼦线程逻辑   
return "success";   
});   
String result = future.get(); // 阻塞等待结果

2）如果⽤ Thread 原⽣⽅式，可以通过共享变量加 volatile 保证可⻅性，⼦线程执⾏完修改状态，主线程轮询或等待通知。

volatile boolean success = false;   
new Thread(() -> {   
try {   
// 执⾏任务   
success = true;   
} catch (Exception e) {   
success = false;   
}   
}).start();

3）更优雅的是⽤ CountDownLatch ，让主线程阻塞等待⼦线程完成。适⽤于只关⼼“是否完成”的场景。

```javascript
CountDownLatch latch = new CountDownLatch(1);
new Thread(() -> {
try {
// 业务逻辑
latch.countDown();
} catch (Exception e) {
latch.countDown();
}
}).start();
latch.await(); // 主线程等待
```

4）实际开发中，像 Spring 的 @Async 或 CompletableFuture 会更常⽤。后者能链式处理结果，⽀持成功和异常回调。

```javascript
CompletableFuture.supplyAsync(() -> {
return "result";
}).whenComplete((res, ex) -> {
if (ex == null) {
System.out.println("成功：" + res);
} else {
System.out.println("失败：" + ex.getMessage());
}
});
```

关键点在于，不要靠 isAlive() 或 join() 判断成功与否，它们只能知道线程状态，不知道业务成败。真正可靠的是拿到返回值或异常信息。

## Volatile 与 Synchronized 的区别是什么？

volatile 和 synchronized 都能保证多线程下的可⻅性，但它们的职责和实现机制差得远了。

volatile关键字只保证变量的可⻅性和禁⽌指令重排，不保证原⼦性。只要⼀个线程修改了volatile变量，新值会⽴刻刷到主内存，其他线程读这个变量时也直接从主内存拿。底层靠的是内存屏障（MemoryBarrier）来实现，⽐如在写volatile 变量前插⼊ StoreStore 屏障，后⾯加 StoreLoad 屏障。

synchronized则是重量级的同步机制，它保证可⻅性、原⼦性和有序性。它通过对象监视器（monitor）实现，进⼊同步块前必须获取锁，执⾏完后释放。同⼀时刻只有⼀个线程能进⼊临界区。它的可⻅性是因为解锁前会把变量刷新回主内存。

1）volatile 适合状态标志位场景，⽐如 private volatile boolean running = true; ，多个线程根据这个值决定是否退出循环。

2）synchronized 更适合复合操作，⽐如 i++，即便 i 是 volatile 的，⾃增也不是原⼦的，还是得上锁。

3）性能上，volatile⼏乎没有锁开销，⽽synchronized在JDK6之后做了优化，有偏向锁、轻量级锁等，但竞争激烈时还是会升级为互斥锁，影响吞吐。

## 代码⽰例：

```java
// volatile 使⽤
volatile boolean shutdownRequested;
public void shutdown() {
shutdownRequested = t rue;
}
public void doWork() {
while (!shutdownRequested) {
// 执⾏任务
}
}
```

synchronized ⽤起来简单，但别滥⽤，搞不定并发问题就全⽅法加 synchronized，这在⾼并发下根本扛不住。像ConcurrentHashMap 就是⽤分段锁 + volatile 来减少锁竞争，⽽不是⼀把⼤锁锁住所有操作。