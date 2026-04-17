# Java 基础⾯试题速记通关版 _ ⾯试刷题 mianshiya.com

本资源来自面试鸭：https://www.mianshiya.com

推荐更多免费学编程资源：

1.编程导航学习网站：学编程、做项目、拿Offer！

2.企业高频面试题库：开始刷题，面试遇原题！

3.精选简历模板大全：1分钟搞定简历！

4.AI资源导航网站：获取最新AI黑科技！

5.1对1模拟面试：随时随地提升面试能力

## 你使⽤过哪些JDK提供的⼯具？

JDK ⾃带的⼯具其实是⽇常排查问题的利器，很多场景下压根不需要额外依赖第三⽅⼯具。

jps相当于Java版的ps，能快速列出当前机器上所有正在运⾏的Java进程PID。排查多实例部署时特别有⽤，⼏秒钟就能定位到⽬标进程。

jstat是看JVM运⾏状态最轻量的⽅式，尤其是监控GC频率和堆内存变化。⽐如想确认是不是频繁FullGC，⽤jstat -gcutil <pid> 1000 每秒打⼀次数据，趋势⼀⽬了然。

jstack 对应线程分析，定位死锁或⾼ CPU 很直接。拿到进程 PID 后执⾏ jstack <pid> ，输出的线程栈⾥如果看到WAITING状态集中在某个锁对象，基本就能锁定问题点。线上服务响应卡顿，第⼀反应就是抓threaddump看有没有线程堆积。

jmap 可以导出堆内存快照，配合 jhat 或 MAT 分析内存泄漏。不过要注意的是， jmap -dump 在堆⼤的时候会触发⻓时间STW，⽣产环境得谨慎操作。

其实从 JDK 8 开始，Arthas 虽然是阿⾥开源的，但已经成了事实标准。它把上⾯这些命令都整合了，还能动态 trace⽅法调⽤、watch参数返回值，排查线上问题效率提升⾮常明显。

<!-- image-->

什么是 Selector？

Selector是JavaNIO⾥⽤来做事件监听的核⼼组件，⼀个线程通过它就能同时监控多个通道的I/O状态，⽐如有没有数据可读、能不能写⼊。

你想想，传统IO⼀个连接就得占⼀个线程，1000个连接就得分1000个线程去处理，系统压根扛不住。⽽⽤了Selector，⼀个线程轮询多个Channel的就绪事件，资源利⽤率直接拉满，这就是为什么Netty、Dubbo这些⾼性能中间件底层都靠它撑着。

每个 Channel 注册到 Selector 上时得绑定⼀个 SelectionKey，表⽰“我对哪些事件感兴趣”，⽐如 OP_READ、OP_WRITE。调⽤select()⽅法后，线程会阻塞直到有⾄少⼀个通道就绪，然后返回就绪的key集合，挨个处理就⾏。

代码上⼤概是这样：

Selector selector = Selector.open();   
channel.configureBlocking(false);   
channel.register(selector, SelectionKey.OP_READ);   
while (true) {   
int readyChannels = selector.select(); // 阻塞等待就绪事件   
if (readyChannels == 0) continue;   
Set<SelectionKey> keys = selector.selectedKeys();   
for (SelectionKey key : keys) {   
if (key.isReadable()) { /\* 处理读 \*/ }   
keys.remove(key);   
}   
}

注意⾮阻塞模式是前提，阻塞IO调了select()也没意义。另外select()返回的是就绪的通道数，不是所有注册的。

整个模型叫多路复⽤，Linux 上实际是 epoll 在背后⼲活。

## 什么是 Channel？

Channel 是 Java NIO 的核⼼组件，可以看作是数据传输的通道，负责从缓冲区读写数据。它和传统的 IO 流不同，Channel是双向的，既能读也能写，⽽流⼀般是单向的。

1）常⻅的 Channel 实现有 FileChannel、SocketChannel、ServerSocketChannel 和 DatagramChannel。⽐如Netty 就基于 NioSocketChannel 做⽹络通信，⽤统⼀的抽象屏蔽底层差异。

2）Channel本⾝不直接操作数据，数据总是流向Buffer。读数据时，数据从Channel进⼊Buffer；写数据时，数据从Buffer写⼊Channel。这种设计让数据处理更灵活，也便于零拷⻉技术的应⽤。

3）在⾼并发场景下，Channel配合Selector实现多路复⽤。⼀个线程就能监控多个Channel的事件，⽐如连接就绪、读就绪，避免为每个连接开线程，扛住⼏万并发连接很常⻅。

<!-- image-->

使⽤时要注意，Channel必须配置为⾮阻塞模式才能注册到Selector，否则会抛异常。另外，关闭Channel会释放对应的⽂件描述符，这个资源很宝贵，Linux下⼀般默认最多1024个，⽤完就得调优。

## 如果⼀个线程在Java中被两次调⽤start()⽅法，会发⽣什么？

调⽤ start() ⽅法的本质是让JVM将线程加⼊调度队列，真正触发 run() 的执⾏。线程的状态机决定了它只能从NEW状态被启动⼀次。

1）第⼀次调⽤ start() ，线程状态从 NEW 变为 RUNNABLE，等待 CPU 调度执⾏ run() ⽅法。

2）第⼆次再调⽤ start() ，JVM会检查线程当前状态，发现已经不是NEW，直接抛出

这个异常是运⾏时异常，不强制捕获，但⼀旦发⽣程序就会中断。常⻅于误把线程对象当⼯具复⽤，⽐如在循环⾥反复启动同⼀个线程。

```java
Thread t = new Thread(() -> System.out.println("hello"));
t.start();
t.start(); // 这⾥炸了
```

正确做法是每次都需要新线程，就得 new ⼀个新实例，或者⽤线程池管理⽣命周期。像 ThreadPoolExecutor 这种，你submit任务，它背后复⽤worker线程，不会出现重复启动的问题。

根本原因在于Thread类的设计就是“⼀次性”的，run⽅法执⾏完，线程⽣命周期就结束了，不能回退到NEW状态重来。

## Java 的 Optional 类是什么？它有什么⽤？

