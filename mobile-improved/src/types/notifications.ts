export type NotificationKind = 'account' | 'borrow' | 'return' | 'fine' | 'hold';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** Who made the change, shown as "by …" */
  actor: string;
  time: string;
  unread: boolean;
}