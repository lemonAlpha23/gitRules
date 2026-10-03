# git-rules

使用 Husky 和 Commitlint 统一 Git 提交信息格式。执行 `git commit` 时，`commit-msg` 钩子会检查提交信息；校验失败时会阻止本次提交。

项目地址：[lemonAlpha23/gitRules](https://github.com/lemonAlpha23/gitRules)。

## 工作原理

这套配置检查的是提交说明的格式。检查失败会终止本次提交，不会删除已经修改或暂存的文件。

```text
git commit → Husky 触发 commit-msg 钩子 → Commitlint 读取规则 → 通过后继续提交
```

各文件的作用如下：

| 文件 | 作用 |
| --- | --- |
| `package.json` | 声明 Commitlint、规则包和 Husky 开发依赖，并通过 `prepare` 脚本启用 Husky |
| `commitlint.config.js` | 定义允许的提交类型、简短说明和正文的长度限制 |
| `.husky/commit-msg` | 接收 Git 提供的提交信息文件路径，调用 Commitlint 校验 |
| `.gitignore` | 避免将 `node_modules/` 依赖目录提交到仓库 |

**仅创建这些文件不会自动启用检查。** 还需要在 Git 仓库中安装依赖并完成 Husky 初始化。即使项目不是 JavaScript 项目，也可以使用 `package.json` 管理这些开发工具。

## 选择安装方式

- 在其他项目中使用：按下面的 Windows 一键安装步骤操作，脚本会合并目标项目的配置。
- 在本仓库中使用：跳转到[在本项目中安装](#在本项目中安装)，直接安装已有依赖即可，无需重新创建 `package.json`。

## 一键安装到其他项目（Windows）

安装前准备好 Git、Node.js 和 npm，并确保能访问 GitHub 和 npm。

1. 下载 [install.bat](https://github.com/lemonAlpha23/gitRules/raw/HEAD/install.bat)（保存为 `.bat`，不要保存成网页或 `.txt`）。
2. 将这一个文件放到目标项目根目录。
3. 双击执行，等待窗口提示安装成功。

BAT 默认安装到自身所在目录，会从本仓库默认分支下载最新工具到临时目录，运行安装后清理下载文件，无需手动下载配套文件或克隆仓库。仓库需要先发布 `install.cjs`、`package.json` 和 `commitlint.config.js`。

也可以将其他项目文件夹拖到 BAT 上，或在 CMD 中显式指定目标目录：

```bat
install.bat "D:\code\my-project"
```

在 PowerShell 中使用 `.\install.bat "D:\code\my-project"`。

安装脚本会：

1. 检查目标目录；尚未使用 Git 的目录会自动执行 `git init`。
2. 合并 `package.json`，加入本工具的开发依赖版本，并在已有 `prepare` 脚本后追加 Husky 初始化。
3. 写入 `commitlint.config.cjs`，并在 `.husky/commit-msg` 中加入校验命令，保留原钩子内容。
4. 为 `.gitignore` 补充依赖目录和备份目录。
5. 执行 `npm install --include=dev` 和 Husky 初始化，使后续提交自动校验。

修改前的文件保存在目标项目的 `.git-rules-backups/` 下。目标项目的 README 不会被覆盖。安装会联网下载 npm 依赖，并执行目标项目的 npm 生命周期脚本；该流程使用 npm，适用于使用 npm 管理依赖的项目。

安装后的钩子显式使用 `commitlint.config.cjs`，兼容设置了 `"type": "module"` 的项目。目标项目其他名称的 Commitlint 配置仍会保留；已有钩子中的其他检查也会继续执行。Husky 会将 Git 的 `core.hooksPath` 设置为 `.husky/_`。

开发者已克隆本工具完整仓库时，可直接运行本地脚本，仅复制、合并配置，稍后再安装依赖：

```sh
node install.cjs "D:\code\my-project" --files-only
```

如果依赖安装失败，按报错处理后可以重新运行安装脚本。重复运行不会再次追加本工具的钩子命令。

`--files-only` 仍会初始化 Git（如有需要）并写入配置，只跳过依赖安装和钩子启用。完成后，在目标项目根目录执行：

```sh
npm install --include=dev
npx --no -- husky
```

## 在本项目中安装

准备好 Git、Node.js 和 npm，在 Git 仓库根目录执行：

```sh
npm install
```

安装时会自动运行 `prepare` 脚本，通过 Husky 配置 Git 钩子。如果当前目录还不是 Git 仓库，需要先运行 `git init`。

`npm install` 会读取 `package.json`，将工具安装到 `node_modules/`，并生成或更新 `package-lock.json`。应将 `package-lock.json` 与项目配置一起提交，`node_modules/` 则由 `.gitignore` 忽略。

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

再检查一条不符合规则的信息，确认会输出错误并以非零状态退出：

```sh
echo "update: 更新配置" | npx --no -- commitlint
```

这里的 `update` 不在允许的类型列表中。手动校验可以验证规则，但要确认提交钩子已经启用，还需检查下方的 `core.hooksPath` 配置。

通过安装脚本配置的目标项目使用 `commitlint.config.cjs`。手动校验时应显式指定该文件，与安装后的钩子保持一致：

```sh
echo "feat: 添加示例功能" | npx --no -- commitlint --config commitlint.config.cjs
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
├── install.bat         # Windows 一键安装入口
├── install.cjs         # 目标项目配置合并和安装逻辑
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

在本仓库中修改 `commitlint.config.js`；通过安装脚本配置的目标项目应修改 `commitlint.config.cjs`。调整其中的 `rules` 后，使用手动校验命令检查符合规则和违反规则的示例。钩子会在后续提交时读取更新后的配置。

### PowerShell 提示无法运行 npm.ps1

可以使用 `npm.cmd install` 和 `npm.cmd run prepare` 调用 npm；手动校验中的 `npx` 也可以替换为 `npx.cmd`。

### 是否能强制所有提交遵守规则

本地钩子可以被跳过，例如提交时使用 `--no-verify`。团队需要强制校验时，还应在 CI 中检查提交信息，并配合仓库的合并限制。
