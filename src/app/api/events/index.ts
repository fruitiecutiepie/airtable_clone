import type EventEmitter from "events";

interface Job {
  emitter: EventEmitter;
  promise: Promise<void>
}
export const jobs = new Map<string, Job>();