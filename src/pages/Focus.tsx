import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import {
  Check,
  CheckCircle2,
  CirclePause,
  CirclePlay,
  Clock3,
  Coffee,
  Flame,
  Link2,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  Square,
  Target,
  Timer,
  Zap,
} from "lucide-react";

import PageHeader from "../components/PageHeader";
import { supabase } from "../lib/supabase";

import {
  getNexaFeedback,
  getNexaManager,
  runNexaAction,
} from "../lib/nexa";

import "./Focus.css";


// ============================================================
// TYPES
// ============================================================

type FocusStatus =
  | "running"
  | "paused"
  | "completed"
  | "cancelled";


type BreakStatus =
  | "ready"
  | "running"
  | "paused"
  | "completed"
  | "cancelled";


type FocusSession = {
  id: string;
  user_id: string;

  task_id: string | null;

  status: FocusStatus;

  planned_minutes: number;
  focused_seconds: number;

  started_at: string | null;
  actual_started_at?: string | null;

  completed_at: string | null;
  ended_at?: string | null;

  created_at: string;
};


type BreakSession = {
  id: string;
  user_id: string;

  status: BreakStatus;

  planned_minutes: number;
  elapsed_seconds: number;

  started_at: string | null;

  completed_at: string | null;

  created_at: string;
};


type TaskOption = {
  id: string;
  title: string;
  status: string;
};


type FocusSettings = {
  default_focus_minutes: number;
  default_break_minutes: number;

  auto_start_break: boolean;
  auto_start_focus: boolean;
};


type Mode =
  | "ready"
  | "focus"
  | "focus-paused"
  | "break-ready"
  | "break"
  | "break-paused";


const DURATION_OPTIONS = [
  15,
  25,
  45,
  60,
];


// ============================================================
// PAGE
// ============================================================

