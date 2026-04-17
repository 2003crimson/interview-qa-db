# SpringBoot ⾯试题速记通关版



推荐更多免费学编程资源：

1.编程导航学习网站：学编程、做项目、拿Offer！  
2.企业高频面试题库：开始刷题，面试遇原题！  
3.精选简历模板大全：1分钟搞定简历！  
4.AI资源导航网站：获取最新AI黑科技！  
5.1对1模拟面试：随时随地提升面试能力

Spring Boot ⼯程启动以后，我希望将数据库中已有的固定内容，打⼊到 Redis 缓存中，请问如何处理？

应⽤启动后加载数据到Redis，关键是找到合适的钩⼦时机，既不能太早（⽐如数据库连接还没建好），也不能太晚（业务请求已经开始进来了）。

Spring 提供了 CommandLineRunner 和 ApplicationRunner ，这两个接⼝的实现会在 Spring Boot 容器初始化完成后⾃动执⾏。⽤它们来触发缓存预热是最稳妥的选择。

1）定义⼀个组件实现 CommandLineRunner ，在 run ⽅法⾥调⽤你的缓存预热逻辑

```java
@Component
public class CachePreloader implements CommandLineRunner {
private final UserService userService;
private final StringRedisTemplate redisTemplate;
public CachePreloader(UserService userService, StringRedisTemplate
redisTemplate) {
this.userService = userService;
this.redisTemplate = redisTemplate;
}
@Override
public void run(String... args) {
List<User> users = userService.getAllUsers();
users.forEach(user ->
redisTemplate.opsForValue().set("user:" + user.getId(),
JSON.toJSONString(user))
);
}
}
```

2）如果数据量⼤，建议分⻚加载，避免⼀次性查 5 万条压垮数据库。可以按每⻚ 1000 条异步刷⼊。

3）注意异常处理。如果Redis挂了，要不要阻塞启动？⼀般来说允许启动继续，但要打告警⽇志，后续通过定时任务补偿。

4）更复杂的场景可以⽤ @EventListener(ContextRefreshedEvent.class) ，它⽐ CommandLineRunner更底层⼀点，适合多模块协同触发。

整个过程其实就是利⽤ Spring 的⽣命周期机制，在容器就绪后、服务对外前把脏活累活⼲完。

## SpringBoot配置⽂件加载优先级你知道吗？

Spring Boot 启动时会按固定顺序扫描多位置的配置⽂件，后加载的会覆盖前⾯的同名属性。整个过程不难理解，关键是记住⼏个核⼼路径和优先级次序。

外部配置优先级最⾼，⽐如通过命令⾏参数指定的配置，它能直接覆盖所有其他来源。其次是当前项⽬⽬录下的config ⼦⽬录⾥的 application.properties 或 application.yml ，这是给运维留的动态调整⼊⼝。

接着是项⽬根⽬录本⾝，这⾥的配置⽂件虽然也能被识别，但通常不如放在 config ⽬录下规范。再往下就是jar包内部的 classpath:/config/ 和 classpath:/ ，也就是我们开发时最常⻅的 src/main/resources 下的配置。

1）命令⾏参数（--server.port=8081）

2）项⽬根⽬录的 config/ ⽬录

3）项⽬根⽬录

4）classpath 的 config/ ⽬录

5）classpath 根路径

如果同时存在 yml 和 properties ⽂件，同⽬录下 properties 会覆盖 yml。另外，profile 特定⽂件如 application-prod.yml 只在对应环境激活时才⽣效，它的优先级⾼于通⽤ application.yml 。

<!-- image-->

实际部署时，推荐把默认配置打在jar⾥，运维⽤外部config⽬录或启动参数调优，这样既安全⼜灵活。

## Spring Boot 是否可以使⽤ XML 配置 ?

SpringBoot虽然主打注解和⾃动配置，但完全⽀持XML配置，只是不推荐作为⾸选。

1）你可以⽤ @ImportResource 注解导⼊传统的 Spring XML ⽂件。⽐如你的⽼项⽬有⼀堆applicationContext.xml 定义的 Bean，直接在启动类上加⼀句@ImportResource("classpath:applicationContext.xml") 就能加载进去。

2）XML在⼀些复杂场景下仍有价值，⽐如整合⽼系统、需要精确控制Bean的⽣命周期或使⽤某些只提供XML配置的第三⽅库时。像⼀些银⾏的⽼系统迁移，可能还在⽤IBMMQ的XML配置⽅式。

3）但⽇常开发中，你应该优先⽤ Java Config 和 application.yml 。XML 写起来冗⻓，维护成本⾼，⽽且破坏了Spring Boot 约定优于配置的原则。新功能基本都通过注解扩展，⽐如 @ConditionalOnMissingBean 这种条件装配，XML 压根搞不定。

代码⽰例：

@SpringBootApplication   
@ImportResource("classpath:beans.xml")   
public class App {   
public static void main(String[] args) {

SpringApplication.run(App.class, args);   
}   
}

总的来说，XML是后备选项，不是主流玩法。你能⽤它，但别滥⽤。

## SpringBoot 中如何实现定时任务 ?

