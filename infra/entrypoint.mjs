import { spawn } from "node:child_process";
if (process.env.DEPLOYMENT_ENV === "production") {
  const problems = [];
  if (!process.env.APP_URL?.startsWith("https://"))
    problems.push("APP_URL must use HTTPS");
  if (
    !process.env.BETTER_AUTH_SECRET ||
    process.env.BETTER_AUTH_SECRET.length < 32 ||
    /replace|build-only|temporary/.test(process.env.BETTER_AUTH_SECRET)
  )
    problems.push("set a unique BETTER_AUTH_SECRET of at least 32 characters");
  if (
    !process.env.POSTGRES_PASSWORD ||
    process.env.POSTGRES_PASSWORD.length < 20 ||
    process.env.POSTGRES_PASSWORD === "drinkable"
  )
    problems.push(
      "set POSTGRES_PASSWORD to at least 20 URL-safe random characters",
    );
  if (!process.env.SMTP_HOST || process.env.SMTP_HOST === "mailpit")
    problems.push("configure production SMTP delivery");
  if (problems.length) {
    console.error(`Production configuration: ${problems.join("; ")}`);
    process.exit(1);
  }
}
const child = spawn(process.argv[2], process.argv.slice(3), {
  stdio: "inherit",
  env: process.env,
});
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