export default function Focus() {

  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    busy,
    setBusy,
  ] =
    useState(false);


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
    settings,
    setSettings,
  ] =
    useState<FocusSettings>({
      default_focus_minutes: 25,
      default_break_minutes: 5,

      auto_start_break: false,
      auto_start_focus: false,
    });


  const [
    selectedMinutes,
    setSelectedMinutes,
  ] =
    useState(25);


  const [
    selectedTaskId,
    setSelectedTaskId,
  ] =
    useState("");


  const [
    tasks,
    setTasks,
  ] =
    useState<TaskOption[]>([]);


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
    now,
    setNow,
  ] =
    useState(
      Date.now()
    );


  const zeroRefreshRef =
    useRef(false);


  // =========================================================
  // ACTIVE STATE
  // =========================================================

  const activeFocus =
    useMemo(
      () =>
        focusSessions.find(
          (
            session
          ) =>
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
          (
            session
          ) =>
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


  // =========================================================
  // LOAD DATABASE ROWS
  // =========================================================

  const loadFocusData =
    useCallback(
      async (
        initial = false
      ) => {

        try {

          if (initial) {
            setLoading(
              true
            );
          }


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


          const today =
            new Date();


          today.setHours(
            0,
            0,
            0,
            0
          );


          const [
            settingsResult,
            focusResult,
            breakResult,
            tasksResult,
          ] =
            await Promise.all([

              supabase
                .from(
                  "user_settings"
                )
                .select(
                  `
                    default_focus_minutes,
                    default_break_minutes,
                    auto_start_break,
                    auto_start_focus
                  `
                )
                .eq(
                  "user_id",
                  user.id
                )
                .maybeSingle(),


              supabase
                .from(
                  "focus_sessions"
                )
                .select("*")
                .eq(
                  "user_id",
                  user.id
                )
                .gte(
                  "created_at",
                  today.toISOString()
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
                .select("*")
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
                .limit(20),


              supabase
                .from(
                  "tasks"
                )
                .select(
                  "id, title, status"
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
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      false,
                  }
                ),

            ]);


          if (
            settingsResult.error
          ) {
            console.error(
              settingsResult.error
            );
          }


          if (
            focusResult.error
          ) {
            throw focusResult.error;
          }


          if (
            breakResult.error
          ) {
            throw breakResult.error;
          }


          if (
            tasksResult.error
          ) {
            throw tasksResult.error;
          }


          const nextSettings:
            FocusSettings =
            {
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

              auto_start_break:
                settingsResult
                  .data
                  ?.auto_start_break
                ??
                false,

              auto_start_focus:
                settingsResult
                  .data
                  ?.auto_start_focus
                ??
                false,
            };


          setSettings(
            nextSettings
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


          setTasks(
            (
              tasksResult.data
              ??
              []
            ) as TaskOption[]
          );


          if (initial) {
            setSelectedMinutes(
              nextSettings
                .default_focus_minutes
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

              ? caughtError.message

              : "Could not load Focus."
          );

        }

        finally {

          if (initial) {
            setLoading(
              false
            );
          }

        }

      },

      []
    );


  // =========================================================
  // AUTHORITATIVE REFRESH
  // =========================================================

  const refreshAuthoritativeState =
    useCallback(
      async (
        initial = false
      ) => {

        try {

          /*
            build_manager() reconciles expired
            focus/break timers before returning.
          */

          await getNexaManager();

        }

        catch (
          caughtError
        ) {

          console.error(
            caughtError
          );

        }


        await loadFocusData(
          initial
        );

      },

      [
        loadFocusData,
      ]
    );


  // =========================================================
  // INITIAL LOAD + REALTIME
  // =========================================================

  useEffect(
    () => {

      void refreshAuthoritativeState(
        true
      );


      const channel =
        supabase
          .channel(
            "nexa-focus-live"
          )

          .on(
            "postgres_changes",

            {
              event:
                "*",

              schema:
                "public",

              table:
                "focus_sessions",
            },

            () => {
              void loadFocusData();
            }
          )

          .on(
            "postgres_changes",

            {
              event:
                "*",

              schema:
                "public",

              table:
                "break_sessions",
            },

            () => {
              void loadFocusData();
            }
          )

          .on(
            "postgres_changes",

            {
              event:
                "*",

              schema:
                "public",

              table:
                "tasks",
            },

            () => {
              void loadFocusData();
            }
          )

          .subscribe();


      /*
        Realtime handles normal physical-button
        changes.

        This is only a recovery poll if a realtime
        event is ever missed.
      */

      const cloudRefresh =
        window.setInterval(
          () => {

            void refreshAuthoritativeState();

          },

          30000
        );


      return () => {

        window.clearInterval(
          cloudRefresh
        );


        void supabase
          .removeChannel(
            channel
          );

      };

    },

    [
      loadFocusData,
      refreshAuthoritativeState,
    ]
  );


  // =========================================================
  // LOCAL CLOCK
  // =========================================================

  useEffect(
    () => {

      const timer =
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
          timer
        );

      };

    },

    []
  );


  // =========================================================
  // MODE
  // =========================================================

  const mode:
    Mode =
    useMemo(
      () => {

        if (
          activeBreak
            ?.status
          ===
          "ready"
        ) {
          return "break-ready";
        }


        if (
          activeBreak
            ?.status
          ===
          "running"
        ) {
          return "break";
        }


        if (
          activeBreak
            ?.status
          ===
          "paused"
        ) {
          return "break-paused";
        }


        if (
          activeFocus
            ?.status
          ===
          "running"
        ) {
          return "focus";
        }


        if (
          activeFocus
            ?.status
          ===
          "paused"
        ) {
          return "focus-paused";
        }


        return "ready";

      },

      [
        activeFocus,
        activeBreak,
      ]
    );


  // =========================================================
  // TIMER VALUES
  // =========================================================

  const focusElapsedSeconds =
    useMemo(
      () => {

        if (!activeFocus) {
          return 0;
        }


        const stored =
          Number(
            activeFocus
              .focused_seconds
            ||
            0
          );


        if (
          activeFocus
            .status
          !==
          "running"
        ) {
          return stored;
        }


        const started =
          getSessionStart(
            activeFocus
          );


        if (!started) {
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
                  started
                ).getTime()
              )
              /
              1000
            )
          )
        );

      },

      [
        activeFocus,
        now,
      ]
    );


  const focusRemainingSeconds =
    activeFocus

      ? Math.max(
          0,

          activeFocus
            .planned_minutes
          *
          60
          -
          focusElapsedSeconds
        )

      : selectedMinutes
        *
        60;


  const breakElapsedSeconds =
    useMemo(
      () => {

        if (!activeBreak) {
          return 0;
        }


        const stored =
          Number(
            activeBreak
              .elapsed_seconds
            ||
            0
          );


        if (
          activeBreak
            .status
          !==
          "running"
        ) {
          return stored;
        }


        if (
          !activeBreak
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
                  activeBreak
                    .started_at
                ).getTime()
              )
              /
              1000
            )
          )
        );

      },

      [
        activeBreak,
        now,
      ]
    );


  const breakRemainingSeconds =
    activeBreak

      ? Math.max(
          0,

          activeBreak
            .planned_minutes
          *
          60
          -
          breakElapsedSeconds
        )

      : settings
          .default_break_minutes
        *
        60;


  // =========================================================
  // EXPIRED TIMER RECONCILIATION
  // =========================================================

  useEffect(
    () => {

      const expired =
        (
          mode ===
            "focus"
          &&
          focusRemainingSeconds ===
            0
        )
        ||
        (
          mode ===
            "break"
          &&
          breakRemainingSeconds ===
            0
        );


      if (!expired) {

        zeroRefreshRef
          .current =
          false;

        return;

      }


      if (
        zeroRefreshRef
          .current
      ) {
        return;
      }


      zeroRefreshRef
        .current =
        true;


      const timer =
        window.setTimeout(
          () => {

            void refreshAuthoritativeState();

          },

          250
        );


      return () => {

        window.clearTimeout(
          timer
        );

      };

    },

    [
      mode,
      focusRemainingSeconds,
      breakRemainingSeconds,
      refreshAuthoritativeState,
    ]
  );


  // =========================================================
  // CURRENT TASK
  // =========================================================

  const selectedTask =
    useMemo(
      () => {

        const taskId =
          activeFocus
            ?.task_id
          ??
          selectedTaskId;


        if (!taskId) {
          return null;
        }


        return (
          tasks.find(
            (
              task
            ) =>
              task.id ===
              taskId
          )
          ??
          null
        );

      },

      [
        activeFocus,
        selectedTaskId,
        tasks,
      ]
    );


  // =========================================================
  // TODAY METRICS
  // =========================================================

  const completedToday =
    useMemo(
      () =>

        focusSessions.filter(
          (
            session
          ) =>
            session.status ===
            "completed"
        ),

      [
        focusSessions,
      ]
    );


  const sessionsToday =
    completedToday.length
    +
    (
      activeFocus
        ? 1
        : 0
    );


  const focusedMinutesToday =
    Math.round(
      focusSessions.reduce(
        (
          total,
          session
        ) =>

          total
          +
          getStoredFocusSeconds(
            session,
            now
          ),

        0
      )
      /
      60
    );


  // =========================================================
  // ACTION HELPER
  // =========================================================

  async function runFocusAction(
    action:
      | "focus_start"
      | "focus_pause"
      | "focus_resume"
      | "focus_end"
      | "break_start"
      | "break_pause"
      | "break_resume"
      | "break_complete",

    payload:
      Record<
        string,
        unknown
      >,

    fallbackSuccess:
      string,

    fallbackError:
      string
  ) {

    setBusy(
      true
    );


    setError("");


    try {

      const result =
        await runNexaAction(
          action,
          payload
        );


      notifySuccess(
        getNexaFeedback(
          result
        )
        ||
        fallbackSuccess
      );


      await loadFocusData();

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

          ? caughtError.message

          : fallbackError
      );

    }

    finally {

      setBusy(
        false
      );

    }

  }


  // =========================================================
  // START FOCUS
  // =========================================================

  async function startFocus() {

    if (
      busy
      ||
      activeFocus
      ||
      activeBreak
    ) {
      return;
    }


    await runFocusAction(
      "focus_start",

      {
        planned_minutes:
          selectedMinutes,

        ...(
          selectedTaskId

            ? {
                task_id:
                  selectedTaskId,
              }

            : {}
        ),
      },

      "Focus started.",

      "Could not start focus."
    );

  }


  // =========================================================
  // PAUSE FOCUS
  // =========================================================

  async function pauseFocus() {

    if (
      busy
      ||
      !activeFocus
      ||
      activeFocus.status
      !==
      "running"
    ) {
      return;
    }


    await runFocusAction(
      "focus_pause",

      {},

      "Focus paused.",

      "Could not pause focus."
    );

  }


  // =========================================================
  // RESUME FOCUS
  // =========================================================

  async function resumeFocus() {

    if (
      busy
      ||
      !activeFocus
      ||
      activeFocus.status
      !==
      "paused"
    ) {
      return;
    }


    await runFocusAction(
      "focus_resume",

      {},

      "Focus resumed.",

      "Could not resume focus."
    );

  }


  // =========================================================
  // END FOCUS
  // =========================================================

  async function endFocus() {

    if (
      busy
      ||
      !activeFocus
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        "End this focus session now?"
      );


    if (!confirmed) {
      return;
    }


    await runFocusAction(
      "focus_end",

      {},

      "Focus session completed.",

      "Could not finish focus."
    );

  }


  // =========================================================
  // START READY BREAK
  // =========================================================

  async function startBreak() {

    if (
      busy
      ||
      !activeBreak
      ||
      activeBreak.status
      !==
      "ready"
    ) {
      return;
    }


    await runFocusAction(
      "break_start",

      {},

      "Break started.",

      "Could not start break."
    );

  }


  // =========================================================
  // PAUSE BREAK
  // =========================================================

  async function pauseBreak() {

    if (
      busy
      ||
      !activeBreak
      ||
      activeBreak.status
      !==
      "running"
    ) {
      return;
    }


    await runFocusAction(
      "break_pause",

      {},

      "Break paused.",

      "Could not pause break."
    );

  }


  // =========================================================
  // RESUME BREAK
  // =========================================================

  async function resumeBreak() {

    if (
      busy
      ||
      !activeBreak
      ||
      activeBreak.status
      !==
      "paused"
    ) {
      return;
    }


    await runFocusAction(
      "break_resume",

      {},

      "Break resumed.",

      "Could not resume break."
    );

  }


  // =========================================================
  // COMPLETE BREAK
  // =========================================================

  async function completeBreak() {

    if (
      busy
      ||
      !activeBreak
    ) {
      return;
    }


    await runFocusAction(
      "break_complete",

      {},

      "Break complete.",

      "Could not complete break."
    );

  }


  // =========================================================
  // NOTIFICATION
  // =========================================================

  function notifySuccess(
    message: string
  ) {

    setSuccess(
      message
    );


    window.setTimeout(
      () => {

        setSuccess("");

      },

      2200
    );

  }


  // =========================================================
  // CURRENT DISPLAY VALUES
  // =========================================================

  const displaySeconds =
    mode === "break"
    ||
    mode === "break-paused"
    ||
    mode === "break-ready"

      ? breakRemainingSeconds

      : focusRemainingSeconds;


  const timerLabel =
    formatTimer(
      displaySeconds
    );


  const progress =
    getProgress(
      mode,
      activeFocus,
      activeBreak,
      focusRemainingSeconds,
      breakRemainingSeconds,
      selectedMinutes,
      settings
        .default_break_minutes
    );


  // =========================================================
  // HEADER STATUS
  // =========================================================

  const headerAction = (

    <div className="focus-day-stat">

      <Flame
        size={16}
      />


      <div>

        <strong>
          {sessionsToday}
        </strong>


        <span>

          {
            sessionsToday ===
            1

              ? "session today"

              : "sessions today"
          }

        </span>

      </div>

    </div>

  );


  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {

    return (

      <section
        className="
          focus-page
          focus-loading-page
        "
      >

        <div className="focus-loading">

          <div className="focus-loading-icon">

            <Loader2
              size={22}
            />

          </div>


          <div>

            <strong>
              Preparing focus
            </strong>


            <span>
              NEXA is restoring your current rhythm.
            </span>

          </div>

        </div>

      </section>

    );

  }


  // =========================================================
  // UI
  // =========================================================

  return (

    <section className="focus-page">

      <PageHeader
        eyebrow="FOCUS MODE"
        title="Focus"
        description="Give one thing your full attention, recover deliberately, then begin again."
        action={
          headerAction
        }
      />


      <div className="focus-page-body">

        {
          error
          &&
          (

            <div className="focus-notice error">

              {error}

            </div>

          )
        }


        {
          success
          &&
          (

            <div className="focus-notice success">

              <CheckCircle2
                size={16}
              />

              {success}

            </div>

          )
        }


        {/* ===================================================
            RHYTHM BAR
            =================================================== */}

        <section className="focus-rhythm-bar">

          <RhythmStep
            icon={
              <Timer
                size={16}
              />
            }

            label="Focus"

            value={
              `${
                activeFocus
                  ?.planned_minutes
                ??
                selectedMinutes
              } min`
            }

            active={
              mode === "ready"
              ||
              mode === "focus"
              ||
              mode === "focus-paused"
            }

            complete={
              Boolean(
                activeBreak
              )
            }
          />


          <div className="focus-rhythm-line" />


          <RhythmStep
            icon={
              <Coffee
                size={16}
              />
            }

            label="Break"

            value={
              `${
                activeBreak
                  ?.planned_minutes
                ??
                settings
                  .default_break_minutes
              } min`
            }

            active={
              mode === "break"
              ||
              mode === "break-ready"
              ||
              mode === "break-paused"
            }
          />


          <div className="focus-rhythm-line" />


          <RhythmStep
            icon={
              <RefreshCw
                size={16}
              />
            }

            label="Continue"

            value={
              settings
                .auto_start_focus

                ? "Automatic"

                : "Manual"
            }

            active={
              false
            }
          />

        </section>


        {/* ===================================================
            MAIN WORKSPACE
            =================================================== */}

        <section className="focus-workspace">

          {/* ===============================================
              TIMER
              =============================================== */}

          <article
            className={
              `focus-timer-card mode-${mode}`
            }
          >

            <div className="focus-timer-aura" />


            <div className="focus-timer-status">

              <span />


              {
                modeTitle(
                  mode
                )
              }

            </div>


            <div
  className="focus-timer-ring"
  style={
    ({
      "--focus-progress": `${progress * 360}deg`,
    } as CSSProperties)
  }
>

              <div className="focus-timer-ring-inner">

                <strong>
                  {timerLabel}
                </strong>


                <span>

                  {
                    modeSubtitle(
                      mode,
                      activeFocus,
                      activeBreak,
                      selectedMinutes
                    )
                  }

                </span>

              </div>

            </div>


            <div className="focus-current-intention">

              <span>
                INTENTION
              </span>


              <strong>

                {
                  selectedTask
                    ?.title
                  ??
                  "Open focus"
                }

              </strong>

            </div>


            <div className="focus-primary-controls">

              {
                mode ===
                "ready"
                &&
                (

                  <button
                    type="button"

                    className="focus-main-button"

                    disabled={
                      busy
                    }

                    onClick={
                      startFocus
                    }
                  >

                    {
                      busy

                        ? (

                            <Loader2
                              className="focus-spin"
                              size={18}
                            />

                          )

                        : (

                            <Play
                              size={17}
                              fill="currentColor"
                            />

                          )
                    }

                    Start focus

                  </button>

                )
              }


              {
                mode ===
                "focus"
                &&
                (

                  <>

                    <button
                      type="button"

                      className="focus-main-button"

                      disabled={
                        busy
                      }

                      onClick={
                        pauseFocus
                      }
                    >

                      <Pause
                        size={17}
                        fill="currentColor"
                      />

                      Pause

                    </button>


                    <button
                      type="button"

                      className="focus-control-secondary"

                      disabled={
                        busy
                      }

                      onClick={
                        endFocus
                      }
                    >

                      <Square
                        size={15}
                        fill="currentColor"
                      />

                      End session

                    </button>

                  </>

                )
              }


              {
                mode ===
                "focus-paused"
                &&
                (

                  <>

                    <button
                      type="button"

                      className="focus-main-button"

                      disabled={
                        busy
                      }

                      onClick={
                        resumeFocus
                      }
                    >

                      <Play
                        size={17}
                        fill="currentColor"
                      />

                      Resume focus

                    </button>


                    <button
                      type="button"

                      className="focus-control-secondary"

                      disabled={
                        busy
                      }

                      onClick={
                        endFocus
                      }
                    >

                      <Square
                        size={15}
                        fill="currentColor"
                      />

                      End session

                    </button>

                  </>

                )
              }


              {
                mode ===
                "break-ready"
                &&
                (

                  <button
                    type="button"

                    className="
                      focus-main-button
                      break-button
                    "

                    disabled={
                      busy
                    }

                    onClick={
                      startBreak
                    }
                  >

                    <Coffee
                      size={17}
                    />

                    Start break

                  </button>

                )
              }


              {
                mode ===
                "break"
                &&
                (

                  <>

                    <button
                      type="button"

                      className="
                        focus-main-button
                        break-button
                      "

                      disabled={
                        busy
                      }

                      onClick={
                        pauseBreak
                      }
                    >

                      <Pause
                        size={17}
                      />

                      Pause break

                    </button>


                    <button
                      type="button"

                      className="focus-control-secondary"

                      disabled={
                        busy
                      }

                      onClick={
                        completeBreak
                      }
                    >

                      <Check
                        size={16}
                      />

                      Finish break

                    </button>

                  </>

                )
              }


              {
                mode ===
                "break-paused"
                &&
                (

                  <>

                    <button
                      type="button"

                      className="
                        focus-main-button
                        break-button
                      "

                      disabled={
                        busy
                      }

                      onClick={
                        resumeBreak
                      }
                    >

                      <Play
                        size={17}
                      />

                      Resume break

                    </button>


                    <button
                      type="button"

                      className="focus-control-secondary"

                      disabled={
                        busy
                      }

                      onClick={
                        completeBreak
                      }
                    >

                      <Check
                        size={16}
                      />

                      Finish break

                    </button>

                  </>

                )
              }

            </div>


            <div className="focus-session-footnote">

              {
                mode === "ready"

                  ? "Choose one intention, press start, and let the rest wait."

                  : mode === "focus"

                    ? "NEXA is keeping this session in sync with your desk device."

                    : mode === "focus-paused"

                      ? "Your progress is saved. Resume when you're ready."

                      : "Recovery is part of the work."
              }

            </div>

          </article>


          {/* ===============================================
              SESSION SETUP
              =============================================== */}

          <aside className="focus-setup">

            <section className="focus-side-card">

              <div className="focus-side-heading">

                <div>

                  <span>
                    SESSION SETUP
                  </span>


                  <h2>
                    Choose your rhythm
                  </h2>

                </div>


                <Clock3
                  size={18}
                />

              </div>


              <div className="focus-duration-grid">

                {
                  DURATION_OPTIONS.map(
                    (
                      minutes
                    ) => (

                      <button
                        type="button"

                        key={
                          minutes
                        }

                        disabled={
                          mode !==
                          "ready"
                        }

                        className={
                          selectedMinutes
                          ===
                          minutes

                            ? "active"

                            : ""
                        }

                        onClick={
                          () =>
                            setSelectedMinutes(
                              minutes
                            )
                        }
                      >

                        <strong>
                          {minutes}
                        </strong>


                        <span>
                          MIN
                        </span>

                      </button>

                    )
                  )
                }

              </div>


              <div className="focus-setting-note">

                <Sparkles
                  size={13}
                />

                Default from Settings:
                {" "}

                {
                  settings
                    .default_focus_minutes
                } min

              </div>

            </section>


            <section className="focus-side-card">

              <div className="focus-side-heading">

                <div>

                  <span>
                    INTENTION
                  </span>


                  <h2>
                    Focus task
                  </h2>

                </div>


                <Target
                  size={18}
                />

              </div>


              <label className="focus-task-select">

                <select
                  disabled={
                    mode !==
                    "ready"
                  }

                  value={
                    selectedTaskId
                  }

                  onChange={
                    (
                      event
                    ) =>

                      setSelectedTaskId(
                        event.target.value
                      )
                  }
                >

                  <option value="">
                    Open focus
                  </option>


                  {
                    tasks.map(
                      (
                        task
                      ) => (

                        <option
                          key={
                            task.id
                          }

                          value={
                            task.id
                          }
                        >

                          {task.title}

                        </option>

                      )
                    )
                  }

                </select>

              </label>


              <div className="focus-setting-note">

                <Link2
                  size={13}
                />


                {
                  selectedTask

                    ? "NEXA will keep this task attached to the focus cycle."

                    : "Open focus is useful when the work is not tied to a task."
                }

              </div>

            </section>


            <section className="
              focus-side-card
              focus-cycle-card
            ">

              <div className="focus-side-heading">

                <div>

                  <span>
                    CYCLE
                  </span>


                  <h2>
                    Your rhythm
                  </h2>

                </div>


                <RefreshCw
                  size={18}
                />

              </div>


              <FocusCycleRow
                label="Break"

                value={
                  `${
                    settings
                      .default_break_minutes
                  } min`
                }

                icon={
                  <Coffee
                    size={15}
                  />
                }
              />


              <FocusCycleRow
                label="Auto-start break"

                value={
                  settings
                    .auto_start_break

                    ? "On"

                    : "Off"
                }

                icon={
                  <CirclePause
                    size={15}
                  />
                }

                enabled={
                  settings
                    .auto_start_break
                }
              />


              <FocusCycleRow
                label="Auto-start next focus"

                value={
                  settings
                    .auto_start_focus

                    ? "On"

                    : "Off"
                }

                icon={
                  <CirclePlay
                    size={15}
                  />
                }

                enabled={
                  settings
                    .auto_start_focus
                }
              />

            </section>

          </aside>

        </section>


        {/* ===================================================
            TODAY SUMMARY
            =================================================== */}

        <section className="focus-summary-section">

          <div className="focus-summary-heading">

            <div>

              <span>
                TODAY
              </span>


              <h2>
                Focus so far
              </h2>

            </div>

          </div>


          <div className="focus-summary-grid">

            <FocusMetric
              icon={
                <Zap
                  size={18}
                />
              }

              value={
                String(
                  sessionsToday
                )
              }

              label="Sessions"
            />


            <FocusMetric
              icon={
                <Clock3
                  size={18}
                />
              }

              value={
                `${
                  focusedMinutesToday
                }m`
              }

              label="Focused"
            />


            <FocusMetric
              icon={
                <Coffee
                  size={18}
                />
              }

              value={
                String(
                  breakSessions.filter(
                    (
                      session
                    ) =>
                      session.status ===
                      "completed"
                  ).length
                )
              }

              label="Breaks"
            />

          </div>

        </section>

      </div>

    </section>

  );

}


