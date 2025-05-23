import simpleGit, { SimpleGit, SimpleGitOptions } from "simple-git";
const { log } = require("./log");
const createLogger = require("progress-estimator");
const chalk = require("chalk");
const path = require("path");
const fs = require("fs-extra");
const { spawn } = require("child_process");
const ora = require("ora");
const figlet = require("figlet"); // 字体艺术字

const logger = createLogger({
  // 初始化进度条
  spinner: {
    interval: 300, // 变换时间 ms
    frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"].map((item) => chalk.blue(item)), // 设置加载动画
  },
});
const goodPrinter = () => {
  const data = figlet.textSync("欢迎使用 demo-cli 脚手架", {
    font: "Standard",
  });
  console.log(chalk.rgb(50, 130, 180).visible(data));
};

// 下面就是一些相关的提示
const gitOptions: Partial<SimpleGitOptions> = {
  baseDir: process.cwd(), // 根目录
  binary: "git",
  maxConcurrentProcesses: 6, // 最大并发进程数
};

// 安装项目依赖
const installDependencies = (prjName: string): Promise<void> => {
  const projectDir = path.join(process.cwd(), prjName);

  return new Promise((resolve, reject) => {
    const npmInstall = spawn("npm", ["install", "--verbose", "--force"], {
      cwd: projectDir,
      stdio: "inherit", // 将子进程的输出直接映射到父进程（当前进程）的输出
      shell: true, // 使用 shell，确保命令在 Windows 和其他平台上都能运行
    });

    npmInstall.on("close", (code: Number) => {
      if (code === 0) {
        console.log(chalk.green("依赖安装成功"));
        resolve();
      } else {
        reject(`依赖安装失败，退出代码: ${code}`);
      }
    });

    npmInstall.on("error", (err: any) => {
      reject(`依赖安装时发生错误: ${err.message}`);
    });
  });
};

// 运行项目
const runProject = (prjName: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const projectDir = path.join(process.cwd(), prjName);
    const spinnerTip = ora("项目启动中...").start();

    // 检查项目目录是否存在
    if (!fs.existsSync(projectDir)) {
      spinnerTip.fail("项目目录不存在");
      reject(new Error("项目目录不存在"));
      return;
    }

    // 使用 spawn 执行 pnpm run serve
    const serveProcess = spawn("pnpm", ["dev"], {
      cwd: projectDir,
      stdio: "pipe", // 子进程的输出流式处理
      shell: true, // 确保在跨平台运行时正常
    });
    let isResolved = false; // 标记是否已经完成
    serveProcess.stdout.on("data", (data: any) => {
      const output = data.toString();
      console.log(chalk.green(output)); // 实时打印日志

      // 检测到启动完成的标志
      if (!isResolved && output.includes("App running at")) {
        isResolved = true; // 确保只调用一次
        spinnerTip.succeed("项目启动成功！");
        resolve(); // 完成 Promise
      }
    });

    serveProcess.stderr.on("data", (data: any) => {
      console.error(chalk.red(data.toString()));
    });

    serveProcess.on("close", (code: Number) => {
      if (code !== 0) {
        spinnerTip.fail("项目启动失败");
        reject(new Error(`项目启动失败，退出代码: ${code}`));
      }
    });

    serveProcess.on("error", (err: any) => {
      spinnerTip.fail("项目启动失败");
      reject(new Error(`项目启动失败: ${err.message}`));
    });
  });
};

export const clone = async (url: string, prjName: string, options: string[]): Promise<any> => {
  const git: SimpleGit = simpleGit(gitOptions);
  try {
    // 开始下载代码并展示预估时间进度条
    await logger(git.clone(url, prjName, options), "代码下载中: ", {
      estimate: 8000, // 展示预估时间
    });

    // 下面就是一些相关的提示
    console.log();
    console.log(chalk.blueBright(`==================================`));
    console.log(chalk.blueBright(`===== 欢迎使用 demo-cli 脚手架 =====`));
    console.log(chalk.blueBright(`==================================`));
    console.log();

    log.success(`项目创建成功 ${chalk.blueBright(prjName)}`);
    log.success(`执行以下命令启动项目：`);
    log.info(`cd ${chalk.blueBright(prjName)}`);
    log.info(`${chalk.yellow("pnpm")} install`);
    log.info(`${chalk.yellow("pnpm")} run dev`);
    goodPrinter();
    // 安装依赖
    await installDependencies(prjName);
    // 运行项目
    await runProject(prjName);
  } catch (err: any) {
    log.error("下载失败");
    log.error(String(err));
  }
};
