import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  AlarmClock,
  AlertCircle,
  Bell,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ListTodo,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  SkipForward,
  Sparkles,
  Timer,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { supabase } from "../lib/supabase";

import "./Today.css";


// ============================================================
// TYPES
// ============================================================

type TaskStatus =
  | "pending"
  | "active"
  | "completed"
  | "cancelled"
  | "skipped";


type TaskPriority =
  | "low"
  | "medium"
  | "high";


type ManagerTask = {
  id: string;

  user_id: string;

  title: string;

  description: string | null;

  status: TaskStatus;

  priority: TaskPriority;

  estimated_minutes: number;

  scheduled_for: string | null;

  actual_started_at: string | null;

  actual_ended_at: string | null;

  completed_at: string | null;

  series_id: string | null;

  reminder_enabled: boolean;

  reminder_minutes_before: number;

  reminder_sent_at: string | null;

  reminder_acknowledged_at: string | null;

  snoozed_until: string | null;

  overdue_acknowledged_at: string | null;

  skipped_at: string | null;

  created_at: string;

  updated_at: string;
};


type ManagerSettings = {
  next_task_countdown_minutes: number;

  default_snooze_minutes: number;

  overdue_nudges_enabled: boolean;

  next_task_prompt_enabled: boolean;
};


type TaskKind =
  | "active"
  | "due"
  | "overdue"
  | "upcoming"
  | "snoozed"
  | "anytime";


type SummaryTone =
  | "violet"
  | "red"
  | "blue"
  | "amber";


// ============================================================
// PAGE
// ============================================================