SpringBoot ⾥做定时任务，最常⽤的就是 @Scheduled 注解，配合 @EnableScheduling 启⽤。整个过程其实挺轻量的，框架帮你把线程池这些脏活累活都包了。

1）先在启动类或配置类上加 @EnableScheduling ，开启定时功能。

2）在⽅法上⽤ @Scheduled 标记，指定执⾏策略。⽀持固定频率、固定延迟，还有cron表达式。

⽐如每5秒跑⼀次：

```java
@Scheduled(fixedRate = 5000)
public void task() {
System.out.println("执⾏中...");
}
```

cron 更灵活，像每天凌晨1点：

```bib
@Scheduled(cron = "0 0 1 * * ?")
public void dailyJob() { ... }
```

默认是单线程串⾏执⾏，所有任务共⽤⼀个线程池。如果某个任务耗时⻓，后⾯的会阻塞。想并⾏就得⾃⼰定义TaskScheduler 或 ThreadPoolTaskScheduler ，给多⼏个线程。

集群环境下@Scheduled就搞不定了，多个实例会重复执⾏。这时候得引⼊分布式调度⽅案，⽐如XXL-JOB、Elastic-Job或Quartz配合数据库锁。它们能保证同⼀时间只有⼀个节点执⾏任务。

简单应⽤直接⽤注解就⾏，开发快⼜够⽤。但⼀旦上集群，就得靠外部调度中间件来协调，不然任务重复执⾏可能引发数据问题。

单机：默认单线程池  
启动类@EnableScheduling 方法加@Scheduled 执行模式  
集群：需XXL-JOB/Quartz 数据库锁or注册中心协调

## @Async什么时候会失效？

⽅法调⽤在同⼀个类中会导致代理失效，这是最常⻅的情况。Spring 的 @Async 基于 AOP 代理实现，只有外部 bean调⽤⽅法时才会⾛代理逻辑，进⽽触发异步执⾏。

如果本类⽅法直接调⽤被@Async标记的⽅法，相当于this.method()，压根不经过代理对象，异步机制就失效了。

1）确保调⽤⽅和被调⽤⽅是不同的 Spring Bean

2）@Async ⽅法不能是 private、static 或 final 的，代理⽆法覆盖这些⽅法

3）所在类必须被Spring容器管理，普通new出来的对象⽆效

4）需要启⽤ @EnableAsync，否则注解不⽣效

5）异常未处理可能导致线程池任务中断，表⾯看像是“没执⾏”

代码⽰例：

```java
@Service
public class AsyncTaskService {
@Async
public void sendEmail() {
}
}
@Service
public class BusinessService {
@Autowired
private AsyncTaskService taskService;
public void process() {
taskService.sendEmail(); // 正确：通过代理调⽤
}
}
```

错误⽤法就是把 taskService 的调⽤换成 this.sendEmail()。

## 说说 Springboot 的启动流程？

Spring Boot 启动看起来就⼀⾏ run() 调⽤，背后其实做了不少事。整个过程从创建上下⽂到刷新容器，每⼀步都封装好了，但得知道它⼲了啥。

1）启动时先初始化⼀个 SpringApplication 实例，这⾥会做些前置判断，⽐如当前项⽬类型是 Servlet 还是Reactive，然后设置默认的 ApplicationContextInitializer 和 ApplicationListener 。

2）真正 run() 的时候，第⼀步是准备环境，不管是Web环境还是⾮Web环境，都会读取配置⽂件（application.yml 或 properties），也⽀持命令⾏参数覆盖。

3）接着创建合适的应⽤上下⽂ ApplicationContext 。如果是 Web 项⽬，就是AnnotationConfigServletWebServerApplicationContext ，这个上下⽂能启动内嵌容器。

4）上下⽂准备好后，开始加载 Bean。Spring Boot 会扫描主类所在包下的所有组件，靠的是@SpringBootApplication ⾥的 @ComponentScan 。

5）最关键的⼀步是刷新上下⽂，这⼀步触发内嵌服务器启动。⽐如 Tomcat 就是在 onRefresh() 时被拉起来的，端⼝绑定、连接器配置都在这阶段完成。

6）最后发布 ApplicationReadyEvent ，表⽰服务已经可以接收请求了。

代码上其实就是：

