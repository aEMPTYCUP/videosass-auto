import os, json, requests

def parse_codex_output(raw):
    """尝试从 JSON 输出中解析文件列表"""
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        files = []
        for part in raw.split("// NEW FILE:"):
            if not part.strip():
                continue
            lines = part.strip().split("\n")
            file_path = lines[0].strip()
            code = "\n".join(lines[1:]).strip()
            if file_path:
                files.append({"file": file_path, "code": code})
        return files

def main():
    api_key = os.environ["DEEPSEEK_API_KEY"]
    title = os.environ["ISSUE_TITLE"]
    body = os.environ["ISSUE_BODY"]

    system_prompt = (
        "你是一个经验丰富的全栈工程师，正在开发 VideoSaaS 项目。\n"
        "请根据下面的任务卡片生成代码。\n"
        "你必须严格按照以下 JSON 数组格式输出，每个元素包含 'file' 和 'code' 字段：\n"
        '[{"file": "relative/path/to/file", "code": "完整文件内容"}]\n'
        "确保 code 字段中的字符串已正确处理引号。"
    )
    user_message = f"任务标题：{title}\n\n任务描述：{body}"

    response = requests.post(
        "https://api.deepseek.com/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        },
        json={
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            "temperature": 0.2
        }
    )
    response.raise_for_status()
    data = response.json()
    content = data["choices"][0]["message"]["content"]

    files = parse_codex_output(content)

    for item in files:
        file_path = item["file"]
        code = item["code"]
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(code)
        print(f"Written {file_path}")

    if "usage" in data:
        print(f"Token usage: {data['usage']}")

if __name__ == "__main__":
    main()
