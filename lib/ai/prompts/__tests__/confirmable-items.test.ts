import {
  CONFIRMABLE_ITEMS_PROMPT_FRAGMENT,
  createConfirmableItem,
  filterPendingItems,
  isConfirmCompleted,
} from "../shared/confirmable-items";
import type { ConfirmableItem } from "@/types/jd";

describe("待确认项机制", () => {
  it("提示词片段应包含 4 种类型说明", () => {
    expect(CONFIRMABLE_ITEMS_PROMPT_FRAGMENT).toContain("inference");
    expect(CONFIRMABLE_ITEMS_PROMPT_FRAGMENT).toContain("placeholder");
    expect(CONFIRMABLE_ITEMS_PROMPT_FRAGMENT).toContain("quantification");
    expect(CONFIRMABLE_ITEMS_PROMPT_FRAGMENT).toContain("keyword_align");
  });

  it("提示词片段应包含输出格式示例", () => {
    expect(CONFIRMABLE_ITEMS_PROMPT_FRAGMENT).toContain('"confirmableItems"');
    expect(CONFIRMABLE_ITEMS_PROMPT_FRAGMENT).toContain('"question"');
    expect(CONFIRMABLE_ITEMS_PROMPT_FRAGMENT).toContain('"options"');
  });

  it("createConfirmableItem 应生成带 id 的 pending 条目", () => {
    const item = createConfirmableItem({
      field: "experiences[0].bullets[1]",
      type: "inference",
      originalText: "参与了项目",
      inferredText: "主导了项目",
      question: "原文是'参与'，是否升级为'主导'？",
      options: ["接受推断", "保留原文", "自定义"],
    });
    expect(item.id).toBeTruthy();
    expect(item.status).toBe("pending");
    expect(item.type).toBe("inference");
  });

  it("filterPendingItems 应只返回 pending 状态", () => {
    const items: ConfirmableItem[] = [
      { id: "1", field: "a", type: "inference", originalText: "a", inferredText: "b", question: "q", options: [], status: "pending" },
      { id: "2", field: "b", type: "placeholder", originalText: "a", inferredText: "b", question: "q", options: [], status: "accepted" },
      { id: "3", field: "c", type: "quantification", originalText: "a", inferredText: "b", question: "q", options: [], status: "pending" },
    ];
    const pending = filterPendingItems(items);
    expect(pending).toHaveLength(2);
    expect(pending[0].id).toBe("1");
  });

  it("isConfirmCompleted 应在无 pending 项时返回 true", () => {
    const items: ConfirmableItem[] = [
      { id: "1", field: "a", type: "inference", originalText: "a", inferredText: "b", question: "q", options: [], status: "accepted" },
      { id: "2", field: "b", type: "placeholder", originalText: "a", inferredText: "b", question: "q", options: [], status: "rejected" },
    ];
    expect(isConfirmCompleted(items)).toBe(true);
  });

  it("isConfirmCompleted 应在有 pending 项时返回 false", () => {
    const items: ConfirmableItem[] = [
      { id: "1", field: "a", type: "inference", originalText: "a", inferredText: "b", question: "q", options: [], status: "pending" },
    ];
    expect(isConfirmCompleted(items)).toBe(false);
  });
});