Optional 其实是 Java 8 引⼊的⼀个容器类，⽤来包装可能为 null 的值。它的核⼼意图不是消灭 null，⽽是让开发者明确表达“这⾥可能没有值”，从⽽减少空指针异常。

⽤ Optional 后，⽅法返回类型会直接告诉调⽤⽅：这个结果可能不存在。⽐如 Optional<String> ⽐ String更清晰地传达语义，避免隐式null带来的误解。

常⻅⽤法有⼏种： 1）构建 Optional： Optional.of(value) ⽤于⾮ null 值，

Optional.ofNullable(value) 可处理 null。 2）取值： orElse(default) 提供默认值， orElseThrow()在⽆值时抛异常。 3）链式操作： map() 对值进⾏转换， filter() 进⾏条件过滤，都不⽤担⼼ NPE。

```cpp
Optional<String> name = Optional.ofNullable(getName());
String result = name.map(String::toUpperCase)
.orElse("UNKNOWN");
```

但别滥⽤。Optional不该⽤在集合元素⾥，也不该作为类字段⸺它不是序列化的友好选择。像Guava早期就有类似设计，但Java8的标准库⽀持让它成了主流做法。

它更适合⽤在⽅法返回值上，尤其是⼯具类或查找⽅法，⽐如 findUserById() 返回 Optional<User> ，调⽤⽅⾃然知道要处理“找不到”的情况。

<!-- image-->

## Java 的 I/O 流是什么？

Java 的 I/O 流本质上是数据传输的抽象模型，把数据的输⼊输出看作“流动”的字节或字符。它不关⼼数据源具体是⽂件、⽹络还是内存，只关注“从哪来、到哪去”这个流动过程。

输⼊流负责读，输出流负责写。字节流处理 8 位的原始⼆进制数据，⽐如图⽚、视频，⽤ InputStream 和

OutputStream 这两个抽象基类。字符流则⾯向⽂本，⾃动处理编码转换，基于 Reader 和 Writer ，适合读写字符串。

实际开发中不会直接⽤这些顶层抽象类，⽽是组合具体实现。⽐如要⾼效读⽂件，会⽤ BufferedInputStream 包⼀层 FileInputStream ，缓冲机制能减少系统调⽤次数，提升性能。⽹络通信⾥常⻅的 ObjectOutputStream就是⽤来序列化对象发到远端。

1）字节流处理⼆进制，⽐如 FileInputStream 读图⽚

2）字符流处理⽂本，避免乱码，⽐如 InputStreamReader 转换编码

3）装饰器模式很关键， Buffered 、 Data 、 Object 这些都是增强功能

举个例⼦，读⼀个 UTF-8 ⽂本⽂件：

```scala
try (var br = new BufferedReader(
new InputStreamReader(
new FileInputStream("data.txt"), "UTF-8")))
br.lines().forEach(System.out::println);
}
```

现在更推荐⽤ NIO 的 Files.newBufferedReader(Paths.get("data.txt")) ，⼀⾏搞定，底层⾃动处理编码和缓冲。

<!-- image-->

## Java中的基本数据类型有哪些？

Java的基本数据类型⼀共8种，是构建程序的最基础单元。它们直接存储值，不涉及对象引⽤，性能⾼，⽤起来也简单。

整数类型有4种：

1） byte ：1 字节，范围 -128 到 127，适合节省内存的场景，⽐如数组⾥存⼤量⼩数字。

2） short ：2 字节，范围 -32768 到 32767，⽤得不多，偶尔在⽂件格式或⽹络协议⾥⻅。

3） int ：4 字节，最常⽤，⼀般循环计数、数学计算都⽤它。

4） long ：8 字节，⼤数才⽤，⽐如时间戳 System.currentTimeMillis() 返回的就是 long。

浮点类型2种：

5） float ：4 字节，单精度，声明时要加 f，⽐如 3.14f ，科学计算或图形处理可能⽤到。

6） double ：8 字节，双精度，⽇常⼩数计算的主⼒，⽐如 3.14 默认就是 double。

字符类型1种：

7） char ：2 字节，存 Unicode 字符，⽐如 'a' 或 '汉' ，本质是⽆符号整数，可以做加减。

布尔类型1种：

8） boolean ：真假值，只有 true 和 false ，控制逻辑分⽀，JVM 内部其实⽤ 1 字节实现，虽然理论上只需要  
1 位。

这些类型对应各⾃的包装类，⽐如 Integer 、 Boolean ，⽤在集合或者需要null的场景。但⾃动装箱拆箱有性能损耗，⾼频场景要⼩⼼。

## 什么是Java中的⾃动装箱和拆箱？

Java⾥的⾃动装箱和拆箱，其实就是编译器在基本类型和对应的包装类之间⾃动转换的语法糖。你写代码的时候不⽤⼿动调 Integer.valueOf() 或 .intValue() ，但底层其实都给你处理了。

1）⾃动装箱是指把基本类型转成包装对象，⽐如 Integer i = 100; 这⾏代码，编译后其实是 Integer i =Integer.valueOf(100); 。这⾥有个关键点， valueOf 在 -128 到 127 范围内会⽤缓存对象，所以这个区间内的Integer ⽐较可以⽤ ==，超出就得⽤ equals。

2）拆箱反过来，是从包装类取基本值，像 int j = new Integer(100); 会被编译成调⽤ intValue() 。但如果对象是 null，拆箱时就会抛出 NullPointerException ，这种空指针问题在集合操作⾥特别容易踩坑。

```java
List<Integer> list = new ArrayList<>();
list.add(100); // 装箱
int value = list.get(0); // 拆箱，如果 get 出 null 就 NPE
```

这种机制⽤起来⽅便，但在⾼频循环或性能敏感场景要⼩⼼，频繁创建包装对象会增加GC压⼒。像Kafka、Netty这些⾼性能中间件⾥，能⽤primitive就不⽤wrapper，就是这个道理。

## Java 中 for 循环与 foreach 循环的区别是什么？

Java⾥的for和foreach看似都能遍历，但底层机制和适⽤场景其实有挺⼤差别。

