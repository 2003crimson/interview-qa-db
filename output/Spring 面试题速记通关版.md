# Spring ⾯试题速记通关版


推荐更多免费学编程资源：

1.编程导航学习网站：学编程、做项目、拿Offer！

2.企业高频面试题库：开始刷题，面试遇原题！

3.精选简历模板大全：1分钟搞定简历！

4.AI资源导航网站：获取最新AI黑科技！

5.1对1模拟面试：随时随地提升面试能力

## 在Spring中，拦截器和过滤器有什么区别？

拦截器和过滤器都能在请求处理前后做点事，但它们的出⾝、管辖范围和能⼒不太⼀样。

过滤器是 Servlet 规范的⼀部分，由容器管理，只要符合 Servlet 规则的 Web 应⽤都能⽤。它在请求到达 Spring 容器之前就起作⽤了，⽐如处理字符编码、⽇志记录、跨域等脏活累活。它的执⾏不依赖Spring，所以你压根不经过Spring 的时候它也能⼯作。

⽽拦截器是 Spring MVC ⾃⼰搞的⼀套机制，归 Spring 管。它只能拦截进⼊ Controller 的请求，HandlerInterceptor接⼝提供了 preHandle、postHandle 和 afterCompletion 三个钩⼦。因为它在 Spring 容器⾥，所以能直接拿到Bean，⽐如注⼊⼀个Service做权限校验。

1）过滤器先执⾏，覆盖所有web请求，包括静态资源（除⾮你配置排除）2）拦截器后执⾏，只对SpringMVC映射的路径⽣效3）过滤器通过FilterChain控制流程，要记得调⽤chain.doFilter()4）拦截器返回布尔值决定是否继续，更直观

代码上，过滤器需要实现 Filter 接⼝并注册到容器，可以⽤ @WebFilter 或配置类；拦截器实现HandlerInterceptor，再通过 WebMvcConfigurer 添加。

<!-- image-->

⼀般像安全认证这种需要全局控制的⽤过滤器，业务相关的⽐如接⼝耗时统计、⽤户上下⽂绑定就⽤拦截器。

## Spring中的@Primary注解的作⽤是什么？

当Spring容器⾥某个接⼝有多个实现类，被 @Component 或者 @Service 注册成Bean时，⽤ @Autowired 默认按类型注⼊就会搞不定，因为容器发现⼀堆同类型的Bean，不知道该选哪个。

这时候 @Primary 就派上⽤场了。它⽤来标记⾸选Bean。只要某个实现类加上了这个注解，Spring在⾃动装配时就会优先选它，避免抛出 NoUniqueBeanDefinitionException 。

⽐如你有两个数据源配置类都实现了 DataSource ，其中⼀个标了 @Primary ，那其他地⽅直接 @Autowired 就能注⼊这个主数据源，不⽤额外指定 @Qualifier 。

@Service   
public class MySQLDataService implements DataService { }   
@Service

@Primary   
public class MongoDataService implements DataService { }

上⾯这段代码⾥，虽然两个都是 DataService 的实现，但 MongoDataService 是⾸选项。其他类直接@Autowired DataService，拿到的就是Mongo那个。

要注意的是， @Primary 和 @Qualifier 可以解决同样的问题，但思路不同。 @Qualifier 是让调⽤⽅主动指名要哪个，适合需要明确选择的场景，⽐如 @Qualifier("mysqlService") ；⽽ @Primary 是从定义端声明“我才是默认的”，更适合设定⼀个通⽤默认实现。

1）⼀个接⼝多个实现时，Spring⽆法决定注⼊哪⼀个

2） @Primary 告诉容器：选我作为默认选项

3）与 @Qualifier 配合使⽤更灵活，但两者⽬的不同

<!-- image-->

## Spring中的@Value注解的作⽤是什么？

@Value是Spring⾥⽤来做属性注⼊的注解，特别适合把配置⽂件⾥的值塞到字段上。

它⽀持直接赋值，⽐如字符串、数字，也⽀持SpEL表达式。像配置中⼼的参数，application.yml⾥的内容，都能通过它拿过来⽤。你写 @Value("\${server.port}") ，Spring 启动时就会去环境变量或配置⽂件⾥找这个 key，找到就注⼊进去。

如果找不到，默认会报错，但你可以给默认值，写成 @Value("\${server.port:8080}") 就⾏，这样没配的时候⾃动⽤ 8080。

1）基本类型和字符串可以直接注⼊

2）⽀持 #{} 写 SpEL，⽐如 @Value("#{systemProperties['os.name']}") 拿系统属性

3）数组或集合可以通过逗号分隔的字符串注⼊，配合 @Value("\${list:value1,value2}") 然后⽤String[] 接收

注意它是在 Bean 初始化阶段由 BeanPostProcessor 处理的，具体是

AutowiredAnnotationBeanPostProcessor 负责扫描和注⼊逻辑。

不过别在静态字段上⽤ @Value，Spring 管不着静态成员，值压根不会被设置进去，写了也⽩搭。

现在主流都⽤ @ConfigurationProperties 做类型安全的配置绑定，@Value 更适合零散、简单的场景，⽐如某个开关标志。

## @Component、@Controller、@Repository和@Service 的区别？

Spring ⽤注解做组件扫描时，这⼏个注解本质都⼀样，都是 @Component 的派⽣注解，容器都会把它们当 SpringBean来管理。真正起作⽤的是语义化和AOP切⾯的针对性处理。

