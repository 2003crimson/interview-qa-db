# Java 集合⾯试题速记通关版



推荐更多免费学编程资源：

1.编程导航学习网站：学编程、做项目、拿Offer！

2.企业高频面试题库：开始刷题，面试遇原题！

4.AI资源导航网站：获取最新AI黑科技！

## ConcurrentHashMap 和 Hashtable 的区别是什么？

ConcurrentHashMap 和 Hashtable 都是线程安全的哈希表实现，但它们的并发控制策略完全不同。

Hashtable ⽤的是⽅法级别的 synchronized ，整个对象⼀把锁，任⼀时刻只有⼀个线程能访问。⽐如 get 、put 都是同步⽅法，竞争激烈时性能很差，10个线程只能串⾏执⾏。

ConcurrentHashMap 在 JDK 8 后采⽤ CAS + synchronized 的⽅式，只锁链表或红⿊树的头节点，锁粒度⼩得多。  
默认分成了16个段（桶），不同段之间操作互不⼲扰，写操作并发度能到16以上。

// put 操作不会阻塞读   
map.put("key", "value");   
// 读操作⼏乎⽆锁，利⽤ volatile 保证可⻅性   
String val = map.get("key");

Hashtable已经基本被淘汰，除了遗留系统外不建议使⽤。⾼并发场景下ConcurrentHashMap的吞吐量能⾼出⼀个数量级，像 Dubbo、RocketMQ 这些中间件⾥⼤量使⽤ ConcurrentHashMap 来缓存元数据或管理连接。

还有⼀个细节：ConcurrentHashMap 不允许 key 或 value 为 null，避免在判断 containsKey 和 get 返回 null时产⽣歧义。⽽ Hashtable 虽然允许 null 值，但实际⽤起来容易出 NPE，也不推荐。

## Java中的List接⼝有哪些实现类？

Java ⾥的 List 接⼝最常⽤的实现就三个：ArrayList、LinkedList，还有⼀个 CopyOnWriteArrayList。

ArrayList底层是数组，随机访问特别快，get和set基本是O(1)，但中间插⼊或删除元素得搬数据，平均是O(n)。它不是线程安全的，多线程写会出问题。平时⽤得最多，毕竟查得多改得少的场景太常⻅了，⽐如从数据库捞出⼀坨数据遍历展⽰。

LinkedList是双向链表，每个节点存前后指针。它的优势在头尾增删，addFirst、addLast都是O(1)，但随机访问要从头/尾⼀路找，get操作是O(n)。内存开销也⼤点，每个节点多两个引⽤。⼀般⽤得少，除⾮明确要在两端频繁操作，⽐如做队列，可以⽤它实现 Deque。

1）ArrayList：数组实现，查询快，增删慢（尤其中间），⾮线程安全

2）LinkedList：双向链表，头尾增删快，查询慢，内存占⽤⾼

3）CopyOnWriteArrayList：写时复制，读不加锁，写时复制整个数组再替换，适合读多写少的并发场景，⽐如监听器列表

代码上，平时声明都⽤ List 接⼝：

```dart
List<String> list = new ArrayList<>();
list.add("hello");
```

CopyOnWriteArrayList 虽然线程安全，但写操作代价⾼，⼤列表搞不定。如果只是单线程或者有外部同步，直接⽤ArrayList 就⾏。

## Java 中 ArrayList 和 LinkedList 有什么区别？

ArrayList 和 LinkedList 都是 List 接⼝的实现，但底层结构完全不同，带来的性能特征也差很多。

1）ArrayList内部⽤数组存储元素，查询快，增删慢。因为数组在内存中是连续的，通过下标访问能做到O(1)。但插⼊或删除元素时，后⾯的所有元素都得往前或往后挪，平均时间复杂度是 O(n)。⽽且数组有容量限制，满了就得扩容，⼀般是1.5倍扩容，会触发⼀次复制操作。

2）LinkedList 是双向链表，每个节点存前驱和后继指针。它的优势是插⼊和删除只改指针，只要找到位置就能 O(1)完成。但查找就得从头或尾开始遍历，最坏要⾛n/2步，所以随机访问慢。

⼀般情况下，90% 的场景都该⽤ ArrayList。除⾮你的业务逻辑频繁在中间插⼊删除，⽐如维护⼀个实时变动很⼤的队列，⽽且很少按索引查，才考虑LinkedList。

代码上看区别也很明显：

```java
List<String> list = new ArrayList<>();
list.add("a"); // 数组末尾加，基本不涉及移动
```

```java
List<String> linked = new LinkedList<>();
((LinkedList<String>) linked).addFirst("head"); // 头插，链表擅⻓的操作
```

别被“链表插⼊快”误导了，前提是“已经定位到位置”。如果还要先遍历找位置，那整体还是O(n)。真正⾼效的是在已知节点附近操作，⽐如迭代过程中⽤ ListIterator。

