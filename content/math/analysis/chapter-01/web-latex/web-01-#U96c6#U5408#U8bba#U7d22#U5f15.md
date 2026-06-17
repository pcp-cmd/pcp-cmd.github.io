---
title: 1.1 集合论索引
status: 修订中
room: Math Lab
artifactType: 网页公式笔记
chain: 原始经验 -> 连接 -> 压缩
judgment: 本页负责把集合论第一轮学习压缩成可进入、可复习、可测试的路径。
next: 按顺序完成集合公理、序结构、集合的势，再进入题解和闭卷测试。
---

# 1.1 集合论索引

## 当前诊断

这一章最容易出问题的地方是“符号层级混乱”：把 $x\in A$、$A\subset B$、$R\subset X\times Y$、$f:X\to Y$、$[x]_\sim$、$\sup A$、$\operatorname{card}X$ 混成一类东西。

本章的训练目标不是背概念，而是形成下面的判断链：

$$
\text{定义} \to \text{例子} \to \text{反例} \to \text{证明模板} \to \text{迁移题}.
$$

## 学习顺序

1. `02-集合公理.md`  
   掌握集合、子集、集合运算、关系、映射、等价关系。

2. `03-序结构.md`  
   掌握偏序、全序、上界、最大元、上确界、确界原理。

3. `04-集合的势.md`  
   掌握等势、单射比较、满射比较、Cantor 定理。

4. `05-集合论题解.md`  
   做完题后再看答案。

5. `06-复习卡片与闭卷测试.md`  
   闭卷测试，生成错题卡。

## 最小行动

今天完成三件事：

1. 闭卷写出：

$$
A\subset B \iff \forall x\,(x\in A\Rightarrow x\in B).
$$

2. 证明：

$$
(A\cup B)^c=A^c\cap B^c.
$$

3. 举一个反例说明：

$$
f(A\cap B)=f(A)\cap f(B)
$$

不总成立。

## 训练输出

今天至少留下一个可复用输出：

> 一页证明笔记：子集定义、De Morgan 公式、逆像保交、像不保交反例。

## 保留资产

- Definition Card：子集、映射、等价关系、偏序、上确界、等势。
- Example Card：$\mathbb N$ 与 $2\mathbb N$ 等势。
- Counterexample Card：像不保交、偏序不全序、上确界不等于最大元。
- Proof Card：Cantor 对角线法。

## 反馈检查

如果你能闭卷回答以下四个问题，本章第一轮合格：

1. 为什么 $\varnothing\subset X$？
2. 映射和一般关系的区别是什么？
3. 为什么逆像比像更稳定？
4. 为什么不存在满射 $g:X\to\mathcal P(X)$？

