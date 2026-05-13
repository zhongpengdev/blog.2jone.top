---
title: Linux下IPC的几种方式
slug: ipc-under-linux
date: 2026-05-13
---

# IPC的方式

IPC用来在不同进程之间交换信息。

## 共享存储

### 原理

普通IPC(Socket, pipe等)在进行IPC时，至少需要两次内核拷贝，数据流向如下面所示：

```
进程A
  ↓ // A用户数据到内存区
内核缓冲区
  ↓ // 内存区数据到B用户Buffer
进程B
```

共享存储是Linux/Unix速度最快的IPC，让两个进程的数据直接映射到同一块物理内存绕过了内核拷贝的中间过程。

具体过程如下：
1. A先调用`shmget()`向内核申请一块共享内存，内核返回一个key标识符。
2. A调用`shmat()`内核将这块物理内存挂到A的虚拟地址空间，A拿到一个指向该空间的指针`ptr_A`
3. B也调用`shmat()`将这一块物理内存挂到B的地址空间，B拿到`ptr_B`
4. A往公共空间中写数据，B直接读

> 注：共享页和普通的物理页本质上均相同，无任何特殊性，只是两个不同的进程页表都指向了某一个共同的物理页，达到数据共享的目的。
>
> 堆内存分配`malloc`的行为是内核只将空闲的物理页映射给A的页表，从逻辑上来说就是私有的。而`shmat`则是将同一个物理页既映射给了A程序，又映射给了B程序，逻辑上说就是共享的。

### 代码流程

完整流程：
1. 创建/打开共享内存区域
2. 映射到当前进程地址空间
3. 初始化同步原语（信号量/互斥锁）
4. 定义好数据结构（消息头+payload）
5. 写方：加锁 → 写入 → 解锁 → 通知
6. 读方：等待通知 → 加锁 → 读取 → 解锁

#### 1. 数据结构

```c
struct shared_msg {
    char have_new_msg;
    int msg_type;
    int msg_length;
    char msg[256];
};
```

#### 2. 创建共享内存

```c
int shmid = shmget(1234, sizeof(struct shared_msg), 0666 | IPC_CREAT); // key, msg_size, 权限 创建标志
```

#### 3. 映射到地址空间

```c
// 拿到shmid后调用shmat将它映射成一个指针
struct shared_msg *ptr = shmat(shmid, NULL, 0);
```

#### 4. 创建信号量

```c
// 创建信号量 SystemV
int semid = semget(5678, 1, 0666 | IPC_CREAT);

// 初始化
semctl(semid, 0, SETVAL, 0); // 0 B调用wait阻塞，A post加1
```

#### 5. A写数据

```c
struct sembuf lock = {0, -1, 0};
struct sembuf unlock = {0, 1, 0};

semop(semid, &lock, 1);           // 加锁
strcpy(ptr->msg, "hello from A"); // 写数据
ptr->msg_length = strlen(ptr->msg);
ptr->have_new_msg = 1;            // 标记有新消息
semop(semid, &unlock, 1);         // 解锁
```

#### 6. B读数据

```c
struct sembuf lock = {0, -1, 0};
struct sembuf unlock = {0, 1, 0};

semop(semid, &lock, 1);           // 阻塞等A写完
if (ptr->have_new_msg) {
    printf("%s\n", ptr->msg);     // 读数据
    ptr->have_new_msg = 0;        // 标记已读
}
semop(semid, &unlock, 1);         // 解锁
```

#### 7. 清理（A负责销毁）

```c
shmdt(ptr);                       // 解除映射
shmctl(shmid, IPC_RMID, NULL);    // 删除共享内存
semctl(semid, 0, IPC_RMID);       // 删除信号量
```

## 消息传递

### 原理

消息传递是内核维护的一个**消息队列**，进程A把消息放进去，进程B从队列中取出来。消息是**有结构的离散单元**，不是字节流。

```
进程A（发送）               内核消息队列                进程B（接收）
                     ┌───────────────────┐
发送 msg1 ──────→   │ [type:1][data:...] │  ──────→ 接收 msg1
发送 msg2 ──────→   │ [type:3][data:...] │
发送 msg3 ──────→   │ [type:1][data:...] │
                     └───────────────────┘
```