## 数据结构对⽐

## Java 中的 HashSet 和 HashMap 有什么区别？

HashSet 和 HashMap 虽然都是基于哈希表实现的集合类，但它们解决的问题不⼀样。

HashMap 是存键值对的，你给⼀个 key，它帮你关联⼀个 value。查找、插⼊、删除基本都在 O(1) 时间完成，前提是哈希分布均匀。它的底层是数组 + 链表（或红⿊树），冲突多了链表⻓度超过 8 就转成红⿊树，提升查找性能。

HashSet其实就是披着集合外⾐的HashMap。它内部持有⼀个HashMap实例，存元素时，把元素作为key，统⼀指向同⼀个静态 Object 对象作为 value。所以 HashSet 只能存不重复的元素，本质上是利⽤了 HashMap 的 key 不可重复特性。

1）HashMap 允许存放 null 键和 null 值，但最多⼀个 null 键。 2）HashSet 也允许⼀个 null 元素，原因同上。 3）遍历顺序不⼀定，除⾮⽤ LinkedHashMap 或 LinkedHashSet。

代码上看，HashSet 的 add ⽅法其实就是调⽤了 map.put(e, PRESENT) == null 来判断是否新增成功。

⼀般你要存映射关系就⽤ HashMap，只关⼼去重和存在性判断就⽤ HashSet，背后的脏活累活其实都是 HashMap 在扛。

## Java ArrayList 的扩容机制是什么？

ArrayList的扩容发⽣在添加元素时容量不⾜的情况下，整个过程其实就⼏步：先检查是否需要扩容，再按⽐例增⻓，最后复制数据。

1）添加元素前会判断当前size+1是否超过数组⻓度

4） 扩容后通过 System.arraycopy 将原数组数据拷⻉到新数组

初始容量默认是10。第⼀次add时如果没指定⼤⼩，会创建⼀个⻓度为10的数组。后续每次扩容都按1.5倍往上加，⽐如从 10 到 15，再到 22、33……直到 Integer.MAX_VALUE。

```java
private void grow() {
int oldCapacity = elementData.length;
int newCapacity = oldCapacity + (oldCapacity >> 1);
elementData = Arrays.copyOf(elementData, newCapacity);
}
```

频繁扩容会影响性能，因为每次都要内存分配和数组拷⻉。如果能预估数据量，建议初始化时直接指定容量，⽐如new ArrayList<>(1000) ，这样能避免中间多次扩容的开销。

扩容本⾝是脏活累活，但对上层透明。你只管add，它⾃动帮你扛住容量问题，前提是别在循环⾥⽆脑add⼤量数据⽽不预设容量。

## 什么是Hash碰撞？怎么解决哈希碰撞？

哈希碰撞指的是不同的输⼊数据经过哈希函数计算后，得到了相同的哈希值。这种情况在实际使⽤中⼏乎是不可避免的，毕竟哈希空间有限，⽽输⼊可能是⽆限的。

⽐如⽤ HashMap 存储键值对时，两个不同的key算出来的hash值⼀样，就会发⽣碰撞。这时候如果不处理，数据就会被覆盖或者丢失。

解决哈希碰撞主要有两种常⻅⽅式：

## 1）链地址法（Separate Chaining）

每个哈希桶对应⼀个链表或红⿊树，所有哈希到同⼀位置的元素都存放在这个结构⾥。Java 的 HashMap 就是这么⼲的。当链表⻓度超过 8 且数组⻓度⼤于 64 时，会⾃动转成红⿊树，查找效率从 O(n) 降到 O(log n)。

## 2）开放寻址法（Open Addressing）

发⽣冲突时，按某种探测策略在数组中找下⼀个空位存放。线性探测、⼆次探测都属于这类。 ThreadLocalMap ⽤的就是线性探测，但容易产⽣堆积问题。

// HashMap 中处理碰撞的核⼼逻辑⽚段   
int hash = hash(key.hashCode());   
int i = (n - 1) & hash; // 定位桶   
if (tab[i] == null || (e = tab[i]) == null) {   
tab[i] = newNode(hash, key, value, null);   
} else {   
// 碰撞了，遍历链表或树插⼊   
}

⼀般来说，链地址法更灵活，适合冲突较多的场景；开放寻址法内存紧凑，但负载⾼时性能下降明显。选哪种得看具体需求和数据特征。

## Java中有哪些集合类？请简单介绍

Java的集合类主要分两⼤派，⼀个是Collection接⼝下的各种实现，另⼀个是Map系的键值对结构。⾯试⾥聊到这块，重点其实是搞清楚每种集合适⽤的场景和底层机制。

Collection ⾥最常⽤的是 List、Set 和 Queue。

