---
title: MySQL索引以及其性能问题
date: 2026-06-17
slug: mysql-index
---

# 索引

## 常见索引语法

### 建表时创建

```sql
-- 主键索引
CREATE TABLE users (
    id INT PRIMARY KEY,               -- 主键索引
    name VARCHAR(50),
    email VARCHAR(100),
    age INT,
    INDEX idx_name (name),            -- 普通索引
    UNIQUE idx_email (email),         -- 唯一索引
    INDEX idx_name_age (name, age)    -- 联合索引
);
```

### CREATE INDEX（已存在表上建索引）

```sql
-- 普通索引
CREATE INDEX idx_name ON users (name);

-- 唯一索引
CREATE UNIQUE INDEX idx_email ON users (email);

-- 联合索引
CREATE INDEX idx_name_age ON users (name, age);

-- 前缀索引（只索引前N个字符，适合长字符串）
CREATE INDEX idx_content ON articles (content(50));

-- 全文索引
CREATE FULLTEXT INDEX idx_content ON articles (content);
```

### ALTER TABLE 建索引

```sql
-- 添加主键
ALTER TABLE users ADD PRIMARY KEY (id);

-- 添加普通索引
ALTER TABLE users ADD INDEX idx_name (name);

-- 添加唯一索引
ALTER TABLE users ADD UNIQUE idx_email (email);
```

### 删除索引

```sql
-- 删除普通/唯一/全文索引
DROP INDEX idx_name ON users;
ALTER TABLE users DROP INDEX idx_name;

-- 删除主键（注意：自增列不能直接删主键）
ALTER TABLE users DROP PRIMARY KEY;
```

### 查看索引

```sql
-- 查看某张表的所有索引
SHOW INDEX FROM users;

-- 从建表语句看索引
SHOW CREATE TABLE users;

-- 查询数据库有哪些索引
SELECT * FROM information_schema.STATISTICS
WHERE TABLE_NAME = 'users';
```

---

```sql
CREATE INDEX idx_name ON users (name); 
```

没有索引时，需要顺序遍历

**时间复杂度：O(n)**  

### 有索引：快速定位

有索引时，MySQL 的做法：

```
1. 去索引里找 25
2. B+树查找：3-4次定位
3. 直接拿到数据位置
4. 读取数据
```

**时间复杂度：O(log n)**  
**100万行数据 → 约3-4次定位**

---

## 三、底层：B+树

**特点：**
1. 所有数据都在**叶子节点**（最下面一层）
2. 非叶子节点只存"路标"（指针）
3. 叶子节点之间用**双向链表**连接
4. 树的高度很低：3-4层能存上亿条数据

### 为什么用 B+树，不用二叉树？

| 数据结构 | 100万数据的高度 | 磁盘I/O次数 |
|---------|---------------|------------|
| 二叉树 | 约20层 | 20次 |
| B+树 | 3-4层 | 3-4次 |

**B+树矮胖，I/O次数少，更适合磁盘存储。**

---

## 四、索引的类型

### 按功能分

| 类型 | 关键字 | 特点 | 例子 | 结构类型 |
|------|--------|------|------| ----- |
| 普通索引 | `INDEX` | 只加速查询 | `INDEX(name)` | 二级索引 |
| 唯一索引 | `UNIQUE` | 加速 + 值不能重复 | `UNIQUE(email)` | 二级索引 |
| 主键索引 | `PRIMARY KEY` | 唯一 + 非空 + 每表一个 | `PRIMARY KEY(id)` | 唯一的聚簇索引 |
| 全文索引 | `FULLTEXT` | 大文本搜索 | `FULLTEXT(content)` | 二级索引 |
| 空间索引 | `SPATIAL` | 地理位置 | `SPATIAL(location)` | 二级索引 |

### 按结构分

聚簇索引：叶子节点存的是整行数据
二级索引：叶子节点存的是主键ID，需要回表

---

## 五、聚簇索引 vs 二级索引（重点！）

聚簇索引（主键索引）

**叶子节点直接存整行数据**。

### 二级索引（普通索引）

```
name索引树：
        ['李']
       /     \
    ['张']   ['王']
    /  \     /  \
  ('张三', id=1) ('李四', id=2) ('王五', id=3)
```
字符串按字符集编码数值比较，中文和英文没有本质区别

**叶子节点存的是 (name, 主键值)**。

### 回表

**先走二级索引，再走主键索引。**

```sql
SELECT * FROM users WHERE name = '张三';
```

执行过程：
1. 走 `name` 索引，找到 `('张三', id=1)`
2. 拿到主键值 `id=1`
3. 再走主键索引，找到整行数据

---

## 六、联合索引

### 联合索引

```sql
CREATE INDEX idx_name_age ON users (name, age);
```
先按 name 排序，name 相同再按 age 排序

```
('张三', 18)
('张三', 25)
('李四', 20)
('李四', 30)
('王五', 22)
```

### 最左前缀走索引原则

| WHERE 条件 | 能否走索引 | 原因 |
|-----------|-----------|------|
| `name = '张三'` | ✅ 能 | 最左列存在 |
| `name = '张三' AND age = 25` | ✅ 能 | 用到了两列 |
| `age = 25` | ❌ 不能 | 跳过了最左列 name |
| `name LIKE '张%'` | ✅ 能 | 前缀匹配 |
| `name LIKE '%三'` | ❌ 不能 | 不是前缀匹配 |

`%三`会进行全表扫描

**联合索引就像电话本，先按姓排，再按名排。只给名不给姓，找不到。**