// ============================================================
// RHYTHM STEP
// ============================================================

function RhythmStep({
  icon,
  label,
  value,
  active,
  complete = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  active: boolean;
  complete?: boolean;
}) {

  return (

    <div
      className={
        `focus-rhythm-step ${
          active
            ? "active"
            : ""
        } ${
          complete
            ? "complete"
            : ""
        }`
      }
    >

      <div className="focus-rhythm-icon">

        {
          complete

            ? (
                <Check
                  size={15}
                />
              )

            : icon
        }

      </div>


      <div>

        <span>
          {label}
        </span>


        <strong>
          {value}
        </strong>

      </div>

    </div>

  );

}


// ============================================================
// CYCLE ROW
// ============================================================

function FocusCycleRow({
  label,
  value,
  icon,
  enabled,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  enabled?: boolean;
}) {

  return (

    <div className="focus-cycle-row">

      <div className="focus-cycle-label">

        <div>
          {icon}
        </div>


        <span>
          {label}
        </span>

      </div>


      <strong
        className={
          enabled

            ? "enabled"

            : ""
        }
      >

        {value}

      </strong>

    </div>

  );

}


// ============================================================
// METRIC
// ============================================================

function FocusMetric({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
}) {

  return (

    <article className="focus-metric">

      <div className="focus-metric-icon">

        {icon}

      </div>


      <div>

        <strong>
          {value}
        </strong>


        <span>
          {label}
        </span>

      </div>

    </article>

  );

}


