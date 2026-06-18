// 调试接口：查看 EdgeOne Pages 注入的环境变量
// 部署后访问 /api/debug-env 检查环境变量是否生效
export const dynamic = "force-dynamic";

export async function GET() {
  const keys = [
    "CLOUDBASE_ENV_ID",
    "CLOUDBASE_SECRET_ID",
    "CLOUDBASE_SECRET_KEY",
    "DEEPSEEK_API_KEY",
    "JWT_SECRET",
    "NEXT_PUBLIC_APP_URL",
  ];

  const env: Record<string, any> = {};
  for (const k of keys) {
    const v = process.env[k];
    env[k] = v ? `${v.substring(0, 6)}... (len=${v.length})` : null;
  }

  // 顺便看一下所有 CLOUDBASE 开头的环境变量
  const allCloudbase: string[] = [];
  for (const k of Object.keys(process.env)) {
    if (k.toUpperCase().includes("CLOUDBASE") || k.toUpperCase().includes("DEEPSEEK")) {
      const v = process.env[k];
      allCloudbase.push(`${k}=${v ? v.substring(0, 6) + "...(len=" + v.length + ")" : "empty"}`);
    }
  }

  return new Response(
    JSON.stringify(
      {
        knownEnv: env,
        allCloudbaseOrDeepseek: allCloudbase,
        nodeEnv: process.env.NODE_ENV,
        vercel: process.env.VERCEL,
        vercelEnv: process.env.VERCEL_ENV,
        region: process.env.VERCEL_REGION,
      },
      null,
      2
    ),
    {
      headers: { "content-type": "application/json" },
    }
  );
}