### 与管道、共享内存的区别

| 特性 | 管道 | 消息传递 | 共享内存 |
|------|------|---------|---------|
| 数据形式 | 字节流 | 结构化消息（type+data） | 原始内存，自定义格式 |
| 内核拷贝 | 2次 | 2次 | 0次 |
| 同步 | 内核自动（读空阻塞） | 内核自动（队空阻塞） | 用户自行处理 |
| 消息边界 | 无（连续字节） | 有（每条消息独立） | 无 |
| 优先级 | 无 | 有（按type排序） | 无 |

### 关键特性

1. **消息有类型**：每条消息带一个 type 标识，接收方可以按 type 选择性接收（比如只收 type=2 的消息）
2. **自动同步**：队列空时接收方阻塞，队列满时发送方阻塞，不需要额外的信号量
3. **消息边界清晰**：每次 send 是一条完整消息，每次 receive 也收到一条完整消息，不会出现半条消息的情况
4. **两种实现**：System V（msgget/msgsnd/msgrcv）和 POSIX（mq_open/mq_send/mq_receive），原理相同

### 适用场景

- 需要**结构化通信**：不同消息类型走不同处理逻辑
- 不想手动管理同步：内核帮你做好了
- 数据量不大：每次拷贝有内核开销，不适合大数据量高频传输（这时候用共享内存）

## 管道

### 原理

管道是内核中的一块**环形缓冲区**，一端写入，一端读取。

```
进程A（写端）                内核环形缓冲区               进程B（读端）
                         ┌─────────────────┐
写入 "hello" ──────→    │ h e l l o        │  ──────→ 读取 "hello"
写入 "world" ──────→    │ w o r l d        │  ──────→ 读取 "world"
                         └─────────────────┘
                           写入端    读取端
```

### 两种管道

| | 匿名管道 `pipe` | 命名管道 `FIFO` |
|--|----------------|----------------|
| 通信对象 | 只能父子/兄弟进程 | 任意进程 |
| 创建方式 | `pipe()` 系统调用 | `mkfifo()` 创建文件节点 |
| 存在方式 | 进程退出即消失 | 文件系统中持久存在，需手动删除 |
| 使用场景 | shell 的 `\|` 管道、fork 后父子通信 | 无关进程间通信 |

### 关键特性

1. **单向通信**：数据只能从写端流向读端，半双工。要双向通信需要两个管道
2. **字节流**：没有消息边界。写入 "hello"+"world" 可能被一次读成 "helloworld"，需要应用层自己分包
3. **自动同步**：缓冲区空时读端阻塞，缓冲区满时写端阻塞，不需要额外同步
4. **内核缓冲区有限**：通常是 64KB（Linux 默认），满了写端就阻塞
5. **读端关闭后写端会收到 SIGPIPE 信号**：典型场景是 `cat file | head -1`，head 读到一行就退出，cat 收到 SIGPIPE

### 用法

Shell 的管道就是匿名管道：

```bash
cat log.txt | grep "error" | wc -l
```

Shell fork 出三个进程，用两个匿名管道串起来：cat 的 stdout → 管道1 → grep 的 stdin → grep 的 stdout → 管道2 → wc 的 stdin。

## 信号（异步通信）

### 原理

信号是内核发给进程的**软件中断**，不需要进程主动接收，来了就打断进程当前工作去处理。

```
                     ┌──────────────┐
kill(pid, SIGUSR1) ──→│  内核标记进程  │──→ 进程收到信号
                     │  pending 位图  │    打断当前执行
                     └──────────────┘    跳转到handler
```

进程收到信号后有三种处理方式：
1. **默认处理**：内核预设的行为（比如 SIGINT 默认终止进程）
2. **忽略**：当没收到
3. **自定义 handler**：用 `sigaction()` 注册回调函数

常见信号：

