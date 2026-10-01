import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  AlarmClock,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  Coffee,
  Cpu,
  Flame,
  Gauge,
  Loader2,
  Play,
  Settings2,
  Sparkles,
  Target,
  Timer,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import PageHeader from "../components/PageHeader";
import { supabase } from "../lib/supabase";

import "./Dashboard.css";


// ============================================================
// TYPES
// ============================================================

type TaskPriority =
  | "low"
  | "medium"
  | "high";


type TaskRow = {
  id: string;
  user_id: string;

  title: string;

  status:
    | "pending"
    | "active"
    | "completed"
    | "cancelled"
    | "skipped";

  priority: TaskPriority;

  estimated_minutes: number;

  scheduled_for: string | null;

  actual_started_at: string | null;

  completed_at: string | null;

  created_at: string;
};


type FocusSession = {
  id: string;

  user_id: string;

  task_id: string | null;

  status:
    | "running"
    | "paused"
    | "completed"
    | "cancelled";

  planned_minutes: number;

  focused_seconds: number;

  started_at: string | null;

  created_at: string;
};


type BreakSession = {
  id: string;

  status:
    | "ready"
    | "running"
    | "paused"
    | "completed"
    | "cancelled";

  planned_minutes: number;

  elapsed_seconds: number;

  started_at: string | null;

  created_at: string;
};


type DeviceRow = {
  id: string;

  name: string | null;

  enabled: boolean | null;

  last_seen: string | null;

  firmware_version: string | null;
};


type DeviceStateRow = {
  device_id: string;

  mode: string;

  line1: string | null;

  line2: string | null;

  focus_minutes: number | null;

  updated_at: string | null;
};


type UserSettings = {
  display_name: string;

  sound_enabled: boolean;

  default_focus_minutes: number;

  default_break_minutes: number;
};


type DailyGoal = {
  task_goal: number;

  focus_minutes_goal: number;
};


type DayActivity = {
  key: string;

  label: string;

  shortDate: string;

  tasks: number;

  focusMinutes: number;
};


const PRIORITY_WEIGHT: Record<
  TaskPriority,
  number
> = {
  low: 1,
  medium: 2,
  high: 3,
};


// ============================================================
// DASHBOARD
// ============================================================