List是有序可重复的，ArrayList内部⽤数组实现，随机访问快，但中间插⼊删除得搬数据，性能损耗⼤；LinkedList是双向链表，适合频繁增删的场景，尤其是头尾操作。

Set 不允许重复元素，HashSet 基于 HashMap 实现，查找添加都是 O(1)，但不保序；LinkedHashSet 能维持插⼊顺序；TreeSet则能⾃然排序，底层是红⿊树。

Queue ⼀般⽤在任务调度，⽐如 ArrayDeque 是数组实现的双端队列，ConcurrentLinkedQueue 是⽆锁线程安全队列，DelayQueue 适合定时任务。

Map才是脏活累活的主⼒。HashMap最常⻅，数组+链表/红⿊树结构，⾮线程安全，但性能好；Hashtable就是⽼古董了，⽅法全 synchronized，基本被 ConcurrentHashMap 取代，后者⽤了分段锁 + CAS，在⾼并发下能扛住压⼒。

LinkedHashMap 能记住插⼊顺序，适合做 LRU 缓存；TreeMap ⽀持按键排序。

1）ArrayList 查找快，增删慢

2）LinkedList 增删快，查找慢

3）HashMap 性能⾼，并发⽤ ConcurrentHashMap

4）需要排序考虑 TreeSet / TreeMap

5）讲究插⼊顺序⽤ LinkedHashMap

## Java 中的 WeakHashMap 是什么 ？

WeakHashMap 的关键在于它对内存的敏感处理。它的 key 是弱引⽤，只要 GC 扫到了，不管内存够不够，这个 key就会被回收。

这意味着，哪怕你还在⽤ value，只要 key 被回收了，整个 entry 就失效了。所以它适合做缓存，但不是那种要求强⼀致的缓存。

典型场景是监听器注册表，⽐如 Swing ⾥的事件监听。注册的时候把 listener 当 key 放进去，⼀旦外⾯没⼈引⽤它，WeakHashMap ⾃动就清理了，避免内存泄漏。

对⽐ HashMap，它不会⾃动清理；⽽ WeakHashMap 在 key 回收后，下次 get 或 size 的时候会触发expungeStaleEntries，把陈旧的 entry 清掉。

代码上其实⽤法差不多：

```java
Map<SomeObject, String> map = new WeakHashMap<>();
SomeObject key = new SomeObject();
map.put(key, "data");
key = null; // 失去强引⽤
System.gc(); // 极端情况下触发
// 下次访问 map，可能就拿不到数据了
```

1）不要指望 WeakHashMap 存⻓期数据

2）别把它当普通 Map ⽤，尤其是 key 会被频繁丢弃的场景

3）GC触发时机不确定，⾏为有延迟性

<!-- image-->

## 说说 Java 中 HashMap 的原理？

HashMap 本质是个数组加链表（或红⿊树）的结构，存数据靠 key 的 hash 值定位桶位置。数组初始⻓度是 16，负载因⼦默认0.75，到12个元素就扩容，避免冲突太多影响性能。

key 的 hash 值不是直接⽤，⽽是再做⼀次扰动运算，把⾼位也参与映射，减少碰撞概率。定位桶⽤ (n - 1) &hash ⽽不是取模，位运算更快。

1）数组⾥每个桶刚开始是Node节点，链表⻓度超过8且数组⻓度⼤于等于64，链表转成红⿊树，防⽌极端情况下查询退化成 O(n)

2）如果⻓度⼩于6，即使hash冲突严重也先不转树，因为数组太⼩扩容更划算

3）删除节点时树⻓度⼩于6⼜会转回链表

put 操作流程：算 hash → 找桶 → 空则新建，否则遍历链/树插⼊ → 判断是否扩容。get 就反过来查。

注意多线程下 put 可能导致环形链表，所以并发场景得⽤ ConcurrentHashMap。JDK 8 虽然优化了扩容时的头插改尾插，但依然不能保证线程安全。

## 使⽤ HashMap 时，有哪些提升性能的技巧？

1）初始化时给⾜容量，避免频繁扩容。HashMap扩容成本⾼，每次都要重新计算hash并搬数据。如果知道⼤概要存100个元素，别⽤默认的16初始容量，直接设成 new HashMap<>(128) ，负载因⼦保持0.75就⾏。

2）⾃定义 key 类型时，hashCode 和 equals ⼀定要写好。hash 冲突多了会退化成链表甚⾄红⿊树，查找从 O(1) 变成 O(logn)。⽐如⽤字符串做 key 没问题，JDK 已优化；但⾃定义对象必须重写这两个⽅法，不然不同实例永远不相等，还可能产⽣⼤量冲突。

3）极端情况下，单个桶⾥节点超过8个才会转红⿊树。但如果key的hash值分布不均，⽐如都挤在⼏个桶⾥，那这些桶的查找效率⽴⻢下降。所以设计key的时候尽量让hash均匀分布。

