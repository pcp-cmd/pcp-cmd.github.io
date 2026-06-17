# 1.1 集合论题解

本文件覆盖 `1.1.1-1.1.3` 的主要练习与习题。若原题按字面不成立，直接给出反例和修正。

## 1.1.1 集合公理

### 练习：`X intersection Y subset X`，`X\Y subset X`，`emptyset subset X`

证明：

- 若 `u in X intersection Y`，则 `u in X` 且 `u in Y`，故 `u in X`。
- 若 `u in X\Y`，则 `u in X` 且 `u notin Y`，故 `u in X`。
- 空集没有元素，因此不存在 `u in emptyset` 且 `u notin X` 的反例，所以 `emptyset subset X`。

### 练习：若 `mathcal X={A,B}`，证明 `intersection mathcal X=A intersection B`

证明：`u in intersection mathcal X` 当且仅当 `u` 属于 `mathcal X` 中每一个集合，也就是 `u in A` 且 `u in B`。这正是 `u in A intersection B`。

### 练习：交换律与 `{X,Y}={X} union {Y}`

证明：

```text
u in X intersection Y <=> u in X and u in Y <=> u in Y and u in X.
u in X union Y <=> u in X or u in Y <=> u in Y or u in X.
u in {X} union {Y} <=> u=X or u=Y <=> u in {X,Y}.
```

### 练习：`{x,x,y}={x,y}`

证明：任意 `u` 属于左边当且仅当 `u=x` 或 `u=y`，这与属于右边的条件相同。

### 练习：有序组属于哪个集合？

对二元有序对，

```text
(x,y)={{x},{x,y}} in P(P(X union Y)).
```

对 `n` 元有序组，令 `U=X1 union ... union Xn`，通过有限次

```text
E_{k+1}=P(P(E_k union U))
```

可以得到一个足够大的集合容纳递归定义的有序组。

### 练习：选择公理两种表述

按讲义抽取文本，若第二种表述要求对任意可能重叠的集合族存在 `C subset union X_alpha` 且每个 `C intersection X_alpha` 都是单点集，则不总成立。

反例：

```text
X1={a,b}, X2={b,c}, X3={a,c}.
```

不存在一个 `C subset {a,b,c}` 与三者都恰交一个点。

正确等价版本：对两两不交的非空集合族，选择函数与“每个集合恰取一点的集合 C”等价。对一般集合族，可先不交化为 `{alpha} x X_alpha`。

### 练习：等价类要么相等要么不交

若 `[x] intersection [y]` 非空，取 `z` 属于交集。则 `z~x` 且 `z~y`。由对称性和传递性得 `x~y`。于是任取 `u in [x]`，有 `u~x~y`，故 `u in [y]`；反向同理。所以 `[x]=[y]`。

因此若 `[x]!=[y]`，交集为空。又每个 `u in X` 都属于 `[u]`，所以

```text
X = union_{x in X} [x].
```

### 习题 1.1.1.2：有序对相等

设

```text
(x,y)={{x},{x,y}}, (a,b)={{a},{a,b}}.
```

若 `(x,y)=(a,b)`，则二者交集相等，得到 `{x}={a}`，故 `x=a`。再由并集相等 `{x,y}={a,b}` 且 `x=a`，得 `y=b`。反向显然。`n` 元有序组用递归定义和归纳法证明。

### 习题 1.1.1.3：集合恒等式与反例

正确：

```text
A union B=A <=> B subset A.
A intersection B=A <=> A subset B.
(A subset C and B subset C) <=> A union B subset C.
(C subset A and C subset B) <=> C subset A intersection B.
```

按元素展开即可证明。

按字面不成立：

```text
(A subset C or B subset C) <=> A intersection B subset C.
```

反例：`A={1}, B={2}, C=emptyset`。右边真，左边假。

```text
(C subset A or C subset B) <=> C subset A union B.
```

反例：`C={1,2}, A={1}, B={2}`。右边真，左边假。

### 习题 1.1.1.4：交并运算

交换律、结合律都由逻辑中的 `and`、`or` 的交换律和结合律得到。

分配律：

```text
u in X intersection (union_i Y_i)
<=> u in X and exists i, u in Y_i
<=> exists i, u in X intersection Y_i.
```

若指标集非空：

```text
u in X union (intersection_i Y_i)
<=> u in X or forall i, u in Y_i
<=> forall i, u in X union Y_i.
```

