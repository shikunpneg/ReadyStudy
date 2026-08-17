# Git 提交规范（Conventional Commits）

格式：`<type>(<scope>): <subject>`

## type
- `feat`     新功能
- `fix`      修复 bug
- `docs`     文档
- `style`    格式（不影响代码运行）
- `refactor` 重构
- `perf`     性能
- `test`     测试
- `chore`    构建/工具
- `build`    构建系统
- `ci`       CI 配置

## scope（按需选用）
`auth` `upload` `quiz` `mindmap` `dashboard` `ui` `db` `ai` `deps` `reader` `notes`

## 示例
```
feat(quiz): 新增填空题答题组件
fix(upload): 修复大 PDF 切片越界
docs(readme): 补充部署步骤
chore(deps): 升级 Next.js 至 15.1
```

## 分支
- `main`     生产，Vercel 自动部署
- `dev`      开发集成
- `feat/*`   功能分支 → PR 到 dev
- `fix/*`    修复分支 → PR 到 dev

每次提交前：
1. `git pull origin dev`
2. `git checkout -b feat/xxx`
3. 改完后 `git add . && git commit -m "feat(xxx): ..."`
4. `git push origin feat/xxx`
5. 在 GitHub 上提 PR 到 dev