export default function Dashboard() {
  const navigate =
    useNavigate();


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    now,
    setNow,
  ] =
    useState(
      Date.now()
    );


  const [
    userId,
    setUserId,
  ] =
    useState("");


  const [
    tasks,
    setTasks,
  ] =
    useState<TaskRow[]>([]);


  const [
    taskHistory,
    setTaskHistory,
  ] =
    useState<TaskRow[]>([]);


  const [
    focusSessions,
    setFocusSessions,
  ] =
    useState<FocusSession[]>([]);


  const [
    breakSessions,
    setBreakSessions,
  ] =
    useState<BreakSession[]>([]);


  const [
    device,
    setDevice,
  ] =
    useState<DeviceRow | null>(
      null
    );


  const [
    deviceState,
    setDeviceState,
  ] =
    useState<DeviceStateRow | null>(
      null
    );


  const [
    settings,
    setSettings,
  ] =
    useState<UserSettings>({
      display_name: "",

      sound_enabled: true,

      default_focus_minutes: 25,

      default_break_minutes: 5,
    });


  const [
    goal,
    setGoal,
  ] =
    useState<DailyGoal>({
      task_goal: 5,

      focus_minutes_goal: 120,
    });


  const [
    voiceSaving,
    setVoiceSaving,
  ] =
    useState(false);


  const [
    taskStarting,
    setTaskStarting,
  ] =
    useState(false);


  // =========================================================
  // LOAD
  // =========================================================

  const loadDashboard =
    useCallback(
      async (
        manual = false
      ) => {

        if (manual) {
          setRefreshing(
            true
          );
        }

        else {
          setLoading(
            true
          );
        }


        setError("");


        try {
          const {
            data: {
              user,
            },

            error:
              userError,
          } =
            await supabase
              .auth
              .getUser();


          if (userError) {
            throw userError;
          }


          if (!user) {
            throw new Error(
              "Authentication session not found."
            );
          }


          setUserId(
            user.id
          );


          const sevenDaysAgo =
            startOfDaysAgo(
              6
            );


          const [
            openTaskResult,
            historyTaskResult,
            focusResult,
            breakResult,
            settingsResult,
            goalResult,
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
                    status,
                    priority,
                    estimated_minutes,
                    scheduled_for,
                    actual_started_at,
                    completed_at,
                    created_at
                  `
                )
                .eq(
                  "user_id",
                  user.id
                )
                .in(
                  "status",
                  [
                    "pending",
                    "active",
                  ]
                ),


              supabase
                .from("tasks")
                .select(
                  `
                    id,
                    user_id,
                    title,
                    status,
                    priority,
                    estimated_minutes,
                    scheduled_for,
                    actual_started_at,
                    completed_at,
                    created_at
                  `
                )
                .eq(
                  "user_id",
                  user.id
                )
                .eq(
                  "status",
                  "completed"
                )
                .gte(
                  "completed_at",
                  sevenDaysAgo
                ),


              supabase
  .from(
    "focus_sessions"
  )
  .select(
    `
      id,
      user_id,
      task_id,
      status,
      planned_minutes,
      focused_seconds,
      started_at,
      created_at
    `
  )
                .eq(
                  "user_id",
                  user.id
                )
                .gte(
                  "created_at",
                  sevenDaysAgo
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      false,
                  }
                ),


              supabase
                .from(
                  "break_sessions"
                )
                .select(
                  `
                    id,
                    status,
                    planned_minutes,
                    elapsed_seconds,
                    started_at,
                    created_at
                  `
                )
                .eq(
                  "user_id",
                  user.id
                )
                .in(
                  "status",
                  [
                    "ready",
                    "running",
                    "paused",
                  ]
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      false,
                  }
                )
                .limit(10),


              supabase
                .from(
                  "user_settings"
                )
                .select(
                  `
                    display_name,
                    sound_enabled,
                    default_focus_minutes,
                    default_break_minutes
                  `
                )
                .eq(
                  "user_id",
                  user.id
                )
                .maybeSingle(),


              supabase
                .from(
                  "daily_goals"
                )
                .select(
                  `
                    task_goal,
                    focus_minutes_goal
                  `
                )
                .eq(
                  "user_id",
                  user.id
                )
                .limit(1)
                .maybeSingle(),


              supabase
                .from("devices")
                .select(
                  `
                    id,
                    name,
                    enabled,
                    last_seen,
                    firmware_version
                  `
                )
                .eq(
                  "user_id",
                  user.id
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      false,
                  }
                )
                .limit(1)
                .maybeSingle(),

            ]);


          if (
            openTaskResult.error
          ) {
            throw openTaskResult
              .error;
          }


          if (
            historyTaskResult.error
          ) {
            throw historyTaskResult
              .error;
          }


          if (
            focusResult.error
          ) {
            throw focusResult
              .error;
          }


          if (
            breakResult.error
          ) {
            console.error(
              breakResult.error
            );
          }


          setTasks(
            (
              openTaskResult
                .data
              ??
              []
            ) as TaskRow[]
          );


          setTaskHistory(
            (
              historyTaskResult
                .data
              ??
              []
            ) as TaskRow[]
          );


          setFocusSessions(
            (
              focusResult.data
              ??
              []
            ) as FocusSession[]
          );


          setBreakSessions(
            (
              breakResult.data
              ??
              []
            ) as BreakSession[]
          );


          if (
            settingsResult.error
          ) {
            console.error(
              settingsResult
                .error
            );
          }


          setSettings({
            display_name:
              settingsResult
                .data
                ?.display_name
              ??
              "",

            sound_enabled:
              settingsResult
                .data
                ?.sound_enabled
              ??
              true,

            default_focus_minutes:
              settingsResult
                .data
                ?.default_focus_minutes
              ??
              25,

            default_break_minutes:
              settingsResult
                .data
                ?.default_break_minutes
              ??
              5,
          });


          if (
            goalResult.error
          ) {
            console.error(
              goalResult
                .error
            );
          }


          setGoal({
            task_goal:
              goalResult
                .data
                ?.task_goal
              ??
              5,

            focus_minutes_goal:
              goalResult
                .data
                ?.focus_minutes_goal
              ??
              120,
          });


          if (
            deviceResult.error
          ) {
            console.error(
              deviceResult
                .error
            );
          }


          const nextDevice =
            deviceResult
              .data as
              DeviceRow |
              null;


          setDevice(
            nextDevice
          );


          if (
            nextDevice
          ) {
            const {
              data:
                stateData,

              error:
                stateError,
            } =
              await supabase
                .from(
                  "device_state"
                )
                .select(
                  `
                    device_id,
                    mode,
                    line1,
                    line2,
                    focus_minutes,
                    updated_at
                  `
                )
                .eq(
                  "device_id",
                  nextDevice.id
                )
                .maybeSingle();


            if (
              stateError
            ) {
              console.error(
                stateError
              );
            }


            setDeviceState(
              stateData as
                DeviceStateRow |
                null
            );
          }

          else {
            setDeviceState(
              null
            );
          }


          setNow(
            Date.now()
          );
        }

        catch (
          caughtError
        ) {
          console.error(
            caughtError
          );


          setError(
            caughtError instanceof
              Error
              ? caughtError
                  .message
              : "Could not load the dashboard."
          );
        }

        finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }

      },
      []
    );


  useEffect(
    () => {

      void loadDashboard();


      const refresh =
        window.setInterval(
          () => {
            void loadDashboard();
          },
          15000
        );


      const clock =
        window.setInterval(
          () => {
            setNow(
              Date.now()
            );
          },
          1000
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
    [
      loadDashboard,
    ]
  );


  // =========================================================
  // CURRENT STATES
  // =========================================================

  const activeTask =
    useMemo(
      () =>
        tasks.find(
          (task) =>
            task.status ===
            "active"
        )
        ??
        null,
      [
        tasks,
      ]
    );


  const activeFocus =
    useMemo(
      () =>
        focusSessions.find(
          (session) =>
            session.status ===
              "running"
            ||
            session.status ===
              "paused"
        )
        ??
        null,
      [
        focusSessions,
      ]
    );


  const activeBreak =
    useMemo(
      () =>
        breakSessions.find(
          (session) =>
            session.status ===
              "ready"
            ||
            session.status ===
              "running"
            ||
            session.status ===
              "paused"
        )
        ??
        null,
      [
        breakSessions,
      ]
    );


  const nextTask =
    useMemo(
      () => {

        const pending =
          tasks
            .filter(
              (task) =>
                task.status ===
                "pending"
            )
            .sort(
              compareTasks
            );


        return (
          pending[0]
          ??
          null
        );

      },
      [
        tasks,
      ]
    );


  // =========================================================
  // TODAY STATS
  // =========================================================

  const completedToday =
    useMemo(
      () =>
        taskHistory.filter(
          (task) =>
            Boolean(
              task.completed_at
            )
            &&
            isToday(
              task
                .completed_at!,
              now
            )
        ),
      [
        taskHistory,
        now,
      ]
    );


  const focusMinutesToday =
    useMemo(
      () => {

        const seconds =
          focusSessions.reduce(
            (
              total,
              session
            ) => {

              if (
                !isToday(
                  session.created_at,
                  now
                )
              ) {
                return total;
              }


              return (
                total
                +
                sessionFocusedSeconds(
                  session,
                  now
                )
              );

            },
            0
          );


        return Math.round(
          seconds /
          60
        );

      },
      [
        focusSessions,
        now,
      ]
    );


  const focusSessionsToday =
    useMemo(
      () =>
        focusSessions.filter(
          (session) =>
            isToday(
              session.created_at,
              now
            )
            &&
            (
              session.status ===
                "completed"
              ||
              session.status ===
                "running"
              ||
              session.status ===
                "paused"
            )
        ).length,
      [
        focusSessions,
        now,
      ]
    );


  // =========================================================
  // GOALS
  // =========================================================

  const taskGoalProgress =
    percentage(
      completedToday.length,
      Math.max(
        1,
        goal.task_goal
      )
    );


  const focusGoalProgress =
    percentage(
      focusMinutesToday,
      Math.max(
        1,
        goal
          .focus_minutes_goal
      )
    );


  const overallProgress =
    Math.round(
      (
        taskGoalProgress
        +
        focusGoalProgress
      )
      /
      2
    );


  // =========================================================
  // DEVICE
  // =========================================================

  const deviceOnline =
    useMemo(
      () => {

        if (
          !device
          ||
          device.enabled ===
            false
          ||
          !device.last_seen
        ) {
          return false;
        }


        return (
          now -
          new Date(
            device.last_seen
          )
            .getTime()
        )
        <=
        90000;

      },
      [
        device,
        now,
      ]
    );


  // =========================================================
  // 7-DAY ACTIVITY
  // =========================================================

  const weekActivity =
    useMemo(
      () =>
        buildWeekActivity(
          taskHistory,
          focusSessions,
          now
        ),
      [
        taskHistory,
        focusSessions,
        now,
      ]
    );


  const maxWeekFocus =
    Math.max(
      1,
      ...weekActivity.map(
        (day) =>
          day.focusMinutes
      )
    );


  // =========================================================
  // GREETING
  // =========================================================

  const greeting =
    greetingForHour(
      new Date(
        now
      ).getHours()
    );


  const displayName =
    settings
      .display_name
      .trim();


  // =========================================================
  // VOICE
  // =========================================================

  async function toggleVoice() {
    if (
      !userId
      ||
      voiceSaving
    ) {
      return;
    }


    const next =
      !settings
        .sound_enabled;


    setVoiceSaving(
      true
    );


    try {
      const {
        error:
          updateError,
      } =
        await supabase
          .from(
            "user_settings"
          )
          .update({
            sound_enabled:
              next,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "user_id",
            userId
          );


      if (
        updateError
      ) {
        throw updateError;
      }


      setSettings(
        (
          current
        ) => ({
          ...current,

          sound_enabled:
            next,
        })
      );
    }

    catch (
      caughtError
    ) {
      console.error(
        caughtError
      );


      setError(
        caughtError instanceof
          Error
          ? caughtError
              .message
          : "Could not update voice announcements."
      );
    }

    finally {
      setVoiceSaving(
        false
      );
    }
  }


  // =========================================================
  // START NEXT TASK
  // =========================================================

  async function startTask(
    task: TaskRow
  ) {
    if (
      !userId
      ||
      taskStarting
    ) {
      return;
    }


    setTaskStarting(
      true
    );

    setError("");


    try {
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
            "user_id",
            userId
          )
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
        throw releaseError;
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
        throw startError;
      }


      if (
        device
      ) {
        const {
          error:
            deviceError,
        } =
          await supabase
            .from(
              "device_state"
            )
            .update({
              mode:
                "task",

              line1:
                "CURRENT TASK",

              line2:
                task.title
                  .toUpperCase()
                  .slice(
                    0,
                    16
                  ),

              updated_at:
                timestamp,
            })
            .eq(
              "device_id",
              device.id
            );


        if (
          deviceError
        ) {
          console.error(
            deviceError
          );
        }
      }


      await loadDashboard();
    }

    catch (
      caughtError
    ) {
      console.error(
        caughtError
      );


      setError(
        caughtError instanceof
          Error
          ? caughtError
              .message
          : "Could not start the task."
      );
    }

    finally {
      setTaskStarting(
        false
      );
    }
  }


  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <section className="dashboard-page dashboard-loading-page">

        <div className="dashboard-loading">

          <div className="dashboard-loading-icon">

            <Loader2
              size={22}
            />

          </div>


          <div>

            <strong>
              Preparing NEXA
            </strong>

            <span>
              Building your workspace overview.
            </span>

          </div>

        </div>

      </section>
    );
  }


  // =========================================================
  // HEADER ACTION
  // =========================================================

  const headerAction = (

    <button
      type="button"
      className={
        `dashboard-device-pill ${
          deviceOnline
            ? "online"
            : "offline"
        }`
      }
      onClick={() =>
        navigate(
          "/device"
        )
      }
    >

      <span />

      {deviceOnline ? (

        <Wifi
          size={15}
        />

      ) : (

        <WifiOff
          size={15}
        />

      )}


      <strong>
        {
          device
            ?.name
          ??
          "NEXA"
        }
      </strong>


      <small>
        {deviceOnline
          ? "Online"
          : "Offline"}
      </small>

    </button>

  );


  // =========================================================
  // UI
  // =========================================================

  return (
    <section className="dashboard-page">

      <PageHeader
        eyebrow="NEXA WORKSPACE"
        title="Dashboard"
        description={
          displayName
            ? `${greeting}, ${displayName}. Here's what deserves your attention right now.`
            : `${greeting}. Here's what deserves your attention right now.`
        }
        action={
          headerAction
        }
      />


      <div className="dashboard-page-body">

        {error && (

          <div className="dashboard-notice error">

            <AlarmClock
              size={16}
            />

            {error}

          </div>

        )}


        {/* ===================================================
            RIGHT NOW
            =================================================== */}

        <section className="dashboard-section">

          <div className="dashboard-section-heading">

            <div>

              <span>
                RIGHT NOW
              </span>

              <h2>
                Your current state
              </h2>

            </div>


            <button
              type="button"
              className="dashboard-refresh"
              disabled={
                refreshing
              }
              onClick={() =>
                void loadDashboard(
                  true
                )
              }
            >

              {refreshing ? (

                <Loader2
                  className="dashboard-spin"
                  size={14}
                />

              ) : (

                <Sparkles
                  size={14}
                />

              )}

              Refresh

            </button>

          </div>


          <div className="dashboard-hero-grid">

            <CurrentStateCard
              activeBreak={
                activeBreak
              }

              activeFocus={
                activeFocus
              }

              activeTask={
                activeTask
              }

              nextTask={
                nextTask
              }

              now={
                now
              }

              taskStarting={
                taskStarting
              }

              onStartTask={
                startTask
              }

              onOpenFocus={() =>
                navigate(
                  "/focus"
                )
              }

              onOpenToday={() =>
                navigate(
                  "/today"
                )
              }

              onAddTask={() =>
                navigate(
                  "/tasks"
                )
              }
            />


            {/* ===============================================
                NEXA COMPANION
                =============================================== */}

            <article className="dashboard-nexa-card">

              <div className="dashboard-nexa-heading">

                <div className="dashboard-nexa-icon">

                  <Cpu
                    size={20}
                  />

                </div>


                <div>

                  <span>
                    DESK COMPANION
                  </span>

                  <h2>
                    {
                      device
                        ?.name
                      ??
                      "NEXA-01"
                    }
                  </h2>

                </div>


                <div
                  className={
                    `dashboard-nexa-status ${
                      deviceOnline
                        ? "online"
                        : ""
                    }`
                  }
                >

                  <i />

                  {deviceOnline
                    ? "Online"
                    : "Offline"}

                </div>

              </div>


              <div className="dashboard-nexa-display">

                <span>
                  LIVE DISPLAY
                </span>

                <strong>
                  {
                    deviceState
                      ?.line1
                    ||
                    "NEXA"
                  }
                </strong>

                <small>
                  {
                    deviceState
                      ?.line2
                    ||
                    "READY"
                  }
                </small>

              </div>


              <div className="dashboard-nexa-info">

                <div>

                  <span>
                    Mode
                  </span>

                  <strong>
                    {
                      capitalise(
                        deviceState
                          ?.mode
                        ||
                        "home"
                      )
                    }
                  </strong>

                </div>


                <div>

                  <span>
                    Last seen
                  </span>

                  <strong>
                    {
                      device
                        ?.last_seen
                        ? relativeDate(
                            device
                              .last_seen,
                            now
                          )
                        : "Never"
                    }
                  </strong>

                </div>

              </div>


              <div className="dashboard-audio-controls">

                <div className="dashboard-audio-row">

                  <div>

                    <Volume2
                      size={15}
                    />

                    <span>
                      Beep feedback
                    </span>

                  </div>


                  <strong className="always">
                    Always on
                  </strong>

                </div>


                <div className="dashboard-audio-row">

                  <div>

                    {
                      settings
                        .sound_enabled
                        ? (
                          <Volume2
                            size={15}
                          />
                        )
                        : (
                          <VolumeX
                            size={15}
                          />
                        )
                    }

                    <span>
                      Voice announcements
                    </span>

                  </div>


                  <button
                    type="button"
                    className={
                      `dashboard-mini-switch ${
                        settings
                          .sound_enabled
                          ? "on"
                          : ""
                      }`
                    }
                    disabled={
                      voiceSaving
                    }
                    aria-label="Toggle voice announcements"
                    onClick={
                      toggleVoice
                    }
                  >

                    <span />

                  </button>

                </div>

              </div>


              <button
                type="button"
                className="dashboard-device-link"
                onClick={() =>
                  navigate(
                    "/device"
                  )
                }
              >

                Open device

                <ArrowRight
                  size={14}
                />

              </button>

            </article>

          </div>

        </section>


        {/* ===================================================
            TODAY
            =================================================== */}

        <section className="dashboard-section">

          <div className="dashboard-section-heading">

            <div>

              <span>
                TODAY
              </span>

              <h2>
                Progress at a glance
              </h2>

            </div>


            <button
              type="button"
              className="dashboard-section-link"
              onClick={() =>
                navigate(
                  "/today"
                )
              }
            >

              Open Today

              <ArrowRight
                size={14}
              />

            </button>

          </div>


          <div className="dashboard-metrics-grid">

            <DashboardMetric
              icon={
                <CheckCircle2
                  size={18}
                />
              }

              value={
                String(
                  completedToday
                    .length
                )
              }

              label="Tasks completed"

              helper={
                `${
                  goal.task_goal
                } daily goal`
              }

              tone="green"
            />


            <DashboardMetric
              icon={
                <Timer
                  size={18}
                />
              }

              value={
                `${focusMinutesToday}m`
              }

              label="Focus time"

              helper={
                `${
                  goal
                    .focus_minutes_goal
                }m daily goal`
              }

              tone="violet"
            />


            <DashboardMetric
              icon={
                <Flame
                  size={18}
                />
              }

              value={
                String(
                  focusSessionsToday
                )
              }

              label="Focus sessions"

              helper="Today"

              tone="orange"
            />


            <DashboardMetric
              icon={
                <Gauge
                  size={18}
                />
              }

              value={
                `${overallProgress}%`
              }

              label="Daily progress"

              helper="Tasks + focus"

              tone="blue"
            />

          </div>

        </section>


        {/* ===================================================
            NEXT + GOALS
            =================================================== */}

        <section className="dashboard-lower-grid">

          {/* NEXT */}

          <article className="dashboard-panel">

            <div className="dashboard-panel-heading">

              <div>

                <span>
                  NEXT
                </span>

                <h2>
                  What comes next
                </h2>

              </div>


              <CalendarClock
                size={18}
              />

            </div>


            {nextTask ? (

              <div className="dashboard-next-task">

                <div className="dashboard-next-time">

                  <span>
                    {
                      nextTask
                        .scheduled_for
                        ? relativeTaskTime(
                            nextTask
                              .scheduled_for,
                            now
                          )
                        : "ANYTIME"
                    }
                  </span>

                  <strong>
                    {
                      nextTask
                        .scheduled_for
                        ? formatClockTime(
                            nextTask
                              .scheduled_for
                          )
                        : "Open"
                    }
                  </strong>

                </div>


                <div className="dashboard-next-main">

                  <div>

                    <span
                      className={
                        `dashboard-priority ${
                          nextTask
                            .priority
                        }`
                      }
                    >
                      {
                        nextTask
                          .priority
                      }
                    </span>


                    <h3>
                      {
                        nextTask
                          .title
                      }
                    </h3>


                    <p>
                      {
                        nextTask
                          .estimated_minutes
                      } minute estimate
                    </p>

                  </div>


                  <button
                    type="button"
                    disabled={
                      taskStarting
                    }
                    onClick={() =>
                      void startTask(
                        nextTask
                      )
                    }
                  >

                    {taskStarting ? (

                      <Loader2
                        className="dashboard-spin"
                        size={14}
                      />

                    ) : (

                      <Play
                        size={13}
                        fill="currentColor"
                      />

                    )}

                    Start

                  </button>

                </div>

              </div>

            ) : (

              <div className="dashboard-panel-empty">

                <div>

                  <Check
                    size={18}
                  />

                </div>


                <strong>
                  Nothing is waiting.
                </strong>


                <span>
                  Your task queue is clear.
                </span>


                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/tasks"
                    )
                  }
                >

                  Add a task

                  <ArrowRight
                    size={13}
                  />

                </button>

              </div>

            )}

          </article>


          {/* GOALS */}

          <article className="dashboard-panel">

            <div className="dashboard-panel-heading">

              <div>

                <span>
                  DAILY GOALS
                </span>

                <h2>
                  Keep the day balanced
                </h2>

              </div>


              <Target
                size={18}
              />

            </div>


            <GoalProgress
              icon={
                <CheckCircle2
                  size={16}
                />
              }

              title="Tasks"

              current={
                completedToday
                  .length
              }

              goal={
                goal
                  .task_goal
              }

              progress={
                taskGoalProgress
              }

              suffix=""
            />


            <GoalProgress
              icon={
                <Timer
                  size={16}
                />
              }

              title="Focus"

              current={
                focusMinutesToday
              }

              goal={
                goal
                  .focus_minutes_goal
              }

              progress={
                focusGoalProgress
              }

              suffix="m"
            />


            <button
              type="button"
              className="dashboard-goal-settings"
              onClick={() =>
                navigate(
                  "/settings"
                )
              }
            >

              <Settings2
                size={14}
              />

              Adjust preferences

            </button>

          </article>

        </section>


        {/* ===================================================
            WEEK RHYTHM
            =================================================== */}

        <section className="dashboard-section dashboard-week-section">

          <div className="dashboard-section-heading">

            <div>

              <span>
                RECENT RHYTHM
              </span>

              <h2>
                Your last seven days
              </h2>

            </div>


            <span className="dashboard-week-legend">

              <i />

              Focus minutes

            </span>

          </div>


          <div className="dashboard-week-card">

            <div className="dashboard-week-bars">

              {weekActivity.map(
                (
                  day,
                  index
                ) => {

                  const height =
                    Math.max(
                      day.focusMinutes >
                      0
                        ? 10
                        : 3,

                      Math.round(
                        (
                          day
                            .focusMinutes
                          /
                          maxWeekFocus
                        )
                        *
                        100
                      )
                    );


                  return (
                    <div
                      className="dashboard-day"
                      key={
                        day.key
                      }
                    >

                      <div className="dashboard-day-bar-space">

                        <div
                          className={
                            `dashboard-day-bar ${
                              index ===
                              weekActivity.length -
                                1
                                ? "today"
                                : ""
                            }`
                          }
                          style={{
                            height:
                              `${height}%`,
                          }}
                        >

                          {day.focusMinutes >
                          0 && (

                            <span>
                              {
                                day
                                  .focusMinutes
                              }m
                            </span>

                          )}

                        </div>

                      </div>


                      <strong>
                        {
                          day
                            .label
                        }
                      </strong>


                      <small>
                        {
                          day
                            .tasks
                        }
                        {" "}
                        {
                          day.tasks ===
                          1
                            ? "task"
                            : "tasks"
                        }
                      </small>

                    </div>
                  );

                }
              )}

            </div>

          </div>

        </section>

      </div>

    </section>
  );
}