1）传统for循环靠索引控制，你得⾃⼰管理下标，适合需要访问索引的场景。⽐如你想处理数组中偶数位的元素，或者反向遍历，这时候⽤for更直接。

for (int i = 0; i < arr.length; i++) {   
System.out.println(arr[i]);   
}

2）foreach（增强 for）本质是 迭代器 的语法糖，编译后会转成 Iterator 的 hasNext() 和 next() 调⽤。它屏蔽了索引细节，代码更简洁，也避免越界错误。但正因为没有索引，你没法在遍历过程中修改集合（⽐如remove不通过迭代器会抛 ConcurrentModificationException）。

for (String s : list) {   
System.out.println(s);   
}

3）性能上，数组类型两者基本没差，JVM 会优化。但对 ArrayList 这种实现了 RandomAccess 的集合，for 通过get(i) 访问很快。⽽ LinkedList ⽤ foreach 更好，因为每次 get(i) 都要从头遍历，O(n²) 的代价，压根不推荐。

4）foreach 不能⽤于需要并发修改的场景，也不能做条件跳步（⽐如 i += 2）。遇到这些情况，⽼⽼实实⽤传统 for 或显式迭代器。

总的来说，能⽤ foreach 就⽤，代码⼲净安全。需要索引或复杂控制逻辑时，再切回 for。

## 你使⽤过Java的反射机制吗？如何应⽤反射？

Java反射这东西，平时写业务代码可能不常碰，但框架⾥到处都是它的影⼦。你⽤Spring的时候，那个@Autowired 注⼊、 @RequestMapping 映射，底层全靠反射搞定。

1）运⾏时动态操作类是反射的核⼼能⼒。⽐如你有个字符串 "com.example.User" ，想在程序跑起来之后创建这个类的实例，常规的 new 是做不到的，因为编译时根本不知道具体类型。这时候 Class.forName 加 newInstance（或者现在的 getDeclaredConstructor().newInstance()）就能派上⽤场。

2）访问私有成员也是常⻅⽤途。单元测试⾥有些private⽅法要测，或者像某些⼯具类需要绕过访问限制，通过setAccessible(true)就能强⾏读写。不过这招别乱⽤，破坏了封装性，维护起来头疼。

3）典型的场景就是 ORM 框架。像 MyBatis 处理结果集映射时，查出⼀⾏数据，它得知道怎么塞进 User 对象的字段⾥。通过反射拿到 ResultMap 定义的属性名，再找对应的 setter 或字段直接赋值，完全不⽤提前写死转换逻辑。

```javascript
Class<?> clazz = Class.forName("com.example.User");
Object obj = clazz.getDeclaredConstructor().newInstance();
Field field = clazz.getDeclaredField("name");
field.setAccessible(true);
field.set(obj, "John");
```

性能⽅⾯，反射⽐直接调⽤慢个⼏倍到⼏⼗倍，关键路径上频繁使⽤会拖垮系统。所以像JSON解析库（如Jackson）会在⾸次反射后缓存Method/Field引⽤，后续复⽤提升效率。

要不要⽤？框架作者躲不开，业务开发尽量少碰。真要⽤，记得做缓存，别让反射成为瓶颈。

## 什么是Java中的继承机制？

Java⾥的继承，说⽩了就是⼦类可以拿⽗类的属性和⽅法来⽤，不⽤重复写。⼀个类只能继承⼀个⽗类，这是单继承，靠的是 extends 关键字。

1）⼦类会⾃动拥有⽗类的⾮私有字段和⽅法。⽐如你写个 Animal 类有 eat() ⽅法， Dog extends Animal就可以直接调⽤ eat() 。

2）构造过程是先跑⽗类构造器，再跑⼦类的。如果你没⼿动调 super() ，编译器会⾃动插⼀句 super() 在⼦类构造器第⼀⾏。

3）⽅法重写（Override）是重点。⼦类可以改写⽗类的⽅法逻辑，但签名得⼀样。加个 @Override 注解能防⽌你写错签名，也⽅便别⼈看。

```dart
class Animal {
void sound() { System.out.println("叫了⼀声"); }
}
class Dog extends Animal {
@Override
void sound() { System.out.println("汪汪"); }
}
```

多态也是基于继承来的。你⽤ Animal a = new Dog() 这种写法，调 a.sound() 实际执⾏的是 Dog 的版本，这就是运⾏时动态绑定。

不过别滥⽤继承。⽗类⼀改，⼦类可能就出问题。⼀般来说，is-a关系才考虑继承，⽐如 Dog is an Animal 。要是只是想复⽤代码，优先⽤组合，不然后期搞不定。

## Java中的访问修饰符有哪些？

Java ⾥的访问修饰符主要就四个： private 、 default （也叫包访问权限）、 protected 和 public 。它们控制的是类、⽅法、变量这些成员能被访问的范围。

1） private 最严格，只能在定义它的那个类内部访问，别的类哪怕同⼀个包都不⾏。

2） default 是不写任何修饰符时的默认⾏为，同⼀个包内的类可以访问。跨包就不⾏，哪怕继承也不管⽤。

3） protected ⽐ default 宽⼀点，同⼀个包⾥的类能访问，不同包的⼦类也能访问，这是它和 default 的关键区别。

4） public 最开放，谁都能访问，不管是不是同⼀个包，也不管有没有继承关系。

举个例⼦，你在写⼀个⼯具类的时候，核⼼算法可能⽤private封装起来，只暴露public的调⽤⽅法；⽽在继承体系⾥，⽗类想让⼦类⽤某个⽅法但⼜不想对外公开，就会⽤ protected。

