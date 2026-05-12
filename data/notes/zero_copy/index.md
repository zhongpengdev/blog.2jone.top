---
title: 常见的零拷贝方案
slug: zero-copy-implementation-scheme
date: 2026-05-12
---

# 零拷贝

消除数据在用户态和内核态之间的拷贝开销

## 传统IO开销

用户程序：调用read() -> 拿到磁盘数据 -> write()写发送

1. 如果用户程序在user buffer 做了加密，解压，解析等传统IO,此时数据必须经过用户态，无法用零拷贝，如果只是为了发送，实际上不合理。

```
data = read(file)
write(socket, data)

// 零拷贝方案
sendfile(socket, file) // 内核态直接将文件搬到socket
```


**从磁盘读取到通过网卡发送，四次上下文切换和4次数据拷贝**

1. Disk → Page Cache（DMA 拷贝）

2. Page Cache → User Buffer（CPU 拷贝，跨越内核/用户边界）

3. User Buffer → Socket Buffer（CPU 拷贝，再次跨越边界）

4. Socket Buffer → NIC (网卡)（DMA 拷贝）

| 时序 | 操作性质 | 数据拷贝动作 | 上下文切换状态 |
|:----:|:--------|:------------|:--------------|
| 1 | 系统调用 | 无 | 切换 1：用户态 → 内核态 (调用 read) |
| 2 | DMA 拷贝 | 1. Disk → Page Cache | 内核态执行中 |
| 3 | CPU 拷贝 | 2. Page Cache → User Buffer | 内核态执行中 |
| 4 | 系统返回 | 无 | 切换 2：内核态 → 用户态 (read 返回) |
| 5 | 系统调用 | 无 | 切换 3：用户态 → 内核态 (调用 write) |
| 6 | CPU 拷贝 | 3. User Buffer → Socket Buffer | 内核态执行中 |
| 7 | DMA 拷贝 | 4. Socket Buffer → NIC | 内核态执行中 |
| 8 | 系统返回 | 无 | 切换 4：内核态 → 用户态 (write 返回) |

## ZERO-COPY

### 各方案对比

| 方案 | 数据拷贝 | 上下文切换 | 核心思路 |
|:----|:-------|:---------|:-------|
| 传统 read+write | 4次 | 4次 | — |
| mmap + write | 3次 | 4次 | 让用户态虚拟地址直接映射 Page Cache，省去拷贝到用户buf |
| sendfile | 2次 | 4次 | 用户态不参与，内核直接搬运 |
| sendfile + SG-DMA | 1次 | 2次 | DMA gather，CPU 拷贝全免 |
| splice | 1-2次 | 2-4次 | 同 sendfile，任意 fd 间可用 |
| io_uring | 批量提交，单次趋近于0 | 批量提交，单次趋近于0 | 异步环形缓冲区，减少 syscall |

演进主线：**逐步把用户态从数据搬运链路中摘出去。**

### mmap

将Page Cache的物理页映射到用户地址空间，用户直接读。

mmap的核心优势是省拷贝，读写都支持(MAP_SHARED)。

传统IO下，程序可访问的合法内存地址如`int *p = 0x7fff12340000` 是虚拟地址，MMU通过页表将该进程可访问的地址转换成内存中真实的物理地址。传统`read`中，用户malloc一块buf，虚拟地址已经映射到了分配的物理页。调用时，内核将命中的page cache目标数据拷贝过来。

而mmap不建新的页，也不拷贝数据，而是直接将`buf`指向了page cache已有的物理页。

所以，调mmap时完全可能触发缺页中断，这时也需要进行磁盘IO，效果和read()时间上等效：

```c
void *p = mmap(NULL, 100GB, PROT_READ,MAP_SHARED, fd, 0);  // 瞬间完成           
p[0];  // 触发第一页的缺页中断，从磁盘读
p[4096];  // 触发第二页的缺页中断...
```

mmap省去从page cache -> user buffer的过程

```c
void *buf = mmap(NULL, size, PROT_READ, MAP_SHARED, fd, 0);

write(sock, buf, size);

```

