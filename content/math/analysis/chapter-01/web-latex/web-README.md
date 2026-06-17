---
title: Obsidian LaTeX 版说明
status: 修订中
room: Math Lab
artifactType: 排版说明
chain: 连接 -> 压缩
judgment: 这页说明集合论笔记如何在 Obsidian 与网页阅读器之间保持公式可读。
next: 继续统一文件名、链接路径和网页公式渲染。
---

# Obsidian LaTeX 版说明

这一目录是 `1.1 集合论` 的 Obsidian/MathJax 友好版本。

## 使用方式

Obsidian 默认支持 MathJax：

- 行内公式：`$x\in A$`
- 块级公式：

```markdown
$$
A\subset B \iff \forall x\,(x\in A\Rightarrow x\in B).
$$
```

建议在 Obsidian 中按以下顺序阅读：

1. `01-集合论索引.md`
2. `02-集合公理.md`
3. `03-序结构.md`
4. `04-集合的势.md`
5. `05-集合论题解.md`
6. `06-复习卡片与闭卷测试.md`

## 排版约定

- 集合用大写字母：$A,B,X,Y$。
- 元素用小写字母：$x,y,u$。
- 幂集写作：$\mathcal P(X)$。
- 空集写作：$\varnothing$。
- 子集写作：$A\subset B$。
- 真子集写作：$A\subsetneq B$。
- 映射写作：$f:X\to Y$。
- 像写作：$f(A)$。
- 逆像写作：$f^{-1}(B)$。