### 习题 1.1.1.5：De Morgan

```text
u in (union_i E_i)^c
<=> not exists i, u in E_i
<=> forall i, u in E_i^c
<=> u in intersection_i E_i^c.
```

另一式同理：

```text
u in (intersection_i E_i)^c
<=> exists i, u in E_i^c
<=> u in union_i E_i^c.
```

### 习题 1.1.1.6：直积

1. `X x Y=emptyset` 当且仅当 `X=emptyset` 或 `Y=emptyset`。
2. 若 `X,Y` 非空，`X x Y subset A x B` 当且仅当 `X subset A` 且 `Y subset B`。固定一个 `y0 in Y` 可证 `X subset A`，固定一个 `x0 in X` 可证 `Y subset B`。
3. `(X x Y) union (A x Y)=(X union A) x Y`，逐元素展开。
4. `(X x Y) intersection (A x B)=(X intersection A) x (Y intersection B)`。
5. `(X x Y)\(A x B)=((X\A) x Y) union (X x (Y\B))`，因为 `not(x in A and y in B)` 等价于 `x notin A or y notin B`。

### 习题 1.1.1.7：像与逆像

若 `A subset B`，则 `f(A) subset f(B)`。但 `f(B\A)=f(B)\f(A)` 不一定成立。

反例：`X={1,2}`，`f(1)=f(2)=0`，`A={1}`，`B={1,2}`。则 `f(B\A)={0}`，而 `f(B)\f(A)=emptyset`。

若 `C subset D`，则 `f^{-1}(C) subset f^{-1}(D)`，且

```text
f^{-1}(D\C)=f^{-1}(D)\f^{-1}(C).
```

总有：

```text
A subset f^{-1}(f(A)),
f(f^{-1}(C)) subset C.
```

严格反例：常值映射让第一式严格；若 `C` 含有不在值域中的元素，第二式严格。

### 习题 1.1.1.8：像与逆像对并交

```text
f(union_i A_i)=union_i f(A_i).
f(intersection_i A_i) subset intersection_i f(A_i).
```

第二式严格反例：常值映射 `f:{1,2}->{0}`，`A1={1}`，`A2={2}`。

逆像严格保持：

```text
f^{-1}(union_j B_j)=union_j f^{-1}(B_j).
f^{-1}(intersection_j B_j)=intersection_j f^{-1}(B_j).
```

### 习题 1.1.1.9：单射满射刻画

满射等价于：

```text
forall C subset Y, f(f^{-1}(C))=C.
```

单射等价于：

```text
forall A subset X, f^{-1}(f(A))=A.
forall A,B subset X, f(A intersection B)=f(A) intersection f(B).
forall A subset B subset X, f(B\A)=f(B)\f(A).
```

证明思路：一般包含关系总成立；反向分别用满射取原像、用单射消去 `f(x)=f(a)`。

### 习题 1.1.1.10：复合

结合律：

```text
((h o g) o f)(x)=h(g(f(x)))=(h o (g o f))(x).
```

不交换反例：`f(x)=x+1`，`g(x)=x^2`。则 `f o g=x^2+1`，`g o f=(x+1)^2`。

### 习题 1.1.1.11：双射逆与复合

若 `f:X->Y` 双射，则每个 `y` 有唯一 `x` 使 `f(x)=y`，故逆关系是映射且双射，并满足：

```text
f o f^{-1}=id_Y, f^{-1} o f=id_X.
```

若 `f1:X1->Y`，`f2:Y->X2`，则 `f2 o f1` 是映射且 `(f2 o f1)(x)=f2(f1(x))`。若二者双射，则复合双射，且

```text
(f2 o f1)^{-1}=f1^{-1} o f2^{-1}.
```

### 习题 1.1.1.12：等价关系判断

1. 整数模 `n` 同余是等价关系，等价类为 `[a]={a+nk:k in Z}`。
2. 非零分母整数对按 `xb=ya` 是等价关系，表示相同有理数。
3. 实数上的 `x>=y` 不是等价关系，因为不满足对称性。

### 习题 1.1.1.13：分类与等价关系

分类给出等价关系：`xRy` 当且仅当 `x,y` 属于同一个分类块。自反、对称显然；传递性来自分类块两两不交。

等价关系给出分类：所有等价类非空、覆盖 `X`，且两两相等或不交。

### 习题 1.1.1.14：映射诱导的等价关系

