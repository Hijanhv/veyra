// Minimal type declarations for modules without bundled type definitions

declare module 'node-cron' {
  export type ScheduledTask = {
    start: () => void;
    stop: () => void;
    destroy: () => void;
  };

  export function schedule(
    expression: string,
    func: () => void | Promise<void>,
    options?: { scheduled?: boolean; timezone?: string }
  ): ScheduledTask;

  export function getTasks(): ScheduledTask[];
}