public static void main(String[] args) {   
SpringApplication.run(Application.class, args);

但你知道它背后把⾃动配置、条件装配、内嵌容器这些脏活累活全包了，才让你能⼀键启动。

<!-- image-->

## SpringBoot是如何实现⾃动配置的？

SpringBoot 的⾃动配置不是魔法，靠的是约定⼤于配置的思想和⼏个关键机制组合起来的。

## 启动时会扫描 classpath 下所有 META-

INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports ⽂件，⾥⾯列了⼀堆 ⾃动配置类。这些类不会⽆脑加载，每个都带着条件注解，⽐如 @ConditionalOnClass 、@ConditionalOnMissingBean ，只有满⾜条件才⽣效。

## 举个例⼦，你引⼊了 spring-boot-starter-data-redis ，classpath ⾥有了

LettuceConnectionFactory ，⾃动配置发现这个类存在，⽽且容器⾥还没⼈创建过 RedisTemplate，它就帮你把连接池、模板对象都配好。

## 1） ⾃动配置类通常放在 spring.factories 或

org.springframework.boot.autoconfigure.AutoConfiguration.imports 中 2） 条件装配确保不冲突，⽐如只在某个类存在且某个Bean缺失时才创建3）配置优先级可通过 @AutoConfigureAfter 控制

<!-- image-->

别⼩看 @EnableAutoConfiguration 这个注解，它就是触发整个链路的开关。实际项⽬⾥像 Nacos、MyBatis-Plus的starter都是照这个套路来，把⼀堆初始化逻辑封装掉，你写个依赖就能⽤。

## SpringBoot（Spring）中为什么不推荐使⽤ @Autowired ？

Spring官⽅其实在新版本⾥把 @Autowired 标记为可选了，根本原因是指定注⼊⽅式时太死板，容易引发隐性问题。

1）依赖注⼊最稳的⽅式是构造器注⼊。⽤构造函数把依赖写清楚，对象⼀创建就必须把该给的都给全，这样单元测试也好写，类的状态也明确。你⽤ @Autowired 注解在字段上，看似省事，但实际掩盖了依赖关系，别⼈看代码不知道这玩意从哪来。

2）字段注⼊会导致 final 关键字没法⽤，类的不可变性被破坏。⽽构造器注⼊天然⽀持 final ，更安全。

3） 循环依赖场景下， @Autowired 会让⼈踩坑。虽然 Spring 能靠三级缓存搞⼀下单例的循环依赖，但这其实是种坏味道，暴露的是设计问题。过度依赖 @Autowired 会让这种问题更难发现。

4） 在⾮单例场景，⽐如 prototype bean 注⼊到 singleton ⾥，字段注⼊可能拿到过期实例，⽽⽅法注⼊（lookupmethod）或 ObjectProvider 才是正解，但 @Autowired 让⼈忽略这些细节。

现在推荐的做法是在构造函数上不加注解，靠 IDE 提⽰⾃动装配。Spring Boot 2.6+ 默认关闭循环依赖后，构造器注⼊成了事实标准。

构造器注入 ServiceB 构造器注入   
ServiceA ServiceC   
不应反向依赖

说⽩了， @Autowired 把脏活累活藏起来了，但架构设计上得往前看⼀步。

如何在SpringBoot启动时执⾏特定代码？有哪些⽅式？

SpringBoot启动时执⾏代码，本质上是利⽤它的⽣命周期回调机制。你不需要⼿动触发，框架会在启动的不同阶段⾃动调⽤你注册的逻辑。

最常⻅的办法是实现 CommandLineRunner 接⼝。只要你的类加上 @Component ，重写 run ⽅法，它就会在容器初始化完成后执⾏。参数就是应⽤启动时传⼊的命令⾏参数。

```java
@Component
public class MyStartupTask implements CommandLineRunner {
public void run(String... args) {
System.out.println("启动任务执⾏");
}
}
```

如果多个 Runner 有先后依赖，可以⽤ @Order(1) 或让类实现 Ordered 接⼝来控制顺序。

另⼀种⽅式是监听 ApplicationReadyEvent 事件。这代表整个应⽤已经准备就绪，包括所有Bean都加载完了，数据库连接也建好了。适合做最后的初始化通知或健康检查上报。

```java
@EventListener(ApplicationReadyEvent.class)
public void onAppReady() {
System.out.println("应⽤已就绪");
}
```

如果你需要更底层的控制，⽐如想在刷新容器早期就介⼊，可以考虑 ApplicationRunner ，它和CommandLineRunner 类似，但接收的是封装后的 ApplicationArguments ，处理参数更⽅便。

还有⼀种情况是你要改配置或环境变量，就得⽤ ApplicationContextInitializer ，它在上下⽂创建后、刷新前执⾏，⼀般配合 spring.factories ⽂件注册。

总的来说，90%的场景⽤ CommandLineRunner 就够了。真要分阶段，再考虑事件监听或者initializer。别把简单事搞复杂，脏活累活框架都帮你扛住了。

## Spring Boot 中如何实现异步处理？

Spring Boot 的异步处理主要靠 @Async 注解和线程池配合，把耗时操作从主线程剥离，避免阻塞请求响应。

1）先在启动类或配置类上加@EnableAsync开启异步⽀持。然后在需要异步执⾏的⽅法上标注@Async，这个⽅法就会被动态代理拦截，交给独⽴线程去跑。

2）默认⽤的是 Spring 内置的 SimpleAsyncTaskExecutor，但⽣产环境⼀定得⾃定义线程池。⽐如⽤ThreadPoolTaskExecutor配置核⼼线程数、队列容量这些参数，不然容易把系统搞崩。常⻅的像发短信、写⽇志这种⾮关键路径操作，就适合扔进异步处理。

3）返回值可以是 void 或 Future / CompletableFuture。如果要获取结果，推荐⽤ CompletableFuture，它⽀持链式调⽤和组合，跟业务逻辑融合更顺。

举个例⼦，⽤户注册后异步发送欢迎邮件，主线程完成注册直接返回，邮件任务由专⻔的线程池处理，这样接⼝响应能从⼏百毫秒降到⼏⼗毫秒。

<!-- image-->

注意事务和异常的处理。@Async⽅法别直接抛异常，最好内部try-catch记录⽇志，因为调⽤⽅可能已经⾛完了。另外，同⼀个类⾥⽅法直接调⽤不会触发代理，得拆到不同 Bean ⾥。

## 在SpringBoot中如何实现多数据源配置？

配置多数据源主要解决⼀个应⽤需要访问多个数据库的场景，⽐如订单库和⽤户库分离。关键在于让 Spring 知道哪个⽅法该⽤哪个数据源。

SpringBoot默认只配⼀个数据源，多个就得⼿动⼲预。核⼼是动态数据源路由，⽤AbstractRoutingDataSource 做分发，根据当前上下⽂决定⽤哪个数据源。

⼀般做法是定义⼀个 @DataSource 注解，标记在 service ⽅法上，⽐如 @DataSource("slave1") 。然后通过AOP拦截这些⽅法，把数据源标识存到 ThreadLocal ⾥。动态数据源在查询时从 ThreadLocal 拿标识，返回对应的数据源实例。

配置上，先定义两个 DataSource Bean，⽐如 masterDataSource 和 slaveDataSource ，注册到⼀个DynamicDataSource ⾥，再把这个 DynamicDataSource 放到 Spring 容器作为主数据源。事务管理器也得指定⽤这个动态数据源。

注意事务要⼩⼼，如果⽤了 @Transactional ，默认绑定的是主数据源，跨数据源事务搞不定，只能保证单个库的ACID。

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface DataSource {
String value();
}
// AOP 切⾯设置数据源
@Before("@annotation(ds)")
public void setDataSource(DataSource ds) {
DynamicDataSourceContextHolder.set(ds.value());
}
```

整个流程就是：注解打标→AOP拦截设上下⽂→动态数据源读上下⽂选库。

## 说说你对SpringBoot事件机制的了解？

Spring Boot 事件机制本质是观察者模式的落地，⽤来解耦业务逻辑。⽐如⽤户注册成功后要发邮件、加积分，这些后续动作就可以⽤事件来触发，主流程不⽤硬编码调⽤。

应⽤启动时，Spring 容器会⾃动识别 ApplicationListener 或标注 @EventListener 的⽅法，把它们注册成监听器。你发⼀个事件，⽐如 context.publishEvent(new UserRegisteredEvent(user)) ，容器就会找到所有监听这个类型的处理器去执⾏。

监听⽅法默认是同步阻塞的，主事务没提交前其他监听器拿不到数据。如果想异步处理，得在类上加

@EnableAsync ，然后给监听⽅法加上 @Async ，这时候要注意事务边界问题，别在事务还没提交时就消费了未提交的数据。

事件类型可以⾃定义，只要继承 ApplicationEvent 就⾏，但其实从 Spring 4.2 开始，连这⼀步都省了，直接发任意对象当事件也⾏。

1）事件发布和监听都在同⼀个应⽤上下⽂内，不跨 JVM

2）适合单体内部模块解耦，跨服务还得靠消息队列⽐如 RabbitMQ、Kafka

3）别滥⽤，频繁发事件会影响性能，毕竟每个监听都是反射调⽤

<!-- image-->

常⻅坑是异步监听导致事务不⼀致，或者监听器抛异常让主流程跟着挂。可以包装⼀层try-catch，或者⽤@EventListener 的 errorHandler 属性指定错误处理器。

## Spring Boot 2.x 与 1.x 版本有哪些主要的改进和区别？

SpringBoot2.x相⽐1.x不是⼩修⼩补，是⼀次全⾯升级，底层⽀撑和开发体验都变了。

JDK版本要求直接跳到8+，不再⽀持6和7。这意味着你可以放⼼⽤Lambda、Stream这些特性，不⽤再写⼀堆匿名内部类。内嵌容器默认版本也升了，Tomcat 8.5+ 成标配，Servlet 规范跟着到了 3.1+。

⾃动配置机制更智能了。条件化配置的判断更细，⽐如 @ConditionalOnMissingBean 现在能按类型和名称双重判断，避免误覆盖。配置元数据⽀持 IDE 提⽰， application.yml ⾥打 spring. 就能⾃动联想，写配置不再靠背。

WebFlux 加⼊让响应式编程成为⼀等公⺠。你可以⽤ @Controller + Mono/Flux 写⾮阻塞接⼝，配合 Netty 或Servlet 3.1+ 容器跑。这在⾼并发 IO 场景下能显著降低线程开销，像⽹关类服务⽤ WebFlux 能扛住更多连接。

Actuator变得更安全也更实⽤。端点默认只暴露 /health 和 /info ，其他要⼿动开启。HTTP端点路径从 和 71

/metrics 这种变成 /actuator/metrics ，隔离更清晰。还⽀持 Prometheus 格式输出，对接 Grafana ⾯板零成本。

依赖管理上，默认⽤ Spring Framework 5，Reactor 成核⼼响应式库。如果你⽤ WebClient 替代 RestTemplate，天然⽀持异步⾮阻塞调⽤，和 Spring Cloud Gateway 配合更顺。

@Bean   
public RouterFunction<ServerResponse> route(UserHandler handler) {   
return route(GET("/users/{id}"), handler::getById);   
}

这套函数式路由写法，是WebFlux提供的另⼀种选择，适合轻量接⼝场景。

## 什么是 Spring Actuator？它有什么优势？

SpringActuator是SpringBoot项⽬⾥的⼀个模块，它给应⽤加了⼀层监控和管理能⼒。你不⽤改业务代码，只要引⼊starter，就能通过HTTP或JMX暴露⼀些预定义的端点（endpoints），⽐如查看健康状态、内存使⽤、线程堆栈、请求指标等。

这些端点能帮你快速定位⽣产问题。⽐如服务挂了，调⽤ /actuator/health ⼀看就知道是数据库连不上还是Redis 超时。再⽐如流量突增，⽤ /actuator/metrics/jvm.memory.used 结合 Grafana 能看出内存是不是在缓慢上涨。

1）暴露的端点默认有安全限制，⽣产上必须配合认证开启，避免信息泄露

3）和Micrometer集成后，能把指标推送到Prometheus，实现全链路监控

代码上就两步：加依赖，开端点。

```xml
<dependency>
<groupId>org.springframework.boot</groupId>
<artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

```yaml
management:
endpoints:
web:
exposure:
include: health,info,metrics
```

其实它的价值不在功能多炫，⽽是统⼀了微服务的观测⼊⼝。你在⽤SpringCloudGateway还是Eureka，所有服务的健康检查、指标格式都是⼀致的，运维脚本和告警规则能复⽤，省掉⼀堆脏活累活。

## 什么是 Spring Boot？

Spring Boot 本质是 Spring 框架的脚⼿架，⽬的就是把开发从繁琐的配置⾥解放出来。你不⽤再⼿动写⼀堆 XML 去配数据源、MVC、事务，它通过⾃动装配机制帮你搞定。

启动⼀个 Web 项⽬，传统 Spring 要配 DispatcherServlet 、组件扫描、视图解析器，可能得上百⾏配置。Spring Boot 只要加个 @SpringBootApplication ，main ⽅法跑 SpringApplication.run() 就⾏了。⽐如⽤ spring-boot-starter-web ，⼀引⼊，Tomcat 和 Spring MVC ⾃动就位。

它采⽤“约定⼤于配置”的思路。⽐如默认静态资源放在 /static ，内嵌Tomcat监听8080端⼝，这些都不⽤额外说明。如果想改，再通过 application.properties 或 application.yml 覆盖就⾏。

依赖管理也是省⼼的地⽅。你⽤ spring-boot-starter-parent 作为⽗POM，⾥⾯已经定好了常⽤库的版本号，避免⾃⼰引⼊时版本冲突。像整合MyBatis、Redis、Kafka，基本都是引⼊对应的starter，写点配置，直接开⼲。

这种快速搭建能⼒，让微服务架构落地变得简单。⽐如⽤ Spring Cloud + Spring Boot，⼏⼗个服务也能快速统⼀技术栈。不过也得注意，⾃动装配虽然⽅便，但出了问题如果不熟悉底层原理，调试起来会有点懵。

所以它不是替代 Spring，⽽是让 Spring 更容易上⼿和维护。⼩到单体应⽤，⼤到云原⽣服务，都能扛住。

## 在SpringBoot中你是怎么使⽤拦截器的？

拦截器在 Spring Boot ⾥其实就是⼀个能插在请求处理流程中的钩⼦，你可以在 Controller 执⾏前、执⾏后、视图渲染前这些节点⼲点事，⽐如鉴权、⽇志、性能统计。

要加拦截器，得先写个类实现 HandlerInterceptor 接⼝，把 preHandle、postHandle、afterCompletion 这⼏个⽅法按需重写。preHandle最常⽤，返回false就会直接中断请求。

接着你需要注册它，新建⼀个配置类实现 WebMvcConfigurer，然后重写 addInterceptors ⽅法。这⾥你可以把⾃定义的拦截器加进去，还能⽤ant匹配路径，⽐如只对 /api/\*\* ⽣效，排除静态资源。

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {
@Override
public void addInterceptors(InterceptorRegistry registry) {
registry.addInterceptor(new AuthInterceptor())
.addPathPatterns("/api/**")
.excludePathPatterns("/login", "/static/**");
}
}
```

注意⼀点，拦截器是跟着WebMvc⾛的，所以它压根不经过Filter那层，也不影响Servlet的⽣命周期。如果你需要处理跨域、字符编码这种底层问题，还是得⽤Filter。

1）拦截器适合做业务⽆关但通⽤的逻辑，像登录检查、接⼝耗时打印

2）多个拦截器有顺序，注册时的顺序就是执⾏顺序

3）异常发⽣时 postHandle 不会触发，善⽤ afterCompletion 做资源清理

<!-- image-->

## Spring Boot 如何处理跨域请求（CORS）？

SpringBoot处理跨域请求主要靠CORS协议⽀持，浏览器在发请求前会先发⼀个OPTIONS预检请求，后端得正确响应才能继续。

1）最简单的⽅式是⽤ @CrossOrigin 注解，加在 Controller 或⽅法上，指定允许的源、⽅法和头。⽐如：

```bib
@RestController
@CrossOrigin(origins = "http://localhost:3000")
```

```java
public class ApiController {
@GetMapping("/data")
public String getData() {
return "hello";
}
}
```

2）全局配置推荐实现 WebMvcConfigurer 的 addCorsMappings ⽅法，统⼀管理规则：

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
@Override
public void addCorsMappings(CorsRegistry registry) {
registry.addMapping("/api/**")
.allowedOrigins("http://localhost:3000")
.allowedMethods("GET", "POST", "PUT", "DELETE")
.allowCredentials(true)
.maxAge(3600);
}
}
```

3）如果项⽬⽤了SpringSecurity，记得确保安全链放⾏OPTIONS请求，否则预检会被拦截。可以在HttpSecurity ⾥配置：

```javascript
.authorizeHttpRequests(auth -> auth
.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
// 其他规则
);
```

实际项⽬中，⼀般前端域名固定，⽤全局配置就够了。如果是开放API，可能还要动态匹配origin，这时候可以写个过滤器⼿动设置 header，⽐如 Access-Control-Allow-Origin 。

<!-- image-->

## 如何理解 Spring Boot 中的 starter？

Spring Boot 的 starter 本质是⼀组依赖描述符，帮你快速集成某个功能模块，不⽤⾃⼰⼀个个找依赖版本。

⽐如你要⽤ Redis，直接引⼊ spring-boot-starter-data-redis ，它背后已经帮你组合好了 Lettuce 或Jedis、SpringDataRedis、连接池、序列化等依赖，版本也都对⻬了。你压根不需要关⼼具体引⼊了哪些库，也不⽤操⼼版本冲突。

1）所有 starter 都遵循统⼀命名规范： spring-boot-starter-xxx ，第三⽅框架接⼊也按这规则，⽐如mybatis-spring-boot-starter 。

2）starter ⾥不写业务逻辑，主要是 pom.xml 的依赖管理。真正的⾃动配置由对应的 autoconfigure 模块实现，⽐如 spring-boot-autoconfigure ⾥的 RedisAutoConfiguration 会根据类路径上的组件⾃动创建

RedisTemplate 、 LettuceConnectionFactory 。

3）⾃动装配基于条件注解，像 @ConditionalOnClass 、 @ConditionalOnMissingBean ，只有满⾜条件才⽣效。⽐如发现 classpath 有 Jedis.class 才去配置 Jedis 连接⼯⼚。

4）你可以⾃定义 starter，拆成两部分： xxx-spring-boot-starter （空壳，引 autoconfigure），和 xxx-spring-boot-autoconfigure （核⼼配置，含 META-  
INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports ⽂件声明配置类）。

<!-- image-->

常⻅的像 spring-boot-starter-web 带了 Tomcat、Spring MVC、Jackson； spring-boot-starter-jdbc⾃动配好 DataSource 和 JdbcTemplate。省去了⼤量基础配置的脏活累活，项⽬⼀启动就能⽤。

## SpringBoot默认同时可以处理的最⼤连接数是多少？

SpringBoot内嵌的Tomcat默认最⼤线程数是200，也就是说它默认能同时处理200个请求。每个请求对应⼀个线程，这个值由 server.tomcat.max-threads 控制。

1）当并发请求数超过 200，新的请求会进⼊等待队列，队列⻓度由 server.tomcat.accept-count 决定，默认是100。超过这个总数，客户端就会收到连接被拒绝的响应。

2）连接建⽴的最⼤数量还受限于 server.tomcat.max-connections ，默认值是 8192。这是指服务器最多能保持多少个TCP连接，包括正在处理的和在队列⾥等着的。

3）这些参数可以根据实际场景调整。⽐如⾼并发场景可能需要把 max-threads 调到 500 或更⾼，同时注意线程多了会增加上下⽂切换开销。

代码上不需要特别配置，直接在 application.yml ⾥改：

```yaml
server:
tomcat:
max-threads: 500
accept-count: 200
max-connections: 10000
```

换个⻆度看，如果⽤的是Undertow或Netty，那对应的参数名和默认值就不同了。⽐如Undertow的默认⼯作线程是 8 + CPU 核数，IO 线程是 2 倍 CPU 核数。

<!-- image-->

## Spring Boot 打成的 jar 和普通的 jar 有什么区别 ?

Spring Boot 打出来的 jar 和普通 jar 最⼤的不同在于可执⾏性和依赖打包⽅式。

普通jar只是把.class⽂件按包结构打进去，运⾏得靠外部classpath引⼊依赖。你⽤ java -jar 跑⼀个普通Spring 项⽬ jar，基本会报错找不到主类或者依赖。

SpringBoot的jar是个胖jar（fatjar），它把项⽬所有的编译类+依赖的第三⽅库+内嵌容器（⽐如Tomcat）全塞进⼀个 jar ⾥了。启动的时候，通过⾃定义的类加载器 LaunchedURLClassLoader 动态加载内部的 jar 包。

它的⽬录结构也特别，除了正常的 /classes ，还有 /lib ⽬录存着所有依赖 jar， /BOOT-INF/classes 放项⽬⾃⼰的 class， /META-INF/MANIFEST.MF ⾥的 Main-Class 指向的是org.springframework.boot.loader.JarLauncher ，不是你写的 Application 类。

这个 JarLauncher 就是启动⼊⼝，它会先解析内部结构，把 /BOOT-INF/lib 下的 jar 全加到类路径，再反射调⽤你配置的真正启动类。

代码上不⽤你操⼼，只要在 pom.xml ⽤了 spring-boot-maven-plugin ，build 时就会⾃动处理。

<build>   
<plugins>   
<plugin>   
<groupId>org.springframework.boot</groupId>   
<artifactId>spring-boot-maven-plugin</artifactId>   
</plugin>   
</plugins>   
</build>

所以⼀句话：普通jar是模块包，SpringBootjar是⾃带容器、开箱即⽤的部署包，适合微服务这种独⽴部署场景。  
像 Nacos、Eureka 的客户端启动包也是这么打的。

## 如何在SpringBoot中定义和读取⾃定义配置？

SpringBoot读⾃定义配置，本质是把配置⽂件⾥的值映射到Java对象⾥。最常⽤的⽅式就是@ConfigurationProperties ，它能把配置⾃动绑定到类的字段上。

⽐如你在 application.yml ⾥加了：

```yaml
app:
name: user-service
timeout: 5000
```

## 对应写个类：

```java
@Component
@ConfigurationProperties(prefix = "app")
public class AppProperties {
private String name;
private long timeout;
```

```scss
// getter/setter
}
```

只要加上 @Component ，这个类就能在其他地⽅ @Autowired 注⼊使⽤。字段名会⾃动和配置项匹配，⽀持松散绑定（⽐如 timeoutMs 可以对应 timeout-ms ）。

如果不想⽤ @Component ，也可以在配置类⾥⽤ @Bean ⼿动注册，然后照样能⽤@ConfigurationProperties 绑定。

还有⼀种⽅式是 @Value("\${xxx}") ，适合读单个值：

```java
@Value("${app.timeout}")
private long timeout;
```

但 @Value 不⽀持复杂对象、不⽀持松散绑定、也不⽀持 JSR-303 校验，灵活性差很多。真要搞配置对象，还是得靠 @ConfigurationProperties 。

它⽀持校验，⽐如加上 @Validated 就能⽤ @NotNull 这些注解。也⽀持嵌套结构，List/Map类型也能处理。

<!-- image-->

Spring Boot 中 application.properties 和 application.yml 的区别是什么？

Spring Boot 配置⽂件选 properties 还是 yml ，主要看结构和可读性。

1）格式上， application.properties 是键值对形式，层级深了就得重复写前缀。⽐如：

server.port=8080   
spring.datasource.url=jdbc:mysql://localhost:3306/test   
spring.datasource.username=root   
spring.datasource.password=123456

2）⽽ application.yml ⽤缩进表⽰层级，结构更清晰，尤其适合复杂配置：

```yaml
server:
port: 8080
spring:
datasource:
url: jdbc:mysql://localhost:3306/test
username: root
password: 123456
```

3）功能上两者完全等价，SpringBoot都⽀持，也可以共存。但注意同名配置项会冲突，加载顺序决定了优先级：properties 会覆盖 yml 中的相同配置。

4）实际项⽬⾥，团队偏向简洁就⽤ yml ，毕竟像 Spring Cloud 、 Kubernetes 这些⽣态都习惯⽤YAML。但如果对缩进敏感，怕空格搞错导致解析失败，那 properties 更稳妥。

别忘了，除了这两个，还能通过环境变量、命令⾏参数等⽅式注⼊配置，灵活性很⾼。

## Spring Boot ⽀持哪些嵌⼊ Web 容器？

Spring Boot 开箱就⽀持好⼏种嵌⼊式 Web 容器，最常⽤的其实是三个：Tomcat、Jetty 和 Undertow。

1）默认是 Tomcat，你只要引⼊ spring-boot-starter-web ，它⾃带了 Tomcat 作为嵌⼊容器，启动后就能直接对外服务，不⽤额外部署 WAR 包。

2）如果你想⽤ Jetty，⽐如在⾼并发⻓连接场景下压测表现更好，那就把 starter ⾥的 Tomcat 依赖排除，加上spring-boot-starter-jetty 。像 Spring Cloud Gateway 有些项⽬就会切到 Jetty 或 Undertow。

3）Undertow是RedHat出的，性能不错，内存占⽤也低，适合想压榨服务器资源的场景。换起来也简单，排除Tomcat 后引⼊ spring-boot-starter-undertow 就⾏。

它们都是通过 ServletWebServerFactory 接⼝来创建具体容器实例的，Spring Boot ⾃动配置会根据 classpath上的类选择合适的实现。⽐如看到 org.apache.catalina.startup.Tomcat 就上 Tomcat，看到io.undertow.Undertow 就初始化 Undertow。

代码上你完全不⽤改，切换靠依赖管理。举个Maven的⽚段：

```xml
<exclusions>
<exclusion>
<groupId>org.springframework.boot</groupId>
<artifactId>spring-boot-starter-tomcat</artifactId>
</exclusion>
</exclusions>
```

加上对应的starter就能替换。⼀般⼩项⽬⽤默认Tomcat完全够⽤，搞微服务⽹关或者追求极致性能再考虑换。

## Spring Boot 是如何通过 main ⽅法启动 web 项⽬的？

Spring Boot 启动 Web 项⽬不是靠 main ⽅法本⾝多⾼级，⽽是靠 SpringApplication.run() 这个静态⽅法把⼀堆脏活累活给⼲了。

main ⽅法⾥通常就两⾏代码，核⼼是调⽤ SpringApplication.run(Application.class, args) 。它会做⼏件事：推断应⽤类型，⽐如有没引⼊ Tomcat、Jetty 这些依赖；加载所有 META-INF/spring.factories ⾥配置的初始化器和监听器；最后创建对应的上下⽂容器。

如果是 Web 应⽤，它会创建 AnnotationConfigServletWebServerApplicationContext，这个上下⽂知道怎么启动内嵌 Web 服务器。在刷新阶段，会触发 ServletWebServerFactoryAutoConfiguration ⾃动装配，根据classpath选⼀个可⽤的Web服务器，⽐如默认是Tomcat。

1）先找有没有 ServletWebServerFactory 类型的 Bean

3）调⽤ webServer.start() 把内嵌容器跑起来

@SpringBootApplication   
public class App {

```java
public static void main(String[] args) {
SpringApplication.run(App.class, args);
}
}
```

整个过程最关键是⾃动装配+内嵌容器+特殊上下⽂联动。你不需要⼿动newTomcat或configureconnector，全靠条件化配置搞定。只要加了 spring-boot-starter-web ，启动时就会拉起⼀个预配置好的 Web 服务，监听8080。

<!-- image-->

## Spring Boot 的核⼼特性有哪些？

Spring Boot 的核⼼特性其实围绕⼀个⽬标：让 Spring 应⽤能快速落地，不⽤在配置上折腾半天。

1）⾃动装配是它最硬的底⽓。你加个 spring-boot-starter-web ，它就帮你把 Tomcat、Spring MVC 都配好了，不需要写⼀堆 XML 或 @Configuration 。背后的逻辑是 @ConditionalOnClass 这些条件注解，只要类路径有某个类，就⾃动⽣效对应配置。

2）起步依赖（Starter）设计得很聪明。⽐如⽤ Kafka 就引⼊ spring-kafka-starter ，它把常⽤的依赖版本都锁定了，不会出现版本冲突。常⻅的像 spring-boot-starter-data-jpa 、 spring-boot-starter-actuator 都是这种模式。

3）内嵌容器让部署变简单。以前要打 WAR 包扔到外部 Tomcat，现在直接 java -jar 启动，因为内嵌了Tomcat、Jetty或Undertow。请求进来时，Servlet容器直接加载应⽤，压根不经过外部部署。

4）Actuator 提供⽣产级监控。⽐如 /actuator/health 看健康状态， /actuator/metrics 查 JVM 指标，结合 Prometheus 和 Grafana 能搞监控⼤盘。

5）外部化配置⽀持多环境。 application.yml ⾥写 spring.profiles.active=prod ，就能切换不同配置，本地和线上互不影响。

代码⽰例就是最简单的启动类：

```java
@SpringBootApplication
public class App {
public static void main(String[] args) {
SpringApplication.run(App.class, args);
}
}
这个注解本⾝是个组合注解，包含了 @Configuration 、 @EnableAutoConfiguration 和
@ComponentScan 。
```

## Spring Boot 3.x 与 2.x 版本有哪些主要的改进和区别？

SpringBoot3是⼀次真正意义上的⼤版本跃进，不是简单功能叠加。最关键是它全⾯拥抱了Java17+和JakartaEE9+，这意味着包路径从 javax.\* 全⾯迁移到了 jakarta.\* 。你如果⽤⽼的 javax.servlet 相关依赖，直接启动就报错，必须升级配套中间件。

Java版本要求从8跳到17，官⽅推荐使⽤LTS版本开发。这带来了很多语⾔层⾯的新特性可⽤，⽐如record、sealedclass、模式匹配等，框架内部也⼤量使⽤这些特性简化代码。

GraalVM 原⽣镜像⽀持是另⼀个重头戏。Spring Boot 3 配合 Spring Native 可以把应⽤编译成原⽣可执⾏⽂件，启动时间从秒级降到毫秒级，内存占⽤减少⼀半以上。像云函数、Serverless这种场景特别适合。

1）⾃动配置机制更智能，条件注解⽀持延迟评估，避免早期加载不必要的 Bean

代码上变化不⼤，但⽣态组件要跟上。⽐如你⽤的是Tomcat9，得升到10才⽀持JakartaServlet；⽤JPA的话Hibernate 要 6+。

// Spring Boot 3 中常⽤的新写法  
@Bean  
public RouterFunction<ServerResponse> route(UserHandler handler) {  
return route(GET("/users/{id}"), handler::getById);  
}

迁移时建议先⽤ spring-boot-migrator ⼯具扫描旧项⽬，⾃动⽣成兼容性报告，能省不少事。



推荐更多免费学编程资源：

1.编程导航学习网站：学编程、做项目、拿Offer！  
2.企业高频面试题库：开始刷题，面试遇原题！  
3.精选简历模板大全：1分钟搞定简历！  
4.AI资源导航网站：获取最新AI黑科技！  
5.1对1模拟面试：随时随地提升面试能力