// ============================================================
// HELPERS
// ============================================================

function getSessionStart(
  session:
    FocusSession
) {

  return (
    session.started_at
    ||
    session.actual_started_at
    ||
    session.created_at
    ||
    null
  );

}


function getStoredFocusSeconds(
  session:
    FocusSession,

  now:
    number
) {

  const stored =
    Number(
      session.focused_seconds
      ||
      0
    );


  if (
    session.status
    !==
    "running"
  ) {
    return stored;
  }


  const started =
    getSessionStart(
      session
    );


  if (!started) {
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
            started
          ).getTime()
        )
        /
        1000
      )
    )
  );

}


function formatTimer(
  seconds:
    number
) {

  const safe =
    Math.max(
      0,

      Math.floor(
        seconds
      )
    );


  const minutes =
    Math.floor(
      safe
      /
      60
    );


  const remaining =
    safe
    %
    60;


  return `${
    String(
      minutes
    ).padStart(
      2,
      "0"
    )
  }:${
    String(
      remaining
    ).padStart(
      2,
      "0"
    )
  }`;

}


function modeTitle(
  mode:
    Mode
) {

  switch (
    mode
  ) {

    case "focus":
      return "FOCUSING";


    case "focus-paused":
      return "FOCUS PAUSED";


    case "break-ready":
      return "BREAK READY";


    case "break":
      return "RECOVER";


    case "break-paused":
      return "BREAK PAUSED";


    default:
      return "READY";

  }

}