export default function Today() {
  const navigate = useNavigate();


  const [
    tasks,
    setTasks,
  ] =
    useState<ManagerTask[]>([]);


  const [
    deviceId,
    setDeviceId,
  ] =
    useState<string | null>(
      null
    );


  const [
    settings,
    setSettings,
  ] =
    useState<ManagerSettings>({
      next_task_countdown_minutes: 5,

      default_snooze_minutes: 10,

      overdue_nudges_enabled: true,

      next_task_prompt_enabled: true,
    });


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    workingTaskId,
    setWorkingTaskId,
  ] =
    useState<string | null>(
      null
    );


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    success,
    setSuccess,
  ] =
    useState("");


  const [
    now,
    setNow,
  ] =
    useState(
      Date.now()
    );


  // ==========================================================
  // NOTIFICATION
  // ==========================================================

  function notifySuccess(
    message: string
  ) {
    setSuccess(
      message
    );


    window.setTimeout(
      () =>
        setSuccess(""),
      2500
    );
  }


  // ==========================================================
  // LOAD MANAGER
  // ==========================================================

  async function loadManager() {
    setError("");


    const {
      data: {
        user,
      },
    } =
      await supabase.auth
        .getUser();


    if (!user) {
      setError(
        "Authentication session not found."
      );

      setLoading(
        false
      );

      return;
    }


    const [
      taskResult,
      settingsResult,
      deviceResult,
    ] =
      await Promise.all([

        supabase
          .from("tasks")
          .select(
            `
              id,
              user_id,
              title,
              description,
              status,
              priority,
              estimated_minutes,
              scheduled_for,
              actual_started_at,
              actual_ended_at,
              completed_at,
              series_id,
              reminder_enabled,
              reminder_minutes_before,
              reminder_sent_at,
              reminder_acknowledged_at,
              snoozed_until,
              overdue_acknowledged_at,
              skipped_at,
              created_at,
              updated_at
            `
          )
          .in(
            "status",
            [
              "pending",
              "active",
            ]
          )
          .order(
            "scheduled_for",
            {
              ascending: true,
              nullsFirst: false,
            }
          ),


        supabase
          .from(
            "user_settings"
          )
          .select(
            `
              next_task_countdown_minutes,
              default_snooze_minutes,
              overdue_nudges_enabled,
              next_task_prompt_enabled
            `
          )
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle(),


        supabase
          .from("devices")
          .select("id")
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "enabled",
            true
          )
          .limit(1)
          .maybeSingle(),

      ]);


    if (
      taskResult.error
    ) {
      setError(
        taskResult
          .error
          .message
      );

      setLoading(
        false
      );

      return;
    }


    setTasks(
      (
        taskResult.data ??
        []
      ) as ManagerTask[]
    );


    if (
      settingsResult.error
    ) {
      console.error(
        settingsResult.error
      );
    }


    if (
      settingsResult.data
    ) {
      setSettings({
        next_task_countdown_minutes:
          settingsResult
            .data
            .next_task_countdown_minutes ??
          5,

        default_snooze_minutes:
          settingsResult
            .data
            .default_snooze_minutes ??
          10,

        overdue_nudges_enabled:
          settingsResult
            .data
            .overdue_nudges_enabled ??
          true,

        next_task_prompt_enabled:
          settingsResult
            .data
            .next_task_prompt_enabled ??
          true,
      });
    }


    setDeviceId(
      deviceResult
        .data
        ?.id ??
      null
    );


    setNow(
      Date.now()
    );


    setLoading(
      false
    );
  }


  // ==========================================================
  // AUTO REFRESH
  // ==========================================================

  useEffect(
    () => {
      loadManager();


      const refresh =
        window.setInterval(
          loadManager,
          15000
        );


      const clock =
        window.setInterval(
          () =>
            setNow(
              Date.now()
            ),
          30000
        );


      return () => {
        window.clearInterval(
          refresh
        );

        window.clearInterval(
          clock
        );
      };
    },
    []
  );


  // ==========================================================
  // DEVICE
  // ==========================================================

  function lcdText(
    value: string
  ) {
    return value
      .trim()
      .toUpperCase()
      .slice(
        0,
        16
      );
  }


  async function updateDevice(
    line1: string,
    line2: string,
    mode = "message"
  ) {
    if (!deviceId) {
      return;
    }


    await supabase
      .from(
        "device_state"
      )
      .update({
        mode,

        line1:
          lcdText(
            line1
          ),

        line2:
          lcdText(
            line2
          ),

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "device_id",
        deviceId
      );
  }


  // ==========================================================
  // NEXT TASK
  // ==========================================================

  function getNextTask(
    excludingId?: string
  ) {
    const pending =
      tasks
        .filter(
          (task) =>
            task.id !==
              excludingId &&
            task.status ===
              "pending"
        )
        .sort(
          (
            a,
            b
          ) => {
            if (
              a.scheduled_for &&
              b.scheduled_for
            ) {
              return (
                new Date(
                  a.scheduled_for
                ).getTime() -
                new Date(
                  b.scheduled_for
                ).getTime()
              );
            }


            if (
              a.scheduled_for
            ) {
              return -1;
            }


            if (
              b.scheduled_for
            ) {
              return 1;
            }


            const priorityWeight = {
              high: 3,
              medium: 2,
              low: 1,
            };


            return (
              priorityWeight[
                b.priority
              ] -
              priorityWeight[
                a.priority
              ]
            );
          }
        );


    return (
      pending[0] ??
      null
    );
  }


  async function showNextTask(
    excludingId?: string
  ) {
    const next =
      getNextTask(
        excludingId
      );


    if (
      next &&
      settings
        .next_task_prompt_enabled
    ) {
      await updateDevice(
        "NEXT TASK",
        next.title,
        "task"
      );
    }

    else {
      await updateDevice(
        "NEXA",
        "READY",
        "home"
      );
    }
  }


  // ==========================================================
  // START TASK
  // ==========================================================

  async function startTask(
    task: ManagerTask
  ) {
    setWorkingTaskId(
      task.id
    );

    setError("");


    const timestamp =
      new Date()
        .toISOString();


    const {
      error:
        releaseError,
    } =
      await supabase
        .from("tasks")
        .update({
          status:
            "pending",

          actual_ended_at:
            timestamp,
        })
        .eq(
          "status",
          "active"
        )
        .neq(
          "id",
          task.id
        );


    if (
      releaseError
    ) {
      setError(
        releaseError
          .message
      );

      setWorkingTaskId(
        null
      );

      return;
    }


    const {
      error:
        startError,
    } =
      await supabase
        .from("tasks")
        .update({
          status:
            "active",

          actual_started_at:
            timestamp,

          actual_ended_at:
            null,

          reminder_acknowledged_at:
            timestamp,

          overdue_acknowledged_at:
            timestamp,
        })
        .eq(
          "id",
          task.id
        );


    if (
      startError
    ) {
      setError(
        startError.message
      );

      setWorkingTaskId(
        null
      );

      return;
    }


    await updateDevice(
      "CURRENT TASK",
      task.title,
      "task"
    );


    notifySuccess(
      "Task started."
    );


    setWorkingTaskId(
      null
    );


    await loadManager();
  }


  // ==========================================================
  // COMPLETE TASK
  // ==========================================================

  async function completeTask(
    task: ManagerTask
  ) {
    setWorkingTaskId(
      task.id
    );

    setError("");


    const timestamp =
      new Date()
        .toISOString();


    const {
      error:
        completeError,
    } =
      await supabase
        .from("tasks")
        .update({
          status:
            "completed",

          completed_at:
            timestamp,

          actual_ended_at:
            timestamp,
        })
        .eq(
          "id",
          task.id
        );


    if (
      completeError
    ) {
      setError(
        completeError
          .message
      );

      setWorkingTaskId(
        null
      );

      return;
    }


    await showNextTask(
      task.id
    );


    notifySuccess(
      "Task completed."
    );


    setWorkingTaskId(
      null
    );


    await loadManager();
  }


  // ==========================================================
  // ACKNOWLEDGE
  // ==========================================================

  async function acknowledgeTask(
    task: ManagerTask
  ) {
    setWorkingTaskId(
      task.id
    );

    setError("");


    const timestamp =
      new Date()
        .toISOString();


    const {
      error:
        updateError,
    } =
      await supabase
        .from("tasks")
        .update({
          reminder_acknowledged_at:
            timestamp,
        })
        .eq(
          "id",
          task.id
        );


    if (
      updateError
    ) {
      setError(
        updateError.message
      );

      setWorkingTaskId(
        null
      );

      return;
    }


    const {
      error:
        eventError,
    } =
      await supabase
        .from(
          "task_reminder_events"
        )
        .insert({
          user_id:
            task.user_id,

          task_id:
            task.id,

          event_type:
            "acknowledged",
        });


    if (
      eventError
    ) {
      console.error(
        eventError
      );
    }


    await showNextTask(
      task.id
    );


    notifySuccess(
      "Reminder acknowledged."
    );


    setWorkingTaskId(
      null
    );


    await loadManager();
  }


  // ==========================================================
  // SNOOZE
  // ==========================================================

  async function snoozeTask(
    task: ManagerTask,
    minutes: number
  ) {
    setWorkingTaskId(
      task.id
    );

    setError("");


    const snoozedUntil =
      new Date(
        Date.now() +
        minutes *
        60000
      ).toISOString();


    const {
      error:
        updateError,
    } =
      await supabase
        .from("tasks")
        .update({
          snoozed_until:
            snoozedUntil,

          reminder_sent_at:
            null,

          reminder_acknowledged_at:
            null,
        })
        .eq(
          "id",
          task.id
        );


    if (
      updateError
    ) {
      setError(
        updateError.message
      );

      setWorkingTaskId(
        null
      );

      return;
    }


    const {
      error:
        eventError,
    } =
      await supabase
        .from(
          "task_reminder_events"
        )
        .insert({
          user_id:
            task.user_id,

          task_id:
            task.id,

          event_type:
            "snoozed",

          snooze_minutes:
            minutes,
        });


    if (
      eventError
    ) {
      console.error(
        eventError
      );
    }


    await updateDevice(
      `SNOOZED ${minutes}M`,
      task.title
    );


    notifySuccess(
      `Reminder snoozed for ${minutes} minutes.`
    );


    setWorkingTaskId(
      null
    );


    await loadManager();
  }


  // ==========================================================
  // POSTPONE
  // ==========================================================

  async function postponeTask(
    task: ManagerTask,
    minutes: number
  ) {
    setWorkingTaskId(
      task.id
    );

    setError("");


    const newTime =
      new Date(
        Date.now() +
        minutes *
        60000
      ).toISOString();


    const {
      error:
        updateError,
    } =
      await supabase
        .from("tasks")
        .update({
          scheduled_for:
            newTime,

          snoozed_until:
            null,

          reminder_sent_at:
            null,

          reminder_acknowledged_at:
            null,

          overdue_acknowledged_at:
            null,
        })
        .eq(
          "id",
          task.id
        );


    if (
      updateError
    ) {
      setError(
        updateError.message
      );

      setWorkingTaskId(
        null
      );

      return;
    }


    const {
      error:
        clearEventsError,
    } =
      await supabase
        .from(
          "task_reminder_events"
        )
        .delete()
        .eq(
          "task_id",
          task.id
        )
        .in(
          "event_type",
          [
            "shown",
            "overdue_prompt",
            "acknowledged",
          ]
        );


    if (
      clearEventsError
    ) {
      console.error(
        clearEventsError
      );
    }


    await updateDevice(
      `IN ${minutes} MIN`,
      task.title
    );


    notifySuccess(
      `Task postponed ${minutes} minutes.`
    );


    setWorkingTaskId(
      null
    );


    await loadManager();
  }


  // ==========================================================
  // SKIP
  // ==========================================================

  async function skipTask(
    task: ManagerTask
  ) {
    const confirmed =
      window.confirm(
        task.series_id
          ? "Skip this occurrence? The recurring routine will continue."
          : `Skip "${task.title}"?`
      );


    if (!confirmed) {
      return;
    }


    setWorkingTaskId(
      task.id
    );

    setError("");


    const timestamp =
      new Date()
        .toISOString();


    const {
      error:
        skipError,
    } =
      await supabase
        .from("tasks")
        .update({
          status:
            "skipped",

          skipped_at:
            timestamp,

          actual_ended_at:
            timestamp,
        })
        .eq(
          "id",
          task.id
        );


    if (
      skipError
    ) {
      setError(
        skipError.message
      );

      setWorkingTaskId(
        null
      );

      return;
    }


    await showNextTask(
      task.id
    );


    notifySuccess(
      task.series_id
        ? "This occurrence was skipped."
        : "Task skipped."
    );


    setWorkingTaskId(
      null
    );


    await loadManager();
  }


  // ==========================================================
  // CLASSIFICATION
  // ==========================================================

  const {
    activeTask,
    dueNow,
    overdue,
    upcoming,
    snoozed,
    anytime,
  } =
    useMemo(
      () => {
        const active =
          tasks.find(
            (task) =>
              task.status ===
                "active"
          ) ??
          null;


        const pending =
          tasks.filter(
            (task) =>
              task.status ===
                "pending"
          );


        const currentTime =
          now;


        const attentionWindow =
          settings
            .next_task_prompt_enabled
            ? (
                Math.max(
                  1,
                  settings
                    .next_task_countdown_minutes
                ) *
                60000
              )
            : 0;


        const snoozedTasks =
          pending.filter(
            (task) =>
              task
                .snoozed_until &&
              new Date(
                task
                  .snoozed_until
              ).getTime() >
                currentTime
          );


        const snoozedIds =
          new Set(
            snoozedTasks.map(
              (task) =>
                task.id
            )
          );


        const available =
          pending.filter(
            (task) =>
              !snoozedIds.has(
                task.id
              )
          );


        const due:
          ManagerTask[] =
          [];


        const overdueTasks:
          ManagerTask[] =
          [];


        const upcomingTasks:
          ManagerTask[] =
          [];


        const anytimeTasks:
          ManagerTask[] =
          [];


        for (
          const task
          of available
        ) {
          if (
            !task.scheduled_for
          ) {
            anytimeTasks.push(
              task
            );

            continue;
          }


          const scheduled =
            new Date(
              task
                .scheduled_for
            ).getTime();


          const reminderWaiting =
            Boolean(
              task
                .reminder_sent_at
            ) &&
            !task
              .reminder_acknowledged_at;


          if (
            reminderWaiting
          ) {
            due.push(
              task
            );

            continue;
          }


          if (
            scheduled <
            currentTime -
              attentionWindow
          ) {
            overdueTasks.push(
              task
            );

            continue;
          }


          if (
            scheduled <=
            currentTime +
              attentionWindow
          ) {
            due.push(
              task
            );

            continue;
          }


          upcomingTasks.push(
            task
          );
        }


        function bySchedule(
          a: ManagerTask,
          b: ManagerTask
        ) {
          if (
            !a.scheduled_for ||
            !b.scheduled_for
          ) {
            return 0;
          }


          return (
            new Date(
              a.scheduled_for
            ).getTime() -
            new Date(
              b.scheduled_for
            ).getTime()
          );
        }


        due.sort(
          bySchedule
        );


        overdueTasks.sort(
          bySchedule
        );


        upcomingTasks.sort(
          bySchedule
        );


        snoozedTasks.sort(
          (
            a,
            b
          ) =>
            new Date(
              a
                .snoozed_until ??
              0
            ).getTime() -
            new Date(
              b
                .snoozed_until ??
              0
            ).getTime()
        );


        return {
          activeTask:
            active,

          dueNow:
            due,

          overdue:
            overdueTasks,

          upcoming:
            upcomingTasks,

          snoozed:
            snoozedTasks,

          anytime:
            anytimeTasks,
        };
      },
      [
        tasks,
        now,
        settings,
      ]
    );


  // ==========================================================
  // COUNTS
  // ==========================================================

  const attentionCount =
    dueNow.length +
    (
      settings
        .overdue_nudges_enabled
        ? overdue.length
        : 0
    );


  const totalManagedTasks =
    (
      activeTask
        ? 1
        : 0
    ) +
    dueNow.length +
    overdue.length +
    upcoming.length +
    snoozed.length +
    anytime.length;


  // ==========================================================
  // HERO TASK
  // ==========================================================

  const heroTask =
    activeTask ??
    dueNow[0] ??
    (
      settings
        .overdue_nudges_enabled
        ? overdue[0]
        : null
    ) ??
    upcoming[0] ??
    anytime[0] ??
    null;


  // ==========================================================
  // DATE / TIME HELPERS
  // ==========================================================

  function formatTodayDate() {
    return new Intl
      .DateTimeFormat(
        "en-IN",
        {
          weekday: "long",

          day: "numeric",

          month: "long",
        }
      )
      .format(
        new Date(now)
      );
  }


  function formatTaskTime(
    task: ManagerTask
  ) {
    if (
      !task.scheduled_for
    ) {
      return "Anytime";
    }


    const date =
      new Date(
        task.scheduled_for
      );


    return new Intl
      .DateTimeFormat(
        "en-IN",
        {
          weekday:
            "short",

          day:
            "numeric",

          month:
            "short",

          hour:
            "numeric",

          minute:
            "2-digit",
        }
      )
      .format(date);
  }


  function relativeTime(
    task: ManagerTask
  ) {
    if (
      !task.scheduled_for
    ) {
      return "No fixed time";
    }


    const difference =
      new Date(
        task.scheduled_for
      ).getTime() -
      now;


    const absoluteMinutes =
      Math.max(
        1,
        Math.round(
          Math.abs(
            difference
          ) /
          60000
        )
      );


    if (
      difference < 0
    ) {
      if (
        absoluteMinutes <
        60
      ) {
        return `${absoluteMinutes}m late`;
      }


      const hours =
        Math.floor(
          absoluteMinutes /
          60
        );


      if (
        hours < 24
      ) {
        return `${hours}h late`;
      }


      const days =
        Math.floor(
          hours / 24
        );


      return `${days}d late`;
    }


    if (
      absoluteMinutes <
      60
    ) {
      return `in ${absoluteMinutes}m`;
    }


    const hours =
      Math.floor(
        absoluteMinutes /
        60
      );


    if (
      hours < 24
    ) {
      return `in ${hours}h`;
    }


    return formatTaskTime(
      task
    );
  }


  function snoozeTime(
    task: ManagerTask
  ) {
    if (
      !task.snoozed_until
    ) {
      return "";
    }


    return new Intl
      .DateTimeFormat(
        "en-IN",
        {
          hour:
            "numeric",

          minute:
            "2-digit",
        }
      )
      .format(
        new Date(
          task
            .snoozed_until
        )
      );
  }


  function heroKind():
    TaskKind {
    if (
      activeTask &&
      heroTask?.id ===
        activeTask.id
    ) {
      return "active";
    }


    if (
      heroTask &&
      dueNow.some(
        (task) =>
          task.id ===
          heroTask.id
      )
    ) {
      return "due";
    }


    if (
      heroTask &&
      overdue.some(
        (task) =>
          task.id ===
          heroTask.id
      )
    ) {
      return "overdue";
    }


    if (
      heroTask &&
      anytime.some(
        (task) =>
          task.id ===
          heroTask.id
      )
    ) {
      return "anytime";
    }


    return "upcoming";
  }


  function heroLabel() {
    switch (
      heroKind()
    ) {
      case "active":
        return "In progress";

      case "due":
        return "Needs attention";

      case "overdue":
        return "Overdue";

      case "anytime":
        return "Ready anytime";

      default:
        return "Next up";
    }
  }


  function heroDescription() {
    if (!heroTask) {
      return "";
    }


    if (
      heroKind() ===
      "active"
    ) {
      return "This is where your attention belongs right now.";
    }


    if (
      heroTask.scheduled_for
    ) {
      return `${formatTaskTime(heroTask)} · ${relativeTime(heroTask)}`;
    }


    return "Ready whenever you are.";
  }


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <section className="today-page">

        <div className="today-loading">

          <div className="today-loading-mark">

            <Loader2
              size={22}
            />

          </div>

          <div>

            <strong>
              Preparing your day
            </strong>

            <span>
              NEXA is organising what needs your attention.
            </span>

          </div>

        </div>

      </section>
    );
  }


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <section className="today-page">

      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <header className="today-header">

        <div className="today-header-copy">

          <div className="today-date">

            <CalendarDays
              size={15}
            />

            {formatTodayDate()}

          </div>


          <h1>
            Today
          </h1>


          <p>
            What needs your attention, what comes next,
            and what can wait.
          </p>

        </div>


        <div
          className={
            attentionCount > 0
              ? "today-health attention"
              : "today-health"
          }
        >

          <div className="today-health-icon">

            {attentionCount > 0 ? (

              <AlarmClock
                size={17}
              />

            ) : (

              <CheckCircle2
                size={17}
              />

            )}

          </div>


          <div>

            <strong>

              {attentionCount > 0
                ? `${attentionCount} ${
                    attentionCount === 1
                      ? "item"
                      : "items"
                  } need attention`
                : "You're on track"
              }

            </strong>


            <span>

              {attentionCount > 0
                ? "Start with what matters most."
                : "Nothing urgent is waiting."
              }

            </span>

          </div>

        </div>

      </header>


      {/* =====================================================
          FEEDBACK
          ===================================================== */}

      {error && (

        <div className="today-alert error">

          <AlertCircle
            size={17}
          />

          <span>
            {error}
          </span>

        </div>

      )}


      {success && (

        <div className="today-alert success">

          <CheckCircle2
            size={17}
          />

          <span>
            {success}
          </span>

        </div>

      )}


      {/* =====================================================
          NOW
          ===================================================== */}

      <section className="today-block">

        <div className="today-section-heading">

          <div>

            <span className="today-section-kicker">
              Now
            </span>

            <h2>
              What deserves your attention
            </h2>

          </div>


          <span className="today-section-note">
            Highest priority first
          </span>

        </div>


        <div
          className={
            heroTask
              ? `today-now-card ${heroKind()}`
              : "today-now-card clear"
          }
        >

          {heroTask ? (

            <>

              <div className="today-now-main">

                <div className="today-now-context">

                  {heroKind() ===
                    "active" ? (

                    <Sparkles
                      size={14}
                    />

                  ) :
                  heroKind() ===
                    "due" ? (

                    <Bell
                      size={14}
                    />

                  ) :
                  heroKind() ===
                    "overdue" ? (

                    <AlarmClock
                      size={14}
                    />

                  ) : (

                    <CalendarClock
                      size={14}
                    />

                  )}


                  {heroLabel()}

                </div>


                <h2>
                  {heroTask.title}
                </h2>


                <p>
                  {heroDescription()}
                </p>


                <div className="today-now-meta">

                  <span
                    className={
                      `today-priority ${heroTask.priority}`
                    }
                  >
                    {heroTask.priority}
                  </span>


                  <span>

                    <Timer
                      size={13}
                    />

                    {
                      heroTask
                        .estimated_minutes
                    } min

                  </span>


                  {heroTask.series_id && (

                    <span>

                      <RefreshCw
                        size={12}
                      />

                      Recurring

                    </span>

                  )}

                </div>

              </div>


              <div className="today-now-actions">

                {heroKind() ===
                  "active" ? (

                  <button
                    type="button"
                    className="today-primary-action complete"
                    disabled={
                      workingTaskId ===
                      heroTask.id
                    }
                    onClick={() =>
                      completeTask(
                        heroTask
                      )
                    }
                  >

                    {workingTaskId ===
                    heroTask.id ? (

                      <Loader2
                        className="today-spin"
                        size={17}
                      />

                    ) : (

                      <Check
                        size={17}
                      />

                    )}

                    Complete

                  </button>

                ) : (

                  <button
                    type="button"
                    className="today-primary-action"
                    disabled={
                      workingTaskId ===
                      heroTask.id
                    }
                    onClick={() =>
                      startTask(
                        heroTask
                      )
                    }
                  >

                    {workingTaskId ===
                    heroTask.id ? (

                      <Loader2
                        className="today-spin"
                        size={17}
                      />

                    ) : (

                      <Play
                        size={16}
                        fill="currentColor"
                      />

                    )}

                    Start now

                  </button>

                )}

              </div>

            </>

          ) : (

            <>

              <div className="today-clear-icon">

                <CheckCircle2
                  size={23}
                />

              </div>


              <div className="today-clear-copy">

                <span>
                  CLEAR FOR NOW
                </span>

                <h2>
                  Your attention is free.
                </h2>

                <p>
                  Nothing is waiting right now.
                  Use the space intentionally or enjoy the pause.
                </p>

              </div>


              <div className="today-clear-actions">

                <button
                  type="button"
                  className="today-primary-action"
                  onClick={() =>
                    navigate(
                      "/focus"
                    )
                  }
                >

                  <Play
                    size={15}
                    fill="currentColor"
                  />

                  Start focus

                </button>


                <button
                  type="button"
                  className="today-secondary-action"
                  onClick={() =>
                    navigate(
                      "/tasks"
                    )
                  }
                >

                  <Plus
                    size={16}
                  />

                  Add task

                </button>

              </div>

            </>

          )}

        </div>

      </section>


      {/* =====================================================
          ATTENTION
          ===================================================== */}

      <section className="today-block">

        <div className="today-section-heading">

          <div>

            <span className="today-section-kicker">
              Attention
            </span>

            <h2>
              At a glance
            </h2>

          </div>


          <span className="today-section-note">
            {totalManagedTasks}
            {" "}
            {totalManagedTasks === 1
              ? "open item"
              : "open items"
            }
          </span>

        </div>


        <div className="today-summary-grid">

          <TodaySummary
            icon={
              <Bell
                size={18}
              />
            }
            label="Due now"
            value={
              dueNow.length
            }
            description="Needs attention now"
            tone="violet"
          />


          <TodaySummary
            icon={
              <AlarmClock
                size={18}
              />
            }
            label="Overdue"
            value={
              overdue.length
            }
            description="Past scheduled time"
            tone="red"
          />


          <TodaySummary
            icon={
              <CalendarClock
                size={18}
              />
            }
            label="Upcoming"
            value={
              upcoming.length
            }
            description="Scheduled ahead"
            tone="blue"
          />


          <TodaySummary
            icon={
              <Timer
                size={18}
              />
            }
            label="Snoozed"
            value={
              snoozed.length
            }
            description="Waiting to return"
            tone="amber"
          />

        </div>

      </section>


      {/* =====================================================
          SCHEDULE
          ===================================================== */}

      <section className="today-block today-schedule">

        <div className="today-section-heading">

          <div>

            <span className="today-section-kicker">
              Schedule
            </span>

            <h2>
              The rest of your day
            </h2>

          </div>


          <button
            type="button"
            className="today-manage-link"
            onClick={() =>
              navigate(
                "/tasks"
              )
            }
          >
            Manage tasks

            <ChevronRight
              size={15}
            />

          </button>

        </div>


        {/* ACTIVE */}

        {activeTask && (

          <TodayTaskGroup
            title="In progress"
            subtitle="The task currently occupying your attention"
            icon={
              <Sparkles
                size={17}
              />
            }
            count={1}
            tone="active"
          >

            <TodayTaskCard
              task={
                activeTask
              }

              kind="active"

              busy={
                workingTaskId ===
                activeTask.id
              }

              snoozeMinutes={
                settings
                  .default_snooze_minutes
              }

              timeLabel={
                activeTask
                  .actual_started_at
                  ? "In progress"
                  : "Active"
              }

              secondaryLabel={
                `${activeTask.estimated_minutes} min estimate`
              }

              onStart={
                startTask
              }

              onComplete={
                completeTask
              }

              onAcknowledge={
                acknowledgeTask
              }

              onSnooze={
                snoozeTask
              }

              onPostpone={
                postponeTask
              }

              onSkip={
                skipTask
              }
            />

          </TodayTaskGroup>

        )}


        {/* DUE */}

        {dueNow.length >
        0 && (

          <TodayTaskGroup
            title="Needs attention"
            subtitle="Reminders and tasks due around now"
            icon={
              <Bell
                size={17}
              />
            }
            count={
              dueNow.length
            }
            tone="attention"
          >

            {dueNow.map(
              (task) => (

                <TodayTaskCard
                  key={
                    task.id
                  }

                  task={
                    task
                  }

                  kind="due"

                  busy={
                    workingTaskId ===
                    task.id
                  }

                  snoozeMinutes={
                    settings
                      .default_snooze_minutes
                  }

                  timeLabel={
                    relativeTime(
                      task
                    )
                  }

                  secondaryLabel={
                    formatTaskTime(
                      task
                    )
                  }

                  onStart={
                    startTask
                  }

                  onComplete={
                    completeTask
                  }

                  onAcknowledge={
                    acknowledgeTask
                  }

                  onSnooze={
                    snoozeTask
                  }

                  onPostpone={
                    postponeTask
                  }

                  onSkip={
                    skipTask
                  }
                />

              )
            )}

          </TodayTaskGroup>

        )}


        {/* OVERDUE */}

        {overdue.length >
        0 && (

          <TodayTaskGroup
            title="Overdue"
            subtitle={
              settings
                .overdue_nudges_enabled
                ? "Choose the next action instead of letting these drift"
                : "Tasks past their scheduled time"
            }
            icon={
              <AlarmClock
                size={17}
              />
            }
            count={
              overdue.length
            }
            tone="danger"
          >

            {overdue.map(
              (task) => (

                <TodayTaskCard
                  key={
                    task.id
                  }

                  task={
                    task
                  }

                  kind="overdue"

                  busy={
                    workingTaskId ===
                    task.id
                  }

                  snoozeMinutes={
                    settings
                      .default_snooze_minutes
                  }

                  timeLabel={
                    relativeTime(
                      task
                    )
                  }

                  secondaryLabel={
                    formatTaskTime(
                      task
                    )
                  }

                  onStart={
                    startTask
                  }

                  onComplete={
                    completeTask
                  }

                  onAcknowledge={
                    acknowledgeTask
                  }

                  onSnooze={
                    snoozeTask
                  }

                  onPostpone={
                    postponeTask
                  }

                  onSkip={
                    skipTask
                  }
                />

              )
            )}

          </TodayTaskGroup>

        )}


        {/* SNOOZED */}

        {snoozed.length >
        0 && (

          <TodayTaskGroup
            title="Snoozed"
            subtitle="Intentionally out of the way until later"
            icon={
              <Timer
                size={17}
              />
            }
            count={
              snoozed.length
            }
            tone="snoozed"
          >

            {snoozed.map(
              (task) => (

                <TodayTaskCard
                  key={
                    task.id
                  }

                  task={
                    task
                  }

                  kind="snoozed"

                  busy={
                    workingTaskId ===
                    task.id
                  }

                  snoozeMinutes={
                    settings
                      .default_snooze_minutes
                  }

                  timeLabel={
                    `Returns ${snoozeTime(task)}`
                  }

                  secondaryLabel={
                    task.scheduled_for
                      ? formatTaskTime(
                          task
                        )
                      : "Anytime"
                  }

                  onStart={
                    startTask
                  }

                  onComplete={
                    completeTask
                  }

                  onAcknowledge={
                    acknowledgeTask
                  }

                  onSnooze={
                    snoozeTask
                  }

                  onPostpone={
                    postponeTask
                  }

                  onSkip={
                    skipTask
                  }
                />

              )
            )}

          </TodayTaskGroup>

        )}


        {/* UPCOMING */}

        {upcoming.length >
        0 && (

          <TodayTaskGroup
            title="Coming up"
            subtitle="Scheduled work ahead"
            icon={
              <CalendarClock
                size={17}
              />
            }
            count={
              upcoming.length
            }
            tone="upcoming"
          >

            {upcoming
              .slice(
                0,
                12
              )
              .map(
                (task) => (

                  <TodayTaskCard
                    key={
                      task.id
                    }

                    task={
                      task
                    }

                    kind="upcoming"

                    busy={
                      workingTaskId ===
                      task.id
                    }

                    snoozeMinutes={
                      settings
                        .default_snooze_minutes
                    }

                    timeLabel={
                      relativeTime(
                        task
                      )
                    }

                    secondaryLabel={
                      formatTaskTime(
                        task
                      )
                    }

                    onStart={
                      startTask
                    }

                    onComplete={
                      completeTask
                    }

                    onAcknowledge={
                      acknowledgeTask
                    }

                    onSnooze={
                      snoozeTask
                    }

                    onPostpone={
                      postponeTask
                    }

                    onSkip={
                      skipTask
                    }
                  />

                )
              )}

          </TodayTaskGroup>

        )}


        {/* ANYTIME */}

        {anytime.length >
        0 && (

          <TodayTaskGroup
            title="Anytime"
            subtitle="Flexible work with no fixed time"
            icon={
              <ListTodo
                size={17}
              />
            }
            count={
              anytime.length
            }
            tone="anytime"
          >

            {anytime.map(
              (task) => (

                <TodayTaskCard
                  key={
                    task.id
                  }

                  task={
                    task
                  }

                  kind="anytime"

                  busy={
                    workingTaskId ===
                    task.id
                  }

                  snoozeMinutes={
                    settings
                      .default_snooze_minutes
                  }

                  timeLabel="Flexible"

                  secondaryLabel={
                    `${task.estimated_minutes} min estimate`
                  }

                  onStart={
                    startTask
                  }

                  onComplete={
                    completeTask
                  }

                  onAcknowledge={
                    acknowledgeTask
                  }

                  onSnooze={
                    snoozeTask
                  }

                  onPostpone={
                    postponeTask
                  }

                  onSkip={
                    skipTask
                  }
                />

              )
            )}

          </TodayTaskGroup>

        )}


        {/* SINGLE EMPTY STATE */}

        {totalManagedTasks ===
        0 && (

          <div className="today-empty">

            <div className="today-empty-icon">

              <CheckCircle2
                size={24}
              />

            </div>


            <div className="today-empty-copy">

              <span>
                SCHEDULE CLEAR
              </span>

              <h3>
                Nothing else needs managing.
              </h3>

              <p>
                Your day is open. Add something meaningful,
                or use the time for a focused session.
              </p>

            </div>


            <div className="today-empty-actions">

              <button
                type="button"
                className="today-primary-action"
                onClick={() =>
                  navigate(
                    "/tasks"
                  )
                }
              >

                <Plus
                  size={16}
                />

                Add task

              </button>


              <button
                type="button"
                className="today-secondary-action"
                onClick={() =>
                  navigate(
                    "/focus"
                  )
                }
              >

                <Play
                  size={15}
                  fill="currentColor"
                />

                Start focus

              </button>

            </div>

          </div>

        )}

      </section>

    </section>
  );
}


