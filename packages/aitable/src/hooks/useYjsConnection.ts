import { useEffect, useMemo, useRef, useState } from "react";
import type { YjsConnectionState } from "@easyspace/sdk";
import { YjsConnection } from "@easyspace/sdk";

export interface UseYjsConnectionParams {
  documentId: string; // 通常使用 tableId 或 viewId
  viewId?: string;
  userId: string;
  token?: string;
  endpoint?: string; // 例如 "/ws/yjs"
  debug?: boolean;
  baseUrl?: string; // 后端基础URL
}

export interface UseYjsConnectionResult {
  state: YjsConnectionState;
  connect: () => Promise<void>;
  disconnect: () => void;
  onMessage: (handler: (data: ArrayBuffer | string) => void) => void;
  sendBinary: (data: Uint8Array | ArrayBuffer) => void;
  sendJSON: (obj: unknown) => void;
}

export function useYjsConnection(
  params: UseYjsConnectionParams,
): UseYjsConnectionResult {
  const { documentId, viewId, userId, token, endpoint, debug, baseUrl } =
    params;
  const [state, setState] = useState<YjsConnectionState>("idle");
  const connRef = useRef<YjsConnection>();

  const connection = useMemo(() => {
    const conn = new YjsConnection({
      documentId,
      viewId,
      userId,
      token,
      endpoint,
      debug,
      baseUrl,
    });
    connRef.current = conn;
    return conn;
  }, [documentId, viewId, userId, token, endpoint, debug, baseUrl]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setState("connecting");
      try {
        await connection.connect();
        mounted && setState("connected");
      } catch {
        mounted && setState("disconnected");
      }
    })();
    return () => {
      mounted = false;
      try {
        connection.disconnect();
      } catch {
        // noop
      }
    };
  }, [connection]);

  return {
    state,
    connect: () => connection.connect(),
    disconnect: () => connection.disconnect(),
    onMessage: (handler) => connection.onMessage(handler),
    sendBinary: (data) => connection.sendBinary(data),
    sendJSON: (obj) => connection.sendJSON(obj),
  };
}
