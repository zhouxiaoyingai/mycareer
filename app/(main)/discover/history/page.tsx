import { HistoryList } from "@/components/discover/history-list";

export const dynamic = "force-dynamic";

export default function HistoryPage() {
  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">历史报告</h1>
        <p className="text-muted-foreground mt-1">
          查看你过往的优势识别记录。每次重新探索都会生成新版本。
        </p>
      </div>
      <HistoryList />
    </div>
  );
}
