# Repository maintenance

- 每次对 Skill 指令、参考规范、初始化脚本或底座运行时做实质修改，都要同步更新 `ITERATION_LOG.md`。
- 记录版本、日期、用户问题、关键决策、涉及范围、验证方式和兼容性说明。
- 提交前至少运行 Skill quick validation、JavaScript/Python 语法检查，并用临时初始化工作区执行 `npm run validate`；涉及交互时补充浏览器回归。
- 不覆盖由本 Skill 生成的既有用户工作区；升级策略或迁移限制必须写入迭代记录。