<table><tr><td rowspan=1 colspan=1>修饰符</td><td rowspan=1 colspan=1>同一类</td><td rowspan=1 colspan=1>同一包</td><td rowspan=1 colspan=1>不同包子类</td><td rowspan=1 colspan=1>不同包非子类</td></tr><tr><td rowspan=1 colspan=1>private</td><td rowspan=1 colspan=1>☑</td><td rowspan=1 colspan=1>×</td><td rowspan=1 colspan=1>×</td><td rowspan=1 colspan=1>X</td></tr><tr><td rowspan=1 colspan=1>default</td><td rowspan=1 colspan=1>√</td><td rowspan=1 colspan=1>√</td><td rowspan=1 colspan=1>×</td><td rowspan=1 colspan=1>X</td></tr><tr><td rowspan=1 colspan=1>protected</td><td rowspan=1 colspan=1>√</td><td rowspan=1 colspan=1>□</td><td rowspan=1 colspan=1>□</td><td rowspan=1 colspan=1>×</td></tr><tr><td rowspan=1 colspan=1> public</td><td rowspan=1 colspan=1>☑</td><td rowspan=1 colspan=1>√</td><td rowspan=1 colspan=1>√</td><td rowspan=1 colspan=1>☑</td></tr></table>

这个表格记熟了，基本就不会搞混了。实际开发中，优先缩⼩访问范围，能⽤private就不⽤public，这是封装的基本原则。

## Java中静态⽅法和实例⽅法的区别是什么？

静态⽅法属于类本⾝，直接通过类名调⽤，不依赖任何实例。实例⽅法则必须在对象创建后才能调⽤，它能访问当前实例的成员变量。

1）内存分配时机不同。静态⽅法随着类加载就存在了，实例⽅法得等 new 出对象后才可使⽤。⽐如 Math.max()是静态的，不⽤newMath对象就能⽤。

2）访问权限有区别。静态⽅法只能直接访问静态成员，不能⽤this或super，也不能访问实例变量。实例⽅法啥都能访问。写⼯具类时常⽤ static，像 Collections.sort(list) 。

3）多态性表现不⼀样。实例⽅法⽀持重写，运⾏时动态绑定，⽗类引⽤指向⼦类对象能调⽤⼦类实现。静态⽅法没有这回事，它是编译期绑定的，⼦类定义同名静态⽅法只是隐藏⽗类的，不会发⽣动态分派。

```groovy
class Parent {
static void say() { System.out.println("Parent static"); }
void speak() { System.out.println("Parent instance"); }
}
class Child extends Parent {
static void say() { System.out.println("Child static"); } // 隐藏，⾮重写
void speak() { System.out.println("Child instance"); } // 重写
}
```

调⽤ new Child().speak() 输出 "Child instance"，⽽ Parent.say() 或 Child.say() 只看左边声明类型，和对象⽆关。

⼀般⼯具⽅法、⼯⼚⽅法⽤静态，业务⾏为、需要状态的操作⽤实例。搞不定选型时问⾃⼰：这个⽅法要不要依赖对象的状态？要就上实例⽅法。

## JDK和JRE有什么区别？

JDK是给开发者⽤的，它⾥⾯不仅包含了写Java代码需要的编译器、调试⼯具，还打包了JRE。你可以把它看作⼀个完整的开发套件。

JRE则是运⾏Java程序的基础环境，它包含JVM和运⾏时需要的核⼼类库。⽐如你只是想跑⼀个别⼈写好的.jar⽂件，装JRE就够了，不需要编译功能。

所以关键在于⽤途不同：开发选JDK，纯运⾏选JRE。

打个⽐⽅，JDK像是整套厨房设备，有⼑具、灶台、调料（编译、调试、运⾏全都有），⽽JRE只是⼀个微波炉，负责把做好的饭菜热⼀下（只负责运⾏）。

现在主流的 JDK 发⾏版，像 OpenJDK、Oracle JDK 或者国内常⽤的 Alibaba Dragonwell，其实都⾃带了 JRE，安装后可以直接编译也能直接运⾏程序。

1）JDK 包含 JRE，JRE 包含 JVM

2）没有 JDK 也能运⾏ Java 程序，只要有 JRE

3）javac 命令在 JRE 中不可⽤，因为它属于编译⼯具，只存在于 JDK

<!-- image-->

⾯试如果问到，记住⼀句话就⾏：JDK是开发环境，JRE是运⾏环境。

Java 中 wait() 和 sleep() 的区别？

wait() 和 sleep() 看起来都是让线程“停下来”，但它们的使⽤场景和底层机制完全不同。

1） wait() 是 Object 的⽅法，调⽤后线程会释放持有的监视器锁（monitorlock），进⼊等待队列，直到其他线程执⾏ notify() 或 notifyAll() 才能被唤醒。它必须在 synchronized 块或⽅法中使⽤，否则会抛出IllegalMonitorStateException 。

```javascript
synchronized (obj) {
obj.wait(); // 释放锁，进⼊等待
}
```

2） sleep() 是 Thread 类的静态⽅法，它只是让当前线程暂停指定时间，不释放任何锁。时间⼀到，线程进⼊就绪状态等待CPU调度。

try {   
Thread.sleep(1000);   
} catch (InterruptedException e) {   
Thread.currentThread().interrupt();   
}

关键区别在于锁的释放与协作机制。 wait() 是线程间通信的⼀部分，常⽤于⽣产者-消费者模式，配合notify() 实现线程协作。⽽ sleep() 更像是“我先歇会⼉”，跟同步⽆关。

还有⼀点， wait() 可以被外部唤醒， sleep() 虽然也能被中断，但需要捕获 InterruptedException ，并且不会⾃动重新获取锁。

所以别搞混了，想做线程协调，⽤ wait()/notify() ；只想暂停⼀下，⽤ sleep() 就⾏。

PO、VO、BO、DTO、DAO、POJO 有什么区别？

这⼏个对象在分层架构⾥各司其职，搞清楚它们的职责边界，代码才不会乱成⼀锅粥。

PO是跟数据库表直接对应的实体类，字段和表列⼀⼀对应，⼀般⽤于ORM框架⽐如MyBatis或JPA。它待在持久层，不往外传。

DTO是⽤来传输数据的，跨服务或跨层传递时⽤。⽐如Controller和远程接⼝之间，字段可能⽐PO少，也可能组合了多个表的数据，⽬的就是减少⽹络传输量。

VO⼀般是给前端展⽰⽤的，可能聚合了⽤户信息、订单状态、商品详情等，结构完全为⻚⾯定制。⽐如⼀个订单详情⻚要显⽰⽤户名、地址、物流进度，VO就把这些都打包好。

