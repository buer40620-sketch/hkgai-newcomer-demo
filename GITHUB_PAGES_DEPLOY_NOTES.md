# 港话通本地 Demo GitHub Pages 发布说明

更新时间：2026-07-22

## 1. 推荐方式

当前 Demo 是零依赖静态前端，最方便的同步方式是上传到 GitHub 仓库，并开启 GitHub Pages。

优点：

- 队友只需要打开一个网址。
- 不需要队友安装 Node 或运行本地服务。
- 当前 `index.html`、`src/main.js`、`src/styles.css` 和 `src/data/*.json` 可以直接由 Pages 托管。

## 2. 需要上传的文件

最小需要：

```text
index.html
src/
package.json
server.mjs
.gitignore
Docs/PROJECT_WORKFLOW_RULES.md
Docs/GITHUB_PAGES_DEPLOY_NOTES.md
```

其中 `package.json` 和 `server.mjs` 是本地预览用；GitHub Pages 真正访问时主要使用 `index.html` 和 `src/`。

不要上传：

```text
node_modules/
outputs/
*.zip
.env
```

这些已经写入 `.gitignore`。

## 3. GitHub Pages 设置

仓库推到 GitHub 后：

1. 打开 GitHub 仓库页面。
2. 进入 `Settings`。
3. 左侧选择 `Pages`。
4. `Build and deployment` 选择：
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. 保存。

## 4. 生成的网址

如果仓库是：

```text
https://github.com/<你的用户名>/<仓库名>
```

Pages 地址通常是：

```text
https://<你的用户名>.github.io/<仓库名>/
```

例如：

```text
https://buer40620-sketch.github.io/hkgai-newcomer-demo/
```

实际地址以 GitHub Pages 设置页显示为准。

## 5. 队友测试路径

打开 Pages URL 后测试：

```text
P0 -> P1 -> P2 -> P3 -> P4 -> P5 -> P1
```

预期结果：

- P1 显示 8 张第一月任务卡。
- 住址证明任务可进入深水区。
- 学校、政府、银行三条规则全部输出 `needs_confirm`。
- P4 来源抽屉显示来源等级、URL、核验日期、最终确认方和边界提示。
- P5 能生成学校、政府、银行三类咨询问题。
- 保存后回到 P1，住址证明状态变为“需要机构确认”。