4）并发场景别⽤HashMap，它不是线程安全的。多个线程同时put可能导致链表成环或者数据丢失。真要并发读写，上 ConcurrentHashMap，JDK 8 后⽤了 synchronized + CAS 分段锁优化，性能⽐⽼版本还好。

<!-- image-->

Java 的 CopyOnWriteArrayList 和 Collections.synchronizedList 有什么区别？分别有什么优缺点？

CopyOnWriteArrayList 和 synchronizedList 都是线程安全的 List 实现，但它们的设计哲学和适⽤场景完全不同。

CopyOnWriteArrayList的核⼼是写时复制。每次修改操作（add、set、remove）都会创建⼀个新的数组副本，读操作则完全⽆锁。这就意味着读读、读写不互斥，但写写会竞争锁。适合读多写少的场景，⽐如监听器列表、观察者列表，像Dubbo的服务发现通知列表就⽤到了它。缺点也很明显，写操作成本⾼，⽽且可能内存占⽤翻倍，实时性差⸺刚写完不⼀定⻢上被别的线程读到。

synchronizedList是基于装饰器模式，把⼀个普通List包装起来，所有⽅法都加上synchronized锁。读写都得抢同⼀把锁，吞吐量低。虽然简单直接，但在⾼并发读场景下，性能远不如 CopyOnWriteArrayList。不过它内存开销⼩，数据强⼀致性好，适合写操作频繁、对内存敏感的场景。

1）CopyOnWriteArrayList 读操作不加锁，适合读远多于写的场景

2）synchronizedList所有操作都加锁，适合兼容⽼代码或写操作较多的情况

3）CopyOnWriteArrayList 有内存膨胀和数据延迟可⻅问题，使⽤时要警惕

<!-- image-->

你遇到过 ConcurrentModificationException 错误吗？它是如何产⽣的？

遍历集合时如果被其他线程或当前线程修改了结构，就会抛 ConcurrentModificationException。这个异常不是线程安全问题的唯⼀表现，但它是个明确的信号：fail-fast机制被触发了。

Java ⾥像 ArrayList、HashMap 这些⾮线程安全集合，默认都有快速失败机制。它们内部维护⼀个 modCount ，记录结构被修改的次数。遍历时会拿这个值和期望值⽐对，⼀旦不⼀致就抛异常。

⽐如⽤for-each循环删元素，看似单线程，也会中招：

for (String s : list) {   
if ("toRemove".equals(s)) {   
list.remove(s); // 直接抛 ConcurrentModificationException   
}   
}

想安全删除，得⽤迭代器⾃⼰的 remove ⽅法：

Iterator<String> it = list.iterator();   
while (it.hasNext()) {   
String s = it.next();   
if ("toRemove".equals(s)) {   
it.remove(); // 正确姿势，内部会同步 modCount   
}   
}

多线程场景更常⻅。⽐如⼀个线程读，另⼀个写 HashMap，哪怕只是 put，⼤概率也会触发异常。这时候要么⽤ConcurrentHashMap，要么加锁。

ConcurrentHashMap 就不会抛这个异常，因为它⽤了更细粒度的同步策略，读操作不阻塞，结构修改也能保证⼀致性，压根不依赖fail-fast机制。

1）单线程遍历+修改，别直接调集合的增删⽅法

2）多线程场景优先上并发容器，⽐如 CopyOnWriteArrayList 或 ConcurrentHashMap

3）实在要⽤⾮线程安全集合，就得⾃⼰包synchronized，但性能差很多

<!-- image-->

## Java 中的 CopyOnWriteArrayList 是什么？

CopyOnWriteArrayList是个典型的读写分离数据结构，主要⽤在读多写少的并发场景。它的思路很直接：读操作完全不加锁，写操作则通过复制底层数组来完成，保证线程安全。

读操作⽐如 get 、迭代器遍历，直接访问内部数组，压根不经过任何锁或CAS，性能极⾼。像Dubbo的服务发现列表、ZooKeeper客户端的监听器注册，就常⽤它存观察者列表，毕竟通知是⾼频读，注册却很少发⽣。

写操作⽐如 add 、 set 、 remove ，会先拿到独占锁，然后拷⻉⼀份新数组，在新数组上修改，最后替换引⽤。整个过程⽼数组⼀直可⽤，所以读操作不会受影响。但代价也很明显，每次写都涉及数组复制，如果列表很⼤，⽐如上万元素，写⼀次可能就搞不定。

1）写操作开销⼤，不适合频繁写或⼤数据集

2）迭代器创建时就固定了内容，不⽀持 fail-fast，不会抛 ConcurrentModificationException

3）适合场景：事件监听器列表、配置缓存、路由表等读远多于写的场合

代码上看核⼼逻辑：

