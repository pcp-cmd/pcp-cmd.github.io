# 1.1 集合论复习卡片与闭卷测试

## Definition Cards

### Card 1：子集

正面：`X subset Y` 的定义是什么？

背面：

```text
forall u (u in X => u in Y).
```

例子：`{1} subset {1,2}`。边界例：`emptyset subset X`。

### Card 2：映射

正面：关系什么时候是映射？

背面：`f subset X x Y` 是映射，当且仅当每个 `x in X` 存在唯一 `y in Y` 使 `(x,y) in f`。

### Card 3：等价关系

正面：等价关系的三个条件？

背面：自反、对称、传递。等价关系给出分类，等价类要么相等要么不交。

### Card 4：偏序

正面：偏序的三个条件？

背面：自反、反对称、传递。例：`P(M)` 上的 `subset`。

### Card 5：上确界

正面：`sup A` 是什么？

背面：`A` 的最小上界。它不一定属于 `A`。若 `sup A in A`，则它是 `max A`。

### Card 6：等势

正面：`card X=card Y` 的定义？

背面：存在双射 `X->Y`。

### Card 7：Cantor 定理

正面：为什么 `card X < card P(X)`？

背面：单射 `x |-> {x}` 给出 `card X <= card P(X)`；对任意 `g:X->P(X)`，构造 `{x:x notin g(x)}`，它不在 `g` 的值域中，所以无满射。

## Example Cards

### Card 8：真子集等势

正面：给出真子集与原集合等势的例子。

背面：`N` 与 `2N` 等势，双射 `n |-> 2n`。

### Card 9：偏序非全序

正面：给出偏序但非全序的例子。

背面：`P({1,2})` 上的 `subset`。`{1}` 与 `{2}` 不可比。

### Card 10：像不保交

正面：给出 `f(A intersection B) subsetneq f(A) intersection f(B)` 的例子。

背面：`f:{1,2}->{0}` 常值，`A={1}`，`B={2}`。左边空，右边 `{0}`。

## 闭卷测试

限时：40 分钟。

### 第 1 题

证明：

```text
(A union B)^c = A^c intersection B^c.
```

### 第 2 题

证明：

```text
f^{-1}(C intersection D)=f^{-1}(C) intersection f^{-1}(D).
```

### 第 3 题

判断：若 `f(A intersection B)=f(A) intersection f(B)` 对所有 `A,B subset X` 成立，则 `f` 是单射。证明或反驳。

### 第 4 题

给出一个有上确界但无最大元的集合。

### 第 5 题

证明最大元若存在则唯一。

### 第 6 题

证明 `N` 与偶数集等势。

### 第 7 题

复述 Cantor 无最大势定理证明中的对角线构造。

## 标准答案

### 第 1 题答案

任取 `x`：

```text
x in (A union B)^c
<=> x notin A union B
<=> not(x in A or x in B)
<=> x notin A and x notin B
<=> x in A^c intersection B^c.
```

### 第 2 题答案

```text
x in f^{-1}(C intersection D)
<=> f(x) in C intersection D
<=> f(x) in C and f(x) in D
<=> x in f^{-1}(C) and x in f^{-1}(D)
<=> x in f^{-1}(C) intersection f^{-1}(D).
```

### 第 3 题答案

成立。若 `f(x)=f(y)`，取 `A={x}`，`B={y}`。则 `f(A) intersection f(B)` 非空。由题设，`f(A intersection B)` 非空，因此 `A intersection B` 非空，故 `x=y`。所以 `f` 单射。

### 第 4 题答案

`(0,1)` 在 `R` 中有上确界 `1`，但没有最大元，因为 `1 notin (0,1)`。

### 第 5 题答案

若 `m1,m2` 都是最大元，则 `m1 <= m2` 且 `m2 <= m1`。由反对称性，`m1=m2`。

### 第 6 题答案

定义

```text
f:N->2N, f(n)=2n.
```

它是单射且满射，所以是双射。故 `N` 与偶数集等势。

### 第 7 题答案

要证明不存在满射 `g:X->P(X)`。构造

```text
D={x in X : x notin g(x)}.
```

若 `D=g(a)`，则

```text
a in D <=> a notin g(a)=D,
```

矛盾。因此 `D` 不在 `g` 的值域中，`g` 不是满射。

## Feedback Check

通过标准：

- 第 1、2 题必须写成等价链。
- 第 3 题必须会用单点集 `{x},{y}`。
- 第 4 题必须说明“无最大元”的原因。
- 第 7 题必须写出 `D={x:x notin g(x)}`。

若错 2 题以上，回到对应卡片重做。