// ============================================================
// CURRENT STATE
// ============================================================

function CurrentStateCard({
  activeBreak,
  activeFocus,
  activeTask,
  nextTask,
  now,
  taskStarting,
  onStartTask,
  onOpenFocus,
  onOpenToday,
  onAddTask,
}: {
  activeBreak: BreakSession | null;

  activeFocus: FocusSession | null;

  activeTask: TaskRow | null;

  nextTask: TaskRow | null;

  now: number;

  taskStarting: boolean;

  onStartTask:
    (
      task: TaskRow
    ) =>
      Promise<void>;

  onOpenFocus:
    () =>
      void;

  onOpenToday:
    () =>
      void;

  onAddTask:
    () =>
      void;
}) {

  // BREAK

  if (activeBreak) {
    const remaining =
      breakRemaining(
        activeBreak,
        now
      );


    return (
      <article className="dashboard-current-card break">

        <CurrentBadge
          icon={
            <Coffee
              size={14}
            />
          }
          label="Recovery break"
        />


        <div className="dashboard-current-content">

          <div>

            <span className="dashboard-current-kicker">
              TAKE THE PAUSE
            </span>

            <h2>
              Reset before the next round.
            </h2>

            <p>
              Recovery is part of the focus cycle.
            </p>

          </div>


          <strong className="dashboard-current-timer">
            {
              formatSeconds(
                remaining
              )
            }
          </strong>

        </div>


        <button
          type="button"
          className="dashboard-current-primary"
          onClick={
            onOpenFocus
          }
        >

          Open break

          <ArrowRight
            size={15}
          />

        </button>

      </article>
    );
  }


  // FOCUS

  if (activeFocus) {
    const remaining =
      focusRemaining(
        activeFocus,
        now
      );


    return (
      <article className="dashboard-current-card focus">

        <CurrentBadge
          icon={
            <Flame
              size={14}
            />
          }
          label={
            activeFocus.status ===
            "paused"
              ? "Focus paused"
              : "Focus in progress"
          }
        />


        <div className="dashboard-current-content">

          <div>

            <span className="dashboard-current-kicker">
              DEEP WORK
            </span>

            <h2>
              Stay with the work.
            </h2>

            <p>
              {
                activeFocus
                  .planned_minutes
              } minute focus session.
            </p>

          </div>


          <strong className="dashboard-current-timer">
            {
              formatSeconds(
                remaining
              )
            }
          </strong>

        </div>


        <button
          type="button"
          className="dashboard-current-primary"
          onClick={
            onOpenFocus
          }
        >

          {
            activeFocus
              .status ===
            "paused"
              ? "Resume focus"
              : "Open focus"
          }

          <ArrowRight
            size={15}
          />

        </button>

      </article>
    );
  }


  // ACTIVE TASK

  if (activeTask) {
    return (
      <article className="dashboard-current-card task">

        <CurrentBadge
          icon={
            <Zap
              size={14}
            />
          }
          label="Current task"
        />


        <div className="dashboard-current-content">

          <div>

            <span className="dashboard-current-kicker">
              IN PROGRESS
            </span>

            <h2>
              {
                activeTask
                  .title
              }
            </h2>

            <p>
              {
                activeTask
                  .estimated_minutes
              } minute estimate
              {
                activeTask
                  .scheduled_for
                  ? ` · ${formatTaskDate(
                      activeTask
                        .scheduled_for
                    )}`
                  : ""
              }
            </p>

          </div>


          <span
            className={
              `dashboard-current-priority ${
                activeTask
                  .priority
              }`
            }
          >
            {
              activeTask
                .priority
            }
          </span>

        </div>


        <button
          type="button"
          className="dashboard-current-primary"
          onClick={
            onOpenToday
          }
        >

          Open task

          <ArrowRight
            size={15}
          />

        </button>

      </article>
    );
  }


  // NEXT TASK

  if (nextTask) {
    return (
      <article className="dashboard-current-card next">

        <CurrentBadge
          icon={
            <CalendarClock
              size={14}
            />
          }
          label="Next up"
        />


        <div className="dashboard-current-content">

          <div>

            <span className="dashboard-current-kicker">
              READY WHEN YOU ARE
            </span>

            <h2>
              {
                nextTask
                  .title
              }
            </h2>

            <p>
              {
                nextTask
                  .scheduled_for
                  ? formatTaskDate(
                      nextTask
                        .scheduled_for
                    )
                  : "No fixed schedule"
              }
              {" · "}
              {
                nextTask
                  .estimated_minutes
              } min
            </p>

          </div>


          <span
            className={
              `dashboard-current-priority ${
                nextTask
                  .priority
              }`
            }
          >
            {
              nextTask
                .priority
            }
          </span>

        </div>


        <div className="dashboard-current-actions">

          <button
            type="button"
            className="dashboard-current-primary"
            disabled={
              taskStarting
            }
            onClick={() =>
              void onStartTask(
                nextTask
              )
            }
          >

            {taskStarting ? (

              <Loader2
                className="dashboard-spin"
                size={14}
              />

            ) : (

              <Play
                size={13}
                fill="currentColor"
              />

            )}

            Start task

          </button>


          <button
            type="button"
            className="dashboard-current-secondary"
            onClick={
              onOpenToday
            }
          >

            View Today

          </button>

        </div>

      </article>
    );
  }


  // CLEAR

  return (
    <article className="dashboard-current-card clear">

      <CurrentBadge
        icon={
          <CheckCircle2
            size={14}
          />
        }
        label="Clear for now"
      />


      <div className="dashboard-current-content">

        <div>

          <span className="dashboard-current-kicker">
            OPEN SPACE
          </span>

          <h2>
            Nothing is demanding your attention.
          </h2>

          <p>
            Start a focus session or capture the next meaningful task.
          </p>

        </div>

      </div>


      <div className="dashboard-current-actions">

        <button
          type="button"
          className="dashboard-current-primary"
          onClick={
            onOpenFocus
          }
        >

          <Play
            size={13}
            fill="currentColor"
          />

          Start focus

        </button>


        <button
          type="button"
          className="dashboard-current-secondary"
          onClick={
            onAddTask
          }
        >

          Add task

        </button>

      </div>

    </article>
  );
}