public boolean add(E e) {   
synchronized (lock) {   
Object[] elements = getArray();   
int len = elements.length;   
Object[] newElements = Arrays.copyOf(elements, len + 1);   
newElements[len] = e;   
setArray(newElements);   
}   
return true;   
}

写操作的锁只⽤来保抷新数组的构建和替换，时间窗⼝⼩，但依然⽐普通 ArrayList 慢⼀个量级。

## 为什么 Java 的 ConcurrentHashMap 不⽀持 key 或 value 为 null？

ConcurrentHashMap 不让 key 或 value 为 null，根本原因是为了避免多线程下的歧义问题。

考虑这个场景：两个线程同时读⼀个key，⼀个返回null，你没法判断这个null是代表“没找到这个key”，还是“找到了但 value 就是 null”。在并发环境下，这种不确定性会直接搞垮程序逻辑。HashMap 单线程下能存 null，是因为你可以⽤ containsKey 先判断，但在并发容器⾥， containsKey 和 get 之间可能已经被其他线程改了，这招就不灵了。

所以ConcurrentHashMap索性⼀⼑切，key和value都不让为null，从源头上杜绝歧义。这不是设计缺陷，⽽是权衡后的安全选择。

拿实际项⽬来说，像⽤ConcurrentHashMap做本地缓存时，如果查不到就该⾛后端存储，⽽不是靠null来判断缺失。如果你真遇到 null 值需求，建议⽤ Optional.ofNullable 包⼀层，这样语义清晰⼜安全。

代码层⾯，它会在⼊⼝直接抛空指针：

```javascript
if (key == null || value == null)
throw new NullPointerException();
```

整个设计思路就是：牺牲⼀点灵活性，换并发下的确定性和安全性。这在⾼并发系统⾥，⽐如⽤在Dubbo的本地缓存或Netty的状态管理中，是⾮常值得的。

## Java 中 ConcurrentHashMap 的 get ⽅法是否需要加锁？

ConcurrentHashMap 的 get ⽅法不需要加锁，这是它和 Hashtable 最关键的区别之⼀。

JDK 8 之后的实现⾥，get 操作完全⽆锁，靠的是 volatile 读和数组元素的 volatile 语义来保证可⻅性。Node 数组的每个桶（bucket）⾥的节点，其val和next指针都是⽤volatile修饰的，这样在读的时候能直接看到最新值，压根不经过锁。

1）查找时先定位到桶，然后遍历链表或红⿊树2）每⼀步读取node.val或node.next都是volatile读，不会被重排序，也不会读到脏数据 3）整个过程没有 synchronized 或 ReentrantLock 参与

当然前提是：size 或 isEmpty 这种聚合操作不保证实时性，因为可能在计算时 map 正在并发修改。

对⽐来看，Hashtable 的 get 是全程 synchronized 的，吞吐量差很多。⽽ ConcurrentHashMap 在⼤多数读多写少场景下，⽐如缓存、配置中⼼本地副本，都能扛住⾼并发读。

代码上看，核⼼就是这⼏句：

transient volatile Node<K,V>[] table;   
static class Node<K,V> implements Map.Entry<K,V> {   
final int hash;   
final K key;   
volatile V val; // 注意是 volatile   
volatile Node<K,V> next; // 也是 volatile   
}

## Java 中 ConcurrentHashMap 1.7 和 1.8 之间有哪些区别？

ConcurrentHashMap 的演进其实是个典型的“从锁竞争到 CAS + synchronized 优化”的过程，1.7 到 1.8 的改动⼏乎是重写级别。

1.7 ⽤的是分段锁 Segment，每个 Segment 是⼀个 ReentrantLock 保护的⼩哈希表。默认 16 个 Segment，意味着最多16个线程能并发写。⼀旦线程数超过这个数，后⾯的就只能阻塞等待锁。Segment继承⾃ReentrantLock，结构复杂，内存占⽤也⾼。

到了1.8，直接抛弃了Segment，改⽤CAS+synchronized控制并发。Node数组加链表/红⿊树，写操作对数组桶位加synchronized锁，粒度更细。读操作完全⽆锁，靠volatile保证可⻅性。扩容时还能⽀持并发迁移，由多个线程⼀起搬数据。

另⼀个关键变化是哈希冲突的处理。1.7 是纯链表，容易在极端情况下退化成 O(n)。1.8 引⼊了链表转红⿊树机制，当链表⻓度超过 8 且数组⻓度⼤于 64，就转换成红⿊树，查找性能从 O(n) 提升到 O(log n)，抗攻击能⼒更强。

扩容效率也提升了。1.8⽤了“多线程协助扩容”机制，⼀个线程发现需要扩容，可以只负责搬⼀部分桶，其他线程写数据时也会顺⼿帮忙搬，真正做到并发扩容。

<!-- image-->

## Java 中的 IdentityHashMap 是什么？

