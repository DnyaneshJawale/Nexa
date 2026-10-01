import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  AlarmClock,
  Bell,
  CalendarClock,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Edit3,
  Filter,
  ListTodo,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Repeat2,
  Search,
  Sparkles,
  Timer,
  Trash2,
  X,
} from "lucide-react";

import PageHeader from "../components/PageHeader";
import { supabase } from "../lib/supabase";

import "./Tasks.css";


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


type TaskRow = {
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
  occurrence_number?: number | null;

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


type UserTaskDefaults = {
  default_focus_minutes: number;
  default_reminder_enabled: boolean;
  default_reminder_minutes_before: number;
};


type TaskFilter =
  | "all"
  | "pending"
  | "active"
  | "overdue"
  | "completed";


type Draft = {
  id?: string;

  title: string;
  description: string;

  priority: TaskPriority;
  estimated_minutes: number;

  scheduled_for: string;

  reminder_enabled: boolean;
  reminder_minutes_before: number;

  series_id: string | null;
};


type MetricTone =
  | "violet"
  | "green"
  | "red"
  | "blue";


const PRIORITY_WEIGHT: Record<
  TaskPriority,
  number
> = {
  low: 1,
  medium: 2,
  high: 3,
};


function createEmptyDraft(
  defaults: UserTaskDefaults
): Draft {
  return {
    title: "",

    description: "",

    priority: "medium",

    estimated_minutes:
      defaults.default_focus_minutes,

    scheduled_for: "",

    reminder_enabled:
      defaults.default_reminder_enabled,

    reminder_minutes_before:
      defaults.default_reminder_minutes_before,

    series_id: null,
  };
}


export default function Tasks() {
  const [
    tasks,
    setTasks,
  ] = useState<TaskRow[]>([]);


  const [
    defaults,
    setDefaults,
  ] = useState<UserTaskDefaults>({
    default_focus_minutes: 25,

    default_reminder_enabled: true,

    default_reminder_minutes_before: 10,
  });


  const [
    deviceId,
    setDeviceId,
  ] =
    useState<string | null>(
      null
    );


  const [
    query,
    setQuery,
  ] =
    useState("");


  const [
    filter,
    setFilter,
  ] =
    useState<TaskFilter>(
      "all"
    );


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
    saving,
    setSaving,
  ] =
    useState(false);


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
    editorOpen,
    setEditorOpen,
  ] =
    useState(false);


  const [
    editingTask,
    setEditingTask,
  ] =
    useState<TaskRow | null>(
      null
    );


  const [
    draft,
    setDraft,
  ] =
    useState<Draft>(
      createEmptyDraft({
        default_focus_minutes: 25,

        default_reminder_enabled: true,

        default_reminder_minutes_before: 10,
      })
    );


  const [
    now,
    setNow,
  ] =
    useState(
      Date.now()
    );


  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    void loadPage();


    const clock =
      window.setInterval(
        () => {
          setNow(
            Date.now()
          );
        },
        30000
      );


    return () => {
      window.clearInterval(
        clock
      );
    };
  }, []);


  // =========================================================
  // LOAD
  // =========================================================

  async function loadPage(
    manual = false
  ) {
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


      const [
        taskResult,
        settingsResult,
        deviceResult,
      ] =
        await Promise.all([

          supabase
            .from("tasks")
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
            ),


          supabase
            .from(
              "user_settings"
            )
            .select(
              `
              default_focus_minutes,
              default_reminder_enabled,
              default_reminder_minutes_before
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
        taskResult.error
      ) {
        throw taskResult
          .error;
      }


      setTasks(
        (
          taskResult.data ??
          []
        ) as TaskRow[]
      );


      if (
        settingsResult.error
      ) {
        console.error(
          "Task defaults:",
          settingsResult.error
        );
      }


      if (
        settingsResult.data
      ) {
        setDefaults({
          default_focus_minutes:
            settingsResult
              .data
              .default_focus_minutes ??
            25,

          default_reminder_enabled:
            settingsResult
              .data
              .default_reminder_enabled ??
            true,

          default_reminder_minutes_before:
            settingsResult
              .data
              .default_reminder_minutes_before ??
            10,
        });
      }


      if (
        deviceResult.error
      ) {
        console.error(
          "Device lookup:",
          deviceResult.error
        );
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
          : "Could not load tasks."
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
  }


  // =========================================================
  // SUCCESS FEEDBACK
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
      2400
    );
  }


  // =========================================================
  // EDITOR
  // =========================================================

  function openCreate() {
    setEditingTask(
      null
    );


    setDraft(
      createEmptyDraft(
        defaults
      )
    );


    setEditorOpen(
      true
    );
  }


  function openEdit(
    task: TaskRow
  ) {
    setEditingTask(
      task
    );


    setDraft({
      id:
        task.id,

      title:
        task.title,

      description:
        task.description ??
        "",

      priority:
        task.priority,

      estimated_minutes:
        task.estimated_minutes ||
        defaults
          .default_focus_minutes,

      scheduled_for:
        task.scheduled_for
          ? toDateTimeLocal(
              task.scheduled_for
            )
          : "",

      reminder_enabled:
        Boolean(
          task.reminder_enabled
        ),

      reminder_minutes_before:
        task
          .reminder_minutes_before ||
        defaults
          .default_reminder_minutes_before,

      series_id:
        task.series_id,
    });


    setEditorOpen(
      true
    );
  }


  function closeEditor() {
    if (saving) {
      return;
    }


    setEditorOpen(
      false
    );


    setEditingTask(
      null
    );
  }


  // =========================================================
  // SAVE TASK
  // =========================================================

  async function saveTask(
    event: FormEvent
  ) {
    event.preventDefault();


    const title =
      draft.title.trim();


    if (!title) {
      setError(
        "Give the task a title before saving it."
      );

      return;
    }


    setSaving(
      true
    );


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
          "Your session expired. Sign in again."
        );
      }


      const scheduledFor =
        draft.scheduled_for
          ? new Date(
              draft
                .scheduled_for
            )
              .toISOString()
          : null;


      const reminderEnabled =
        Boolean(
          draft
            .reminder_enabled
          &&
          scheduledFor
        );


      const basePayload = {
        user_id:
          user.id,

        title,

        description:
          draft.description
            .trim() ||
          null,

        priority:
          draft.priority,

        estimated_minutes:
          Math.min(
            480,

            Math.max(
              1,

              Number(
                draft
                  .estimated_minutes
              )
              ||
              defaults
                .default_focus_minutes
            )
          ),

        scheduled_for:
          scheduledFor,

        reminder_enabled:
          reminderEnabled,

        reminder_minutes_before:
          Math.min(
            1440,

            Math.max(
              0,

              Number(
                draft
                  .reminder_minutes_before
              )
              ||
              0
            )
          ),

        updated_at:
          new Date()
            .toISOString(),
      };


      // EDIT

      if (draft.id) {
        const scheduleChanged =
          (
            editingTask
              ?.scheduled_for ??
            null
          )
          !==
          scheduledFor;


        const reminderChanged =
          Boolean(
            editingTask
              ?.reminder_enabled
          )
          !==
          reminderEnabled
          ||
          Number(
            editingTask
              ?.reminder_minutes_before ??
            0
          )
          !==
          Number(
            basePayload
              .reminder_minutes_before
          );


        const reminderReset =
          scheduleChanged ||
          reminderChanged
            ? {
                reminder_sent_at:
                  null,

                reminder_acknowledged_at:
                  null,

                snoozed_until:
                  null,

                overdue_acknowledged_at:
                  null,
              }
            : {};


        const {
          error:
            updateError,
        } =
          await supabase
            .from("tasks")
            .update({
              ...basePayload,
              ...reminderReset,
            })
            .eq(
              "id",
              draft.id
            )
            .eq(
              "user_id",
              user.id
            );


        if (
          updateError
        ) {
          throw updateError;
        }


        notifySuccess(
          "Task updated."
        );
      }


      // CREATE

      else {
        const {
          error:
            insertError,
        } =
          await supabase
            .from("tasks")
            .insert({
              ...basePayload,

              status:
                "pending",

              actual_started_at:
                null,

              actual_ended_at:
                null,

              completed_at:
                null,

              reminder_sent_at:
                null,

              reminder_acknowledged_at:
                null,

              snoozed_until:
                null,

              overdue_acknowledged_at:
                null,

              skipped_at:
                null,
            });


        if (
          insertError
        ) {
          throw insertError;
        }


        notifySuccess(
          "Task created."
        );
      }


      setEditorOpen(
        false
      );


      setEditingTask(
        null
      );


      setDraft(
        createEmptyDraft(
          defaults
        )
      );


      await loadPage();
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
          : "Could not save the task."
      );
    }

    finally {
      setSaving(
        false
      );
    }
  }


  // =========================================================
  // DEVICE
  // =========================================================

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


    const {
      error:
        deviceError,
    } =
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


    if (
      deviceError
    ) {
      console.error(
        "Device state update:",
        deviceError
      );
    }
  }


  function getNextPendingTask(
    excludingId?: string
  ) {
    return (
      tasks
        .filter(
          (task) =>
            task.id !==
              excludingId
            &&
            task.status ===
              "pending"
        )
        .sort(
          compareActionableTasks
        )[0]
      ??
      null
    );
  }


  async function showNextTask(
    excludingId?: string
  ) {
    const next =
      getNextPendingTask(
        excludingId
      );


    if (next) {
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


  // =========================================================
  // START TASK
  // =========================================================

  async function startTask(
    task: TaskRow
  ) {
    setWorkingTaskId(
      task.id
    );


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
          "Your session expired. Sign in again."
        );
      }


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

            updated_at:
              timestamp,
          })
          .eq(
            "user_id",
            user.id
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

            completed_at:
              null,

            reminder_acknowledged_at:
              timestamp,

            overdue_acknowledged_at:
              timestamp,

            updated_at:
              timestamp,
          })
          .eq(
            "id",
            task.id
          )
          .eq(
            "user_id",
            user.id
          );


      if (
        startError
      ) {
        throw startError;
      }


      await updateDevice(
        "CURRENT TASK",
        task.title,
        "task"
      );


      notifySuccess(
        "Task started."
      );


      await loadPage();
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
      setWorkingTaskId(
        null
      );
    }
  }


  // =========================================================
  // COMPLETE TASK
  // =========================================================

  async function completeTask(
    task: TaskRow
  ) {
    setWorkingTaskId(
      task.id
    );


    setError("");


    try {
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

            updated_at:
              timestamp,
          })
          .eq(
            "id",
            task.id
          );


      if (
        completeError
      ) {
        throw completeError;
      }


      await showNextTask(
        task.id
      );


      notifySuccess(
        "Task completed."
      );


      await loadPage();
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
          : "Could not complete the task."
      );
    }

    finally {
      setWorkingTaskId(
        null
      );
    }
  }


  // =========================================================
  // DELETE
  // =========================================================

  async function deleteTask(
    task: TaskRow
  ) {
    const message =
      task.series_id
        ? `Delete this occurrence of "${task.title}"? This does not edit the recurring series itself.`
        : `Delete "${task.title}"?`;


    if (
      !window.confirm(
        message
      )
    ) {
      return;
    }


    setWorkingTaskId(
      task.id
    );


    setError("");


    try {
      const {
        error:
          deleteError,
      } =
        await supabase
          .from("tasks")
          .delete()
          .eq(
            "id",
            task.id
          );


      if (
        deleteError
      ) {
        throw deleteError;
      }


      if (
        task.status ===
        "active"
      ) {
        await showNextTask(
          task.id
        );
      }


      notifySuccess(
        "Task deleted."
      );


      await loadPage();
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
          : "Could not delete the task."
      );
    }

    finally {
      setWorkingTaskId(
        null
      );
    }
  }


  // =========================================================
  // METRICS
  // =========================================================

  const derived =
    useMemo(
      () => {
        const overdueTasks =
          tasks.filter(
            isOverdueTask
          );


        const remaining =
          tasks.filter(
            (task) =>
              task.status ===
                "pending"
              ||
              task.status ===
                "active"
          );


        const completed =
          tasks.filter(
            (task) =>
              task.status ===
                "completed"
          );


        const plannedMinutes =
          remaining.reduce(
            (
              total,
              task
            ) =>
              total +
              Number(
                task
                  .estimated_minutes ||
                0
              ),
            0
          );


        return {
          overdueTasks,
          remaining,
          completed,
          plannedMinutes,
        };
      },
      [
        tasks,
        now,
      ]
    );


  // =========================================================
  // FILTERED TASKS
  // =========================================================

  const filteredTasks =
    useMemo(
      () => {
        const needle =
          query
            .trim()
            .toLowerCase();


        return tasks
          .filter(
            (task) => {
              const matchesText =
                !needle
                ||
                task.title
                  .toLowerCase()
                  .includes(
                    needle
                  )
                ||
                (
                  task.description ??
                  ""
                )
                  .toLowerCase()
                  .includes(
                    needle
                  );


              if (
                !matchesText
              ) {
                return false;
              }


              if (
                filter ===
                "all"
              ) {
                return (
                  task.status !==
                    "cancelled"
                  &&
                  task.status !==
                    "skipped"
                );
              }


              if (
                filter ===
                "overdue"
              ) {
                return isOverdueTask(
                  task
                );
              }


              return (
                task.status ===
                filter
              );
            }
          )
          .sort(
            compareTasksForDisplay
          );
      },
      [
        tasks,
        query,
        filter,
        now,
      ]
    );


  const filterCounts =
    useMemo(
      () => ({
        all:
          tasks.filter(
            (task) =>
              task.status !==
                "cancelled"
              &&
              task.status !==
                "skipped"
          ).length,

        pending:
          tasks.filter(
            (task) =>
              task.status ===
              "pending"
          ).length,

        active:
          tasks.filter(
            (task) =>
              task.status ===
              "active"
          ).length,

        overdue:
          tasks.filter(
            isOverdueTask
          ).length,

        completed:
          tasks.filter(
            (task) =>
              task.status ===
              "completed"
          ).length,
      }),
      [
        tasks,
        now,
      ]
    );


  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <section className="tasks-page tasks-loading-page">

        <div className="tasks-loading-state">

          <div className="tasks-loading-icon">

            <Loader2
              size={22}
            />

          </div>


          <div>

            <strong>
              Preparing your task space
            </strong>

            <span>
              NEXA is organising your plan.
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
    <section className="tasks-page">

      <PageHeader
        eyebrow="TASK PLANNING"
        title="Tasks"
        description="Plan the work ahead, keep priorities visible, and move the right task into focus."
        action={

          <button
            type="button"
            className="tasks-new-button"
            onClick={
              openCreate
            }
          >

            <Plus
              size={17}
            />

            New task

          </button>

        }
      />


      <div className="tasks-page-body">

        {error && (

          <div className="tasks-notice error">

            <AlarmClock
              size={17}
            />

            <span>
              {error}
            </span>

          </div>

        )}


        {success && (

          <div className="tasks-notice success">

            <CheckCircle2
              size={17}
            />

            <span>
              {success}
            </span>

          </div>

        )}


        {/* ===================================================
            OVERVIEW
            =================================================== */}

        <section className="tasks-section">

          <div className="tasks-section-heading tasks-overview-heading">

            <div>

              <span className="tasks-section-kicker">
                Overview
              </span>

              <h2>
                Your workload at a glance
              </h2>

            </div>


            <button
              type="button"
              className="tasks-refresh-button"
              disabled={
                refreshing
              }
              onClick={() =>
                void loadPage(
                  true
                )
              }
            >

              <RefreshCw
                size={15}
                className={
                  refreshing
                    ? "tasks-spin"
                    : ""
                }
              />

              Refresh

            </button>

          </div>


          <div className="tasks-metrics-grid">

            <TaskMetric
              icon={
                <ListTodo
                  size={18}
                />
              }
              label="Remaining"
              value={
                String(
                  derived
                    .remaining
                    .length
                )
              }
              helper="Pending + active"
              tone="violet"
            />


            <TaskMetric
              icon={
                <CheckCircle2
                  size={18}
                />
              }
              label="Completed"
              value={
                String(
                  derived
                    .completed
                    .length
                )
              }
              helper="Finished tasks"
              tone="green"
            />


            <TaskMetric
              icon={
                <AlarmClock
                  size={18}
                />
              }
              label="Overdue"
              value={
                String(
                  derived
                    .overdueTasks
                    .length
                )
              }
              helper="Past scheduled time"
              tone="red"
            />


            <TaskMetric
              icon={
                <Clock3
                  size={18}
                />
              }
              label="Planned time"
              value={
                formatMinutes(
                  derived
                    .plannedMinutes
                )
              }
              helper="Remaining estimate"
              tone="blue"
            />

          </div>

        </section>


        {/* ===================================================
            TASK WORKSPACE
            =================================================== */}

        <section className="tasks-section tasks-workspace-section">

          <div className="tasks-section-heading">

            <div>

              <span className="tasks-section-kicker">
                Workspace
              </span>

              <h2>
                Your tasks
              </h2>

            </div>


            <span className="tasks-section-note">

              {
                filteredTasks
                  .length
              }

              {" "}

              {
                filteredTasks
                  .length ===
                1
                  ? "task"
                  : "tasks"
              }

              {" "}shown

            </span>

          </div>


          <div className="tasks-toolbar">

            <label className="tasks-search-box">

              <Search
                size={17}
              />


              <input
                value={
                  query
                }
                placeholder="Search tasks"
                aria-label="Search tasks"
                onChange={(
                  event
                ) =>
                  setQuery(
                    event.target
                      .value
                  )
                }
              />


              {query && (

                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() =>
                    setQuery("")
                  }
                >

                  <X
                    size={15}
                  />

                </button>

              )}

            </label>


            <div className="tasks-filter-wrap">

              <div className="tasks-filter-label">

                <Filter
                  size={14}
                />

                View

              </div>


              <div className="tasks-filter-tabs">

                {(
                  [
                    "all",
                    "pending",
                    "active",
                    "overdue",
                    "completed",
                  ] as TaskFilter[]
                ).map(
                  (
                    value
                  ) => (

                    <button
                      type="button"
                      key={
                        value
                      }
                      className={
                        filter ===
                        value
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setFilter(
                          value
                        )
                      }
                    >

                      {
                        filterLabel(
                          value
                        )
                      }


                      <span>

                        {
                          filterCounts[
                            value
                          ]
                        }

                      </span>

                    </button>

                  )
                )}

              </div>

            </div>

          </div>


          <div className="tasks-list-surface">

            {
              filteredTasks
                .length >
              0
              ? (

                <div className="tasks-list">

                  {
                    filteredTasks
                      .map(
                        (
                          task
                        ) => (

                          <TaskCard
                            key={
                              task.id
                            }

                            task={
                              task
                            }

                            now={
                              now
                            }

                            busy={
                              workingTaskId ===
                              task.id
                            }

                            onStart={
                              startTask
                            }

                            onComplete={
                              completeTask
                            }

                            onEdit={
                              openEdit
                            }

                            onDelete={
                              deleteTask
                            }
                          />

                        )
                      )
                  }

                </div>

              )
              : (

                <div className="tasks-empty-state">

                  <div className="tasks-empty-icon">

                    {
                      tasks.length ===
                      0
                      ? (

                        <Sparkles
                          size={22}
                        />

                      )
                      : (

                        <Search
                          size={22}
                        />

                      )
                    }

                  </div>


                  <div className="tasks-empty-copy">

                    <span>

                      {
                        tasks.length ===
                        0
                          ? "READY WHEN YOU ARE"
                          : "NO MATCHES"
                      }

                    </span>


                    <h3>

                      {
                        tasks.length ===
                        0
                          ? "Your task space is clear."
                          : "Nothing matches this view."
                      }

                    </h3>


                    <p>

                      {
                        tasks.length ===
                        0
                          ? "Capture one meaningful next action and let NEXA keep it visible."
                          : "Try another filter or change the search phrase."
                      }

                    </p>

                  </div>


                  <div className="tasks-empty-actions">

                    {
                      tasks.length ===
                      0
                      ? (

                        <button
                          type="button"
                          className="tasks-primary-button"
                          onClick={
                            openCreate
                          }
                        >

                          <Plus
                            size={16}
                          />

                          Create task

                        </button>

                      )
                      : (

                        <button
                          type="button"
                          className="tasks-secondary-button"
                          onClick={() => {

                            setQuery("");

                            setFilter(
                              "all"
                            );

                          }}
                        >

                          Clear filters

                        </button>

                      )
                    }

                  </div>

                </div>

              )
            }

          </div>

        </section>

      </div>


      {/* =====================================================
          TASK EDITOR
          ===================================================== */}

      {editorOpen && (

        <div
          className="tasks-modal-layer"
          role="presentation"
          onMouseDown={
            closeEditor
          }
        >

          <form
            className="tasks-editor"
            onSubmit={
              saveTask
            }
            onMouseDown={(
              event
            ) =>
              event
                .stopPropagation()
            }
          >

            <div className="tasks-editor-header">

              <div>

                <span>

                  {
                    draft.id
                      ? "REFINE TASK"
                      : "CAPTURE THE NEXT MOVE"
                  }

                </span>


                <h2>

                  {
                    draft.id
                      ? "Edit task"
                      : "New task"
                  }

                </h2>


                <p>
                  Keep the task clear enough that you can act on it without rethinking it later.
                </p>

              </div>


              <button
                type="button"
                className="tasks-editor-close"
                aria-label="Close task editor"
                onClick={
                  closeEditor
                }
              >

                <X
                  size={18}
                />

              </button>

            </div>


            {draft.series_id && (

              <div className="tasks-series-notice">

                <Repeat2
                  size={16}
                />


                <div>

                  <strong>
                    Recurring occurrence
                  </strong>

                  <span>
                    These changes apply to this task occurrence. The recurring series remains intact.
                  </span>

                </div>

              </div>

            )}


            <div className="tasks-editor-body">

              <label className="tasks-field tasks-field-title">

                <span>
                  Task title
                </span>


                <input
                  autoFocus
                  required
                  maxLength={120}
                  value={
                    draft.title
                  }
                  placeholder="What needs to get done?"
                  onChange={(
                    event
                  ) =>
                    setDraft({
                      ...draft,

                      title:
                        event.target
                          .value,
                    })
                  }
                />

              </label>


              <label className="tasks-field">

                <span>
                  Description
                </span>


                <textarea
                  rows={3}
                  maxLength={600}
                  value={
                    draft
                      .description
                  }
                  placeholder="Optional context, outcome, or note..."
                  onChange={(
                    event
                  ) =>
                    setDraft({
                      ...draft,

                      description:
                        event.target
                          .value,
                    })
                  }
                />

              </label>


              <div className="tasks-form-grid three">

                <label className="tasks-field">

                  <span>
                    Priority
                  </span>


                  <select
                    value={
                      draft
                        .priority
                    }
                    onChange={(
                      event
                    ) =>
                      setDraft({
                        ...draft,

                        priority:
                          event.target
                            .value as
                            TaskPriority,
                      })
                    }
                  >

                    <option value="low">
                      Low
                    </option>

                    <option value="medium">
                      Medium
                    </option>

                    <option value="high">
                      High
                    </option>

                  </select>

                </label>


                <label className="tasks-field">

                  <span>
                    Estimate
                  </span>


                  <div className="tasks-input-suffix">

                    <input
                      type="number"
                      min={1}
                      max={480}
                      value={
                        draft
                          .estimated_minutes
                      }
                      onChange={(
                        event
                      ) =>
                        setDraft({
                          ...draft,

                          estimated_minutes:
                            Number(
                              event.target
                                .value
                            ),
                        })
                      }
                    />


                    <small>
                      min
                    </small>

                  </div>

                </label>


                <label className="tasks-field">

                  <span>
                    Schedule
                  </span>


                  <input
                    type="datetime-local"
                    value={
                      draft
                        .scheduled_for
                    }
                    onChange={(
                      event
                    ) => {

                      const scheduled_for =
                        event.target
                          .value;


                      setDraft({
                        ...draft,

                        scheduled_for,

                        reminder_enabled:
                          scheduled_for
                            ? draft
                                .reminder_enabled
                            : false,
                      });

                    }}
                  />

                </label>

              </div>


              <div className="tasks-reminder-card">

                <div className="tasks-reminder-copy">

                  <div className="tasks-reminder-icon">

                    <Bell
                      size={18}
                    />

                  </div>


                  <div>

                    <strong>
                      Reminder
                    </strong>

                    <span>
                      Let NEXA bring this task forward before its scheduled time.
                    </span>

                  </div>

                </div>


                <label className="tasks-switch">

                  <input
                    type="checkbox"
                    checked={
                      draft
                        .reminder_enabled
                    }
                    disabled={
                      !draft
                        .scheduled_for
                    }
                    onChange={(
                      event
                    ) =>
                      setDraft({
                        ...draft,

                        reminder_enabled:
                          event.target
                            .checked,
                      })
                    }
                  />


                  <span />

                </label>

              </div>


              {
                draft
                  .reminder_enabled
                &&
                draft
                  .scheduled_for
                &&
                (

                  <label className="tasks-field tasks-reminder-minutes">

                    <span>
                      Remind me before
                    </span>


                    <div className="tasks-input-suffix">

                      <input
                        type="number"
                        min={0}
                        max={1440}
                        value={
                          draft
                            .reminder_minutes_before
                        }
                        onChange={(
                          event
                        ) =>
                          setDraft({
                            ...draft,

                            reminder_minutes_before:
                              Number(
                                event.target
                                  .value
                              ),
                          })
                        }
                      />


                      <small>
                        min
                      </small>

                    </div>

                  </label>

                )
              }


              {
                !draft
                  .scheduled_for
                &&
                (

                  <p className="tasks-field-hint">
                    Set a schedule to enable a reminder. Unscheduled tasks remain available anytime.
                  </p>

                )
              }

            </div>


            <div className="tasks-editor-footer">

              <button
                type="button"
                className="tasks-secondary-button"
                disabled={
                  saving
                }
                onClick={
                  closeEditor
                }
              >
                Cancel
              </button>


              <button
                type="submit"
                className="tasks-primary-button"
                disabled={
                  saving
                  ||
                  !draft
                    .title
                    .trim()
                }
              >

                {
                  saving
                    ? (

                      <Loader2
                        className="tasks-spin"
                        size={16}
                      />

                    )
                    : draft.id
                      ? (

                        <Check
                          size={16}
                        />

                      )
                      : (

                        <Plus
                          size={16}
                        />

                      )
                }


                {
                  saving
                    ? "Saving..."
                    : draft.id
                      ? "Save changes"
                      : "Create task"
                }

              </button>

            </div>

          </form>

        </div>

      )}

    </section>
  );
}


// ============================================================
// METRIC
// ============================================================

type TaskMetricProps = {
  icon: ReactNode;

  label: string;

  value: string;

  helper: string;

  tone: MetricTone;
};


function TaskMetric({
  icon,
  label,
  value,
  helper,
  tone,
}: TaskMetricProps) {
  return (
    <article className="tasks-metric-card">

      <div
        className={
          `tasks-metric-icon ${tone}`
        }
      >
        {icon}
      </div>


      <div className="tasks-metric-copy">

        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

        <small>
          {helper}
        </small>

      </div>

    </article>
  );
}


// ============================================================
// TASK CARD
// ============================================================

type TaskCardProps = {
  task: TaskRow;

  now: number;

  busy: boolean;

  onStart:
    (
      task: TaskRow
    ) =>
      Promise<void>;

  onComplete:
    (
      task: TaskRow
    ) =>
      Promise<void>;

  onEdit:
    (
      task: TaskRow
    ) =>
      void;

  onDelete:
    (
      task: TaskRow
    ) =>
      Promise<void>;
};


function TaskCard({
  task,
  now,
  busy,
  onStart,
  onComplete,
  onEdit,
  onDelete,
}: TaskCardProps) {

  const overdue =
    isOverdueTask(
      task,
      now
    );


  const active =
    task.status ===
    "active";


  const completed =
    task.status ===
    "completed";


  return (
    <article
      className={
        `tasks-task-card ${
          active
            ? "active"
            : ""
        } ${
          overdue
            ? "overdue"
            : ""
        } ${
          completed
            ? "completed"
            : ""
        }`
      }
    >

      <button
        type="button"
        className={
          `tasks-complete-control ${
            completed
              ? "completed"
              : ""
          }`
        }
        disabled={
          completed ||
          busy
        }
        title={
          completed
            ? "Completed"
            : "Mark task complete"
        }
        onClick={() => {

          if (
            !completed &&
            !busy
          ) {
            void onComplete(
              task
            );
          }

        }}
      >

        {
          busy
            ? (

              <Loader2
                className="tasks-spin"
                size={18}
              />

            )
            : completed
              ? (

                <CheckCircle2
                  size={20}
                />

              )
              : (

                <Circle
                  size={20}
                />

              )
        }

      </button>


      <div className="tasks-task-main">

        <div className="tasks-task-title-row">

          <div className="tasks-task-title-copy">

            <h3>
              {task.title}
            </h3>


            <div className="tasks-task-badges">

              <span
                className={
                  `tasks-priority ${task.priority}`
                }
              >
                {task.priority}
              </span>


              {active && (

                <span className="tasks-live-badge">

                  <i />

                  Active

                </span>

              )}


              {overdue && (

                <span className="tasks-overdue-badge">

                  <AlarmClock
                    size={10}
                  />

                  Overdue

                </span>

              )}


              {task.series_id && (

                <span className="tasks-soft-badge">

                  <Repeat2
                    size={10}
                  />

                  Recurring

                </span>

              )}


              {
                task
                  .reminder_enabled
                &&
                task
                  .scheduled_for
                &&
                (

                  <span className="tasks-soft-badge">

                    <Bell
                      size={10}
                    />

                    {
                      task
                        .reminder_minutes_before
                    }m reminder

                  </span>

                )
              }

            </div>

          </div>

        </div>


        {task.description && (

          <p className="tasks-task-description">
            {task.description}
          </p>

        )}


        <div className="tasks-task-meta">

          <span
            className={
              overdue
                ? "late"
                : ""
            }
          >

            <CalendarClock
              size={13}
            />

            {
              task
                .scheduled_for
                ? formatSchedule(
                    task
                      .scheduled_for,
                    now
                  )
                : "Anytime"
            }

          </span>


          <span>

            <Timer
              size={13}
            />

            {
              task
                .estimated_minutes ||
              0
            } min

          </span>


          <span>

            <Clock3
              size={13}
            />

            {
              taskStatusLabel(
                task.status
              )
            }

          </span>

        </div>

      </div>


      <div className="tasks-task-actions">

        {
          !completed &&
          !active
          &&
          (

            <button
              type="button"
              className="tasks-row-action start"
              disabled={
                busy
              }
              onClick={() =>
                void onStart(
                  task
                )
              }
            >

              <Play
                size={13}
                fill="currentColor"
              />

              Start

            </button>

          )
        }


        {active && (

          <button
            type="button"
            className="tasks-row-action complete"
            disabled={
              busy
            }
            onClick={() =>
              void onComplete(
                task
              )
            }
          >

            <Check
              size={14}
            />

            Complete

          </button>

        )}


        <button
          type="button"
          className="tasks-icon-action"
          disabled={
            busy
          }
          title="Edit"
          aria-label={
            `Edit ${task.title}`
          }
          onClick={() =>
            onEdit(
              task
            )
          }
        >

          <Edit3
            size={15}
          />

        </button>


        <button
          type="button"
          className="tasks-icon-action danger"
          disabled={
            busy
          }
          title="Delete"
          aria-label={
            `Delete ${task.title}`
          }
          onClick={() =>
            void onDelete(
              task
            )
          }
        >

          <Trash2
            size={15}
          />

        </button>

      </div>

    </article>
  );
}


// ============================================================
// HELPERS
// ============================================================

function compareActionableTasks(
  a: TaskRow,
  b: TaskRow
) {
  const aTime =
    a.scheduled_for
      ? new Date(
          a.scheduled_for
        )
          .getTime()
      : Number
          .MAX_SAFE_INTEGER;


  const bTime =
    b.scheduled_for
      ? new Date(
          b.scheduled_for
        )
          .getTime()
      : Number
          .MAX_SAFE_INTEGER;


  if (
    aTime !==
    bTime
  ) {
    return (
      aTime -
      bTime
    );
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


function compareTasksForDisplay(
  a: TaskRow,
  b: TaskRow
) {
  const statusWeight:
    Record<
      TaskStatus,
      number
    > = {
      active: 0,

      pending: 1,

      completed: 2,

      skipped: 3,

      cancelled: 4,
    };


  const statusDifference =
    statusWeight[
      a.status
    ]
    -
    statusWeight[
      b.status
    ];


  if (
    statusDifference !==
    0
  ) {
    return statusDifference;
  }


  if (
    a.status ===
      "pending"
    &&
    b.status ===
      "pending"
  ) {
    const aOverdue =
      isOverdueTask(
        a
      );


    const bOverdue =
      isOverdueTask(
        b
      );


    if (
      aOverdue !==
      bOverdue
    ) {
      return aOverdue
        ? -1
        : 1;
    }


    return compareActionableTasks(
      a,
      b
    );
  }


  if (
    a.status ===
      "completed"
    &&
    b.status ===
      "completed"
  ) {
    const aCompleted =
      a.completed_at
        ? new Date(
            a.completed_at
          )
            .getTime()
        : 0;


    const bCompleted =
      b.completed_at
        ? new Date(
            b.completed_at
          )
            .getTime()
        : 0;


    return (
      bCompleted -
      aCompleted
    );
  }


  return (
    new Date(
      b.created_at
    )
      .getTime()
    -
    new Date(
      a.created_at
    )
      .getTime()
  );
}


function isOverdueTask(
  task: TaskRow,
  currentTime =
    Date.now()
) {
  if (
    task.status !==
      "pending"
    ||
    !task
      .scheduled_for
  ) {
    return false;
  }


  return (
    new Date(
      task
        .scheduled_for
    )
      .getTime()
    <
    currentTime
  );
}


function filterLabel(
  filter: TaskFilter
) {
  switch (filter) {
    case "pending":
      return "Pending";

    case "active":
      return "Active";

    case "overdue":
      return "Overdue";

    case "completed":
      return "Completed";

    default:
      return "All";
  }
}


function taskStatusLabel(
  status: TaskStatus
) {
  switch (status) {
    case "pending":
      return "Pending";

    case "active":
      return "In progress";

    case "completed":
      return "Completed";

    case "cancelled":
      return "Cancelled";

    case "skipped":
      return "Skipped";
  }
}


function formatMinutes(
  minutes: number
) {
  if (
    minutes <
    60
  ) {
    return `${minutes}m`;
  }


  const hours =
    Math.floor(
      minutes /
      60
    );


  const remaining =
    minutes %
    60;


  return (
    remaining >
    0
      ? `${hours}h ${remaining}m`
      : `${hours}h`
  );
}


function formatSchedule(
  iso: string,
  currentTime =
    Date.now()
) {
  const date =
    new Date(
      iso
    );


  const today =
    new Date(
      currentTime
    );


  const tomorrow =
    new Date(
      today
    );


  tomorrow.setDate(
    today.getDate() +
    1
  );


  const time =
    new Intl
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
        date
      );


  if (
    sameDay(
      date,
      today
    )
  ) {
    return `Today · ${time}`;
  }


  if (
    sameDay(
      date,
      tomorrow
    )
  ) {
    return `Tomorrow · ${time}`;
  }


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

        hour12:
          true,
      }
    )
    .format(
      date
    );
}


function sameDay(
  a: Date,
  b: Date
) {
  return (
    a.getFullYear() ===
      b.getFullYear()
    &&
    a.getMonth() ===
      b.getMonth()
    &&
    a.getDate() ===
      b.getDate()
  );
}


function toDateTimeLocal(
  iso: string
) {
  const date =
    new Date(
      iso
    );


  const local =
    new Date(
      date.getTime()
      -
      date
        .getTimezoneOffset()
      *
      60000
    );


  return local
    .toISOString()
    .slice(
      0,
      16
    );
}