1）@Component 是通⽤组件，适合那些不太能归类的⼯具类或配置类。

2）@Controller ⽤在 Web 层，⽐如 Spring MVC 的控制器。它会被组件扫描⾃动注册，并且通常配合@RequestMapping 使⽤。框架会特别识别它，⽤于请求映射和异常处理。

3）@Repository 专⽤于数据访问层，⽐如 DAO 类。它的关键作⽤是让 Spring 能把数据库相关的异常（⽐如SQLException）统⼀转换成 Spring 的 DataAccessException，这个事是由PersistenceExceptionTranslationPostProcessor 做的，它默认只处理加了 @Repository 的类。

4）@Service⽤在业务逻辑层，虽然框架本⾝对它没有特殊处理，但团队约定俗成⽤来标识服务类，⽅便代码结构清晰，也便于AOP针对service包做事务增强。

@Repository   
public class UserDAO {   
public void save(User user) { /\*   
}   
@Service   
public class UserService {   
@Autowired private UserDAO dao;   
// 业务⽅法上加 @Transactional 更⾃然   
}

说⽩了，除了 @Repository 有异常翻译这层实际功能外，其他三个主要是为了分层清晰、便于维护和切⾯匹配。不⽤错就⾏，别混着⽤。

## @Bean和@Component有什么区别？

@Bean是⽅法级别的注解，通常写在配置类⾥，你得⼿动new对象出来交给Spring管。⽐如数据源这种需要复杂初始化逻辑的，⽤它最合适。

@Component是类级别的，加在类上，Spring⾃动扫描到就会把这个类当bean创建，适合那些不需要特别定制构造过程的普通组件。像Service、Controller这些层，直接贴个注解就完事了，省⼼。

1）@Bean 的控制权在⽅法内部，你可以精确控制对象怎么创建，⽐如设置参数、调⽤静态⼯⼚。

2）@Component 靠 classpath 扫描⽣效，配合 @ComponentScan ⼀起⽤，⾃动发现组件。

3）它们最终都是把实例注册进IOC容器，但⽣命周期管理⽅式不⼀样。

举个例⼦：你想集成 RedisTemplate，可能要先配 JedisConnectionFactory，再 set 到 template 上。这种链式配置，写在@Bean⽅法⾥⼀⽬了然。

```java
@Configuration
public class RedisConfig {
@Bean
public RedisTemplate<String, Object> redisTemplate() {
RedisTemplate<String, Object> template = new RedisTemplate<>();
template.setConnectionFactory(connectionFactory());
return template;
}
}
```

⽽⼀个订单服务 OrderService，本⾝没啥初始化逻辑，直接⽤ @Component：

@Component   
public class OrderService { ... }

其实选哪个，关键看你要不要⼲预对象的构建过程。需要精细控制就⽤ @Bean，否则 @Component 更轻量。

## @Qualifier 注解有什么作⽤

当Spring容器⾥同⼀个接⼝有多个实现类时，光⽤@Autowired会懵，不知道该注⼊哪⼀个。这时候就得靠@Qualifier 来指名道姓。

⽐如你有个接⼝叫 UserService，底下有 LocalUserService 和 RemoteUserService 两个实现，都被扫进容器了。你在Controller⾥要注⼊远程那个，就得这么写：

```java
@Autowired
@Qualifier("remoteUserService")
private UserService userService;
```

这⾥的 "remoteUserService" 是 Bean 的名字，⼀般就是⾸字⺟⼩写的类名。Spring 凭这个名字精准定位到该注⼊哪个实例。

反过来，如果不⽤@Qualifier，⼜确实存在多个候选Bean，应⽤启动直接报错，抛NoUniqueBeanDefinitionException。所以这个注解是解决同类型多实例依赖注⼊歧义的标配⽅案。

实际项⽬⾥像数据源配置、不同策略实现（⽐如⽀付⽅式）、多套客户端实例都会碰到这情况，@Qualifier就是来兜底的。

1）它和 @Primary 能搭配⽤，@Primary 标记默认选哪个，@Qualifier ⽤于特殊指定

2）也可以结合⾃定义注解，把 @Qualifier 封装掉，代码更清晰，⽐如定义个 @RemoteService 注解

3）别忘了，bean name 写错了会找不到，IDE ⼀般能帮你校验，但⼿动写字符串还是容易翻⻋

## Spring中的 @ModelAttribute 注解的作⽤是什么？

@ModelAttribute 主要⽤来预处理请求参数，把数据提前塞进 Model ⾥，让后续⽅法能直接⽤。

1）它可以加在⽅法上，这个⽅法会在每个 @RequestMapping ⽅法执⾏前先跑⼀遍。⽐如你有个表单要⽤到省份列表，就可以⽤它从数据库捞出来放进 Model ，这样⻚⾯⾃动能访问到。

```java
@ModelAttribute
public void populateStates(Model model) {
model.addAttribute("states", stateService.getStates());
}
```

2）它也能加在控制器⽅法的参数上，表⽰这个参数不是从URL或body来的，⽽是从 Model ⾥找对应名字的对象，或者通过参数解析器⾃动组装。常⽤于表单提交时绑定对象。

```java
@PostMapping("/users")
public String saveUser(@ModelAttribute User user) {
// user 已经由请求参数⾃动填充
userService.save(user);
```

```lua
return "redirect:/users";
}
```

注意⼀点，如果 Model ⾥没有现成的 User 实例，Spring会调⽤它的⽆参构造函数创建⼀个，然后再⽤请求⾥的name 、 email 这些字段去 set。这个过程压根不经过 @RequestBody 那套反序列化流程，是靠数据绑定器WebDataBinder 搞定的。

⼀般搭配 @SessionAttributes ⽤，可以把表单对象跨请求存住，⽐如多步骤表单。但别滥⽤，容易把 Model塞得太满，调试起来头疼。

## Spring Bean ⼀共有⼏种作⽤域？

Spring⾥的Bean作⽤域，说⽩了就是这个实例归谁管、活多久。容器默认给你管到底的叫单例，但实际场景远不⽌这⼀种。

1）singleton是最常⽤的，整个应⽤就⼀个实例，Spring容器启动时创建，销毁容器时才释放。像配置类、⼯具类这种⽆状态组件⽤它最合适。

2）prototype每次拿都给你new⼀个新对象，不缓存。适合有状态的Bean，⽐如某个请求级别的数据处理器，每次都需要⼲净的上下⽂。

3）request 和 session 是 Web 环境专属。request 级别的 Bean 在⼀次 HTTP 请求中共享，请求结束就销毁；session级别的则绑定到⽤户会话，⽤户退出或 session 过期才清理。在 Spring MVC 或 Spring Boot 的 Web 项⽬⾥才能⽤。

4）application 作⽤于 ServletContext ⽣命周期，整个 Web 应⽤共享⼀份实例，基本不常⽤。

5）websocket 是 Spring 3.1 后加的，每个 WebSocket 会话拥有独⽴的 Bean 实例，⽤于 WebSocket 的会话隔离场景。

⾮ Web 项⽬⾥ request、session 这些直接⽤不了，跑起来会报错。所以选作⽤域得看运⾏环境和对象⽣命周期需求，别⼀股脑全⽤ singleton。

<!-- image-->

## Spring 中的 @Validated 和 @Valid 注解有什么区别？

Spring ⾥的校验注解看着差不多，其实分⼯明确。@Valid 是 JSR-303 规范原⽣的，⽀持嵌套对象校验，但⽤在⽅法参数上时，Spring不会⾃动触发它对⽅法⼊参的校验。

@Validated是Spring⾃⼰加的，专为解决这个痛点。它能⽤在类上做开启校验的开关，⽐如Controller上加了@Validated，⾥⾯的⽅法参数就能配合@Valid起效。更重要的是，它⽀持分组校验，⽐如新增和修改⽤不同的校验规则。

1）@Valid可以⽤在成员变量、⽅法参数、构造器参数上，适合嵌套对象校验

2）@Validated 只能⽤在⽅法和类型上，不能标在字段上

3）@Validated ⽀持分组，⽐如 @Validated(Update.class) 只跑更新组的校验

4）Spring MVC ⽅法参数前加 @Valid，得靠 AOP 拦截才能⽣效，⽽ @Validated 是触发点

举个例⼦，Controller ⽅法参数是对象，⾥⾯还有个 List

，Address 里也有@NotBlank。这时候主对象用@Valid才会递归校验到每一项，只用@Validated不会深入集合内部。

## 代码上常见写法：

@PostMapping("/user")   
public String save(@Valid @RequestBody User user) { ... }

## 如果要用分组：

<!-- image-->

## Spring事务在什么情况下会失效？

Spring事务失效最常见的原因是调用发生在同一个类内部，导致AOP代理没生效。比如你在一个 @Service 里写了个methodA(）调用了同样加了@Transactional的methodB(），这时候事务压根不经过代理对象，自调用直接绕过了切面。

另一个典型是异常被吞了或者捕获后没抛出去。Spring默认只对 RuntimeException 和 Error 回滚，如果你catch了 Exception 又不主动声明rollback，事务就不会回滚。想让它对普通异常也回滚，得加上@Transactional(rollbackFor = Exception.class) 。

还有就是方法不是public 的。AOP基于代理，非public方法不会被CGLIB或JDK动态代理拦截，事务自然失效。别试图在private方法上加事务注解，没用。

数据库引擎不支持事务也会翻车。比如MySQL用MyISAM引擎，压根不支持事务，你代码写得再漂亮也没用。生产环境基本都用InnoDB，但有时候配置疏忽可能踩坑。

传播行为设置不当也可能“看起来像失效”。比如当前方法已经处于事务中，而你用了PROPAGATION_SUPPORTS ， 它会跟着⾛， 但外部没事务时它也不创建， 这时候逻辑就变了。

<!-- image-->

简单说，只要记住三点：走代理、抛对异常、数据库撑住。这三块不出问题，事务基本能稳住。

@Async如何避免内部调用失效？

Spring的 @Async 注解失效，最常见的就是方法内部调用导致AOP代理没生效。你写了个异步方法，但同一个类里另一个方法直接调它，这时候压根不经过代理对象，异步就没了。

1）核心是代理机制没触发。@Async 依赖 SpringAOP，只有外部 bean调用才会走代理，内部方法直调等于普通方法调用。

2）解决方案一：把异步方法拆到另一个 @Service里，通过注入的方式调。这是最干净的做法，职责也清晰。

```java
@Service
public class AsyncTaskService {
@Async
public void sendEmail() { /* 异步发邮件 */ }
}
@Service
public class UserService {
@Autowired private AsyncTaskService taskService;
public void register() {
// 外部调⽤， ⾛代理
taskService.sendE mail();
}
}
```

3）方案二：自己注入自己，通过代理对象调。虽然有点绕，但在无法拆分时可用。

@Autowired private UserService self;   
public void register() {   
self.sendEmail(); // 通过代理调⾃⼰   
}

4）方案三：用 ApplicationContext 拿代理对象，或者 AopContext.currentProxy(），但得配置expose-proxy="true" ， 代码侵⼊性强， ⼀般不推荐。

其实最稳妥的还是设计上避免自调用，把异步逻辑下沉到独立组件。像定时任务用 @Scheduled、事件驱动用Spring Event，都比硬怼 @Async 更可控。

## Spring中的@Profile 注解的作用是什么？

根据运行环境激活不同配置，让应用能适应开发、测试、生产等不同场景。比如数据源在本地连H2，在线上连MySQL，@Profile就是做这个开关的。

它标记在 @Component或 @Configuration 类上，Spring容器启动时会根据当前激活的profile决定是否加载这些组件。没被匹配的类直接跳过，压根不经过初始化流程。

1）通过 @Profile("dev"）指定该配置仅在dev环境生效

激活方式常见两种：JVM参数-Dspring.profiles.active=prod，或者配置文件里写spring.profiles.active=prod 。 环境变量也⾏， 优先级看具体部署⽅式。

@Configuration  
@Profile("dev")  
public class DevDataSourceConfig {  
@Bean  
public DataSource dataSource() {  
return new HikariDataSource(); // 本地⽤轻量数据库  
}  
}

和 @Conditional 相比，@Profile更聚焦环境维度判断，属于它的特例场景。真要搞复杂条件控制，还是得上@Conditional ⾃定义规则。

## @Async什么时候会失效？

方法调用在同一个类中会导致代理失效，这是最常见的情况。Spring的@Async基于AOP代理实现，只有外部bean调用方法时才会走代理逻辑，进而触发异步执行。

如果本类方法直接调用被 @Async标记的方法，相当于this.method()，压根不经过代理对象，异步机制就失效了。

1）确保调用方和被调用方是不同的 Spring Bean

2）@Async方法不能是private、static或final的，代理无法覆盖这些方法

3）所在类必须被Spring容器管理，普通new出来的对象无效

4）需要启用@EnableAsync，否则注解不生效

5）异常未处理可能导致线程池任务中断，表面看像是“没执行”

代码示例：

@Service   
public class AsyncTaskService {   
@Async   
public void sendEmail() {   
System.out.println("当前线程： " + Thread.currentThread().getName());   
}

}  
@Service  
public class BusinessService {  
@Autowired  
private AsyncTaskService taskService;  
public void process() {  
taskService.sendEmail(); // 正确： 通过代理调⽤  
}  
}

错误用法就是把taskService的调用换成this.sendEmail()。

## SpringMvc中如何处理异常？

Spring MVC的异常处理机制其实挺清晰的，关键在于分层拦截和统一出口。你不需要到处try-catch，框架已经帮你设计好了几道防线。

第一道防线是@ExceptionHandler，它写在Controller内部，能处理当前类中方法抛出的异常。如果想跨多个Controller复用，就把这个方法提到一个类里，并加上 @ControllerAdvice。这样一来，全局的异常比如参数校验失败、业务逻辑异常，都能集中捕获。

比如你调用接口时传了非法参数，Spring会抛 MethodArgumentNotValidException，你可以在Advice 类里专门捕获它，返回一个结构化的错误JSON，前端接起来也方便。

1）@ControllerAdvice 可以配合 @ExceptionHandler 做全局异常处理

2）支持按异常类型定义多个处理方法，精度可控

3）最终返回值通常封装成统一响应体，比如 {code：500，msg："服务器异常"，data：null}

还有一种情况是框架底层抛的异常，比如DispatcherServlet初始化失败，这种压根不经过Controller，就得靠HandlerExceptionResolver 接⼝来兜底。 不过⼀般我们不⽤⾃⼰实现， Spring 已经内置了⼏个， 像DefaultHandlerExceptionResolver 就能把 Spring 内部异常转成对应的 HTTP 状态码。

<!-- image-->

别忘了还有 @ResponseStatus，直接标在自定义异常上，触发时自动设置HTTP状态码，省得手动设。

## SpringMvc中的国际化支持是如何实现的？

Spring MVC的国际化主要靠 LocaleResolver 和 MessageSource 两个组件协作完成。

用户的语言偏好由 LocaleResolver 解析，常见的有基于请求头的 AcceptHeaderLocaleResolver，也有基于Cookie或 Session的实现。比如浏览器发来 Accept-Language：zh-CN，框架就知道该用中文。

真正加载语言包的是 MessageSource，通常用 ResourceBundleMessageSource 读取类路径下的messages_zh.properties 、 messages_en.properties 这样的⽂件。 你在 controller 或⻚⾯⾥通过 code 拿

文本，它会根据当前locale返回对应翻译。

代码里可以用 @RequestHeader("Accept-Language"）手动感知语言，但更常见的是直接注入MessageSource 实例去 getMessage。

## 1）配置示例：

```java
@Bean
public MessageSource messageSource() {
source.setBasename("messages");
source.setDefaultEncoding("UTF-8");
return source;
}
```

## 2）目录结构：

src/main/resources/  
messages.properties # 默认  
messages_zh.properties # 中⽂  
messages_en.properties # 英⽂

前端如果用Thymeleaf，直接 \${#messages.text('login.title')} 就能取到。REST接口则通常在 service层调用 messageSource.getMessage(code，args，locale）组装响应。

整个流程不依赖任何特定中间件，核心机制就是“解析区域+动态查表”。只要语言文件放对位置，换语言基本不用改代码。

Spring中的@PostConstruct和@PreDestroy 注解的作用是什么？

Spring的这两个注解用来标记生命周期回调方法，让开发者能在 Bean初始化完成或销毁前执行自定义逻辑。

1）@PostConstruct 标记的方法会在依赖注入完成后自动执行，只会触发一次。比如你有个数据缓存组件，需要在应用启动后立即加载基础数据，就可以放在这里：

@PostConstruct   
public void init() {   
cache.loadAll();   
}

这个时机点很关键：所有 @Autowired 字段都已经填充完毕，可以安全使用依赖项。

2）@PreDestroy 用在销毁前清理资源，仅适用于singleton和prototype bean在容器关闭时。典型场景是关闭线程池、释放文件句柄或通知注册中心下线：

```java
@PreDestroy
public void cleanup() {
executor.shutdown();
}
```

要注意的是，@PreDestroy 能正常触发的前提是应用能优雅关闭，比如通过 ApplicationContext.close()或JVM的shutdown hook。如果是kill-9这种粗暴方式，压根不经过Spring生命周期，脏活累活就搞不定了。

这两个注解本质上替代了实现InitializingBean 和 DisposableBean 接口的方式，更轻量且不侵入业务代码。从执行顺序看，构造函数→依赖注入→@PostConstruct →业务方法→@PreDestroy (容器关闭时)。

## Spring中的@RequestBody和@ResponseBody注解的作用是什么？

这两个注解是 SpringMVC 处理HTTP请求和响应时最常用的工具，专门用来跟JSON打交道。

@RequestBody 的作⽤是把HTTP请求体⾥的JSON数据⾃动反序列化成Java对象。 ⽐如前端发来⼀个JSON字符串，Spring会通过Jackson或Fastjson把它转成对应的DTO或实体类实例。没有它，你就得手动读取输入流再解析，麻烦不说还容易出错。

@PostMapping("/user")   
public void createUser(@RequestBody User user) {   
// user 已经是解析好的对象了   
}

反过来，@ResponseBody 是把方法返回的Java对象序列化成JSON，写进HTTP响应体里。浏览器收到的就是标准的JSON数据。现在大多数接口都是前后端分离的RESTAPI，这个注解几乎是标配。

```java
@GetMapping("/user/{id}")
@ResponseBody
public User getUser(@PathVariable Long id) {
return userService.findById(id);
}
```

其实更常见的写法是直接用 @RestController，它本身就被 @ResponseBody 修饰了，所有方法默认都会返回JSON。

这两个注解的背后依赖的是HttpMessageConverter，Spring Boot会自动配置好Jackson的实现。只要类路径下有jackson-databind，这套机制就能跑起来，完全不用手写配置。

<!-- image-->

## Spring中的@Pathvariable注解的作用是什么？

@PathVariable ⽤来绑定 URL 模板中的变量到⽅法参数上。 ⽐如 RESTful 接⼝⾥常⻅的 /users/123 ， 这个123 就是路径变量。

Spring MVC在处理请求时，会根据 @RequestMapping 或其衍生注解（如 @GetMapping）里的占位符，把对应位置的值提取出来，自动注入到加了@PathVariable 的参数中。

1）最简单的用法是直接匹配同名变量

```groovy
@GetMapping("/orders/{id}")
public String getOrder(@PathVariable String id) {
return "Order ID: " + id;
}
```

2）如果参数名和路径变量名不一致，可以指定名称

```java
@GetMapping("/categories/{cid}/products/{pid}")
public String getProduct(@PathVariable("cid") String categoryId,
@PathVariable("pid") String productId) {
return "Category " + categoryId + ", Product " + productId;
}
```

3）支持类型转换，可以直接声明为基本类型或包装类

@GetMapping("/items/{itemId}")   
public Item getItem(@PathVariable Long itemId) {   
return itemService.findById(itemId);   
}

如果传的不是数字，会抛出 TypeMismatchException 。

4）变量可选？默认必须存在。如果想让某个路径变量可选，得配合 required = false

```java
@GetMapping("/tags/{tagName}")
public String getTag(@PathVariable(required = false) String tagName) {
if (tagName == null) return "All tags";
return "Tag: " + tagName;
}
```

但注意，这种方式对REST设计不太友好，一般建议通过不同接口区分。

整个过程由 HandlerMethodArgumentResolver 的实现类 PathVariableMethodArgumentResolver 完成,属于Spring MVC参数解析机制的一环。

SpringMVC中的拦截器是什么？如何定义一个拦器？

拦截器在SpringMVC里是用来对请求处理过程进行预处理和后处理的机制。它能在控制器方法执行前后、视图渲染前插入自定义逻辑，比如权限校验、日志记录、性能监控。

要定义一个拦截器，你需要实现 HandlerInterceptor 接口，重写它的三个方法：

1）preHandle：在控制器方法执行前调用，返回布尔值决定是否放行。返回false就会中断后续流程。

2）postHandle：控制器方法执行完但视图还没渲染时调用，可以用来修改模型数据或视图。

3）afterCompletion：整个请求完成（包括视图渲染）后调用，通常用于资源清理。

public class MyInterceptor implements HandlerInterceptor {   
@Override

```java
public boolean preHandle(HttpServletRequest request, HttpServletResponse
response, Object handler) {
System.out.println("执⾏前");
return true;
}
@Override
Object handler, ModelAndView modelAndView) {
System.out.println("执⾏后， 视图渲染前");
}
@Override
public void afterCompletion(HttpServletRequest request, HttpServletResponse
response, Object handler, Exception ex) {
System.out.println("请求完成");
}
}
```

写好之后要在配置类中注册，继承 WebMvcConfigurer，把拦截器加到拦截路径里。比如你可以只拦截 /api/\*\*这样的接口路径。

注意这个handler参数是处理器方法的映射信息，不是Controller实例。如果要用注解判断权限，就在这里做反射解析。这种机制比过滤器更贴近Spring的调度流程，粒度更细，也更容易拿到Spring管理的 Bean。

## Spring中的@ExceptionHandler注解的作用是什么？

@ExceptionHandler是SpringMVC里专门处理控制器内部异常的注解。你把它加在方法上，一旦同一个Controller里其他方法抛出它能处理的异常类型，就会自动跳转到这个方法来响应。

1）最常见的用法是在一个Controller内部定义私有的异常处理逻辑。比如某个接口可能抛出IllegalArgumentException ， 你就可以写：

```java
@ExceptionHandler(IllegalArgumentException.class)
public ResponseEntity<String> handleIllegalArgument() {
return ResponseEntity.badRequest().body("参数不对");
}
```

这样前端调用时传了非法参数，就不会直接返回500，而是得到一个友好的400响应。

2）但更实用的做法是结合@ControllerAdvice把异常处理做成全局的。把通用的异常捕获逻辑抽出去，所有Controller都能生效，避免每个类都重复写。

3）它支持的返回类型很灵活，可以直接返回Model和View用于渲染错误页，也可以返回ResponseEntity构造JSON响应，适合前后端分离场景。

注意它只能捕获当前Controller或其调用链中抛出的异常。如果请求压根没进到 Controller，比如被拦截器拦住了，那它就搞不定了。这类全局性问题得靠 @ControllerAdvice + @ExceptionHandler 配合解决。

<!-- image-->

Spring中的@ResponseStatus 注解的作用是什么？

@ResponseStatus 用在控制器的方法或异常类上，直接绑定 HTTP状态码，省得你手动写response.setStatus()。

比如抛出一个自定义异常，加上 @ResponseStatus(HttpStatus.NOT_FOUND)，Spring拦截到就会自动返回404，连controller都不用碰。这招在全局异常处理里特别实用，配合@ControlerAdvice能统一响应状态。

1）作用目标可以是方法，也可以是异常类

2）状态码由value属性指定，比如400、404、500

3）可选reason字段，填充响应体里的错误信息

```java
@ResponseStatus(value = HttpStatus.BAD_REQUEST, reason = "请求参数不对")
public class InvalidParamException extends RuntimeException {
}
```

注意它和ResponseEntity的区别：前者声明式，适合固定场景；后者编程式，灵活控制body和header。要是两个都用了，ResponseEntity优先级更高，毕竟运行时动态决定的嘛。

别滥用在正常业务流里返回状态码，那该用ResponseEntity或ResponseWriter手动输出。@ResponseStatus更适合“异常即状态”这种语义场景。

Spring中的@RequestHeader和@Cookievalue 注解的作用是什么？

用来从HTTP请求里提取特定的请求头和 Cookie值，省得你手动通过 HttpServletRequest 去拿。

1）@RequestHeader 把请求头的值直接注入到方法参数里。比如要获取客户端支持的压缩类型：

```java
@GetMapping("/info")
public String getInfo(@RequestHeader("Accept-Encoding") String encoding) {
return "Encoding: " + encoding;
}
```

如果头部不存在，默认会抛异常，加上 required=false 就能避免：

@RequestHeader(value = "X-User-ID", required = false) String userId

2）@CookieValue 是专门取 Cookie的。比如读取 JSESSIONID:

```java
@GetMapping("/hello")
public String hello(@CookieValue("JSESSIONID") String jSessionId) {
```

return "Session ID: " + jSessionId;   
}

也支持 required = false 和设置默认值 defaultValue 。

这两个注解在写网关、鉴权逻辑时特别常见。像用@CookieValue拿token 字段做免登录，或者通过@RequestHeader 读取 Authorization 头传递 JWT （虽然更常⻅的做法是全局拦截器处理）。

注意它们只能用在控制器的方法参数上，属于SpringMVC的绑定机制的一部分。背后靠的是HandlerMethodArgumentResolver实现自动解析，整个过程对开发者透明。

<!-- image-->

Spring中的@SessionAttribute注解的作用是什么？

用来从当前HTTP会话中获取已存在的属性，通常用于处理用户登录状态或跨请求共享数据。它不是创建session属性的注解，而是假设session中已经有对应值，直接拿来用。

如果 session中没有找到对应属性，默认会抛出异常，除非设置required=false。这和

常见于需要强依赖登录用户信息的场景，比如管理员后台接口，要求用户必须已登录且session中有user对象。

```java
@GetMapping("/profile")
public String getProfile(@SessionAttribute("user") User user, Model model) {
model.addAttribute("user", user);
return "profile";
}
```

1）只能获取已经存在于session中的属性，不会自动创建

2）适用于前后端不分离的传统MVC场景，比如Thymeleaf页面渲染

3）在SpringSecurity集成时，常配合认证后的用户信息提取使用

现代Web应用越来越多采用无状态设计，像JWT这类方案让服务端不再维护session，这种情况下@SessionAttribute ⽤得越来越少。 但在⼀些内部系统、 企业应⽤⾥， 基于 session 的认证还是主流， 这时候它依然是个简单可靠的工具。

## SpringMVC中如何处理表单提交？

表单提交在SpringMVC里其实就走标准的请求处理流程，关键在于怎么接数据、怎么转数据、怎么校验。

1）前端发个POST请求到 /submit ，Content-Type一般是 application/x-ww-form-urlencoded 。  
Spring的DispatcherServlet拿到请求后，根据 URL找到对应的@Controller方法。

2）方法参数通常用一个JavaBean接参，比如 @ModelAttribute UserForm form。Spring会自动把表单字段按名字映射到对象属性上，支持基本类型、嵌套对象，甚至集合。如果字段名对不上，可以用

@RequestParam("email") 明确指定。

3）想做数据校验？加上@Valid 就行。配合 Hibernate Validator，用 @NotBlank、@Email 这些注解声明规则。校验失败的话，会抛出 MethodArgumentNotValidException，你可以用 @ExceptionHandler 统一处理，返回错误信息给前端。

4）如果表单带文件上传，记得把 Content-Type改成 multipart/form-data，后端用 MultipartFile 接参。Spring需要配置 MultipartResolver，比如用 CommonsMultipartResolver 或基于Servlet3.0的标准实现。

```groovy
@PostMapping("/submit")
public String handleForm(@Valid @ModelAttribute UserForm form,
BindingResult result) {
if (result.hasErrors()) {
return "form-page"; // 返回⻚⾯， 带上错误
}
// 处理逻辑
return "success";
}
```

整个过程压根不经过视图解析之前的拦截器也能介入，比如打日志或者做权限检查。常见问题就是时间格式转换，需要 @DateTimeFormat(pattern = "yyyy-MM-dd"） 明确指定。

Spring中的@Scheduled注解的作用是什么？

定时任务的声明式配置，用@Scheduled就能把一个普通方法变成周期性执行的任务，不用手动去写线程调度逻辑。

1）方法上加上 @Scheduled，指定触发规则，Spring容器启动时会自动注册进任务调度线程池。比如每5秒跑一次：

```bib
@Scheduled(fixedRate = 5000)
public void report() {
System.out.println("执⾏中...");
}
```

2）支持多种表达式类型，最常用的是cron表达式，比如每天凌晨1点执行：

```bib
@Scheduled(cron = "0 0 1 * * ?")
public void dailyTask() { ... }
```

也支持fixedDelay (上一次执行完后隔多久）、fixedRate (不管上次是否完成，固定频率触发)。

3）默认是单线程串行执行所有任务，如果某个任务耗时10秒，而fixedRate是5秒，那实际还是等上一个跑完才会触发下一个。想并行得自己配TaskScheduler或加@Async。

4）要启用这个功能，主类得加上@EnableScheduling。它底层依赖 Spring的TaskScheduler抽象，最终由ScheduledExecutorService驱动，压根不经过外部调度系统。

注意分布式场景下别直接用这个做关键定时任务，多实例会重复执行。真要分布式调度，得上xxl-job或Elastic-Job这种带中心化调度和故障转移的框架。

## Spring中的@Cacheable和@CacheEvict注解的作用是什么？

@Cacheable和 @CacheEvict是Spring基于AOP实现的声明式缓存控制手段，让你不用写重复的缓存读写代码。

1）@Cacheable用在方法上，第一次调用时执行方法体，把结果放进缓存。下次请求同样的参数，直接从缓存拿，压根不经过方法体。比如查用户信息，@Cacheable(value = "user"，key ="#id"）就表示以id为key缓存返回值。

```java
@Cacheable("books")
public Book getBookById(String isbn) {
return findInDatabase(isbn);
}
```

2）@CacheEvict用来清掉缓存，通常用在增删改操作后。比如更新一本书，就得把旧的缓存干掉，不然下次读到的就是脏数据。加 allEntries = true 能清整个缓存区，beforeInvocation= true 表示先清缓存再执行方法。

```groovy
@CacheEvict(value = "books", key = "#isbn")
public void updateBook(String isbn, Book book) {
saveToDatabase(book);
}
```

这套机制依赖CacheManager，底层可以对接 Redis、Caffeine等。注意key的生成策略，默认是用参数做SimpleKey，复杂对象要确保hashCode和equals正确。如果方法抛异常，默认不会进缓存，可以用unless或condition 控制更精细的⾏为。

<!-- image-->

## Spring中的@Conditional注解的作用是什么？

@Conditional是 Spring里做条件化装配的开关。你给一个类或者配置加上它，Spring就会根据你指定的条件来决定要不要把这个Bean拿出来创建。

它的核心是Condition接口，只要实现 matches 方法就行，返回true就加载，false就跳过。比如你想在 Linux系统下才启用某个服务，写个条件判断操作系统就行。

Spring Boot里一堆衍生注解都是基于它的：1）@ConditionalOnClass:classpath 有这个类才生效2)@ConditionalOnMissingBean：容器里没有这个Bean才创建3）@ConditionalOnProperty：配置文件里开了开关才起作用

举个例子，你用Redis做缓存，但想保留本地缓存作为fallback。就可以写两个配置类，一个标上@ConditionalOnClass(Redis.class)，另一个标 @ConditionalOnMissingClass("redis.clients.jedis.Jedis")，Spring自动选合适的加载。

这样就不用硬编码逻辑，配置驱动就能切换行为，Starter的自动装配全靠这套机制撑起来的。

## Spring中的@Lazy注解的作用是什么？

@Lazy注解控制的是Bean的初始化时机，简单说就是让Bean延迟到第一次被使用时才创建，而不是在应用启动时就一股脑全初始化好。

Spring默认会把单例Bean在容器启动阶段就完成实例化和依赖注入，这叫预初始化。对于那些启动时用不到、或者初始化代价高的组件，这种做法其实浪费时间和资源。加上@Lazy，就能把这部分“脏活累活”往后拖。

1）加在配置类上，整个类里定义的Bean都延迟加载

2）加在@Bean方法上，只对这个方法返回的 Bean生效

3）加在@Component类上，标记该组件为懒加载

比如你用@Service标记了一个报表服务，它依赖的数据源要查十几个表，启动时根本不会访问这个服务。这时候加上@Lazy，能明显缩短启动时间。

有个细节要注意：如果A依赖B，B加了@Lazy，但A没加，那A初始化时还是会去触发B的创建，相当于延迟失效。真正想延迟，得确保整条依赖链都支持懒加载。

代码上看，就是在声明时多一个注解：

@Lazy   
@Bean   
public ExpensiveService expensiveService() {   
return new ExpensiveService();   
}

这种机制在大型项目里特别有用，像某些定时任务处理器、异步消息消费者，完全没必要在启动时就拉起来。用好@Lazy，能让应用更快“扛住”启动过程。

## Spring中的@PropertySource 注解的作用是什么？

用来加载自定义的Properties配置文件，让里面的键值对能被 Spring的Environment读取到。默认情况下Spring只会加载 application.properties 或 application.yml，如果你有额外的配置文件，比如jdbc.properties 或 merchant-config.properties ， 就得靠它来引⼊。

1）通过value 属性指定文件路径，支持 classpath：和 file:协议2）可以配合 @value 或Environment API 取值 3） 如果⽂件不存在， 默认会启动失败， 加上 ignoreResourceNotFound = true 可以容忍

典型用法：

@PropertySource("classpath:jdbc.properties")   
@Configuration   
public class JdbcConfig {   
@Value("\${db.url}")

private String dbUrl;   
}

多个文件按顺序加载，后加载的会覆盖前面同名的key。注意它只支持.properties 文件，不支持 YAML。如果想加载YAML，得自己实现 PropertySourceFactory 。

实际项目里用得不多，多数人直接把所有配置扔application.yml。但在模块化设计中，比如中间件或 SDK需要自带独立配置时，这注解就很有用了，像早期的Dubbo就这么干过。

## Spring中的JPA和Hibernate有什么区别？

JPA是Java持久化规范，说白了就是一套接口定义，规定了ORM该有哪些功能，比如怎么映射实体、怎么查数据。  
Hibernate则是这套规范的实现之一，真正干活的是它。

1）JPA不绑定具体实现，你可以换别的provider，比如EclipseLink。但实际项目里，Hibernate几乎成了事实标准，SpringData JPA 默认用的也是它。

2）你在代码里写 @Entity、@Id 这些注解，其实是JPA的，不是 Hibernate 自己的。Spring Data JPA的JpaRepository 接⼝也基于 JPA 规范设计， 你⾯向的是接⼝编程。

3）但一旦涉及高级功能，比如二级缓存、批量处理策略、自定义方言，就得用Hibernate特有的API了。这时候你会发现配置文件里还是得引入Hibernate的包，甚至写hibernate.hbm2ddl.auto 这种属性。

举个例子，Spring Boot配置:

```yaml
spring:
jpa:
hibernate:
ddl-auto: update
database: mysql
```

这里hibernate 明明是实现，却出现在JPA配置下，就是因为Spring把两者融合得比较紧。

简单说：JPA定规则，Hibernate做脏活累活。你写业务用JPA注解和仓库接口，框架底层全交给Hibernate去扛住。

## Spring中的@EventListener注解的作用是什么？

Spring的 @EventListener 注解用来监听应用中发布的事件，相当于注册了一个回调函数。当某个事件被发布时，被注解的方法就会自动触发。

1）方法上加上 @EventListener，Spring就会在对应事件发生时调用它。比如用户注册成功后发一个UserRegisteredEvent ， 你就可以写个监听⽅法发欢迎邮件。

```java
@EventListener
public void sendWelcomeEmail(UserRegisteredEvent event) {
// 发送邮件逻辑
}
```

2）监听的事件类型由方法参数决定。如果参数是 ApplicationEvent 子类，那这个方法就只响应这个类型的事件。支持泛型和条件表达式，比如用 condition ="#event.userType ==‘vIP'" 控制只处理特定场景。