IdentityHashMap 不按 equals ⽐较键，⽽是⽤ == 判断 key 是否相等。也就是说，只有当两个引⽤指向同⼀个对象时，才认为 key 相同。

1）它不遵循 Map 接⼝的通⽤约定，⽐如和 HashMap ⾏为就不⼀样。你 put ⼀个 key，必须⽤完全相同的引⽤ get才能拿到值，哪怕两个对象逻辑上 equals 为 true 也没⽤。

2）底层不是⽤红⿊树或拉链法处理哈希冲突，⽽是采⽤线性探测法开放寻址，数组⻓度总是 2 的幂次。它的 Entry 直接存放在Object数组⾥，奇偶位分别放key和value，节省空间也提升缓存命中率。

3）性能上⽐ HashMap 略快，因为跳过了 hashCode() 和 equals() 调⽤，适合做代理对象映射、AOP中的⽬标对象追踪这类场景。Spring的某些内部实现就⽤它来快速关联实例对。

注意别在常规业务⾥⽤它替代 HashMap ，否则容易出现“明明 key ⼀样却取不到值”的问题。它的设计⽬标很明确：基于引⽤⼀致性做映射。

<!-- image-->

代码⻓这样：

IdentityHashMap<Key, Value> map = new IdentityHashMap<>();   
Key k1 = new Key();   
Key k2 = new Key();   
map.put(k1, "first");   
map.put(k2, "second");   
// 即便 k1.equals(k2) 为 true，k1 和 k2 仍是不同 key

## Java 中的 TreeMap 是什么？

TreeMap 是 Java ⾥基于红⿊树实现的有序 Map，存进去的 key 会⾃动排序。遍历它的 keySet 或 entrySet 时，拿到的结果是按 key 升序排列的，不像 HashMap 那样⽆序。

1）底层数据结构是红⿊树，⼀种⾃平衡⼆叉查找树。插⼊、删除、查找的时间复杂度都是O(logn)，性能稳定，不会像普通⼆叉搜索树那样退化成链表。

2）它实现了 SortedMap 和 NavigableMap 接⼝，能⼲不少事。⽐如找⼩于某个 key 的最⼤键 lowerKey() ，找⼤于等于某个 key 的最⼩键 ceilingKey() ，还能截取⼀段范围 subMap() 。这些在做区间查询时特别有⽤，像⽤时间戳做 key 查某段时间内的记录。

3）key 必须具备可⽐性。要么 key 类型实现 Comparable 接⼝，要么构造时传⼊ Comparator。不然运⾏时直接抛异常。

代码上⻓这样：

```java
TreeMap<String, Integer> map = new TreeMap<>();
map.put("b", 2);
map.put("a", 1);
map.put("c", 3);
System.out.println(map.firstKey()); // 输出 a
```

注意点：如果只是想存键值对，不要求顺序，优先⽤ HashMap，O(1) 操作更快。TreeMap 主要⽤在需要有序访问的场景，⽐如⽤ ZSET 做排⾏榜时，后端临时排序可以⽤它，但量⼤了还是得上 Redis。

## Java 中的 LinkedHashMap 是什么？

LinkedHashMap是HashMap的⼦类，它在哈希表的基础上，额外维护了⼀条双向链表，⽤来记录插⼊顺序或者访问顺序。

这就让它能按顺序遍历key-value对。默认情况下，它是按插⼊顺序排列的。⽐如你put("a",1)，再put("b",2)，遍历时先a后b。如果你构造时开启accessOrder模式，就会变成按访问顺序排列，最近访问的放到最后，适合实现LRU缓存。

像 MyBatis 的缓存、Spring MVC 处理请求参数绑定，都⽤到了 LinkedHashMap 来保证顺序性。它和 TreeMap 不⼀样，TreeMap 是靠 Comparable 或 Comparator 排序，底层是红⿊树，性能开销更⼤。

代码上基本和 HashMap ⼀样⽤：

Map<String, Integer> map = new LinkedHashMap<>();   
map.put("first", 1);   
map.put("second", 2);

遍历结果就是插⼊顺序。如果想实现 LRU，可以重写 removeEldestEntry ⽅法：

protected boolean removeEldestEntry(Map.Entry eldest) {   
return size() > MAX_SIZE;   
}

这时候超过容量会⾃动淘汰最⽼的数据。注意初始容量和负载因⼦别设得太⼩，不然频繁扩容影响性能。

它的缺点是内存占⽤⽐ HashMap 稍⾼，因为要存前后指针。但⼤多数场景下这点开销不值⼀提。

<!-- image-->

## JDK1.8对HashMap除了红⿊树还进⾏了哪些改动？

JDK 1.8 对 HashMap 的优化不⽌是引⼊红⿊树这么简单，还有⼏个关键调整让它的性能更稳。