// ============================================================
// SUMMARY
// ============================================================

type TodaySummaryProps = {
  icon: ReactNode;

  label: string;

  value: number;

  description: string;

  tone: SummaryTone;
};


function TodaySummary({
  icon,
  label,
  value,
  description,
  tone,
}: TodaySummaryProps) {
  return (
    <article
      className={
        `today-summary-card ${tone}`
      }
    >

      <div className="today-summary-top">

        <div
          className={
            `today-summary-icon ${tone}`
          }
        >
          {icon}
        </div>


        <span className="today-summary-label">
          {label}
        </span>

      </div>


      <strong className="today-summary-value">
        {value}
      </strong>


      <span className="today-summary-description">
        {description}
      </span>

    </article>
  );
}


// ============================================================
// TASK GROUP
// ============================================================

type TodayTaskGroupProps = {
  title: string;

  subtitle: string;

  icon: ReactNode;

  count: number;

  tone:
    | "active"
    | "attention"
    | "danger"
    | "snoozed"
    | "upcoming"
    | "anytime";

  children: ReactNode;
};


function TodayTaskGroup({
  title,
  subtitle,
  icon,
  count,
  tone,
  children,
}: TodayTaskGroupProps) {
  return (
    <section
      className={
        `today-task-group ${tone}`
      }
    >

      <div className="today-task-group-header">

        <div className="today-task-group-title">

          <div
            className={
              `today-task-group-icon ${tone}`
            }
          >
            {icon}
          </div>


          <div>

            <div className="today-task-group-name">

              <h3>
                {title}
              </h3>

              <span>
                {count}
              </span>

            </div>


            <p>
              {subtitle}
            </p>

          </div>

        </div>

      </div>


      <div className="today-task-list">
        {children}
      </div>

    </section>
  );
}