| 信号 | 含义 | 默认行为 |
|------|------|---------|
| SIGINT | Ctrl+C | 终止 |
| SIGTERM | 请求优雅退出 | 终止 |
| SIGKILL | 强制杀死（不可捕获） | 绝杀 |
| SIGCHLD | 子进程结束 | 忽略 |
| SIGPIPE | 写了一个没人读的管道 | 终止 |
| SIGUSR1/2 | 用户自定义（可用于IPC） | 终止 |

### 作为IPC的方式

进程A通过 `kill(pid, sig)` 向进程B发送信号，B通过 `sigaction()` 注册的 handler 接收。

但信号能携带的信息极少——**只有一个信号编号**，没有数据载荷。所以信号本质是"通知"，不是"通信"。

### 缺点

1. **信号会丢失**：同一个信号连续发多次，可能只收到一次（pending 位图只有1位）
2. **不可靠**：不保证送达顺序，不保证不丢失
3. **数据能力弱**：只有一个整数编号，不能传数据（`sigqueue` 可以带一个 int/ptr，但非常有限）
4. **handler 有大量限制**：handler 中只能调用 async-signal-safe 函数，不能 malloc、不能 printf
5. **时序复杂**：信号可能在任意时刻到达，打断任意代码，容易引入竞态条件


## 现代化的IPC

前面讲的共享内存、管道、消息队列、信号都是经典的 System V / POSIX IPC。Linux 后来引入了一批更现代的机制，核心思路是**统一用文件描述符（fd）来管理一切**，可以和 `epoll` 配合使用。

### eventfd

一个轻量级的"计数器fd"，`write` 加1，`read` 清零。用于线程/进程间的事件通知。

```
线程A：eventfd_write(fd, 1)  ──通知──→  线程B：eventfd_read(fd) 被唤醒
```

比信号量轻量，比管道简单，而且能放进 `epoll` 等待。

### signalfd

把信号变成一个可读的 fd。进程不再用 handler 异步处理信号，而是像读文件一样同步读取信号。

```
传统方式：sigaction 注册 handler → 信号来了异步回调（限制多，难调试）
signalfd：创建 signalfd → epoll_wait 返回 → read 读出信号（同步，可控）
```

解决了传统信号 handler 的两大痛点：handler 中不能调用大多数函数、时序难控制。

### timerfd

定时器变成 fd。到期后 fd 变为可读，配合 epoll 使用。

```
创建 timerfd（设1秒后到期）
    ↓
epoll_wait 等待
    ↓
1秒后 timerfd 可读，read 得到到期次数
```

替代了 `alarm()` / `setitimer()` 信号定时器，不再依赖信号机制。

### futex

Fast Userspace muTEX，用户态快速互斥锁的底层原语。

```
无竞争时：直接在用户态修改共享内存中的标记，不陷入内核（快）
有竞争时：才调用 futex() 系统调用，进入内核等待（慢路径）
```

`pthread_mutex` 的底层就是 futex。这也是为什么多线程锁在无竞争时性能很好。

### epoll

IO 多路复用，同时等待多个 fd 的事件。不是进程间通信本身，而是**管理多个 IPC 通道的工具**。

```
epoll 同时等待：
  - pipe 的读端
  - socket
  - eventfd
  - timerfd
  哪个有数据就处理哪个
```

### 现代IPC vs 经典IPC

| | 经典 IPC | 现代 IPC |
|--|---------|---------|
| 标识方式 | key / id | 文件描述符（fd） |
| 能否放入 epoll | 不能 | 全部可以 |
| 编程模型 | 各自独立的 API | 统一的 read/write/epoll 模型 |
| 代表 | shmget, pipe, msgget | eventfd, signalfd, timerfd, futex |

核心优势：**fd 统一后，一个 epoll 循环就能管理所有 IPC 通道**，不需要为每种 IPC 写单独的等待逻辑。


| IPC           | 用途       |
| ------------- | ---------- |
| shared memory | 高性能数据 |
| socket        | 通用通信   |
| pipe          | 父子通信   |
| message queue | 结构化消息 |
| eventfd       | 事件通知   |
| futex         | 线程同步   |
| epoll         | IO事件     |