链表转红⿊树的条件是bin中节点数≥8且数组⻓度≥64。如果只是链表⻓但数组太⼩，会优先扩容，⽽不是直接建树。这样避免在哈希冲突还没真正严重时就引⼊复杂的树结构，毕竟树的开销⽐链表⼤。

另⼀个容易被忽略的点是 hash 计算⽅式。JDK 1.8 仍然⽤ (n - 1) & hash 定位桶，但对 key 的 hashCode 做了⼆次扰动：先异或低16位和⾼16位，减少低位碰撞概率。这招在key的hashCode分布不均时特别有⽤，⽐如只递增的 Integer。

扩容机制也有变化。⽼版本是头插法，多线程下可能形成环，导致死循环。1.8改成尾插法，迁移时节点顺序不变，彻底避开这个问题。⽽且扩容后的新位置要么在原索引，要么在原索引+oldCap位置，计算也快。

代码上看插⼊逻辑，核⼼还是 putVal ⽅法，但处理树化和拆分树的分⽀明显变多了。尤其是 treeifyBin ⾥会先看数组⼤⼩，不够就不树化。

<!-- image-->  
这些改动合起来，让 HashMap 在⾼冲突场景下从 O(n) 降到 O(log n)，同时⽇常使⽤也没增加额外负担。

## 为什么JDK1.8对HashMap进⾏了红⿊树的改动？

JDK1.8对HashMap的优化，主要解决哈希冲突严重时的性能退化问题。当⼤量元素落在同⼀个桶时，链表会变得很⻓，查找从O(1)退化到O(n)。为控制最坏情况的时间复杂度，引⼊了红⿊树机制。

具体触发条件是：某个桶内的节点数达到 8，并且当前数组⻓度⼤于等于 64，链表就会转成红⿊树。这样最坏查找性能能稳定在 O(log n)。反过来，如果红⿊树节点减少到 6，⼜会退化回链表，避免维护红⿊树的额外开销。

这个设计其实是空间和时间的权衡。链表占⽤⼩，但查询慢；红⿊树查询快，结构更复杂。阈值选8和6是为了防⽌频繁来回转换，⽤了泊松分布做依据，碰撞达到8的概率已经极低。

常⻅误区是认为只要 put 就可能转红⿊树，其实前提是扩容也解决不了散列问题。⽐如所有 key 都只落在少数⼏个桶⾥，扩容后还是冲突，这时候链表⻓度才会持续增⻓。

代码上你不需要感知这个过程，HashMap内部⾃动切换。但如果你的key没有合理实现hashCode()，⽐如总返回1，那所有元素都挤在⼀个桶，性能⽴⻢崩成 O(n)。

<!-- image-->

## 为什么 Java 中 HashMap 的默认负载因⼦是 0.75？

负载因⼦（load factor）决定了 HashMap 什么时候扩容。默认值 0.75 是空间和时间成本之间的⼀个权衡结果。

1）如果负载因⼦太⼩，⽐如 0.5，那数组还没装满就触发扩容，内存利⽤率低，但冲突少，查找快。

2）如果负载因⼦太⼤，⽐如 0.9，内存⽤得更满，但哈希冲突概率显著上升，链表变⻓，查找性能下降。

HashMap的设计⽬标是在平均情况下实现O(1)的存取效率。0.75这个值能让哈希桶的填充程度适中，在不浪费太多空间的前提下，把冲突控制在可接受范围。

JDK源码注释⾥也提过，基于泊松分布统计，当负载因⼦为0.75时，⼀个桶⾥链⻓度超过8的概率极低，这和红⿊树转换阈值的设计也能对上。

代码上看，初始化时如果不指定，就是0.75：

public HashMap() {   
this.loadFactor = 0.75f;   
}

实际开发中，如果你知道数据量会很⼤且稳定，可以提前算好容量，避免频繁rehash。⽐如要存1000个元素，按0.75算，初始容量⾄少设成 1000 / 0.75 ≈ 1333 ，再向上取最接近的2的幂，也就是2048。

<!-- image-->

为什么HashMap在Java中扩容时采⽤2的n次⽅倍？

HashMap 的容量设计成 2 的 n 次⽅，主要是为了快速计算元素的存储位置。数组下标是通过 hash & (capacity- 1) 算出来的，这个位运算只有在容量为 2^n 时才等价于取模 % 。

如果容量是普通数字，就得⽤取模运算 hash % capacity ，这⽐位运算慢得多。⽽当capacity是16、32、64这种数时，capacity - 1 就是 15（0b1111）、31（0b11111）这种低位全 1 的⼆进制数，& 运算天然就能截断⾼位，实现均匀分布。

扩容翻倍也保证了这个特性⼀直成⽴。⽐如从16扩到32，还是2的幂，下标计算⽅式不变，迁移数据时也能⽤hash & oldCapacity 判断是否需要移动。

