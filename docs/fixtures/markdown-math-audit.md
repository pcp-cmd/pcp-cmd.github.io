# Markdown 与数学回归样文

此文件仅供自动化检查；通过请求拦截送入阅读器，不加入正式 Writing 与公开索引。

## 四种数学分隔符

美元行内：$a_1+b_2=c_3$。

圆括号行内：\(p_i+q_j=r_k\)。

美元块级与集合花括号：

$$
\{x\in A:x>0\}
$$

方括号块级：

\[
\sum_{i=1}^{n}x_i^2
\]

## 多行数学

$$
\begin{aligned}
a_i+b_j&=c_k\\
d_l-e_m&=f_n
\end{aligned}
$$

$$
\begin{pmatrix}
1&2\\
3&4
\end{pmatrix}
$$

## Markdown 结构

这一段有 **加粗文字**、*强调文字*，以及[同页链接](#markdown-test-anchor)。

- 列表第一项
- 列表第二项含 $u_1+v_2$。

| 列名 | 内容 |
| --- | --- |
| 数学 | $t_1+t_2$ |
| 文字 | 正常单元格 |

### 子标题

<span id="markdown-test-anchor">链接目标</span>

## 代码保持原样

行内代码：`$not_math$`、`\(not_math\)`、`:::proof`。

```text
$$not_math$$
\[not_math\]
:::proof
**这是字面示例**
:::
```

## Callout 内的 Markdown 与数学

:::proof
**关键一步**

- Callout 第一项
- Callout 第二项含 $P\subseteq Q$。

结论是 \(\{1,2\}\subseteq\mathbb{N}\)。
:::

## 安全过滤

<script>window.__markdownMathUnsafe = 'script';</script>
<img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="安全过滤探针" onerror="window.__markdownMathUnsafe='image'" onload="window.__markdownMathUnsafe='image'">
<a href="javascript:window.__markdownMathUnsafe='link'">危险链接</a>
<iframe srcdoc="<script>parent.__markdownMathUnsafe='frame'</script>"></iframe>