### 写时拷贝(COW)

`mmap(..., MAP_SHARED, ...);` 中的MAP_SHARED字段标识共享映射，flag字段包括两种:`MAP_SHARED`, `MAP_PRIVATE`。

**MAP_SHARED**

虚拟地址 → 直接指向 Page Cache 中的物理内存页

读取数据：CPU直接去Page Cache拿（快）

修改数据：直接修改Page Cache里的内容（直接改掉page cache中的数据）

其他进程也MAP_SHARED同一个文件：他们的虚拟地址也指向同一块Page Cache → 共享对方的修改

后果：修改后，内核会自动把Page Cache里的脏数据写回磁盘


**MAP_PRIVATE**

最一开始，程序的虚拟地址都指向 Page Cache

只读取数据：直接读Page Cache，没事

第一次要修改数据：

CPU发现要写一个“共享仓库”里的东西（但标记为private）
内核立即在物理内存里找一个新页，把Page Cache中那一页的内容拷贝到这个新页
内核修改你的页表，让你的虚拟地址不再指向Page Cache，而是指向这个新拷贝的页
然后你在这个新拷贝的页上执行修改

后果：

该程序修改的是自己的私有拷贝

其他进程MAP_PRIVATE同一个文件：他们各自有自己的私有拷贝（互相看不见）

原来那个Page Cache里的数据根本没变

自己修改后的数据不会写回磁盘（因为本来就是私有的）

这就是写时拷贝（Copy-on-Write, COW）机制。

### sendfile

`ssize_t sendfile(int out_fd, int in_fd, off_t *offset, size_t count)`

不经过用户空间，内核直接拷贝到Socket Buffer

如果网卡支持 DMA gather（SG-DMA），Socket Buffer 的拷贝也省掉：一次拷贝，两次切换

适用：纯搬运场景（Nginx、Kafka 发文件）

**page cache -CPU拷贝-> socket buffer -DMA-> NIC**

省去page cache -> user buffer, user buffer -> socket buffer 

如果支持DMA gather：page cache -DMA gather-> NIC   

```c
sendfile(sock, file_fd, &offset, size);
```

### splice

通过管道做中转，内核里两个文件描述符之间直接传数据，不进用户空间。比 sendfile 更通用——sendfile 只能 file→socket，splice 任意 fd 之间都可以。

和sendfile一样，只需要两次或者一次拷贝。

适用于在非socket的fd之间数据搬运。

省去page cache -> user buffer 以及 user buffer -> socket buffer

### Direct I/O

Direct IO绕过了 Page Cache，但数据仍然从磁盘 DMA拷贝到用户缓冲区——不是"零拷贝"，是"零缓存"。

适用：数据库等应用自己管理缓存，不信任内核的page cache。

直接disk -> user buffer
```c
int fd = open(path, O_DIRECT | O_WRONLY);
```

## io_uring

Linux 5.1+ 引入，现代异步 I/O 框架。核心思想：**用户态和内核态共享两块环形缓冲区（ring buffer），通过内存映射通信，尽量减少系统调用。**

### 核心机制：SQ + CQ

```
用户态                              内核态
┌──────────────┐               ┌──────────────────┐
│ Submission   │  mmap 共享    │                  │
│ Queue (SQ)   │──────────────→│ 读取 SQ entries  │
│ 环形缓冲区    │               │ 执行 I/O 操作     │
└──────────────┘               │                  │
                               │ 写入结果          │
┌──────────────┐  mmap 共享    │                  │
│ Completion   │←──────────────│ Completion       │
│ Queue (CQ)   │               │ Queue (CQ)       │
│ 环形缓冲区    │               │ 环形缓冲区        │
└──────────────┘               └──────────────────┘
```

- **SQ（Submission Queue）**：用户态往里写 I/O 请求（SQE），内核态读取并执行
- **CQ（Completion Queue）**：内核态写入完成结果（CQE），用户态读取
- 两个队列通过 `mmap` 在用户态和内核态之间**共享物理内存**，读写不需要系统调用

