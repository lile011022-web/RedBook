export {};

declare global {
  interface Window {
    redbook?: {
      clearXhsSession(accountId: string): Promise<void>;
      notifyPublishDue(message: string): Promise<void>;
      openXhsWorkbench(accountId: string, displayName: string): Promise<void>;
    };
  }
}
