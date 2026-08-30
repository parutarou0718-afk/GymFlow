# GymFlow 工作交接

更新时间：2026-08-31  
当前分支：`refactor/program-module`  
当前 checkpoint：`502d9bd feat: add social profiles and shared program copying`

## 当前状态

GymFlow 已完成 M1–M20 的核心阶段；当前可用主链为：

```text
选择 Current Gym
→ 查看 Gym Inventory
→ 选择 Program
→ 匹配当前 Gym
→ 必要时替换/生成 Adapted Program
→ 开始 Workout（保存 gymId）
→ 完成后记录 Gym Visit
```

M19–M20 已建立本地优先的 Social Core：帖子、可见性、关注、点赞、评论、收藏、个人主页，以及 Program / Workout / Gym 的分享入口。

## 最新 M20：Sharing & Social Profile

最后提交 `502d9bd` 包含：

- `src/modules/social-profile`：个人公开资料、面向 viewer 的可见帖子、粉丝/关注摘要及去重后的分享引用。
- `src/modules/sharing`：对已分享 Program / Workout 的安全只读访问。
- `ProgramService.copyProgram(...)`：深拷贝 Program 到新 owner；新 Program 与原 Program 完全独立，Exercise entry ID 与时间戳均重新生成。
- 分享入口：Program Detail、Workout History Detail、Gym Detail 均可进入 Social composer 并预填附件。
- 分享查看页：`/shared-program` 和 `/shared-workout`。
- Feed / Profile 中的作者、Program、Workout、Gym 都有相应跳转入口。

### M20 的重要规则

- 不能因知道 Program ID 而绕过分享权限：非 owner 只能由 `SharingService` 在存在可读 Share Post 时查看或复制。
- Program 的 copy 是 copy，不是 link；删除 Post 或撤销分享不会删除已复制 Program。
- 删除最后一条可读的 Program Share Post 会立即撤销该 Program 的共享访问。
- 分享 Workout 只返回安全摘要：日期、时长、动作数、训练量和可选 gymId；不暴露原 session、notes、sync 数据或 domain events。
- Social Profile 的帖子数量必须按当前 viewer 的可见性计算，不能泄露 private/followers-only 帖子。

## 模块边界

UI 只能调用模块 public API；不得从页面直接穿透访问其他领域的 Store 或 SQLite。

| 模块 | Public API 职责 |
| --- | --- |
| `workout` | 训练生命周期、历史、安全 Workout 分享摘要 |
| `program` | Program/Template 兼容 CRUD、历史保存为 Program、Program copy |
| `gym` / `gym-inventory` | Gym 与器械库存 |
| `matching` / `program-matching` | 动作及 Program 的 Gym 可执行性匹配 |
| `program-adaptation` | 从匹配结果生成 Adapted Program |
| `training-flow` | Current Gym 下的 Program → Match → Adapt → Workout 编排 |
| `user` / `user-gym` / `gym-context` | 本地用户、User–Gym metadata、Current Gym |
| `social` | Posts、关注、likes/comments/saves、Feed 与可见性判断 |
| `social-profile` | 聚合公开个人资料（只依赖 User / Social public API） |
| `sharing` | 将 Social 可见性与 Program / Workout 的安全共享读取、复制编排在一起 |

## 兼容层与约束

- Program domain 在逻辑上独立，但物理存储仍兼容 legacy `WorkoutTemplate` 和 `templates` 表；保留所有旧 ID，不重命名或迁移 `templates`。
- GymFlow domain userId 是稳定的本地 ID；Supabase Auth UUID 不是领域主键。
- Web 使用内存 seed 数据，刷新可回到初始状态；Native 的 SQLite 持久化不受影响。
- 所有新 schema 演进必须经过 ordered migration ledger；不得重建既有数据库或伪造历史迁移。
- Workout completion 已有原子持久化边界：session completion、snapshot/outbox 与 domain event 要么一起成功，要么一起回滚。

## 验证命令

在项目根目录执行：

```bash
npm test
npx tsc --noEmit
npx expo-doctor
npx expo export --platform web
```

截至 `502d9bd`，上述验证结果为：

- `npm test`：85/85 通过
- TypeScript：通过
- Expo Doctor：18/18 通过
- Web export：通过

本地 Web 预览：

```bash
npx expo start --web
```

## 下一步建议

M20 后不要直接扩大 Social 表面功能。优先在进入 M21 前确认产品方向，并继续遵守 public API 边界。适合的候选方向：

1. Auth / Cloud Sync：明确本地 GymFlow user 与远程 identity 的映射、所有权与同步策略。
2. Social 的正式产品 UI：从当前 development validation UI 演进为正式 Feed、Profile、分享流程。
3. 社区功能：Gym Community、活动、约练、挑战；前提是先定义隐私、审核和远程持久化。

不要在未完成上述决策前，把 Social、Program 或 Workout 直接耦合到 Supabase / Auth 实现。

## 新对话建议首条指令

```text
请先阅读 docs/HANDOFF.md，并基于当前分支与最后 checkpoint 继续。先运行 npm test、npx tsc --noEmit、npx expo-doctor 与 npx expo export --platform web 确认基线。遵守模块 public API 边界，不直接跨模块访问 Store/SQLite；不要重命名 templates 或引入未经设计的 Auth/Cloud 耦合。
```
