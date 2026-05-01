---
title: Why LangChain
date: 2026-01-23
slug: "why-langchain"
description: "Building AI Agents with LangChain: Implementing Function Calling and Tool use for business logic integration."
---

## 怎么让 AI 理解业务需求？

场景：用户在购物商城询问AI需要快速查询`小米15pro`这款手机的价格，AI需要查询数据库并拿到商品信息并返回前端，这时单纯调用AI模型的接口显然是不行的，AI无法访问你的数据库，更无从谈起信息获取了，那么，怎么让AI访问我们的实际业务呢？

再有就是，用户发出指令“请帮我生成一张小猫的图片”，那么这时你如何根据用户的指定生图需求去调用生图接口呢？如何和普通文本问答灵活区分？

这些问题就引出了这篇文章的主角，LangChian。上述问题的解决关键就在于把不同的业务逻辑包装成"Function Tool"，让 AI 自己决定什么时候调用哪个工具。

### 举个例子：查账单

```python
from langchain_core.tools import tool

@tool
async def query_unpaid_bills(status: int = 0) -> str:
    """
    查询用户当前所有的代缴账单记录。
    参数: status: 0 (代缴)
    """
    try:
        # 获取业务数据
        data = await http_client.get("/api/property-fee/bills", params={"status": status})
        return json.dumps(data, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)}, ensure_ascii=False)
```

就这么简单。加个 `@tool` 装饰器，写清楚 docstring，AI 就知道这个函数是干嘛的了。

用户说"我有哪些待缴费用"，AI 会：
1. 理解意图：用户想查账单
2. 选工具：调用 `query_unpaid_bills`
3. 拿结果：解析返回的 jsON
4. 回复：用自然语言告诉用户

### 智能天气查询

AI没有记忆，没有时间概念，不能联网，也不知道用户位置，如果你的AI想加入一个功能，要让AI能实时查询用户的当地天气，或者一些类似的需求，
那么很简单啦，核心不就是上述的Function Tool调用公共API嘛：

```python
@tool
async def get_weather(city: str = "") -> str:
    """获取城市天气，参数city为空时默认查询当前ip地址的城市天气"""
    if city == "":
        # 获取用户 IP
        ip_data = await http_client.get("/api/user/ip")
        ip = ip_data.get("data")
        
        # IP 定位城市
        city_data = await _external_get(f"https://api.52vmy.cn/api/query/itad?ip={ip}")
        city = city_data.get("data").get("address").split(" ")[0]
    
    # 查天气
    weather = await _external_get(f"https://api.52vmy.cn/api/query/tian?city={city}")
    return json.dumps(weather, ensure_ascii=False)
```

用户不说城市，AI 会自动通过 IP 模糊定位。这种智能化的处理，以前得写一堆 if-else，现在 AI 自己就能搞定。

### 文生图

如果想实现类似ChatGPT那样的用户不用显式选择问生图功能，而是直接在文本框中键入“我需要生成一张小猫的图片”，那么如何实现灵活调用呢？核心还是Function Tool Calling：

```python
@tool
import os
import json
import asyncio
import aiohttp
from typing import Optional
from langchain_core.tools import tool
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("API_KEY")
CREATE_TEXT_URL = os.getenv("QWEN_CREATE_TEXT_URL")
GET_RESULT_URL = os.getenv("QWEN_GET_RESULT_URL")


@tool
async def generate_image_from_text(
    prompt: str, size: Optional[str] = "1024*1024", n: Optional[int] = 1
) -> str:
    """
    根据文本描述生成图片.

    Args:
        prompt: 图片描述提示词
        size: 图片尺寸, 默认为 "1024*1024". 可选值: "1024*1024", "720*1280", "1280*720"
        n: 生成数量, 默认为 1 (API限制通常为1-4)

    Returns:
        生成的图片URL的jsON字符串
    """
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
    }

    payload = {
        "model": "wanx-v1",
        "input": {"prompt": prompt},
        "parameters": {"style": "<auto>", "size": size, "n": n},
    }

    try:
        async with aiohttp.Clientsession() as session:
            # 提交任务
            async with session.post(
                CREATE_TEXT_URL, headers=headers, json=payload
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    return json.dumps(
                        {
                            "success": False,
                            "error": "API Error",
                            "message": f"Failed to submit task. Status: {response.status}",
                            "detail": error_text,
                        },
                        ensure_ascii=False,
                    )

                result = await response.json()
                if "output" not in result or "task_id" not in result["output"]:
                    return json.dumps(
                        {
                            "success": False,
                            "error": "Invalid Response",
                            "message": "Task ID not found in response",
                            "detail": result,
                        },
                        ensure_ascii=False,
                    )

                task_id = result["output"]["task_id"]
                print(f"Image generation task submitted. Task ID: {task_id}")

            # 轮询结果
            task_status = "PENDING"
            wait_time = 1
            max_retries = 30  # 30 * (1~2s) approx 60s max wait

            for attempt in range(max_retries):
                await asyncio.sleep(wait_time)

                check_url = f"{GET_RESULT_URL}/{task_id}"
                async with session.get(check_url, headers=headers) as check_response:
                    if check_response.status != 200:
                        continue

                    check_result = await check_response.json()

                    if "output" in check_result:
                        task_status = check_result["output"]["task_status"]

                        if task_status == "SUCCEEDED":
                            # 返回结果
                            # result format: output: { task_status: "SUCCEEDED", results: [ { url: "..." } ] }
                            if "results" in check_result["output"]:
                                return json.dumps(
                                    {
                                        "success": True,
                                        "task_id": task_id,
                                        "images": check_result["output"]["results"],
                                    },
                                    ensure_ascii=False,
                                )
                            else:
                                return json.dumps(
                                    {
                                        "success": False,
                                        "error": "No Results",
                                        "message": "Task succeeded but no image results found.",
                                    },
                                    ensure_ascii=False,
                                )

                        elif task_status == "FAILED":
                            return json.dumps(
                                {
                                    "success": False,
                                    "error": "Generation Failed",
                                    "message": check_result["output"].get(
                                        "message", "Unknown error"
                                    ),
                                },
                                ensure_ascii=False,
                            )

            return json.dumps(
                {
                    "success": False,
                    "error": "Timeout",
                    "message": "Image generation timed out.",
                },
                ensure_ascii=False,
            )

    except Exception as e:
        return json.dumps(
            {"success": False, "error": "Exception", "message": str(e)},
            ensure_ascii=False,
        )

```

