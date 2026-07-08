import os, subprocess, requests, json, tempfile

def truncate_diff(diff, max_chars=100000):
    if len(diff) <= max_chars:
        return diff
    return diff[:max_chars] + "\n\n... (diff truncated, too large)"

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
                {"role": "user", "content": diff_content}
            ]
        }
    )
    response.raise_for_status()
    review_content = response.json()["content"][0]["text"]

    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False, encoding="utf-8") as f:
        f.write(review_content)
        tmp_path = f.name

    subprocess.run(["gh", "pr", "review", pr_number, "--body-file", tmp_path], check=True)
    os.unlink(tmp_path)

    resp_data = response.json()
    print(f"Claude API usage: {resp_data.get('usage', 'N/A')}")

if __name__ == "__main__":
    main()
