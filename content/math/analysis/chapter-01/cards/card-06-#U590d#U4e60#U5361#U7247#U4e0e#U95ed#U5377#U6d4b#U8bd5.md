# 1.1 集合论复习卡片与闭卷测试

## Definition Cards

### Card 1：子集

正面：$A\subset B$ 的定义是什么？

背面：

$$
A\subset B \iff \forall x\,(x\in A\Rightarrow x\in B).
$$

### Card 2：映射

正面：关系 $f\subset X\times Y$ 什么时候是映射？

背面：

$$
\forall x\in X,\ \exists! y\in Y,\ (x,y)\in f.
$$

### Card 3：等价关系

正面：等价关系的三个条件是什么？

背面：

$$
x\sim x,
$$

$$
x\sim y\Rightarrow y\sim x,
$$

$$
(x\sim y\ \text{且}\ y\sim z)\Rightarrow x\sim z.
$$

### Card 4：偏序

正面：偏序的三个条件是什么？

背面：自反、反对称、传递。

$$
x\preceq x,
$$

$$
(x\preceq y\ \text{且}\ y\preceq x)\Rightarrow x=y,
$$

$$
(x\preceq y\ \text{且}\ y\preceq z)\Rightarrow x\preceq z.
$$

### Card 5：上确界

正面：$\sup A$ 是什么？

背面：$\sup A$ 是 $A$ 的最小上界：

$$
\sup A=\min\{s:s\ \text{是}\ A\ \text{的上界}\}.
$$

### Card 6：等势

正面：$\operatorname{card}X=\operatorname{card}Y$ 的定义是什么？

背面：存在双射：

$$
f:X\to Y.
$$

### Card 7：Cantor 对角线法

正面：为什么不存在满射 $g:X\to\mathcal P(X)$？

背面：构造：

$$
D=\{x\in X:x\notin g(x)\}.
$$

若 $D=g(a)$，则：

$$
a\in D\iff a\notin D,
$$

矛盾。

## Counterexample Cards

### Card 8：真子集不一定更小

$$
2\mathbb N\subsetneq\mathbb N,
$$

但：

$$
\operatorname{card}(2\mathbb N)=\operatorname{card}\mathbb N.
$$

双射：

$$
n\mapsto 2n.
$$

### Card 9：像不保交

令 $f:\{1,2\}\to\{0\}$ 为常值映射。取：

$$
A=\{1\},\quad B=\{2\}.
$$

则：

$$
f(A\cap B)=\varnothing,
$$

但：

$$
f(A)\cap f(B)=\{0\}.
$$

### Card 10：偏序不一定全序

在 $\mathcal P(\{1,2\})$ 中：

$$
\{1\}\not\subset \{2\},
$$

且：

$$
\{2\}\not\subset \{1\}.
$$

所以包含关系是偏序，但不是全序。

## 闭卷测试

限时：40 分钟。

### 第 1 题

证明：

$$
(A\cup B)^c=A^c\cap B^c.
$$

### 第 2 题

证明：

$$
f^{-1}(C\cap D)=f^{-1}(C)\cap f^{-1}(D).
$$

### 第 3 题

判断并证明：

$$
\bigl[\forall A,B\subset X,\ f(A\cap B)=f(A)\cap f(B)\bigr]
\iff
f\ \text{是单射}.
$$

### 第 4 题

给出一个有上确界但无最大元的集合。

### 第 5 题

证明最大元若存在则唯一。

### 第 6 题

证明 $\mathbb N$ 与 $2\mathbb N$ 等势。

### 第 7 题

证明不存在满射：

$$
g:X\to\mathcal P(X).
$$

## Feedback Check

合格标准：

1. 第 1、2 题能写出完整等价链。
2. 第 3 题能用单点集 $\{x\},\{y\}$ 证明单射。
3. 第 7 题能独立构造：

$$
D=\{x\in X:x\notin g(x)\}.
$$

若错两题以上，回到对应卡片重练。

