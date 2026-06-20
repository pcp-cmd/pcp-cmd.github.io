# 1.1 集合论题解

## 1. 集合公理部分

### 题 1：证明 $\varnothing\subset X$

按子集定义，需要证明：

$$
\forall u\,(u\in\varnothing\Rightarrow u\in X).
$$

由于不存在 $u\in\varnothing$，所以不存在反例。因此：

$$
\varnothing\subset X.
$$

### 题 2：证明 $X\cap Y\subset X$

任取 $u\in X\cap Y$。由交集定义：

$$
u\in X\quad\text{且}\quad u\in Y.
$$

特别地，$u\in X$。所以：

$$
X\cap Y\subset X.
$$

### 题 3：证明 $X\setminus Y\subset X$

任取 $u\in X\setminus Y$。由差集定义：

$$
u\in X\quad\text{且}\quad u\notin Y.
$$

特别地，$u\in X$。所以：

$$
X\setminus Y\subset X.
$$

### 题 4：证明 De Morgan 公式

证明：

$$
(A\cup B)^c=A^c\cap B^c.
$$

任取 $x$，则：

$$
\begin{aligned}
x\in (A\cup B)^c
&\iff x\notin A\cup B\\
&\iff \neg(x\in A\ \text{或}\ x\in B)\\
&\iff x\notin A\ \text{且}\ x\notin B\\
&\iff x\in A^c\ \text{且}\ x\in B^c\\
&\iff x\in A^c\cap B^c.
\end{aligned}
$$

所以：

$$
(A\cup B)^c=A^c\cap B^c.
$$

同理：

$$
(A\cap B)^c=A^c\cup B^c.
$$

### 题 5：像保并

证明：

$$
f\left(\bigcup_{i\in I}A_i\right)=\bigcup_{i\in I}f(A_i).
$$

任取 $y$：

$$
\begin{aligned}
y\in f\left(\bigcup_{i\in I}A_i\right)
&\iff \exists x\in \bigcup_{i\in I}A_i,\ y=f(x)\\
&\iff \exists i\in I,\ \exists x\in A_i,\ y=f(x)\\
&\iff \exists i\in I,\ y\in f(A_i)\\
&\iff y\in \bigcup_{i\in I}f(A_i).
\end{aligned}
$$

### 题 6：像不一定保交

一般只有：

$$
f(A\cap B)\subset f(A)\cap f(B).
$$

反例：令

$$
X=\{1,2\},\quad Y=\{0\},
$$

且 $f(1)=f(2)=0$。取：

$$
A=\{1\},\quad B=\{2\}.
$$

则：

$$
A\cap B=\varnothing,
$$

所以：

$$
f(A\cap B)=\varnothing.
$$

但：

$$
f(A)=\{0\},\quad f(B)=\{0\},
$$

所以：

$$
f(A)\cap f(B)=\{0\}.
$$

因此：

$$
f(A\cap B)\ne f(A)\cap f(B).
$$

### 题 7：逆像保交

证明：

$$
f^{-1}(C\cap D)=f^{-1}(C)\cap f^{-1}(D).
$$

任取 $x$：

$$
\begin{aligned}
x\in f^{-1}(C\cap D)
&\iff f(x)\in C\cap D\\
&\iff f(x)\in C\ \text{且}\ f(x)\in D\\
&\iff x\in f^{-1}(C)\ \text{且}\ x\in f^{-1}(D)\\
&\iff x\in f^{-1}(C)\cap f^{-1}(D).
\end{aligned}
$$

### 题 8：单射的集合刻画

命题：

$$
f\ \text{是单射}
\iff
\forall A\subset X,\ f^{-1}(f(A))=A.
$$

证明：

一般总有：

$$
A\subset f^{-1}(f(A)).
$$

若 $f$ 单射，任取 $x\in f^{-1}(f(A))$，则存在 $a\in A$ 使：

$$
f(x)=f(a).
$$

由单射性得 $x=a$，所以 $x\in A$。因此：

$$
f^{-1}(f(A))\subset A.
$$

反过来，若对任意 $A\subset X$ 有 $f^{-1}(f(A))=A$，取 $A=\{x\}$。若 $f(x)=f(y)$，则：

$$
y\in f^{-1}(f(\{x\}))=\{x\}.
$$

故 $y=x$，所以 $f$ 是单射。