function modeSubtitle(
  mode:
    Mode,

  focus:
    FocusSession
    |
    null,

  breakSession:
    BreakSession
    |
    null,

  selectedMinutes:
    number
) {

  switch (
    mode
  ) {

    case "focus":

    case "focus-paused":

      return `${
        focus
          ?.planned_minutes
        ??
        selectedMinutes
      } MINUTE SESSION`;


    case "break-ready":

    case "break":

    case "break-paused":

      return `${
        breakSession
          ?.planned_minutes
        ??
        5
      } MINUTE BREAK`;


    default:

      return `${
        selectedMinutes
      } MINUTE SESSION`;

  }

}


function getProgress(
  mode:
    Mode,

  focus:
    FocusSession
    |
    null,

  breakSession:
    BreakSession
    |
    null,

  focusRemaining:
    number,

  breakRemaining:
    number,

  selectedMinutes:
    number,

  defaultBreak:
    number
) {

  let totalSeconds =
    selectedMinutes
    *
    60;


  let remaining =
    focusRemaining;


  if (
    mode ===
      "focus"
    ||
    mode ===
      "focus-paused"
  ) {

    totalSeconds =
      (
        focus
          ?.planned_minutes
        ??
        selectedMinutes
      )
      *
      60;


    remaining =
      focusRemaining;

  }


  if (
    mode ===
      "break"
    ||
    mode ===
      "break-paused"
    ||
    mode ===
      "break-ready"
  ) {

    totalSeconds =
      (
        breakSession
          ?.planned_minutes
        ??
        defaultBreak
      )
      *
      60;


    remaining =
      breakRemaining;

  }


  if (
    mode ===
    "ready"
  ) {
    return 0;
  }


  if (
    totalSeconds <=
    0
  ) {
    return 0;
  }


  return Math.min(
    1,

    Math.max(
      0,

      1
      -
      remaining
      /
      totalSeconds
    )
  );

}