BO 承担业务逻辑，可能包含⼀些计算⽅法或流程控制。⽐如 OrderBO 可能有 calculateDiscount() 或isOverdue() 这种带⾏为的对象，通常在 service 内部流转。

DAO 是数据访问对象，专⻔负责操作数据库，⽐如 UserDao 定义了 insertUser() 、 findByPhone() 等⽅法。  
它是个接⼝或类，⼲的是和 DB 交互的脏活累活。

POJO是最普通的Java对象，不依赖任何框架接⼝，上⾯这些对象本质上都是POJO，只要没继承特殊类、没实现框架接⼝，就是 POJO。

1）PO → 数据库映射

2）DTO→跨层数据搬运

3）VO→前端视图组装

4）BO→业务逻辑承载

5）DAO→操作数据库的⽅法集合

6）POJO → 所有普通 Java 对象的统称

<!-- image-->

## 你认为Java的优势是什么？

Java 的优势其实体现在⼯程落地的稳定性上，尤其适合⼤型复杂系统。

⾸先，JVM是它的核⼼护城河。⼀次编写，到处运⾏不是⼝号，是实打实的⽣产⼒保障。你写的服务在开发机跑得好好的，扔到线上⼤概率还是稳的，不⽤操⼼底层操作系统差异带来的诡异问题。

类库⽣态也成熟得离谱。从 Spring 全家桶做 Web 服务，到 Netty 写⾼性能通信，再到 Kafka、Flink 这些⼤数据组件，清⼀⾊ Java 栈。公司⾥搞个微服务，Spring Boot 加⼏个 starter 就能快速搭起来，省了多少脏活累活。

1）内存管理⾃动搞定，GC虽然偶尔会停顿，但G1、ZGC这些新收集器已经能把暂停压到毫秒级甚⾄更低

2）并发编程有完整的⼯具链，ConcurrentHashMap、CompletableFuture、ForkJoinPool 都是实战利器

3）语⾔本⾝虽不算炫，但泛型、注解、Lambda 这些该有的都有，代码可读性和维护性拿捏住了

企业级应⽤⾥，Java拿来就能扛住⾼并发场景。像阿⾥早期的交易系统、银⾏的核⼼账务，都是靠Java堆出来的。不是它完美，⽽是整个技术闭环太完整，从诊断（jstack、jmap）、监控（Micrometer）、部署到调优，⼯具链⼀套接⼀套。

<!-- image-->

## Java21有哪些新特性？

Java 21 是⼀个⻓期⽀持（LTS）版本，带来了不少实⽤的新特性，主要集中在语法简化、性能提升和底层机制增强。

1）虚拟线程是最⼤亮点。它属于ProjectLoom的成果，把并发编程从“每个请求⼀个线程”切换到“成千上万协程共享少量OS线程”。以前⽤Tomcat线程池扛1万并发都吃⼒，现在⽤虚拟线程轻松应对。写法也简单，⼏乎不⽤改代码。

```javascript
Thread.startVirtualThread(() -> System.out.println("运⾏在虚拟线程"));
```

2）结构化并发处于孵化阶段，配合虚拟线程使⽤。它让多个⼦任务的⽣命周期统⼀管理，异常传递更清晰，适合批处理或分⽚查询场景。

3）记录模式（RecordPatterns）和数组解构是模式匹配的进⼀步落地。以前要写⼀堆if-elseinstanceof判断再拆字段，现在可以直接匹配数据结构。

```groovy
if (obj instanceof Point(int x, int y)) {
System.out.println(x + ", " + y);
}
```

4）字符串模板（ STR ）是预览功能，取代繁琐的 String.format 或 StringBuilder 拼接。写 SQL 或 JSON 组装时特别顺⼿。

String name = "Alice";   
System.out.println(STR."Hello \{name}"); // Hello Alice

这些特性⾥，虚拟线程对系统吞吐量影响最⼤。像WebFlux这类响应式框架的部分压⼒其实来⾃回调复杂性，⽽虚拟线程⽤同步代码就能写出⾼并发服务，直接降低⼼智负担。

要不要升级？如果你的应⽤是典型的I/O密集型，⽐如⽹关、微服务接⼝层，升级后可能不改代码就提升3-5倍QPS。但计算密集型服务收益就不明显。

Java⽅法重载和⽅法重写之间的区别是什么？

⽅法重载和重写看起来都是“同名不同义”，但它们的使⽤场景和底层逻辑完全不同。

1）⽅法重载发⽣在同⼀个类⾥，靠的是参数列表的不同。⽐如 Math.max(int, int) 和 Math.max(double,double) ，返回类型可以不⼀样，但光靠返回类型不同是搞不定重载的。它在编译期就决定了调⽤哪个⽅法，属于编译时多态。

2）⽅法重写是⼦类对⽗类⽅法的覆盖，要求⽅法名、参数列表、返回类型都⼀致（⼦类返回类型可以是⽗类的⼦类型），⽽且访问权限不能更严格。它是运⾏时才确定调⽤哪个版本，⽐如 ArrayList.toString() 覆盖了Object.toString() ，这就是运⾏时多态的体现。

## 代码上看：

class Parent {  
void show() { }  
}  
class Child extends Parent {  
@Override  
void show() { } // 重写  
}

重载更像是⼀个类内部的多个同名⼯具⽅法，像 Arrays.sort() 就有好⼏种参数形式；⽽重写是为了实现多态，让 List<String> list = new ArrayList<>() 调⽤ list.add() 时，实际执⾏的是 ArrayList 的逻辑。

编译期 方法重载— 静态绑定

## Java17有哪些新特性？

Java17是⼀个⻓期⽀持（LTS）版本，直接从Java11跳过来的，所以积累了不少实⽤更新。重点不是语法⼤改，⽽是让代码更安全、更简洁、运⾏更⾼效。

## 1）密封类（Sealed Classes）