### 工作流程

```
1. 用户初始化 io_uring（mmap 建立 SQ/CQ 共享内存）
2. 用户往 SQ 写入 SQE（纯内存操作，无需 syscall）
3. 用户调用 io_uring_enter() 通知内核（一次 syscall 批量提交多个请求）
4. 内核从 SQ 读取 SQE，执行 I/O
5. 内核将结果写入 CQ（纯内存操作）
6. 用户轮询 CQ 获取结果（或阻塞等待）
```

**关键优势：SQ/CQ 本身的读写不需要系统调用，只有提交/等待需要 `io_uring_enter()`，且一次可批量提交多个请求。**

### 与传统/epoll 对比

| 维度 | 传统阻塞 I/O | epoll | io_uring |
|:----|:------------|:------|:---------|
| 每个请求的 syscall | 2次 (read+write) | 2-3次 (epoll_ctl+epoll_wait+read) | 0次（SQ/CQ共享内存） |
| 批量提交 | 不支持 | 部分支持 | 一次 enter() 提交 N 个 |
| 异步性 | 同步阻塞 | 通知就绪，读写仍同步 | 完全异步 |
| 磁盘 I/O 支持 | 差 | 不支持 | 完整支持 |
| 内存拷贝 | 多次 | 多次 | 可做到零拷贝 |

### 代码示例

```c
#include <liburing.h>

struct io_uring ring;
io_uring_queue_init(QUEUE_DEPTH, &ring, 0);

// 从 SQ 拿一个空槽
struct io_uring_sqe *sqe = io_uring_get_sqe(&ring);

// 填充 I/O 请求：读文件
io_uring_prep_read(sqe, file_fd, buf, size, offset);

// 提交（批量，一次 syscall）
io_uring_submit(&ring);

// 等待完成
struct io_uring_cqe *cqe;
io_uring_wait_cqe(&ring, &cqe);

// cqe->res 是 read 的返回值
printf("read %d bytes\n", cqe->res);

// 标记 CQE 已消费
io_uring_cqe_seen(&ring, cqe);

io_uring_queue_exit(&ring);
```

### 高级特性

#### SQPOLL（Submission Queue Polling）

内核启动一个专用线程**轮询 SQ**，用户写入 SQE 后甚至不需要调用 `io_uring_enter()`——内核自动发现并执行。

```
普通模式：用户写 SQE → io_uring_enter() → 内核读 SQE → 执行
SQPOLL：  用户写 SQE → 内核轮询自动发现 → 执行（零 syscall）
```

适用：超高频 I/O 场景（数据库、消息队列），追求极致延迟。

#### Provided Buffers（缓冲区注册）

用户预先注册一组缓冲区到内核，内核读数据时直接用注册的 buffer，省去 `read()` 的缓冲区拷贝。

```
传统：内核读数据 → 拷贝到用户指定的 buf
Provided Buffer：内核直接读到预注册的 buf（省一次拷贝）
```

#### Fixed Files / Fixed Buffers

预先将 fd 和缓冲区注册到内核，避免每次 I/O 操作的重复查找和映射开销。

### 适用场景

- 高并发网络服务器（替代 epoll）
- 数据库 I/O 引擎（PostgreSQL、RocksDB 已集成）
- 高吞吐文件服务
- 任何需要大量 I/O 且追求低延迟的场景

## 总结

零拷贝的本质：**数据不需要经过用户态，直接在内核态完成搬运。**

- **mmap** — 省掉 Page Cache → User Buffer 的拷贝，但用户态仍在链路上
- **sendfile/splice** — 完全绕过用户态，内核直接搬运；SG-DMA 进一步省掉 CPU 拷贝
- **Direct I/O** — 不是零拷贝，是跳过 Page Cache，让应用自己管理缓存
- **io_uring** — 不解决拷贝问题，解决的是**系统调用开销**：共享环形缓冲区 + 批量提交

选型依据：需要处理数据 → 传统 IO；纯转发 → sendfile；高并发异步 → io_uring；自管缓存 → Direct I/O。
