import { Command } from "commander"; // 处理控制台命令
import { version } from "../package.json";
import create from "./command/create";
import update from "./command/update";
// 命令行中使用 demo-cli xxx 即可触发
const program = new Command("demo-cli");
program.version(version, "-v , --version");

program
  .command("create")
  .description("创建一个新项目")
  .argument("[name]", "项目名称")
  .action(async (name?: string) => {
    await create(name);
  });

program
  .command("update")
  .description("更新demo-cli")
  .action(() => {
    update();
  });
program.parse();