还有⼀个隐藏好处：JDK8的树化阈值判断和红⿊树拆分逻辑，都依赖这个均匀分布特性来保证性能稳定。要是随便设个100当初始容量，不仅取模慢，还容易导致链表过⻓，查询退化成O(n)。

1）必须是2的幂才能⽤&替代%2）扩容翻倍维持了该性质连续性3）配合扰动函数减少哈希冲突

## Java中HashMap的扩容机制是怎样的？

HashMap 扩容发⽣在元素数量超过阈值（threshold）时，这个阈值是容量（capacity）乘以加载因⼦（loadFactor），默认是 0.75。⽐如初始容量 16，阈值就是 16 \* 0.75 = 12。⼀旦元素数超过 12，就会触发扩容。

扩容不是简单地把数组扩⼤⼀倍，⽽是创建⼀个新数组，⻓度翻倍，然后把⽼数据全部rehash搬到新桶⾥。这⾥有个优化点：因为容量总是2的幂，所以元素在新数组中的位置要么是原位置，要么是原位置加旧容量。JDK8利⽤这⼀点，通过位运算直接判断，避免重复计算hash。

链表节点在迁移时会根据 hash & oldCap 的结果决定去向，等于 0 的留在原索引，不等于 0 的移到原索引 + 旧容量的位置。红⿊树节点也类似，但会先拆分树，再判断是否需要转回链表。

<!-- image-->

注意扩容是懒触发的，只在put后检查时发⽣。多线程下并发put可能导致数据覆盖或链表成环，所以HashMap不是线程安全的。如果担⼼性能，可以预设⾜够⼤的容量，减少扩容次数。 ConcurrentHashMap 在这⽅⾯做了优化，扩容时⽀持并发读写，⽤的是渐进式rehash。

## Java 中的 HashMap 和 Hashtable 有什么区别？

HashMap 允许 null 键和 null 值，⽽ Hashtable 不允许，⼀放就抛 NullPointerException。这个特性让 HashMap 在⼤多数场景下更灵活，⽐如做缓存时可以⽤null表⽰未命中。

线程安全⽅⾯，Hashtable是同步的，每个⽅法都加了synchronized，相当于把整个表锁住。虽然线程安全，但并发度低，同⼀时间只有1个线程能操作。HashMap则完全不处理线程安全，适合单线程或外部加锁的场景。

如果要替代 Hashtable 的线程安全需求，现在⼀般⽤ ConcurrentHashMap。它采⽤分段锁（JDK 1.8 后是 CAS +synchronized）提升并发性能，在⾼并发下⽐ Hashtable 能扛住更多请求。

遍历⽅式也有差异。HashMap 使⽤ Iterator，⽀持 fail-fast 机制，⼀旦检测到并发修改会抛

ConcurrentModificationException。Hashtable 除了 Iterator，还⽀持 Enumeration，后者不抛异常，但可能看到过期数据。

1）底层结构相同，都是数组+链表/红⿊树（JDK1.8+）

2）初始容量和扩容机制类似，默认加载因⼦都是0.75

3）HashMap 可以通过 Collections.synchronizedMap 包装成线程安全版本

<!-- image-->  
实际开发中，Hashtable 基本属于历史遗留类，新项⽬直接上 HashMap 或 ConcurrentHashMap 就⾏。

数组和链表在Java中的区别是什么？

数组和链表是两种基础的数据结构，在Java⾥的表现和适⽤场景差异挺⼤，关键得看你怎么⽤。

1）内存布局上，数组在堆⾥申请⼀块连续的内存空间，⼤⼩固定，初始化时就得定下来。你声明⼀个int[1000] ，JVM 就得⼀⼝⽓找 1000 个连续的 int 位置，中间不能断。链表不⼀样，每个节点 Node 分散在堆⾥，靠next指针连起来，增删节点就是改指针，不⽤找连续空间。

2）访问效率，数组⽀持随机访问， get(i) 是O(1)，直接通过baseaddress+offset算出位置。链表必须从头开始遍历， get(i) 最坏要 O(n)。

3）插⼊删除，数组中间插⼀个数，后⾯所有元素都得往后挪，代价是O(n)。链表只要改前后节点的指针，O(1)搞定，前提是已经定位到位置。所以像 LinkedList 在频繁增删的场景⽐ ArrayList 强。

// ArrayList 底层是数组   
list.add(0, 1); // 后⾯元素全后移   
// LinkedList 底层是双向链表   
List<Integer> linked = new LinkedList<>();   
linked.add(0, 1); // 只改指针

4）空间开销，数组只存数据，内存紧凑。链表每个节点得多存1-2个引⽤（next、prev），空间利⽤率低⼀些。



推荐更多免费学编程资源：

1.编程导航学习网站：学编程、做项目、拿Offer！

4.AI资源导航网站：获取最新AI黑科技！