### 题 9：等价类要么相等要么不交

设 $\sim$ 是 $X$ 上的等价关系。

若：

$$
[x]_\sim\cap [y]_\sim\ne\varnothing,
$$

取：

$$
z\in [x]_\sim\cap [y]_\sim.
$$

则：

$$
z\sim x,\quad z\sim y.
$$

由对称性和传递性可得：

$$
x\sim y.
$$

任取 $u\in [x]_\sim$，则 $u\sim x$，又 $x\sim y$，所以 $u\sim y$，即：

$$
u\in [y]_\sim.
$$

故：

$$
[x]_\sim\subset [y]_\sim.
$$

反向同理，所以：

$$
[x]_\sim=[y]_\sim.
$$

因此两个等价类要么相等，要么不交。

## 2. 序结构部分

### 题 10：最大元若存在则唯一

设 $m_1,m_2$ 都是 $A$ 的最大元。因为 $m_1\in A$ 且 $m_2$ 是最大元，所以：

$$
m_1\preceq m_2.
$$

因为 $m_2\in A$ 且 $m_1$ 是最大元，所以：

$$
m_2\preceq m_1.
$$

由反对称性：

$$
m_1=m_2.
$$

### 题 11：$\sup A$ 与 $\max A$ 的关系

若 $\max A$ 存在，则它是 $A$ 的上界且属于 $A$。任何上界 $s$ 都满足：

$$
\max A\preceq s.
$$

所以：

$$
\sup A=\max A.
$$

反过来，若 $\sup A$ 存在且 $\sup A\in A$，则 $\sup A$ 是属于 $A$ 的上界，所以：

$$
\max A=\sup A.
$$

因此：

$$
\max A\ \text{存在}
\iff
\sup A\ \text{存在且}\ \sup A\in A.
$$

### 题 12：有理数中的缺口

令：

$$
A=\{x\in\mathbb Q:x^2<2\}.
$$

在 $\mathbb Q$ 中，$A$ 有上界，例如 $2$。但它没有上确界。

直观原因：真正的最小上界是 $\sqrt2$，但：

$$
\sqrt2\notin\mathbb Q.
$$

因此 $\mathbb Q$ 不满足确界原理。

## 3. 集合的势部分

### 题 13：$\mathbb N$ 与 $2\mathbb N$ 等势

定义：

$$
f:\mathbb N\to 2\mathbb N,\quad f(n)=2n.
$$

若 $f(m)=f(n)$，则 $2m=2n$，所以 $m=n$。因此 $f$ 是单射。

任取 $y\in 2\mathbb N$，则存在 $n\in\mathbb N$ 使 $y=2n=f(n)$。因此 $f$ 是满射。

所以 $f$ 是双射，故：

$$
\operatorname{card}\mathbb N=\operatorname{card}(2\mathbb N).
$$

### 题 14：真子集等势不推出势更小

命题：

> 若存在 $Y$ 的真子集 $Y_0$ 使 $\operatorname{card}X=\operatorname{card}Y_0$，则 $\operatorname{card}X<\operatorname{card}Y$。

反例：

$$
X=\mathbb N,\quad Y=\mathbb N,\quad Y_0=2\mathbb N.
$$

虽然：

$$
Y_0\subsetneq Y
$$

且：

$$
\operatorname{card}X=\operatorname{card}Y_0,
$$

但：

$$
\operatorname{card}X=\operatorname{card}Y.
$$

所以原命题不成立。

### 题 15：Cantor 无最大势定理

先定义单射：

$$
i:X\to\mathcal P(X),\quad i(x)=\{x\}.
$$

所以：

$$
\operatorname{card}X\le \operatorname{card}\mathcal P(X).
$$

下面证明不存在满射 $g:X\to\mathcal P(X)$。

任给 $g:X\to\mathcal P(X)$，构造：

$$
D=\{x\in X:x\notin g(x)\}.
$$

显然：

$$
D\in\mathcal P(X).
$$

若 $g$ 满射，则存在 $a\in X$ 使：

$$
g(a)=D.
$$

于是：

$$
a\in D
\iff a\notin g(a)
\iff a\notin D.
$$

矛盾。因此 $g$ 不可能满射。

所以：

$$
\operatorname{card}X<\operatorname{card}\mathcal P(X).
$$

