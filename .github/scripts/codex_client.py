import os, json, requests, re

def parse_codex_output(raw):
    """从 MiniMax 输出中解析文件列表"""
    # 去掉 markdown 代码块包裹
    raw = raw.strip()
    if raw.startswith('```'):
        # 去掉 ```json ... ``` 或 ``` ... ```
        match = re.search(r'```(?:\w+)?\n?(.*?)\n?```', raw, re.DOTALL)
        if match:
            raw = match.group(1).strip()

    try:
        data = json.loads(raw)
        # 处理 JSON 对象（可能是 {"files": [...]} 格式）
        if isinstance(data, dict):
            if "files" in data:
                return data["files"]
            elif "code" in data and "file" in data:
                return [data]
        # 处理数组
        return data
    except json.JSONDecodeError:
        # 降级到 // NEW FILE 解析
        files = []
        for part in raw.split("// NEW FILE:"):
            if not part.strip():
                continue
            lines = part.strip().split("\n")
            file_path = lines[0].strip()
            code = "\n".join(lines[1:]).strip()
            if file_path and code:
                files.append({"file": file_path, "code": code})
        return files

def main():
    api_key = os.environ["MINIMAX_API_KEY"]
    title = os.environ.get("ISSUE_TITLE", "")
    body = os.environ.get("ISSUE_BODY", "")

    system_prompt = (
        "你是一个经验丰富的全栈工程师，正在开发 VideoSaaS 项目。\n"
        "请根据下面的任务卡片生成代码。\n"
        "你必须严格按照以下 JSON 数组格式输出，不要使用 markdown 代码块包裹：\n"
        '[{"file": "relative/path/to/file", "code": "完整文件内容"}]\n'
        "重要：只输出 JSON 数组，不要 ```json 包裹，不要任何其他文字。"
    )
    user_message = f"任务标题：{title}\n\n任务描述：{body}"

    response = requests.post(
        "https://api.minimaxi.com/anthropic/v1/messages",
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        },
        json={
            "model": "MiniMax-M3",
            "max_tokens": 4000,
            "system": system_prompt,
            "messages": [
                {"role": "user", "content": user_message}
            ]
        },
        timeout=120
    )
    response.raise_for_status()
    data = response.json()
    content = data["content"][0]["text"]

    files = parse_codex_output(content)

    if not files:
        print("Error: No files generated")
        print(f"Raw content: {content[:500]}")
        exit(1)

    for item in files:
        file_path = item.get("file", "")
        code = item.get("code", "")
        if not file_path or not code:
            continue
        # 安全检查：禁止路径穿越
        if ".." in file_path or file_path.startswith("/"):
            print(f"Skipping unsafe path: {file_path}")
            continue
        dir_path = os.path.dirname(file_path)
        if dir_path:
            os.makedirs(dir_path, exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(code)
        print(f"Written {file_path}")

    if "usage" in data:
        print(f"Token usage: {data['usage']}")

if __name__ == "__main__":
    main()
