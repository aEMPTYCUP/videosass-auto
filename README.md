# VideoSaaS 全自动化协作方案

> DeepSeek (代码生成) + MiniMax (PR 审查) + GitHub Actions

## 流水线

```
[Issue + codex-task 标签]
         │
         ▼
[DeepSeek Codex 生成代码]
         │
         ▼
[自动创建 PR]
         │
         ▼
[CI Lint 检查]
         │
         ▼
[ready-for-review 标签]
         │
         ▼
[MiniMax Claude 审查]
         │
         ▼
[Gate3 人工合并]
```

## 配置 Secrets

在 Settings → Secrets and variables → Actions 中添加：

| Secret 名 | 说明 |
|-----------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API Key |
| `MINIMAX_API_KEY` | MiniMax API Key |