// ============================================================
// CURRENT BADGE
// ============================================================

function CurrentBadge({
  icon,
  label,
}: {
  icon: ReactNode;

  label: string;
}) {
  return (
    <div className="dashboard-current-badge">

      {icon}

      {label}

    </div>
  );
}


// ============================================================
// METRIC
// ============================================================

function DashboardMetric({
  icon,
  value,
  label,
  helper,
  tone,
}: {
  icon: ReactNode;

  value: string;

  label: string;

  helper: string;

  tone:
    | "green"
    | "violet"
    | "orange"
    | "blue";
}) {
  return (
    <article className="dashboard-metric">

      <div
        className={
          `dashboard-metric-icon ${tone}`
        }
      >
        {icon}
      </div>


      <div>

        <strong>
          {value}
        </strong>

        <span>
          {label}
        </span>

        <small>
          {helper}
        </small>

      </div>

    </article>
  );
}


// ============================================================
// GOAL
// ============================================================

function GoalProgress({
  icon,
  title,
  current,
  goal,
  progress,
  suffix,
}: {
  icon: ReactNode;

  title: string;

  current: number;

  goal: number;

  progress: number;

  suffix: string;
}) {
  return (
    <div className="dashboard-goal">

      <div className="dashboard-goal-top">

        <div>

          <span className="dashboard-goal-icon">
            {icon}
          </span>


          <strong>
            {title}
          </strong>

        </div>


        <span>
          {current}
          {suffix}
          {" / "}
          {goal}
          {suffix}
        </span>

      </div>


      <div className="dashboard-progress-track">

        <div
          style={{
            width:
              `${progress}%`,
          }}
        />

      </div>


      <small>
        {progress}% complete
      </small>

    </div>
  );
}