想限制⼀个类只能被指定的⼏个⼦类继承，⽤ sealed 关键字就⾏。以前靠⽂档约定，现在编译器能强制校验。⽐如你定义 Shape 只能由 Circle 、 Rect 实现，别的类继承直接报错。

public sealed interface Shape permits Circle, Rect {}   
public record Circle(double r) implements Shape {}   
public final class Rect implements Shape {}

## 2）switch模式匹配（预览功能）

虽然Java17还是预览版，但已经能看出趋势。以前switch⾥要先判断类型再强转，现在⼀步到位。

switch (obj) {   
case String s -> System.out.println("字符串: " + s);   
case Integer i -> System.out.println("数字: " + i);   
default -> System.out.println("其他");   
}

3）移除了AppletAPI，彻底跟⽼旧浏览器插件说再⻅。同时ZGC和Shenandoah在这个版本已经可⽤，⼤堆内存（⽐如 1TB）下也能把 GC 停顿压到 10ms 以内，适合对延迟敏感的服务。

4）默认启⽤弹性元空间，减少FullGC中元空间回收的开销。底层实现上，把很多原来⽤C++写的脏活累活交给了Java，维护起来更⽅便。

总的来说，Java17更像是“成熟期”的⼀次加固，密封类和模式匹配这些特性，都在引导你写出更可读、更少出错的代码。升级后⼀般不需要改业务逻辑，但能明显提升系统稳定性和可维护性。

## Float经过⼀系列的操作后(加减乘除)，如何判断是否和另⼀个数相等呢？

浮点数相等判断是个经典坑，根本原因在于⼆进制⽆法精确表⽰所有⼗进制⼩数。⽐如 0.1 在⼆进制⾥是⽆限循环的，存的时候就存在舍⼊误差，经过⼏次运算后误差累积，直接⽤ == 判断等于基本会翻⻋。

解决办法是⽤“误差范围”来判断，也就是看两个数的差值是否⾜够⼩。这个⾜够⼩的值通常称为 epsilon，Java ⾥可以借助 Math.ulp() 或者直接定义⼀个极⼩阈值。

float a = 0.1f \* 3;  
float b = 0.3f;  
// 错误做法  
// if (a == b) // 可能为 false  
// 正确做法  
if (Math.abs(a - b) < 1e-6) {  
// 认为相等  
}

实际业务中，⾦融计算压根不会⽤ float 或 double ，⽽是上 BigDecimal 。像⽀付宝、银⾏系统这些对精度要求⾼的场景，都是 BigDecimal 在扛住，因为它是基于⼗进制的精确计算。

有个细节是， 1e-6 这种阈值不是万能的，对于很⼤或很⼩的数值可能不适⽤。更稳妥的做法是结合相对误差：

public static boolean floatEquals(float a, float b) {   
return Math.abs(a - b) <= Math.max(Math.ulp(a), Math.ulp(b));   
}

总之，浮点数判等别⽤ == ，要么⽤误差容忍⽐较，要么直接上 BigDecimal 做精确计算。

Java25有哪些新特性？

Java25是⼀个短期⽀持版本（仅维护半年），更多是为⻓期版本探路，真正值得关注意的是它背后的实验性功能和语⾔演进⽅向。

## 1）虚拟线程（Virtual Threads）进⼊第⼆轮预览

这是ProjectLoom的核⼼成果，⽬标是让⾼并发编程变得简单。传统线程成本⾼，每个线程占⽤MB级栈内存，最多开⼏万条就到头了。⽽虚拟线程由JVM调度，轻量到可以同时跑百万级，像Tomcat的NIO处理模型可以直接⽤同步代码写出来。

Thread.startVirtualThread(() -> System.out.println("Hello, Loom"));

## 2）未命名变量和模式（Unnamed Variables and Patterns）

当你写模式匹配或 lambda 时，有些变量根本不⽤命名，⽐如只关⼼集合结构不关⼼内容，现在可以⽤下划线 _ 占位，代码更⼲净。

if (obj instanceof String _) { /\* 只判断类型 \*/ }

## 3）外部函数与内存 API（Foreign Function & Memory API）再次孵化

允许Java直接调⽤native库，替代⽼旧的JNI。你可以像Go或Rust那样操作堆外内存、调⽤C函数，性能更好且更安全。⽐如⽤这个API调SQLite原⽣接⼝，延迟能压到微秒级。

4）其他⼩更新包括：ZGC⽀持提前终⽌、权限默认禁⽤、record类扩展等，但都不是⽣产级强需求。

真正影响深远的是虚拟线程，⼀旦稳定，整个中间件⽣态都会重构，像 Netty、Spring WebFlux 的异步模型可能会被同步+虚拟线程取代。⽬前建议在测试环境试⽔，别直接上⽣产。

<!-- image-->

Java11有哪些新特性？

Java11是⼀个⻓期⽀持（LTS）版本，直接接替Java8，带来不少实⽤改进。它不光是语法升级，更多是精简和增强平台能⼒。

## 1）HTTP Client 标准化

原⽣ HttpClient ⽀持同步异步请求，WebSocket 也⼀并⽀持。以前得靠第三⽅库⽐如 OkHttp，现在 JDK ⾃带就能⼲。

HttpClient.newHttpClient()  
.sendAsync(request, BodyHandlers.ofString())  
.thenApply(Response::body)  
.thenAccept(System.out::println);

## 2）字符串操作更顺⼿

String 新增了 isBlank() 、 lines() 、 strip() （⽐ trim 更智能，处理 Unicode 空格）、repeat(n) 。⽇常处理⽂本省了不少事。

## 3）⽂件读写⼀⾏搞定

Files.readString() 和 Files.writeString() ⽀持 UTF-8 编码的⼀次性读写，⼩⽂件场景不⽤再套BufferedReader 套路了。

## 4）运⾏单⽂件源码

可以直接 java HelloWorld.java 运⾏，不⽤先 javac 。适合脚本类场景或教学演⽰，开发调试更轻量。

## 5）ZGC 初登场

虽然ZGC在Java11还是实验性功能，但它主打“低延迟”，⽬标是停顿时间不超过10ms，能扛住TB级堆内存。后来在 Java 15 转正。

