# 1.1.3 集合的势讲解

## Current Diagnosis

本节的弱点通常是 `transfer ability`：有限集合的直觉会误导无限集合。训练目标是把“数元素个数”的习惯转成“构造双射、单射、满射”。

## 1. 等势

若存在双射 `f:X->Y`，称 `X` 与 `Y` 等势：

```text
card X = card Y.
```

形象例子：每个 `X` 中元素都能安排到唯一一个 `Y` 中位置，且没有空位。

## 2. 无限集合的第一个反直觉

自然数集与偶数集等势：

```text
f:N->2N, f(n)=2n.
```

虽然 `2N` 是 `N` 的真子集，但它们一样大。

结论：无限集合中，真子集不一定更小。

## 3. 势不大于

对非空集合：

```text
card X <= card Y
```

等价于：

```text
存在单射 X->Y
存在满射 Y->X
```

直观：

- 单射 `X->Y`：`Y` 容得下 `X`。
- 满射 `Y->X`：`Y` 覆盖得住 `X`。

## 4. Cantor-Schroder-Bernstein 定理

若

```text
card X <= card Y
card Y <= card X
```

则

```text
card X = card Y.
```

直觉：你能塞进我，我也能塞进你，那我们一样大。

## 5. Cantor 无最大势定理

任意集合 `X` 都满足：

```text
card X < card P(X).
```

核心对角线构造：

```text
X1={x in X : x notin g(x)}.
```

若 `g:X->P(X)` 是满射，则 `X1=g(a)` 对某个 `a` 成立。问 `a in X1` 吗？

- 若 `a in X1`，由定义得 `a notin g(a)=X1`，矛盾。
- 若 `a notin X1`，由定义得 `a in g(a)=X1`，矛盾。

所以没有从 `X` 到 `P(X)` 的满射。

## Minimum Action

今天做：

1. 写出 `N` 到偶数集的双射。
2. 解释为什么“真子集不一定更小”。
3. 复述 Cantor 对角线证明。

## Asset To Keep

保存证明卡：

```text
卡片名：Cantor 对角线法
正面：为什么不存在满射 g:X->P(X)？
背面：构造 X1={x:x notin g(x)}。若 X1=g(a)，则 a in X1 iff a notin X1，矛盾。
```

