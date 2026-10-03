# git-rules

使用 Husky 和 Commitlint 统一 Git 提交信息格式。执行 `git commit` 时，`commit-msg` 钩子会检查提交信息；校验失败时会阻止本次提交。

## 快速开始

准备好 Git、Node.js 和 npm，在 Git 仓库根目录执行：

```sh
npm install
```

安装时会自动运行 `prepare` 脚本，通过 Husky 配置 Git 钩子。如果当前目录还不是 Git 仓库，需要先运行 `git init`。

如果安装时跳过了生命周期脚本，可以手动安装钩子：

```sh
npm run prepare
```

配置完成后，正常暂存并提交文件即可，例如：

```sh
git add README.md
git commit -m "docs: 更新项目说明"
```

## 提交信息格式

```text
<type>(<scope>): <subject>

<body>

<footer>
```

- `type`：提交类型，必填，取值见下表。
- `scope`：可选，用于说明影响的模块，例如 `auth` 或 `config`。
- `subject`：必填的简短说明，冒号后需有一个空格，最多 50 个字符。
- `body`：可选的详细说明，与标题之间空一行，每行最多 72 个字符。
- `footer`：可选的补充信息，例如关联的问题编号。

### 允许的提交类型

| 类型 | 用途 |
| --- | --- |
| `feat` | 新增功能 |
| `fix` | 修复问题 |
| `docs` | 修改文档 |
| `style` | 调整代码格式，不改变代码行为 |
| `refactor` | 重构代码 |
| `perf` | 优化性能 |
| `test` | 新增或修改测试 |
| `chore` | 维护配置、依赖或工具 |
| `revert` | 回退变更 |

示例：

```text
feat(auth): 添加登录功能
fix(config): 修复配置读取失败的问题
docs: 补充安装步骤
chore: 更新开发依赖
```

### 校验规则

项目继承 `@commitlint/config-conventional` 的规则，并在 `commitlint.config.js` 中覆盖以下配置：

| 规则 | 当前配置 |
| --- | --- |
| `type-enum` | 仅允许上表中的 9 种类型 |
| `subject-max-length` | 简短说明最多 50 个字符，不包含类型和作用域 |
| `body-max-line-length` | 正文每行最多 72 个字符 |

以上规则均为错误级别，违反时校验失败。继承配置中的其他规则仍然生效；如需查看完整配置，可执行：

```sh
npx --no -- commitlint --print-config
```

## 手动校验

无需创建提交，也可以检查一条提交信息：

```sh
echo "feat: 添加示例功能" | npx --no -- commitlint
```

检查最近一次提交的信息：

```sh
npx --no -- commitlint --last --verbose
```

## 项目文件

```text
.
├── .husky/
│   └── commit-msg       # 提交时调用 Commitlint
├── .gitignore          # 忽略 node_modules/
├── commitlint.config.js # 提交信息校验规则
├── package.json        # 开发依赖和 Husky 初始化脚本
└── README.md
```

## 常见问题

### 提交时没有触发校验

确认已在 Git 仓库中执行 `npm install` 和 `npm run prepare`，再检查钩子目录：

```sh
git config --get core.hooksPath
```

使用本项目的 Husky 配置时，预期为 `.husky/_`。同时确认没有设置 `HUSKY=0`，且提交时没有使用 `--no-verify`。

### 提交信息被拒绝

根据 Commitlint 输出检查提交类型、冒号后的空格和说明长度。例如，`update: 更新配置` 中的 `update` 不在允许列表内，可按变更用途改为 `chore: 更新配置`。

### 如何调整规则

修改 `commitlint.config.js` 中的 `rules`，然后使用手动校验命令检查符合规则和违反规则的示例。钩子会在后续提交时读取更新后的配置。