## 6）移除部分旧内容

彻底移除了 Java EE 和 CORBA 模块（⽐如 javax.xml.ws ），官⽅明确这些技术已经过时，推荐⽤ Spring Boot 或Micronaut 替代。

总的来说，Java11把实⽤性和现代化推进了⼀⼤步，尤其是HTTP客户端和字符串API，基本成了新项⽬的标配底座。

## Java Object 类中有什么⽅法，有什么作⽤？

每个Java类都默认继承Object，它提供的⽅法是JVM和语⾔层⾯协作的结果。这些⽅法构成了对象⾏为的基础，像equals、hashCode 这种在集合类⾥天天⽤。

1） equals(Object obj) 判断两个对象是否逻辑相等。默认实现是 == ⽐较，但像 String、Integer 都重写了它，按值⽐较。注意要满⾜⾃反、对称、传递等特性。

2） hashCode() 返回对象的哈希码。散列表⽐如 HashMap、HashSet 就靠它定位桶位置。重写 equals 时必须重写hashCode，不然HashMap⾥可能找不到你存的对象。

3） toString() 返回对象的字符串表⽰。打印对象或字符串拼接时⾃动调⽤。建议所有类都重写它，不然输出像java.lang.Object@6504e3ll ，看不出内容。

4） clone() 创建并返回对象的拷⻉。要实现 Cloneable 接⼝，否则抛异常。浅拷⻉只复制基本类型和引⽤地址，深拷⻉得⾃⼰递归处理。

5） getClass() 返回运⾏时类对象，final ⽅法不能被重写。它是反射的⼊⼝，⽐如 Class.forName 就能拿到类信息。

6） wait() 、 notify() 、 notifyAll() 配合 synchronized 实现线程间通信。wait 会释放锁并挂起线程，直到被notify唤醒。⽤的时候必须在同步块⾥。

7） finalize() 对象被回收前可能调⽤的⽅法。但不保证执⾏，也不推荐⽤，资源释放应该⽤⼿动 close 或 try-with-resources。

<!-- image-->

## 接⼝和抽象类有什么区别？

接⼝和抽象类虽然都能定义⽅法契约，但它们的定位和能⼒完全不同。

抽象类本质还是个类，它允许你写具体的⽅法实现，也能定义成员变量。⼦类继承它的时候，可以复⽤⾥⾯已有的代码。⽐如你有个 BaseService 抽象类，⾥⾯写了通⽤的⽇志记录逻辑，所有业务服务继承它就能直接⽤。

接⼝就更纯粹了，从Java8开始允许默认⽅法实现，但它主要还是⽤来声明“能做什么”。⼀个类可以实现多个接⼝，⽐如 ArrayList 既实现了 List ⼜实现了 RandomAccess 。这在设计扩展点时特别有⽤，像 Spring 的ApplicationContextAware 、 InitializingBean 都是通过接⼝让 Bean 感知容器⽣命周期。

1）抽象类强调“是什么”，适合有共同属性和⾏为的场景

2）接⼝强调“有什么能⼒”，适合解耦和横向扩展

3）抽象类只能单继承，接⼝可以多实现

public abstract class Animal {   
protected String name;   
public abstract void makeSound();   
public void sleep() {   
System.out.println("Sleeping...");   
}   
}   
public interface Flyable {   
default void fly() {   
System.out.println("Flying...");   
}   
}

实际开发⾥，⼀般⽤抽象类做⻣架实现，接⼝定义⾏为规范。像 JDK ⾥的 InputStream 是抽象类，因为有共⽤的读取逻辑；⽽ Comparable 就是典型的能⼒接⼝。

## Java中的序列化和反序列化是什么？

序列化就是把内存⾥的对象变成字节流，⽅便存储或传输。反序列化则是把这个字节流重新还原成对象。

1）要让⼀个类⽀持序列化，必须实现 Serializable 接⼝，这个接⼝是个标记接⼝，不带任何⽅法。JVM会通过反射机制⾃动处理字段的读写。

class User implements Serializable {   
private String name;   
private int age;   
}

2） 序列化时会⽣成⼀个 serialVersionUID ，⽤来校验版本⼀致性。如果反序列化时类结构变了，但serialVersionUID 匹配，就能成功加载，否则抛 InvalidClassException 。建议显式定义它，避免因字段变动导致意外失败。

3） 静态变量和被 transient 修饰的字段不会被序列化。⽐如密码这类敏感信息，可以⽤ transient 标记，让它绕过持久化过程。

场景上，RMI、Dubbo的⽹络调⽤底层就依赖序列化传对象。Redis存Java对象时也常做序列化，⽐如⽤JdkSerializationRedisSerializer。

不过默认的序列化性能差，产⽣的字节流⼤，跨语⾔也搞不定。实际项⽬⾥更多⽤Kryo、Protobuf或JSON（如Jackson）替代。

Java Object ObjeetOutputStream Byte Stream -File /Network- Storage/Transfer ObjeetlnputStream Java Object

## 为什么Java不⽀持多重继承？

Java不⽀持类的多重继承，主要是为了避免“菱形问题”带来的歧义和复杂性。想象两个⽗类有同名⽅法，⼦类继承时就不知道该调⽤哪个，编译器压根没法决定。

1）类只能单继承，这是Java语⾔设计时的明确选择，保证继承链清晰。每个类有且只有⼀个直接⽗类，Object是所有类的最终祖先。

2）接⼝可以多继承，从Java8开始，接⼝允许默认⽅法，解决了部分多重⾏为复⽤的需求。⽐如⼀个类实现多个接⼝，每个接⼝提供默认实现，只要⽅法签名不冲突就没问题。

3）如果多个接⼝有同名默认⽅法，编译器会报错，必须由⼦类显式重写该⽅法，明确指出逻辑如何处理。这样就把决策权交给开发者，⽽不是让系统猜测。

<!-- image-->

代码上，你得⼿动解决冲突：

class C implements A, B {  
@Override  
public void method() {  
// 必须重写，可以选择调⽤ A 或 B 的默认实现，或者⾃⼰写  
A.super.method();  
}  
}