// ============================================================
// TASK CARD
// ============================================================

type TodayTaskCardProps = {
  task: ManagerTask;

  kind: TaskKind;

  busy: boolean;

  snoozeMinutes: number;

  timeLabel: string;

  secondaryLabel: string;

  onStart:
    (
      task: ManagerTask
    ) =>
      Promise<void>;

  onComplete:
    (
      task: ManagerTask
    ) =>
      Promise<void>;

  onAcknowledge:
    (
      task: ManagerTask
    ) =>
      Promise<void>;

  onSnooze:
    (
      task: ManagerTask,
      minutes: number
    ) =>
      Promise<void>;

  onPostpone:
    (
      task: ManagerTask,
      minutes: number
    ) =>
      Promise<void>;

  onSkip:
    (
      task: ManagerTask
    ) =>
      Promise<void>;
};


function TodayTaskCard({
  task,
  kind,
  busy,
  snoozeMinutes,
  timeLabel,
  secondaryLabel,
  onStart,
  onComplete,
  onAcknowledge,
  onSnooze,
  onPostpone,
  onSkip,
}: TodayTaskCardProps) {
  const reminderWaiting =
    Boolean(
      task.reminder_sent_at
    ) &&
    !task
      .reminder_acknowledged_at;


  return (
    <article
      className={
        `today-task-card ${kind}`
      }
    >

      <div className="today-task-accent" />


      <div className="today-task-main">

        <div className="today-task-title-row">

          <h4>
            {task.title}
          </h4>


          <div className="today-task-badges">

            <span
              className={
                `today-priority ${task.priority}`
              }
            >
              {task.priority}
            </span>


            {task.series_id && (

              <span className="today-soft-badge">

                <RefreshCw
                  size={10}
                />

                Repeats

              </span>

            )}


            {reminderWaiting && (

              <span className="today-reminder-badge">

                <Bell
                  size={10}
                />

                Reminder

              </span>

            )}

          </div>

        </div>


        {task.description && (

          <p className="today-task-description">
            {task.description}
          </p>

        )}


        <div className="today-task-meta">

          <span
            className={
              kind ===
                "overdue"
                ? "late"
                : ""
            }
          >

            <Clock3
              size={12}
            />

            {timeLabel}

          </span>


          <span>

            <CalendarClock
              size={12}
            />

            {secondaryLabel}

          </span>


          <span>

            <Timer
              size={12}
            />

            {
              task
                .estimated_minutes
            } min

          </span>

        </div>

      </div>


      <div className="today-task-actions">

        {kind ===
          "active" && (

          <button
            type="button"
            className="today-task-action complete"
            disabled={busy}
            onClick={() =>
              onComplete(
                task
              )
            }
          >

            {busy ? (

              <Loader2
                className="today-spin"
                size={13}
              />

            ) : (

              <Check
                size={13}
              />

            )}

            Complete

          </button>

        )}


        {kind !==
          "active" && (

          <button
            type="button"
            className="today-task-action start"
            disabled={busy}
            onClick={() =>
              onStart(
                task
              )
            }
          >

            {busy ? (

              <Loader2
                className="today-spin"
                size={13}
              />

            ) : (

              <Play
                size={12}
                fill="currentColor"
              />

            )}

            Start

          </button>

        )}


        {kind ===
          "due" &&
        reminderWaiting && (

          <button
            type="button"
            className="today-task-action acknowledge"
            disabled={busy}
            onClick={() =>
              onAcknowledge(
                task
              )
            }
          >

            <CheckCircle2
              size={13}
            />

            Acknowledge

          </button>

        )}


        {kind ===
          "due" && (

          <button
            type="button"
            className="today-task-action snooze"
            disabled={busy}
            onClick={() =>
              onSnooze(
                task,
                snoozeMinutes
              )
            }
          >

            <Timer
              size={13}
            />

            Snooze {snoozeMinutes}m

          </button>

        )}


        {kind ===
          "overdue" && (

          <button
            type="button"
            className="today-task-action postpone"
            disabled={busy}
            onClick={() =>
              onPostpone(
                task,
                15
              )
            }
          >

            <Clock3
              size={13}
            />

            +15m

          </button>

        )}


        {kind !==
          "active" && (

          <button
            type="button"
            className="today-task-action skip"
            disabled={busy}
            onClick={() =>
              onSkip(
                task
              )
            }
          >

            <SkipForward
              size={13}
            />

            Skip

          </button>

        )}

      </div>

    </article>
  );
}