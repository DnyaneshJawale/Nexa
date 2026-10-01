import { supabase } from "./supabase";


export type NexaPreferences = {
  display_name: string;

  timezone: string;

  default_focus_minutes: number;

  default_break_minutes: number;

  auto_start_break: boolean;

  auto_start_focus: boolean;

  sound_enabled: boolean;

  startup_chime_enabled: boolean;

  default_reminder_enabled: boolean;

  default_reminder_minutes_before: number;

  default_snooze_minutes: number;

  overdue_nudges_enabled: boolean;

  next_task_prompt_enabled: boolean;

  next_task_countdown_minutes: number;

  quiet_hours_enabled: boolean;

  quiet_hours_start: string;

  quiet_hours_end: string;

  device_idle_rotation_seconds: number;

  morning_brief_enabled: boolean;

  morning_brief_time: string;

  shutdown_summary_enabled: boolean;

  shutdown_summary_time: string;
};


export const DEFAULT_NEXA_PREFERENCES:
  NexaPreferences = {

  display_name: "",

  timezone:
    "Asia/Kolkata",

  default_focus_minutes:
    25,

  default_break_minutes:
    5,

  auto_start_break:
    false,

  auto_start_focus:
    false,

  sound_enabled:
    true,

  startup_chime_enabled:
    true,

  default_reminder_enabled:
    true,

  default_reminder_minutes_before:
    10,

  default_snooze_minutes:
    10,

  overdue_nudges_enabled:
    true,

  next_task_prompt_enabled:
    true,

  next_task_countdown_minutes:
    5,

  quiet_hours_enabled:
    false,

  quiet_hours_start:
    "22:00",

  quiet_hours_end:
    "07:00",

  device_idle_rotation_seconds:
    8,

  morning_brief_enabled:
    true,

  morning_brief_time:
    "07:00",

  shutdown_summary_enabled:
    true,

  shutdown_summary_time:
    "22:00",
};


function normalizeTime(
  value:
    string | null | undefined,

  fallback: string
) {
  if (!value) {
    return fallback;
  }

  return value.slice(
    0,
    5
  );
}


function normalizeTimezone(
  timezone:
    string | null | undefined
) {
  if (
    !timezone ||
    timezone.trim() === ""
  ) {
    return "Asia/Kolkata";
  }


  if (
    timezone ===
    "Asia/Calcutta"
  ) {
    return "Asia/Kolkata";
  }


  return timezone;
}


export async function getNexaPreferences():
  Promise<NexaPreferences> {

  const {
    data: {
      user,
    },
  } =
    await supabase.auth
      .getUser();


  if (!user) {
    return {
      ...DEFAULT_NEXA_PREFERENCES,
    };
  }


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "user_settings"
      )
      .select(
        `
        display_name,
        timezone,
        default_focus_minutes,
        default_break_minutes,
        auto_start_break,
        auto_start_focus,
        sound_enabled,
        startup_chime_enabled,
        default_reminder_enabled,
        default_reminder_minutes_before,
        default_snooze_minutes,
        overdue_nudges_enabled,
        next_task_prompt_enabled,
        next_task_countdown_minutes,
        quiet_hours_enabled,
        quiet_hours_start,
        quiet_hours_end,
        device_idle_rotation_seconds,
        morning_brief_enabled,
        morning_brief_time,
        shutdown_summary_enabled,
        shutdown_summary_time
        `
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();


  if (error) {
    throw error;
  }


  return {

    ...DEFAULT_NEXA_PREFERENCES,

    ...(data ?? {}),

    timezone:
      normalizeTimezone(
        data?.timezone
      ),

    quiet_hours_start:
      normalizeTime(
        data
          ?.quiet_hours_start,

        DEFAULT_NEXA_PREFERENCES
          .quiet_hours_start
      ),

    quiet_hours_end:
      normalizeTime(
        data
          ?.quiet_hours_end,

        DEFAULT_NEXA_PREFERENCES
          .quiet_hours_end
      ),

    morning_brief_time:
      normalizeTime(
        data
          ?.morning_brief_time,

        DEFAULT_NEXA_PREFERENCES
          .morning_brief_time
      ),

    shutdown_summary_time:
      normalizeTime(
        data
          ?.shutdown_summary_time,

        DEFAULT_NEXA_PREFERENCES
          .shutdown_summary_time
      ),
  };
}