说⽩了，Java ⽤“单继承 + 多接⼝”的组合，既规避了复杂性，⼜保留了灵活性。像 Spring 框架⾥⼤量依赖接⼝做解耦，就是这种设计的实际受益场景。

## Java运⾏时异常和编译时异常之间的区别是什么？

Java的异常体系设计是为了让程序在出错时能有清晰的处理路径。我们平时说的运⾏时异常和编译时异常，其实是Exception体系下的两个分⽀，关键区别在于“编译器是否强制你处理”。

运⾏时异常，也就是 RuntimeException 及其⼦类，⽐如 NullPointerException、

ArrayIndexOutOfBoundsException，这类异常编译器不强制你在代码⾥ try-catch 或 throws。它们通常是由程序逻辑错误导致的，⽐如空指针、数组越界。你可以处理，但不是必须的。

⽽编译时异常，像IOException、SQLException这些，只要⽅法⾥可能抛出，你就得显式处理，要么catch，要么继续往上throws。否则，代码根本过不了编译。这类异常往往是外部因素引起的，⽐如⽂件不存在、⽹络断开，属于“可预期但不可控”的问题。

简单说，编译时异常是编译器逼你⾯对的问题，你不写处理逻辑就编译不过；运⾏时异常是你⾃⼰代码的“bug”，编译器默认你已经校验好了，出了问题你⾃⼰负责。

// 编译时异常：必须处理  
FileInputStream fis = new FileInputStream("a.txt"); // 不处理会编译失败

// 运⾏时异常：可以不处理  
int[] arr = new int[5];  
arr[10] = 1; // 数组越界，程序直接崩，但编译没问题

所以设计上，如果你希望调⽤者必须考虑某种错误场景，就⽤编译时异常；如果是程序内部逻辑问题，⽤运⾏时异常更合适。现在很多框架⽐如Spring，也倾向于⽤运⾏时异常来减少模板代码。

## 如何在Java中调⽤外部可执⾏程序或系统命令？

Java ⾥执⾏外部命令，主要靠 Runtime.exec() 或 ProcessBuilder 。虽然都能⼲这活，但后者更灵活，是现在推荐的⽅式。

1）⽤ Runtime.exec() 最简单，⼀⾏代码就⾏

```javascript
Process p = Runtime.getRuntime().exec("ls -l");
```

但它对环境变量、⼯作⽬录这些控制很弱，搞复杂场景容易翻⻋。

2） ProcessBuilder 就是为了弥补这个短板设计的，能精细控制命令的执⾏环境

```javascript
ProcessBuilder pb = new ProcessBuilder("ping", "baidu.com");
pb.directory(new File("/tmp")); // 指定⼯作⽬录
pb.inheritIO(); // 输出直接打到控制台，⽅便调试
Process p = pb.start();
```

真正关键的是别忘了处理输⼊输出流。⼦进程的stdout和stderr如果不读，缓冲区满了就会卡住，程序直接僵死。常⻅写法是⽤线程异步消费这两个流。

另外， Process.waitFor() 会阻塞等命令结束，返回退出码，0 ⼀般是成功。超时控制⽤ waitFor(long,TimeUnit) ，避免⽆限等下去。

<!-- image-->

## 栈和队列在Java中的区别是什么？

栈和队列最根本的区别在于数据访问的顺序。

1）栈是后进先出（LIFO），就像⼀摞盘⼦，只能从顶部拿或放。Java⾥可以⽤ ArrayDeque 模拟栈操作，⽐如调⽤push() ⼊栈， pop() 出栈，取值永远在顶端。

2）队列是先进先出（FIFO），像排队打饭，新来的⼈排尾，前⾯的⼈先⾛。Java 中 Queue 接⼝定义了 offer()⼊队， poll() 出队，处理顺序从头到尾。

实际开发中，栈常⽤于⽅法调⽤链、表达式求值，JVM就靠虚拟机栈管理⽅法执⾏上下⽂。⽽队列多⽤于解耦⽣产消费，⽐如消息中间件Kafka的底层就是⾼性能队列在⽀撑，线程池的任务队列也是典型场景。

代码上对⽐也很直观：

```javascript
ArrayDeque<Integer> stack = new ArrayDeque<>();
stack.push(1);
stack.push(2);
stack.pop(); // 返回 2
Queue<Integer> queue = new ArrayDeque<>();
queue.offer(1);
queue.offer(2);
queue.poll(); // 返回 1
```

注意别⽤过时的 Stack 类，它线程安全但性能差，直接⽤ ArrayDeque 做栈更⾼效。同样，普通场景⽤ArrayDeque 实现队列，⽐ LinkedList 更快，内存更紧凑。

## 什么是Java的⽹络编程？

Java的⽹络编程，说⽩了就是⽤Java代码实现不同机器上的程序能互相通信。最基础的就是基于TCP和UDP这两种协议来收发数据。

1）TCP 是⾯向连接的，⽐如你⽤ Socket 写个聊天程序，服务端得先启动 ServerSocket 监听端⼝，客户端再⽤Socket发起连接。⼀旦连上，双⽅就能通过输⼊输出流交换数据，保证可靠、有序。

```java
// 服务端简单⽰例
ServerSocket server = new ServerSocket(8080);
Socket client = server.accept();
BufferedReader in = new BufferedReader(new
InputStreamReader(client.getInputStream()));
String msg = in.readLine(); // 读客户端消息
```

2）UDP 不建⽴连接，直接发数据包，适合对实时性要求⾼但能容忍丢包的场景，⽐如视频直播。Java ⽤DatagramSocket 和 DatagramPacket 来处理。

3）实际开发中，没⼈会直接裸写这些底层API。Netty才是主流选择，它把NIO那套复杂的事件驱动模型封装得很⼲净，像Dubbo、RocketMQ都靠它撑起⾼性能通信。

NIO 和 Netty 是进阶关键，尤其是 Reactor 模式怎么通过⼀个线程管理成千上万个连接。传统 IO 每个连接⼀个线程，扛不住并发；NIO⽤Selector监听多个通道，压根不经过阻塞等待。