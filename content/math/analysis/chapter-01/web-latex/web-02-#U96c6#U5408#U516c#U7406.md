# 1.1.1 集合公理

## 1. 外延公理

外延公理说：集合由它的元素完全决定。

$$
\bigl(\forall u\,(u\in X\Leftrightarrow u\in Y)\bigr)\Rightarrow X=Y.
$$

因此证明集合相等最常用的方法是“双包含法”：

$$
X=Y \iff (X\subset Y \ \text{且}\ Y\subset X).
$$

## 2. 子集

定义：

$$
X\subset Y \iff \forall u\,(u\in X\Rightarrow u\in Y).
$$

形象理解：$X$ 是小袋子，$Y$ 是大袋子。若小袋子里每张卡片都在大袋子里，则 $X\subset Y$。

边界例：

$$
\varnothing\subset X.
$$

原因：空集没有元素，所以不存在一个 $u\in\varnothing$ 但 $u\notin X$ 的反例。

## 3. 配对公理与有序对

配对公理保证任意两个对象 $x,y$ 可以组成集合：

$$
\{x,y\}.
$$

集合没有顺序：

$$
\{x,y\}=\{y,x\}.
$$

为了表达顺序，定义 Kuratowski 有序对：

$$
(x,y):=\bigl\{\{x\},\{x,y\}\bigr\}.
$$

它满足：

$$
(x,y)=(a,b)\iff x=a\ \text{且}\ y=b.
$$

## 4. 分离公理

分离公理允许从已有集合 $X$ 中筛选元素：

$$
\{u\in X:\varphi(u)\}.
$$

关键是必须先有大集合 $X$。这避免了 Russell 悖论式的危险构造：

$$
\{x:x\notin x\}.
$$

## 5. 交、差、空集

由分离公理可定义：

$$
X\cap Y:=\{u\in X:u\in Y\},
$$

$$
X\setminus Y:=\{u\in X:u\notin Y\},
$$

$$
\varnothing:=X\setminus X.
$$

## 6. 并集公理

若 $\mathcal X$ 是一个集合族，则

$$
\bigcup\mathcal X:=\{u:\exists A\in\mathcal X,\ u\in A\}.
$$

若 $\mathcal X=\{A,B\}$，则

$$
\bigcup\mathcal X=A\cup B.
$$

## 7. 幂集公理

幂集定义为：

$$
\mathcal P(X):=\{u:u\subset X\}.
$$

例：

$$
\mathcal P(\{1,2\})=\{\varnothing,\{1\},\{2\},\{1,2\}\}.
$$

## 8. 直积、关系、映射

直积：

$$
X\times Y:=\{(x,y):x\in X,\ y\in Y\}.
$$

关系：

$$
R\subset X\times Y.
$$

映射是特殊关系。$f\subset X\times Y$ 是从 $X$ 到 $Y$ 的映射，记作 $f:X\to Y$，当且仅当：

$$
\forall x\in X,\ \exists! y\in Y,\ (x,y)\in f.
$$

其中 $\exists!$ 表示“存在唯一”。

## 9. 单射、满射、双射

单射：

$$
f(x_1)=f(x_2)\Rightarrow x_1=x_2.
$$

满射：

$$
\forall y\in Y,\ \exists x\in X,\ f(x)=y.
$$

双射：既是单射又是满射。

## 10. 像与逆像

若 $A\subset X$，则 $A$ 的像为：

$$
f(A):=\{y\in Y:\exists x\in A,\ y=f(x)\}.
$$

若 $B\subset Y$，则 $B$ 的逆像为：

$$
f^{-1}(B):=\{x\in X:f(x)\in B\}.
$$

核心规律：

$$
f\left(\bigcup_i A_i\right)=\bigcup_i f(A_i),
$$

但一般只有：

$$
f\left(\bigcap_i A_i\right)\subset \bigcap_i f(A_i).
$$

逆像更稳定：

$$
f^{-1}\left(\bigcup_j B_j\right)=\bigcup_j f^{-1}(B_j),
$$

$$
f^{-1}\left(\bigcap_j B_j\right)=\bigcap_j f^{-1}(B_j).
$$

## 11. 等价关系

集合 $X$ 上的关系 $\sim$ 是等价关系，若满足：

$$
x\sim x,
$$

$$
x\sim y\Rightarrow y\sim x,
$$

$$
(x\sim y\ \text{且}\ y\sim z)\Rightarrow x\sim z.
$$

等价类：

$$
[x]_\sim:=\{y\in X:y\sim x\}.
$$

商集：

$$
X/{\sim}:=\{[x]_\sim:x\in X\}.
$$

等价关系就是一种分类规则。等价类要么相等，要么不交。

## Minimum Action

今天完成：

1. 闭卷写出 $X\subset Y$ 的定义。
2. 证明 $X\cap Y\subset X$。
3. 举例说明 $\{x\}$ 和 $x$ 不是同一层级的对象。