// ============================================================
// HELPERS
// ============================================================

function compareTasks(
  a: TaskRow,
  b: TaskRow
) {
  const now =
    Date.now();


  const aOverdue =
    Boolean(
      a.scheduled_for
    )
    &&
    new Date(
      a.scheduled_for!
    )
      .getTime()
    <
    now;


  const bOverdue =
    Boolean(
      b.scheduled_for
    )
    &&
    new Date(
      b.scheduled_for!
    )
      .getTime()
    <
    now;


  if (
    aOverdue !==
    bOverdue
  ) {
    return aOverdue
      ? -1
      : 1;
  }


  if (
    a.scheduled_for
    &&
    b.scheduled_for
  ) {
    return (
      new Date(
        a.scheduled_for
      )
        .getTime()
      -
      new Date(
        b.scheduled_for
      )
        .getTime()
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


  return (
    PRIORITY_WEIGHT[
      b.priority
    ]
    -
    PRIORITY_WEIGHT[
      a.priority
    ]
  );
}


function percentage(
  current: number,
  goal: number
) {
  if (
    goal <=
    0
  ) {
    return 0;
  }


  return Math.min(
    100,

    Math.max(
      0,

      Math.round(
        current /
        goal *
        100
      )
    )
  );
}


function startOfDaysAgo(
  days: number
) {
  const date =
    new Date();


  date.setDate(
    date.getDate() -
    days
  );


  date.setHours(
    0,
    0,
    0,
    0
  );


  return date
    .toISOString();
}


function isToday(
  value: string,
  currentTime: number
) {
  const date =
    new Date(
      value
    );


  const today =
    new Date(
      currentTime
    );


  return (
    date.getFullYear() ===
      today.getFullYear()
    &&
    date.getMonth() ===
      today.getMonth()
    &&
    date.getDate() ===
      today.getDate()
  );
}


function sessionFocusedSeconds(
  session: FocusSession,
  now: number
) {
  const stored =
    Number(
      session
        .focused_seconds
      ||
      0
    );


  if (
    session.status !==
    "running"
    ||
    !session
      .started_at
  ) {
    return stored;
  }


  return (
    stored
    +
    Math.max(
      0,

      Math.floor(
        (
          now
          -
          new Date(
            session
              .started_at
          )
            .getTime()
        )
        /
        1000
      )
    )
  );
}


function focusRemaining(
  session: FocusSession,
  now: number
) {
  return Math.max(
    0,

    session
      .planned_minutes
    *
    60
    -
    sessionFocusedSeconds(
      session,
      now
    )
  );
}


function breakRemaining(
  session: BreakSession,
  now: number
) {
  let elapsed =
    Number(
      session
        .elapsed_seconds
      ||
      0
    );


  if (
    session.status ===
      "running"
    &&
    session
      .started_at
  ) {
    elapsed +=
      Math.max(
        0,

        Math.floor(
          (
            now
            -
            new Date(
              session
                .started_at
            )
              .getTime()
          )
          /
          1000
        )
      );
  }


  return Math.max(
    0,

    session
      .planned_minutes
    *
    60
    -
    elapsed
  );
}


function formatSeconds(
  value: number
) {
  const minutes =
    Math.floor(
      value /
      60
    );


  const seconds =
    value %
    60;


  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}


function greetingForHour(
  hour: number
) {
  if (
    hour <
    12
  ) {
    return "Good morning";
  }


  if (
    hour <
    17
  ) {
    return "Good afternoon";
  }


  return "Good evening";
}


function capitalise(
  value: string
) {
  if (!value) {
    return "";
  }


  return (
    value.charAt(0)
      .toUpperCase()
    +
    value.slice(1)
  );
}


function relativeDate(
  value: string,
  now: number
) {
  const seconds =
    Math.max(
      0,

      Math.floor(
        (
          now
          -
          new Date(
            value
          )
            .getTime()
        )
        /
        1000
      )
    );


  if (
    seconds <
    10
  ) {
    return "Just now";
  }


  if (
    seconds <
    60
  ) {
    return `${seconds}s ago`;
  }


  const minutes =
    Math.floor(
      seconds /
      60
    );


  if (
    minutes <
    60
  ) {
    return `${minutes}m ago`;
  }


  const hours =
    Math.floor(
      minutes /
      60
    );


  if (
    hours <
    24
  ) {
    return `${hours}h ago`;
  }


  return `${Math.floor(
    hours /
    24
  )}d ago`;
}


function formatTaskDate(
  value: string
) {
  return new Intl
    .DateTimeFormat(
      "en-IN",
      {
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
    .format(
      new Date(
        value
      )
    );
}


function formatClockTime(
  value: string
) {
  return new Intl
    .DateTimeFormat(
      "en-IN",
      {
        hour:
          "numeric",

        minute:
          "2-digit",

        hour12:
          true,
      }
    )
    .format(
      new Date(
        value
      )
    );
}


function relativeTaskTime(
  value: string,
  now: number
) {
  const difference =
    new Date(
      value
    )
      .getTime()
    -
    now;


  const minutes =
    Math.round(
      Math.abs(
        difference
      )
      /
      60000
    );


  if (
    difference <
    0
  ) {
    return minutes <
      60
      ? `${minutes}M LATE`
      : "OVERDUE";
  }


  if (
    minutes <
    60
  ) {
    return `IN ${Math.max(1, minutes)}M`;
  }


  return "UPCOMING";
}


function buildWeekActivity(
  completedTasks: TaskRow[],
  sessions: FocusSession[],
  now: number
): DayActivity[] {
  const days:
    DayActivity[] = [];


  for (
    let offset = 6;
    offset >= 0;
    offset--
  ) {
    const date =
      new Date(
        now
      );


    date.setDate(
      date.getDate() -
      offset
    );


    date.setHours(
      0,
      0,
      0,
      0
    );


    const key =
      localDateKey(
        date
      );


    const tasks =
      completedTasks.filter(
        (task) =>
          task.completed_at
          &&
          localDateKey(
            new Date(
              task.completed_at
            )
          )
          ===
          key
      ).length;


    const focusSeconds =
      sessions.reduce(
        (
          total,
          session
        ) => {

          if (
            localDateKey(
              new Date(
                session.created_at
              )
            )
            !==
            key
          ) {
            return total;
          }


          return (
            total
            +
            sessionFocusedSeconds(
              session,
              now
            )
          );

        },
        0
      );


    days.push({
      key,

      label:
        new Intl
          .DateTimeFormat(
            "en-IN",
            {
              weekday:
                "short",
            }
          )
          .format(
            date
          )
          .slice(
            0,
            2
          ),

      shortDate:
        new Intl
          .DateTimeFormat(
            "en-IN",
            {
              day:
                "numeric",
            }
          )
          .format(
            date
          ),

      tasks,

      focusMinutes:
        Math.round(
          focusSeconds /
          60
        ),
    });
  }


  return days;
}


function localDateKey(
  date: Date
) {
  return [
    date.getFullYear(),

    String(
      date.getMonth() +
      1
    )
      .padStart(
        2,
        "0"
      ),

    String(
      date.getDate()
    )
      .padStart(
        2,
        "0"
      ),
  ]
    .join("-");
}