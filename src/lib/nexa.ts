import { supabase } from "./supabase";

export type NexaDisplayType =
  | "idle"
  | "message"
  | "reminder"
  | "break"
  | "focus"
  | "task";

export type NexaScreen = {
  id?: string;
  line1: string;
  line2: string;
};

export type NexaDisplay = {
  type: NexaDisplayType;
  line1: string;
  line2: string;
  running: boolean;
  task_id: string | null;
  session_id: string | null;
  remaining_seconds: number;
};

export type NexaManager = {
  ok: boolean;
  error?: string | null;
  server_time?: string;

  display: NexaDisplay;

  idle: {
    rotation_seconds: number;
    screens: NexaScreen[];
  };

  audio: {
    voice_enabled: boolean;
    startup_chime_enabled: boolean;
  };
};

export type NexaFeedback = {
  line1: string;
  line2: string;
};

export type NexaActionResult = {
  ok: boolean;
  error?: string | null;
  action?: string | null;
  feedback?: NexaFeedback | null;
  manager: NexaManager;
};

export type NexaAction =
  | "focus_start"
  | "focus_pause"
  | "focus_resume"
  | "focus_end"
  | "focus_status"
  | "break_start"
  | "break_pause"
  | "break_resume"
  | "break_complete"
  | "break_complete_focus"
  | "break_status"
  | "task_start"
  | "next_task_start"
  | "task_complete"
  | "task_status"
  | "task_postpone"
  | "task_skip"
  | "reminder_ack"
  | "reminder_snooze"
  | "reminder_start_task"
  | "quick_focus"
  | "send_message"
  | "dismiss_message";

function getErrorMessage(
  value: unknown,
  fallback: string
) {
  if (value instanceof Error) {
    return value.message;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "message" in value
  ) {
    const message = (
      value as {
        message?: unknown;
      }
    ).message;

    if (
      typeof message === "string" &&
      message.trim()
    ) {
      return message;
    }
  }

  return fallback;
}

export async function getNexaManager():
Promise<NexaManager> {
  const {
    data,
    error,
  } = await supabase.rpc(
    "nexa_app_manager"
  );

  if (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Could not load NEXA state."
      )
    );
  }

  const result =
    data as NexaManager | null;

  if (!result) {
    throw new Error(
      "NEXA returned an empty manager response."
    );
  }

  if (result.ok === false) {
    throw new Error(
      result.error ||
      "Could not load NEXA state."
    );
  }

  return result;
}

export async function runNexaAction(
  action: NexaAction,
  payload: Record<string, unknown> = {}
): Promise<NexaActionResult> {
  const {
    data,
    error,
  } = await supabase.rpc(
    "nexa_app_action",
    {
      p_action: action,
      p_payload: payload,
    }
  );

  if (error) {
    throw new Error(
      getErrorMessage(
        error,
        "NEXA action failed."
      )
    );
  }

  const result =
    data as NexaActionResult | null;

  if (!result) {
    throw new Error(
      "NEXA returned an empty action response."
    );
  }

  if (result.ok === false) {
    throw new Error(
      result.error ||
      result.feedback?.line2 ||
      "NEXA action failed."
    );
  }

  if (
    !result.manager ||
    result.manager.ok === false
  ) {
    throw new Error(
      result.manager?.error ||
      "NEXA returned an invalid manager state."
    );
  }

  return result;
}

export function formatNexaSeconds(
  totalSeconds: number
) {
  const safeSeconds =
    Math.max(
      0,
      Math.floor(totalSeconds)
    );

  const hours =
    Math.floor(
      safeSeconds / 3600
    );

  const minutes =
    Math.floor(
      (safeSeconds % 3600) / 60
    );

  const seconds =
    safeSeconds % 60;

  if (hours > 0) {
    return [
      hours.toString(),

      minutes
        .toString()
        .padStart(
          2,
          "0"
        ),

      seconds
        .toString()
        .padStart(
          2,
          "0"
        ),
    ].join(":");
  }

  return [
    minutes
      .toString()
      .padStart(
        2,
        "0"
      ),

    seconds
      .toString()
      .padStart(
        2,
        "0"
      ),
  ].join(":");
}

export function getNexaFeedback(
  result: NexaActionResult
) {
  const line1 =
    result.feedback
      ?.line1
      ?.trim();

  const line2 =
    result.feedback
      ?.line2
      ?.trim();

  return [
    line1,
    line2,
  ]
    .filter(Boolean)
    .join(" — ");
}