联合索引不等于两个单独索引，联合索引单独查 `age = 25`时不会走索引，但是两个单独索引肯定会走索引的。

例子：

```sql

SELECT * FROM orders WHERE user_id = 123 AND status = 'paid';

# 建索引
CREATE INDEX idx_user_status ON orders (user_id, status);
```
### 联合索引失效的场景

索引从左到右，遇到第一个范围查询（>、<、>=、<=、BETWEEN、LIKE 'abc%'）后，右边的列就用不上了。

等值查询(= IN)可以继续往右走
---

## 七、什么时候用索引？什么时候不用？

### ✅ 适合建索引

- WHERE 条件经常用的列
- JOIN 连接用的列
- ORDER BY 排序的列
- GROUP BY 分组的列
- 区分度高的列（身份证号 > 性别）

### ❌ 不适合建索引

- 表很小（几千行）
- 频繁写入的表（索引拖慢写入）
- 区分度低的列（性别只有男/女）
- 长文本列（除非前缀索引）

---

## 八、索引失效的常见情况（面试必问）

```sql
-- 1. 对列用了函数
WHERE YEAR(create_time) = 2024  -- ❌
WHERE create_time >= '2024-01-01' AND create_time < '2025-01-01'  -- ✅

-- 2. 隐式类型转换
WHERE phone = 13800138000  -- ❌ phone 是 VARCHAR
WHERE phone = '13800138000'  -- ✅

-- 3. LIKE 以 % 开头
WHERE name LIKE '%张三'  -- ❌
WHERE name LIKE '张三%'  -- ✅

-- 4. OR 连接的条件
WHERE name = '张三' OR age = 25  -- ⚠️ 两边都有索引才走

-- 5. 使用 != 或 <>
WHERE age != 25  -- ❌ 大多数情况不走

-- 6. 使用 IS NULL / IS NOT NULL
WHERE age IS NULL  -- ⚠️ 可能走也可能不走

-- 7. 联合索引没遵守最左前缀
-- 索引 (a,b,c)
WHERE b = 1 AND c = 2  -- ❌ 没用到 a
WHERE a = 1 AND c = 2  -- ⚠️ 只用到 a
WHERE a = 1 AND b = 1 AND c = 1  -- ✅ 全用
```

日期不使用`datetime`, 将年月日拆开存，单独走索引。否则，使用datetime的话，要是单独查询昨天的东西，需要使用函数，函数无法走索引。

```sql

-- ❌ 错误写法（不走索引）
SELECT * FROM orders WHERE DATE(created_at) = CURDATE() - INTERVAL 1 DAY;

-- ✅ 正确写法（走索引）
SELECT * FROM orders 
WHERE created_at >= CURDATE() - INTERVAL 1 DAY
  AND created_at < CURDATE();
```
---

## 九、如何验证索引是否生效？

### 用 EXPLAIN

```sql
EXPLAIN SELECT * FROM users WHERE name = '张三';
```

### 重点看这些列

| 列 | 好 | 坏 | 说明 |
|---|----|----|-----|
| `type` | `ref`, `range`, `const` | `ALL` | ALL 代表全表扫描 |
| `key` | 有索引名 | `NULL` | NULL 代表没用索引 |
| `rows` | 数字小 | 数字大 | 扫描的行数 |
| `Extra` | `Using index` | `Using filesort` | 前者好 |
| `Extra` | - | `Using where` | 代表回表了 |

### type 好坏排序

```
const > ref > range > index > ALL

const：主键/唯一索引等值查询（最快）
ref：普通索引等值查询
range：范围查询
index：遍历整个索引（比 ALL 好一点）
ALL：全表扫描（最慢）
```

---

## 十、覆盖索引（性能优化利器）

**覆盖索引 = 要查的列都在索引里，不需要回表**

```sql
-- 索引：idx_name_age (name, age)

-- 覆盖索引查询（不需要回表）
SELECT name, age FROM users WHERE name = '张三';
-- Extra 显示：Using index

-- 非覆盖索引查询（需要回表）
SELECT * FROM users WHERE name = '张三';
-- Extra 显示：Using index condition（回表了）
```

**覆盖索引的好处**：避免回表，速度快 2-3 倍。

---

## 十一、索引的代价

不是索引越多越好，每个索引都有代价：

| 代价 | 说明 |
|------|------|
| 空间 | 每个索引都占磁盘空间 |
| 写入变慢 | INSERT/UPDATE/DELETE 需要同时更新索引 |
| 维护成本 | 冗余索引需要清理 |

**经验法则：一张表索引不超过 5-6 个。**

---

## 十二、如何设计好索引？

### 三步法

1. **找出核心查询**：哪些 WHERE、JOIN、ORDER BY 最频繁？
2. **选择区分度高的列**：身份证号 > 姓名 > 性别
3. **按最左前缀原则建联合索引**：把区分度高的放左边

### 例子

```sql
-- 常见查询
WHERE name = '张三'
WHERE name = '张三' AND age = 25
ORDER BY created_at

-- 推荐索引
CREATE INDEX idx_name_age ON users (name, age);  -- 覆盖前两个查询
CREATE INDEX idx_created_at ON users (created_at);  -- 覆盖排序
```

---

## 一句话总结

> **索引是 B+树 结构的目录，用 O(log n) 的时间快速定位数据，避免 O(n) 的全表扫描。核心是选对列、遵守最左前缀原则，同时避免索引失效的写法。**

你现在能说出：**为什么 `LIKE '%abc'` 不走索引** 吗？