用户说"帮我生成一张夕阳下的海滩"，AI 会：
1. 识别这是生图需求
2. 调用 `generate_image_from_text`
3. 提交任务并轮询结果
4. 返回图片 URL 给用户 

这里的需求实际上更复杂一些，包括图片的另存储等步骤，具体可参考千问文生图的一些细节说明。

## 细节

### 工具管理

所有工具统一在 `app/tools/__init__.python` 导出：

```python
from app.tools.community.bills_tools import query_unpaid_bills
from app.tools.community.notification_tools import get_user_notifications
from app.tools.api.weather_tools import get_weather
from app.tools.others.search import web_search, wikipedia_search
# ...

all_tools = [
    query_unpaid_bills,
    get_user_notifications,
    web_search,
    get_weather,
    ...
]
```

新加功能就往这个列表里塞，不用改其他地方。

### Agent 初始化

使用 LangGraph 的 `create_react_agent` 构建 Agent：

```python
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import InMemorySaver
from app.tools import all_tools

# 初始化 LLM
llm = ChatOpenAI(
    api_key=API_KEY,
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
    model="qwen-plus",
    temperature=0,
    streaming=True,  # 开启流式输出
)

# 创建 checkpointer（会话记忆）
checkpointer = InMemorySaver()

# 创建 Agent
agent_executor = create_react_agent(
    llm, 
    all_tools, 
    checkpointer=checkpointer
)
```

**关键配置：**

1. **LLM 配置**
   - `streaming=True`：开启流式输出，实时返回生成的文本
   - `temperature=0`：确保输出稳定，适合工具调用场景

2. **Checkpointer（会话记忆）**
   - 使用 `InMemorySaver` 保存对话历史
   - 每个用户会话通过 `thread_id` 隔离
   - 支持多轮对话上下文

3. **运行配置**
```python
config = {
    "recursion_limit": 50,  # 最大递归次数，防止死循环
    "configurable": {
        "thread_id": f"{user_id}_{session_id}",  # 会话标识
        "checkpoint_ns": "agent_stream_service",  # 命名空间
    },
}
```

**ReAct 工作流程：**
- **Re**asoning（推理）：分析用户意图
- **Act**ing（行动）：选择并调用工具
- **Observation**（观察）：处理工具返回结果
- 循环迭代，直到完成任务

### 流式输出

用 WebSocket 做实时推送：

```python
async def get_agent_response_stream(user_id: str, session_id: int, user_input: str):
    await manager.send_status(user_id, "thinking", {"message": "正在思考..."})
    
    async for event in agent_executor.astream_events(
        {"messages": input_message},
        version="v1",
        config=config,
    ):
        kind = event["event"]
        
        if kind == "on_chat_model_stream":
            # 流式输出文本
            content = event["data"]["chunk"].content
            if content:
                await manager.send_text_chunk(user_id, content, is_final=False)
        
        elif kind == "on_tool_start":
            # 工具开始调用
            tool_name = event["name"]
            await manager.send_status(user_id, "tool_calling", {
                "tool": tool_name,
                "message": "正在查询账单..."
            })
        
        elif kind == "on_tool_end":
            # 工具调用完成
            await manager.send_status(user_id, "tool_completed", {...})
```

用户能实时看到 AI 在干什么，不用傻等。


## 小结

LangChain 提供了一套把 AI 和业务系统连起来的方法论。结合 Function Calling，以及LangGraph的会话记忆功能，AI 自己就能决定该干什么，对于一个完善的AI智能体来说是必不可少的。

项目地址：[lavanceeee/communitys-agent-banked-python](https://github.com/lavanceeee/communitys-agent-banked-python)

技术栈：FastAPI · LangChain · LangGraph · 通义千问 · WebSocket