定义 `x~y <=> f(x)=f(y)`。这是等价关系。

等价类：

```text
[x]_f=f^{-1}(f(x)).
```

映射

```text
tilde f:X/~ -> Y, [x]_f |-> f(x)
```

良定义：若 `[x]=[y]`，则 `f(x)=f(y)`。

单射：若 `tilde f([x])=tilde f([y])`，则 `f(x)=f(y)`，所以 `[x]=[y]`。

## 1.1.2 序结构

### 练习：上界与下界不唯一

若 `s` 是上界且 `s preceq t`，则对任意 `a in A`，`a preceq s preceq t`，故 `t` 也是上界。下界对偶。

### 练习：最大元最小元唯一

若 `m1,m2` 都是最大元，则 `m1 preceq m2` 且 `m2 preceq m1`，由反对称性 `m1=m2`。最小元同理。

### 练习：`sup` 与 `max`

```text
max A 存在 <=> sup A 存在且 sup A in A。
```

此时 `max A=sup A`。最小元和下确界对偶。

### 习题 1.1.2.2：偏序判断

1. `R` 上 `<=` 是偏序且全序。
2. `R x R` 上字典序是偏序且全序。
3. 用半径平方比较不是偏序：`(1,0)` 与 `(0,1)` 互相相关但不相等，反对称性失败。
4. `P(M)` 上 `subset` 是偏序；若 `M` 至少两个元素，通常不是全序。

### 习题 1.1.2.3：`{x in Q:x^2<2}` 无最大最小与确界

在 `Q` 中，真正的上确界应是 `sqrt(2)`，下确界应是 `-sqrt(2)`，但二者不是有理数。

无最大元：任取 `q` 满足 `q^2<2`，可取有理数 `r` 使 `q<r<sqrt(2)`，则 `r^2<2` 且 `r>q`。

无最小元同理，在 `-sqrt(2)` 与 `q` 之间取有理数。

若 `s in Q` 是上确界，分 `s^2<2`、`s^2>2`、`s^2=2` 讨论都会矛盾。下确界同理。

### 习题 1.1.2.4：上确界运算

若 `A subset B`，则 `sup B` 是 `A` 的上界，所以

```text
sup A preceq sup B.
```

若 `C subset D`，则

```text
inf C succeq inf D.
```

在一般偏序集中，原题关于 `sup(A union B)` 需要补充相关确界存在。正确说法：

```text
sup(A union B)=sup{sup A,sup B}
```

在右侧存在时成立。下确界式对偶。

`sup` 不能改成 `max`：在 `P({1,2})` 中 `{1}` 与 `{2}` 没有最大元，但上确界是 `{1,2}`。

若 `A intersection B` 非空，则在相关确界存在时：

```text
sup(A intersection B) preceq inf{sup A,sup B}.
```

下确界对偶：

```text
inf(C intersection D) succeq sup{inf C,inf D}.
```

## 1.1.3 集合的势

### 练习 1.1.3.2

`card X < card Y` 蕴含存在 `Y` 的真子集 `Y0` 使 `card X=card Y0`。

反向不成立。取

```text
X=N, Y=N, Y0=2N.
```

则 `Y0` 是 `Y` 的真子集，`card X=card Y0`，但 `card X<card Y` 不成立。

### 习题 1.1.3.2 第 1 问

不成立。

反例：

```text
A=N, B=N, C=N\{0}, D=N.
```

则 `card A=card C`，`card B=card D`，但

```text
B\A=emptyset, D\C={0}.
```

不等势。

### 习题 1.1.3.2 第 2 问

不成立。因为 `A\A=emptyset`，条件只是 `B\A=emptyset`，即 `B subset A`。

反例：

```text
A={1,2}, B={1}.
```

### 习题 1.1.3.2 第 3 问

已知 `A subset B` 且 `card A=card(A union C)`。取双射

```text
h:A union C -> A.
```

定义单射 `F:B union C -> B`：

```text
F(x)=h(x), 若 x in A union C;
F(x)=x, 若 x in B\(A union C).
```

两部分定义域不交，像分别落在 `A` 与 `B\(A union C)`，也不交，所以 `F` 是单射。因此

```text
card(B union C) <= card B.
```

又 `B subset B union C`，故 `card B <= card(B union C)`。由 Cantor-Schroder-Bernstein 定理，

```text
card B=card(B union C).
```

