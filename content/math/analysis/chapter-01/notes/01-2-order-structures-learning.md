# 1.1.2 集合上的序结构讲解

## Current Diagnosis

本节主要障碍是 `counterexample block`：初学者容易把“上界、最大元、上确界”当成一个东西。实际训练要靠例子和反例区分。

## 1. 偏序

偏序关系 `preceq` 满足：

```text
自反：x preceq x
反对称：x preceq y 且 y preceq x => x=y
传递：x preceq y 且 y preceq z => x preceq z
```

例子：幂集 `P(M)` 上的包含关系 `subset` 是偏序。

反例：`P({1,2})` 中 `{1}` 与 `{2}` 不可比，所以它不是全序。

## 2. 全序

全序比偏序多可比性：

```text
任意 x,y，要么 x preceq y，要么 y preceq x。
```

实数通常大小关系是全序。

## 3. 上界与最大元

`s` 是 `A` 的上界：

```text
forall a in A, a preceq s.
```

`m` 是 `A` 的最大元：

```text
m in A 且 forall a in A, a preceq m.
```

最大元必须属于 `A`，上界不必属于 `A`。

例子：

```text
A=(0,1)
1 是上界，但不是最大元。
```

## 4. 上确界

上确界是最小的上界：

```text
sup A = min {s : s 是 A 的上界}.
```

例子：

```text
sup(0,1)=1, 但 max(0,1) 不存在。
```

关系：

```text
max A 存在 <=> sup A 存在且 sup A in A。
```

下确界与最小元完全对偶。

## 5. 确界原理

确界原理说：全序集的每个非空有上界子集都有上确界。

实数满足；有理数不满足。

关键例子：

```text
A={x in Q : x^2<2}
```

在 `Q` 中有上界，但没有上确界，因为应有的上确界是 `sqrt(2)`，它不属于 `Q`。

## 6. 单调映射

单调递增：

```text
x1 preceq x2 => f(x1) preceq f(x2).
```

单调递减：

```text
x1 preceq x2 => f(x1) succeq f(x2).
```

## Minimum Action

今天做：

1. 给出一个偏序但非全序的例子。
2. 给出一个有上确界但无最大元的集合。
3. 证明最大元若存在则唯一。

## Asset To Keep

保存反例卡：

```text
卡片名：上确界不等于最大元
正面：给出有上确界但无最大元的集合。
背面：(0,1) 在 R 中 sup=1，但 1 不属于集合，所以 max 不存在。
```

