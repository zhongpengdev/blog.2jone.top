---
title: 整数规划问题
date: 2025-08-03
slug: "integer-programming"
description: "Modeling and solving integer programming problems using the PuLP library in python, demonstrated with a facility location and supply chain optimization case study."
banner: ./yueshu1.jpg
---

## 问题重述

某公司计划在 A、B、C 三个城市中选择若干个或多个建设配送中心，向甲、乙、丙、丁四个地区供货。相关数据如下：

**建设成本：** 城市 A：50 万元，城市 B：60 万元，城市 C：70 万元  

**运输成本：**（元 / 吨，从配送中心到地区）

| 配送中心 | 甲地区 | 乙地区 | 丙地区 | 丁地区 |
|----------|--------|--------|--------|--------|
| A        | 100    | 150    | 200    | 180    |
| B        | 120    | 130    | 170    | 160    |
| C        | 140    | 160    | 150    | 190    |

**需求与产能：**

地区需求量：甲地区：200 吨，乙地区：300 吨，丙地区：150 吨，地区：250 吨，且每个配送中心最大产能为 500 吨（若建设）

**约束条件**

1. 地区的需求必须被完全满足（不能缺货）
2. 若建设城市 B 的配送中心，则必须同时建设城市 A 的（B 依赖 A）
3. 总预算（建设成本 + 运输成本）不超过 300 万元

如何选择配送中心并分配运输量，使总费用（建设 + 运输）最低？

## 建模与求解

**决策变量**

+ x<sub>A</sub>, x<sub>B</sub>, x<sub>C</sub>
表示三地的建设与否，可以抽象为0-1整数规划问题：
    + 0：不建X
    + 1：建设X

+ y<sub>ij</sub> 表示从i(A,B,C)到j(甲 / 乙 / 丙 / 丁)的运输量(吨)

**目标函数**

+ min_z = 50x<sub>A</sub> + 60x<sub>B</sub> + 70x<sub>C</sub> + Σ(运输成本<sub>ij</sub> × y<sub>ij</sub> ) / 10000

**约束条件**

1. 需求量约束
    + y<sub>A甲</sub> + y<sub>B甲</sub> + y<sub>C甲</sub> = 200
    + y<sub>A乙</sub> + y<sub>B乙</sub> + y<sub>C乙</sub> = 300
    + y<sub>A丙</sub> + y<sub>B丙</sub> + y<sub>C丙</sub> = 150
    + y<sub>A丁</sub> + y<sub>B丁</sub> + y<sub>C丁</sub> = 250

2. 产能约束
    ![yueshu](yueshu1.jpg)

3. **AB依赖约束**
    + x<sub>B</sub> \<= x<sub>A</sub> 

4. 总费用约束
    + `min_z <= 300`

`scipy.optimize.linprog`库仅支持线性规划问题的求解，不支持整数规划问题求解，[PuLP官方文档](https://pypi.org/project/PuLP/)全部支持。

```python
import pulp

#create new problem
prob = pulp.LpProblem("配送中心选址", pulp.LpMinimize)

"""
变量 x_ABC
dict定义三个决策变量
cat参数定义二进制变量
"""
x = {
    'A': pulp.LpVariable('A', cat='Binary'),
    'B': pulp.LpVariable('B', cat='Binary'),
    'C': pulp.LpVariable('C', cat='Binary'),
}

"""
变量 y_ij
使用两层循环构建双字典
"""

regions = ['甲', '乙', '丙', '丁']
factories = ['A', 'B', 'C']

y_ij = {}

for factory in factories:
    #初始化每一个i对应的空字典
    y_ij[factory] = {}

    for region in regions:
        #定义y_ij对应的Lp变量
        y_ij[factory][region] = pulp.LpVariable(
            name=f'y_{factory}{region}',
            lowBound=0, #y_ij>=0
            cat='Continuous'
        )
#建造成本
build_cost = 50 * x['A'] + 60 * x['B'] + 70 * x['C']

#单位运输成本
cost_unit = {
    'A': {'甲': 100, '乙': 150, '丙': 200, '丁': 180},
    'B': {'甲': 120, '乙': 130, '丙': 170, '丁': 160},
    'C': {'甲': 140, '乙': 160, '丙': 150, '丁': 190}
}
#总运输成本
transport_cost = 0
for factory in factories:
    for region in regions:
        transport_cost += cost_unit[factory][region] * y_ij[factory][region]
#/万元
transport_cost /= 10000 

#总费用
prob += build_cost + transport_cost

#总需求
demands = {
    '甲': 200,
    '乙': 300,
    '丙': 150,
    '丁': 250
} 

#总需求量约束
for region in regions:
    prob += y_ij['A'][region] + y_ij['B'][region] + y_ij['C'][region] == demands[region] 

#产能约束
for factory in factories:
    prob += y_ij[factory]['甲'] + y_ij[factory]['乙'] + y_ij[factory]['丙'] + y_ij[factory]['丁'] <= 500 * x[factory]

#AB依赖约束
prob += x['B'] <= x['A']

#总费用约束
prob += build_cost + transport_cost <= 300

#默认CBC求解器 关闭日志输出
status = prob.solve(pulp.PULP_CBC_CMD(msg=0))

print(f"最小总费用：{pulp.value(prob.objective):.2f}万元") #目标函数最优值

print("配送中心建设方案：")
for factory in factories:
    is_built = "是" if x[factory].varValue == 1 else "否"
    print(f"是否建设{factory}：{is_built}")

print("运输量分配（吨）：")
for factory in factories:
    if x[factory].varValue == 1:
        print(f"{factory}配送中心：")
        for region in regions:
            print(f"到{region}地区：{round(y_ij[factory][region].varValue)}吨")
```

```text
最小总费用：122.85万元
配送中心建设方案：
是否建设A：是
是否建设B：是
是否建设C：否
运输量分配（吨）：
A配送中心：
到甲地区：200吨
到乙地区：0吨
到丙地区：0吨
到丁地区：200吨
B配送中心：
到甲地区：0吨
到乙地区：300吨
到丙地区：150吨
到丁地区：50吨
```

