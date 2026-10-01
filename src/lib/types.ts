export type TaskStatus = "todo" | "in_progress" | "completed" | "skipped";
export type TaskPriority = "low" | "medium" | "high";

export type Task = {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  scheduled_for: string | null;
  estimate_minutes: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FocusSessionStatus = "running" | "paused" | "completed" | "cancelled";

export type FocusSession = {
  id: string;
  user_id: string;
  task_id: string | null;
  started_at: string;
  ended_at: string | null;
  planned_minutes: number;
  focused_seconds: number;
  status: FocusSessionStatus;
  created_at: string;
};

export type DeviceRecord = {
  id: string;
  name: string;
  firmware_version: string | null;
  last_seen: string | null;
  enabled: boolean;
};

export type DeviceState = {
  device_id: string;
  mode: "home" | "task" | "focus" | "message";
  line1: string;
  line2: string;
  focus_minutes: number;
  updated_at: string;
};

export type UserSettings = {
  user_id: string;
  display_name: string | null;
  focus_minutes: number;
  break_minutes: number;
  sounds_enabled: boolean;
  quiet_start: string | null;
  quiet_end: string | null;
  created_at: string;
  updated_at: string;
};

export type DailyGoal = {
  user_id: string;
  goal_date: string;
  task_target: number;
  focus_minutes_target: number;
  created_at: string;
  updated_at: string;
};
