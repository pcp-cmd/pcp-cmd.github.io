# 1.1.3 集合的势

## 1. 等势

若存在双射 $f:X\to Y$，则称 $X$ 与 $Y$ 等势，记作：

$$
\operatorname{card}X=\operatorname{card}Y.
$$

形象理解：$X$ 中每个元素与 $Y$ 中每个元素可以一一配对，没有遗漏，也没有重复。

## 2. 无限集合的反直觉

自然数集 $\mathbb N$ 与偶数集

$$
2\mathbb N:=\{2n:n\in\mathbb N\}
$$

等势。双射为：

$$
f:\mathbb N\to 2\mathbb N,\quad f(n)=2n.
$$

所以无限集合可以和自己的真子集等势。

## 3. 势不大于

定义：

$$
\operatorname{card}X\le \operatorname{card}Y
$$

表示 $X$ 与 $Y$ 的某个子集等势。

对非空集合，以下等价：

$$
\operatorname{card}X\le \operatorname{card}Y,
$$

$$
\exists\ \text{单射}\ f:X\to Y,
$$

$$
\exists\ \text{满射}\ g:Y\to X.
$$

直观：

- 单射 $X\to Y$：$Y$ 容得下 $X$。
- 满射 $Y\to X$：$Y$ 覆盖得住 $X$。

## 4. Cantor--Schroder--Bernstein 定理

若：

$$
\operatorname{card}X\le \operatorname{card}Y
$$

且：

$$
\operatorname{card}Y\le \operatorname{card}X,
$$

则：

$$
\operatorname{card}X=\operatorname{card}Y.
$$

直观：如果 $X$ 能嵌入 $Y$，$Y$ 也能嵌入 $X$，那么二者一样大。

## 5. Cantor 无最大势定理

对任意集合 $X$：

$$
\operatorname{card}X<\operatorname{card}\mathcal P(X).
$$

先有单射：

$$
i:X\to\mathcal P(X),\quad i(x)=\{x\}.
$$

所以：

$$
\operatorname{card}X\le \operatorname{card}\mathcal P(X).
$$

接着证明不存在满射 $g:X\to\mathcal P(X)$。

给定任意 $g:X\to\mathcal P(X)$，构造：

$$
D:=\{x\in X:x\notin g(x)\}.
$$

若 $g$ 是满射，则存在 $a\in X$ 使得：

$$
g(a)=D.
$$

于是：

$$
a\in D
\iff a\notin g(a)
\iff a\notin D.
$$

矛盾。所以 $g$ 不可能满射。

## 6. 本节反例

命题：

> 若存在 $Y$ 的真子集 $Y_0$ 使 $\operatorname{card}X=\operatorname{card}Y_0$，则 $\operatorname{card}X<\operatorname{card}Y$。

这是假的。

反例：

$$
X=\mathbb N,\quad Y=\mathbb N,\quad Y_0=2\mathbb N.
$$

虽然 $Y_0\subsetneq Y$ 且 $\operatorname{card}X=\operatorname{card}Y_0$，但：

$$
\operatorname{card}X=\operatorname{card}Y.
$$

## Minimum Action

今天完成：

1. 写出 $\mathbb N$ 到 $2\mathbb N$ 的双射。
2. 解释为什么无限集合的真子集可能一样大。
3. 闭卷写出 Cantor 对角线构造：

$$
D=\{x\in X:x\notin g(x)\}.
$$

