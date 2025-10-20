import { useCallback, useEffect } from "react";
import { useYjsConnection } from "./useYjsConnection";

type ColumnWidthMap = Record<string, number>;

export interface UseTableHeaderSyncParams {
  tableId: string;
  viewId?: string;
  userId: string;
  token?: string;
  endpoint?: string;
  debug?: boolean;
  baseUrl?: string;
  onColumnOrder?: (order: string[]) => void;
  onColumnWidth?: (widths: ColumnWidthMap) => void;
}

export function useTableHeaderSync(params: UseTableHeaderSyncParams) {
  const {
    tableId,
    viewId,
    userId,
    token,
    endpoint,
    debug,
    baseUrl,
    onColumnOrder,
    onColumnWidth,
  } = params;

  const { state, onMessage, sendJSON } = useYjsConnection({
    documentId: tableId,
    viewId: viewId,
    userId,
    token,
    endpoint,
    debug,
    baseUrl,
  });

  // 监听来自服务端的 YJS/业务事件更新
  useEffect(() => {
    onMessage((data) => {
      if (data instanceof ArrayBuffer) {
        // 二进制增量，此处表头暂不处理
        return;
      }
      try {
        const msg = JSON.parse(data as string);
        // 兼容 yjs.go 的业务事件包装：{ type, document, update }
        // 也兼容自定义表头更新：{ type: 'column.order' | 'column.width', payload }
        if (msg?.type === "column.order" && Array.isArray(msg?.payload)) {
          onColumnOrder && onColumnOrder(msg.payload as string[]);
          return;
        }
        if (
          msg?.type === "column.width" &&
          msg?.payload &&
          typeof msg.payload === "object"
        ) {
          onColumnWidth && onColumnWidth(msg.payload as ColumnWidthMap);
          return;
        }
      } catch {
        // 忽略非 JSON 文本
      }
    });
  }, [onMessage, onColumnOrder, onColumnWidth]);

  // 发送列顺序更新（本地乐观更新 + REST 落库后，也可再次广播校对）
  const sendColumnOrder = useCallback(
    (order: string[]) => {
      sendJSON({ type: "column.order", document: tableId, payload: order });
    },
    [sendJSON, tableId],
  );

  // 发送列宽更新（仅增量）
  const sendColumnWidth = useCallback(
    (widths: ColumnWidthMap) => {
      sendJSON({ type: "column.width", document: tableId, payload: widths });
    },
    [sendJSON, tableId],
  );

  return {
    state,
    sendColumnOrder,
    sendColumnWidth,
  };
}
