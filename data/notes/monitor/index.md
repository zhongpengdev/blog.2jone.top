---
title: 初步认识管程
date: 2026-05-22
slug: "what-is-monitor"
---

# 管程 monitor

管程在实现上更偏向于编程语言层面的并发抽象，底层依赖OS提供的同步原语，任何时刻，只允许一个线程进入管程内部执行。

所以，一般来说管程主要用于同一进程内的线程同步和同进程的共享数据保护，而不是跨进程同步。

主要封装了并发模型中
+ 自动互斥
+ 条件等待
+ 共享资源封装
+ 进入/退出规则等

1. 封装了共享资源和对资源的操作。
2. 同一时刻只有一个线程能进入管程。

```text
  代码（应用层）
      ↓ 使用
  管程 Monitor（编程语言/库层）
      ↓ 封装
  Mutex + Condition Variable（系统/库层）
      ↓ 封装
  硬件原语：CAS、关中断、原子指令（硬件层）
```

管程不是OS层面的底层东西，是编程语言层面的封装：
    将mutex + 条件变量 + 共享数据全部打包成一个整体，减少手动PV的过程。

## 条件变量

条件变量封装了1. 等待队列 2. 操作接口(wait(), signal(), broadcast()叫醒所有人)

注意：条件变量不存储任何的条件，是否阻塞，某个线程是否进入队列由程序员自己写判断逻辑，**条件变量只负责挂起/唤醒**。

如果线程A发现 `S <= 0` 则执行`x.wait()`将自己挂起，自动放弃管程的使用权，能让其他线程进来还资源。

如果没有条件变量的wait机制，线程A进入管程后发现无资源可用时，无法释放管程锁，导致其他线程也无法进入，形成死锁。

当线程B归还资源后， `x.signal()`唤醒队列中的A线程使用。

唤醒策略有两种：

1. Hoare管程
   + signal的线程B立刻暂停，让A执行
2. Mesa管程
   + B继续执行，A进入就绪队列等待，只有B释放锁之后A才能重新竞争锁，且需要重新经过while()重检条件。(Java `synchronized/wait/notify`、Python `threading.Condition`、C++ `std::condition_variable`)

## 条件变量和信号量的区别

信号量是有值的，在内部维护了一个计数器，就是计数器的状态，表示还有多少资源可用。

条件变量没有任何状态，需要程序员手动判断应用层共享变量的状态。

```c
mutex.lock(); // 进入管程加锁

/**
 * 如果是信号量P(&mutex)就直接自动阻塞
 */ 
while (count == 0) { // 手动判断是否有可用资源。
    cv.wait(mutex);
}

// 过了while()，证明有资源
count --;
if(count > 0) {
    cv.signal(); // 有资源则唤醒等待者
}
mutex.unlock(); // 办完事离开管程，释放锁
```

## condition

```c

// 阻塞队列（mutex 通过参数传入，不存结构体里）
struct Condition {
    Queue<TCB> queue; // 被阻塞线程队列
}
```

## wait(Condition *cv, proc *mutex)

```c
void wait(Condition *cv, proc *mutex) {
    cv.queue.enqueue(current_thread);

    // 释放锁
    V(mutex);

    // 阻塞当前线程
    block();

    // 被唤醒后重新抢锁
    P(mutex);
}
```

## signal()

### Hoare 管程

signal 后，当前线程立刻让出 CPU，被唤醒的线程直接执行。

```c
signal(cv, mutex) {
    if(!cv.queue.empty()) {
        TCB *t = cv.queue.dequeue();
        wakeup(t);
        suspend();  // 当前线程暂停，让 t 立刻运行
    }
}
```

### Mesa 管程

signal 后，当前线程继续执行。被唤醒的线程只是变成就绪，等当前线程释放锁后才能竞争。

```c
signal(cv) {
    if(!cv.queue.empty()) {
        TCB *t = cv.queue.dequeue();
        wakeup(t);  // t 变成就绪，不立即运行
    }
    // 当前线程继续执行，不阻塞
}
```

这就是为什么 Mesa 管程中 wait 返回后必须用 `while` 重检条件——从被唤醒到重新抢到锁这段时间，条件可能又被别人改了。