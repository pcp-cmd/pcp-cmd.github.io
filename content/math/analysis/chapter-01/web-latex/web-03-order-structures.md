# 1.1.2 集合上的序结构

## 1. 偏序

集合 $X$ 上的关系 $\preceq$ 是偏序，若满足：

$$
\forall x\in X,\ x\preceq x,
$$

$$
(x\preceq y\ \text{且}\ y\preceq x)\Rightarrow x=y,
$$

$$
(x\preceq y\ \text{且}\ y\preceq z)\Rightarrow x\preceq z.
$$

例：$\mathcal P(M)$ 上的包含关系 $\subset$ 是偏序。

## 2. 全序

全序比偏序多一个可比性：

$$
\forall x,y\in X,\quad x\preceq y\ \text{或}\ y\preceq x.
$$

例：$\mathbb R$ 上的通常大小关系 $\le$ 是全序。

反例：$\mathcal P(\{1,2\})$ 上的 $\subset$ 不是全序，因为 $\{1\}$ 与 $\{2\}$ 不可比。

## 3. 上界、下界

设 $\varnothing\ne A\subset X$。

$s\in X$ 是 $A$ 的上界，若：

$$
\forall a\in A,\ a\preceq s.
$$

$t\in X$ 是 $A$ 的下界，若：

$$
\forall a\in A,\ t\preceq a.
$$

## 4. 最大元、最小元

$m$ 是 $A$ 的最大元，若：

$$
m\in A\quad\text{且}\quad \forall a\in A,\ a\preceq m.
$$

$m$ 是 $A$ 的最小元，若：

$$
m\in A\quad\text{且}\quad \forall a\in A,\ m\preceq a.
$$

最大元必须属于集合本身。

例：

$$
\max[0,1]=1.
$$

但 $(0,1)$ 没有最大元。

## 5. 上确界、下确界

上确界是最小的上界：

$$
\sup A:=\min\{s\in X:s\ \text{是}\ A\ \text{的上界}\}.
$$

下确界是最大的下界：

$$
\inf A:=\max\{t\in X:t\ \text{是}\ A\ \text{的下界}\}.
$$

重要关系：

$$
\max A\ \text{存在}\iff \sup A\ \text{存在且}\ \sup A\in A.
$$

此时：

$$
\max A=\sup A.
$$

例：

$$
\sup(0,1)=1,
$$

但 $(0,1)$ 没有最大元。

## 6. 确界原理

一个全序集满足确界原理，指：

> 每个非空且有上界的子集都有上确界。

实数集 $\mathbb R$ 满足确界原理。有理数集 $\mathbb Q$ 不满足。

关键例子：

$$
A=\{x\in\mathbb Q:x^2<2\}.
$$

它在 $\mathbb Q$ 中有上界，但没有 $\mathbb Q$ 中的上确界，因为应有的上确界是 $\sqrt2$，而 $\sqrt2\notin\mathbb Q$。

## 7. 单调映射

若 $(X,\preceq_X)$ 与 $(Y,\preceq_Y)$ 是偏序集，则 $f:X\to Y$ 单调递增，若：

$$
x_1\preceq_X x_2\Rightarrow f(x_1)\preceq_Y f(x_2).
$$

单调递减，若：

$$
x_1\preceq_X x_2\Rightarrow f(x_1)\succeq_Y f(x_2).
$$

## Minimum Action

今天完成：

1. 举一个偏序但非全序的例子。
2. 举一个有上确界但无最大元的例子。
3. 证明最大元若存在则唯一。

