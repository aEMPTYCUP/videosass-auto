import os, subprocess, requests, json, tempfile, re

def truncate_diff(diff, max_chars=100000):
    if len(diff) <= max_chars:
        return diff
    return diff[:max_chars] + "\n\n... (diff truncated, too large)"

def extract_text_from_content(content_list):
    """从 MiniMax 返回的 content 中提取纯文本"""
    result = []
    for item in content_list:
        if isinstance(item, dict):
            if item.get("type") == "text":
                result.append(item.get("text", ""))
            # 忽略 thinking 类型
    return "\n".join(result)

def main():
    api_key = os.environ["MINIMAX_API_KEY"]
    pr_number = os.environ["PR_NUMBER"]

    diff = subprocess.check_output(["gh", "pr", "diff", pr_number], text=True)
    diff_content = truncate_diff(diff)

    with open("CLAUDE_REVIEW.md", "r", encoding="utf-8") as f:
        review_guide = f.read()

    system_prompt = (
        "你是一名资深安全架构师和代码审查员。请根据以下规范审查 Pull Request，"
        "并输出详细的审查意见（使用中文 Markdown 格式）。"
        f"审查规范：\n{review_guide}"
    )

    response = requests.post(
        "https://api.minimaxi.com/anthropic/v1/messages",
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        },
        json={
            "model": "MiniMax-M2.7",
            "max_tokens": 2000,
            "system": system_prompt,
            "messages": [
                {"role": "user", "content": f"请审查以下 PR diff：\n\n{diff_content}"}
            ]
        },
        timeout=120
    )
    response.raise_for_status()
    data = response.json()

    # 提取纯文本内容（跳过 thinking）
    content = extract_text_from_content(data.get("content", []))

    if not content:
        print("Error: No text content in response")
        print(f"Raw content: {data.get('content')}")
        exit(1)

    # 写入临时文件避免 shell 转义
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False, encoding="utf-8") as f:
        f.write(content)
        tmp_path = f.name

    subprocess.run(["gh", "pr", "review", pr_number, "--body-file", tmp_path], check=True)
    os.unlink(tmp_path)

    resp_data = response.json()
    print(f"MiniMax API usage: {resp_data.get('usage', 'N/A')}")

if __name__ == "__main__":
    main()
