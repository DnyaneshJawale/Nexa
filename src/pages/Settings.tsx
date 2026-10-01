import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  Bell,
  Check,
  CheckCircle2,
  Coffee,
  Loader2,
  Moon,
  RefreshCw,
  RotateCcw,
  Save,
  Settings2,
  Sparkles,
  Timer,
  UserRound,
  Volume2,
  Zap,
} from "lucide-react";

import PageHeader from "../components/PageHeader";
import { supabase } from "../lib/supabase";

import "./Settings.css";


// ============================================================
// TYPES
// ============================================================

type NexaSettings = {
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
};


const DEFAULT_SETTINGS: NexaSettings = {
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
};


// ============================================================
// PAGE
// ============================================================

export default function Settings() {
  const [
    settings,
    setSettings,
  ] =
    useState<NexaSettings>(
      DEFAULT_SETTINGS
    );


  const [
    savedSettings,
    setSavedSettings,
  ] =
    useState<NexaSettings>(
      DEFAULT_SETTINGS
    );


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    saving,
    setSaving,
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


  // =========================================================
  // LOAD
  // =========================================================

  const loadSettings =
    useCallback(
      async () => {

        setLoading(
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


          if (
            userError
          ) {
            throw userError;
          }


          if (!user) {
            throw new Error(
              "Authentication session not found."
            );
          }


          const {
            data,
            error:
              settingsError,
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
                  device_idle_rotation_seconds
                `
              )
              .eq(
                "user_id",
                user.id
              )
              .maybeSingle();


          if (
            settingsError
          ) {
            throw settingsError;
          }


          const next:
            NexaSettings = {
            display_name:
              data
                ?.display_name
              ??
              "",

            timezone:
              data
                ?.timezone
              ??
              "Asia/Kolkata",

            default_focus_minutes:
              data
                ?.default_focus_minutes
              ??
              25,

            default_break_minutes:
              data
                ?.default_break_minutes
              ??
              5,

            auto_start_break:
              data
                ?.auto_start_break
              ??
              false,

            auto_start_focus:
              data
                ?.auto_start_focus
              ??
              false,

            sound_enabled:
              data
                ?.sound_enabled
              ??
              true,

            startup_chime_enabled:
              data
                ?.startup_chime_enabled
              ??
              true,

            default_reminder_enabled:
              data
                ?.default_reminder_enabled
              ??
              true,

            default_reminder_minutes_before:
              data
                ?.default_reminder_minutes_before
              ??
              10,

            default_snooze_minutes:
              data
                ?.default_snooze_minutes
              ??
              10,

            overdue_nudges_enabled:
              data
                ?.overdue_nudges_enabled
              ??
              true,

            next_task_prompt_enabled:
              data
                ?.next_task_prompt_enabled
              ??
              true,

            next_task_countdown_minutes:
              data
                ?.next_task_countdown_minutes
              ??
              5,

            quiet_hours_enabled:
              data
                ?.quiet_hours_enabled
              ??
              false,

            quiet_hours_start:
              trimTime(
                data
                  ?.quiet_hours_start
              )
              ||
              "22:00",

            quiet_hours_end:
              trimTime(
                data
                  ?.quiet_hours_end
              )
              ||
              "07:00",

            device_idle_rotation_seconds:
              data
                ?.device_idle_rotation_seconds
              ??
              8,
          };


          setSettings(
            next
          );


          setSavedSettings(
            next
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
              : "Could not load settings."
          );
        }

        finally {
          setLoading(
            false
          );
        }

      },
      []
    );


  useEffect(
    () => {
      void loadSettings();
    },
    [
      loadSettings,
    ]
  );


  // =========================================================
  // DIRTY STATE
  // =========================================================

  const changed =
    useMemo(
      () =>
        JSON.stringify(
          settings
        )
        !==
        JSON.stringify(
          savedSettings
        ),
      [
        settings,
        savedSettings,
      ]
    );


  // =========================================================
  // SAVE
  // =========================================================

  async function saveSettings() {
    if (
      saving ||
      !changed
    ) {
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


      if (
        userError
      ) {
        throw userError;
      }


      if (!user) {
        throw new Error(
          "Authentication session not found."
        );
      }


      const payload = {
        user_id:
          user.id,

        display_name:
          settings
            .display_name
            .trim(),

        timezone:
          settings
            .timezone,

        default_focus_minutes:
          clamp(
            settings
              .default_focus_minutes,
            1,
            180
          ),

        default_break_minutes:
          clamp(
            settings
              .default_break_minutes,
            1,
            60
          ),

        auto_start_break:
          settings
            .auto_start_break,

        auto_start_focus:
          settings
            .auto_start_focus,

        /*
          sound_enabled controls spoken sentences.

          Beep feedback is deliberately NOT controlled
          by this field. Operational beeps remain enabled
          on the ESP8266.
        */

        sound_enabled:
          settings
            .sound_enabled,

        startup_chime_enabled:
          settings
            .startup_chime_enabled,

        default_reminder_enabled:
          settings
            .default_reminder_enabled,

        default_reminder_minutes_before:
          clamp(
            settings
              .default_reminder_minutes_before,
            0,
            1440
          ),

        default_snooze_minutes:
          clamp(
            settings
              .default_snooze_minutes,
            1,
            1440
          ),

        overdue_nudges_enabled:
          settings
            .overdue_nudges_enabled,

        next_task_prompt_enabled:
          settings
            .next_task_prompt_enabled,

        next_task_countdown_minutes:
          clamp(
            settings
              .next_task_countdown_minutes,
            1,
            60
          ),

        quiet_hours_enabled:
          settings
            .quiet_hours_enabled,

        quiet_hours_start:
          settings
            .quiet_hours_start,

        quiet_hours_end:
          settings
            .quiet_hours_end,

        device_idle_rotation_seconds:
          clamp(
            settings
              .device_idle_rotation_seconds,
            3,
            60
          ),

        updated_at:
          new Date()
            .toISOString(),
      };


      const {
        error:
          saveError,
      } =
        await supabase
          .from(
            "user_settings"
          )
          .upsert(
            payload,
            {
              onConflict:
                "user_id",
            }
          );


      if (
        saveError
      ) {
        throw saveError;
      }


      const saved: NexaSettings = {
        ...settings,

        display_name:
          payload
            .display_name,

        default_focus_minutes:
          payload
            .default_focus_minutes,

        default_break_minutes:
          payload
            .default_break_minutes,

        default_reminder_minutes_before:
          payload
            .default_reminder_minutes_before,

        default_snooze_minutes:
          payload
            .default_snooze_minutes,

        next_task_countdown_minutes:
          payload
            .next_task_countdown_minutes,

        device_idle_rotation_seconds:
          payload
            .device_idle_rotation_seconds,
      };


      setSettings(
        saved
      );


      setSavedSettings(
        saved
      );


      notifySuccess(
        "Settings saved."
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
          : "Could not save settings."
      );
    }

    finally {
      setSaving(
        false
      );
    }
  }


  // =========================================================
  // RESET UNSAVED
  // =========================================================

  function discardChanges() {
    setSettings(
      savedSettings
    );


    setError("");
  }


  // =========================================================
  // SUCCESS
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
  // UPDATE HELPER
  // =========================================================

  function updateSetting<
    K extends keyof NexaSettings
  >(
    key: K,
    value:
      NexaSettings[K]
  ) {
    setSettings(
      (
        current
      ) => ({
        ...current,
        [key]:
          value,
      })
    );
  }


  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <section className="settings-page settings-loading-page">

        <div className="settings-loading">

          <div className="settings-loading-icon">

            <Loader2
              size={22}
            />

          </div>


          <div>

            <strong>
              Loading your preferences
            </strong>

            <span>
              NEXA is restoring your workspace behaviour.
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
    <div className="settings-header-actions">

      {changed && (

        <button
          type="button"
          className="settings-discard-button"
          disabled={
            saving
          }
          onClick={
            discardChanges
          }
        >

          <RotateCcw
            size={14}
          />

          Discard

        </button>

      )}


      <button
        type="button"
        className="settings-save-button"
        disabled={
          saving ||
          !changed
        }
        onClick={
          saveSettings
        }
      >

        {saving ? (

          <Loader2
            className="settings-spin"
            size={16}
          />

        ) : changed ? (

          <Save
            size={16}
          />

        ) : (

          <Check
            size={16}
          />

        )}


        {saving
          ? "Saving..."
          : changed
            ? "Save changes"
            : "Saved"
        }

      </button>

    </div>
  );


  // =========================================================
  // UI
  // =========================================================

  return (
    <section className="settings-page">

      <PageHeader
        eyebrow="NEXA PREFERENCES"
        title="Settings"
        description="Shape how NEXA manages focus, reminders, audio and the behaviour of your desk companion."
        action={
          headerAction
        }
      />


      <div className="settings-page-body">

        {error && (

          <div className="settings-notice error">
            {error}
          </div>

        )}


        {success && (

          <div className="settings-notice success">

            <CheckCircle2
              size={16}
            />

            {success}

          </div>

        )}


        {/* ===================================================
            WORKSPACE
            =================================================== */}

        <SettingsSection
          icon={
            <UserRound
              size={20}
            />
          }
          eyebrow="WORKSPACE"
          title="Personalise NEXA"
          description="Basic information NEXA uses across greetings, scheduling and your workspace."
        >

          <div className="settings-grid two">

            <SettingsField
              label="Display name"
              hint="Used in NEXA greetings and summaries."
            >

              <input
                type="text"
                maxLength={60}
                value={
                  settings
                    .display_name
                }
                placeholder="Your name"
                onChange={(
                  event
                ) =>
                  updateSetting(
                    "display_name",
                    event.target
                      .value
                  )
                }
              />

            </SettingsField>


            <SettingsField
              label="Timezone"
              hint="Tasks and reminder times use this timezone."
            >

              <select
                value={
                  settings
                    .timezone
                }
                onChange={(
                  event
                ) =>
                  updateSetting(
                    "timezone",
                    event.target
                      .value
                  )
                }
              >

                <option value="Asia/Kolkata">
                  India · Asia/Kolkata
                </option>

                <option value="Asia/Dubai">
                  Dubai · Asia/Dubai
                </option>

                <option value="Europe/London">
                  London · Europe/London
                </option>

                <option value="America/New_York">
                  New York · America/New_York
                </option>

                <option value="America/Los_Angeles">
                  Los Angeles · America/Los_Angeles
                </option>

              </select>

            </SettingsField>

          </div>

        </SettingsSection>


        {/* ===================================================
            FOCUS
            =================================================== */}

        <SettingsSection
          icon={
            <Timer
              size={20}
            />
          }
          eyebrow="FOCUS RHYTHM"
          title="Deep-work cycle"
          description="Set the default structure NEXA uses when you enter focus mode."
        >

          <div className="settings-grid two">

            <SettingsField
              label="Focus duration"
              hint="Default duration for a new focus session."
            >

              <NumberInput
                value={
                  settings
                    .default_focus_minutes
                }
                min={1}
                max={180}
                suffix="min"
                onChange={(
                  value
                ) =>
                  updateSetting(
                    "default_focus_minutes",
                    value
                  )
                }
              />

            </SettingsField>


            <SettingsField
              label="Break duration"
              hint="Recovery time proposed after a completed focus session."
            >

              <NumberInput
                value={
                  settings
                    .default_break_minutes
                }
                min={1}
                max={60}
                suffix="min"
                onChange={(
                  value
                ) =>
                  updateSetting(
                    "default_break_minutes",
                    value
                  )
                }
              />

            </SettingsField>

          </div>


          <div className="settings-toggle-stack">

            <SettingsToggle
              icon={
                <Coffee
                  size={17}
                />
              }
              title="Automatically start break"
              description="Begin the break timer when a focus session completes."
              checked={
                settings
                  .auto_start_break
              }
              onChange={(
                value
              ) =>
                updateSetting(
                  "auto_start_break",
                  value
                )
              }
            />


            <SettingsToggle
              icon={
                <RefreshCw
                  size={17}
                />
              }
              title="Automatically start next focus"
              description="After a completed break, begin the next focus cycle."
              checked={
                settings
                  .auto_start_focus
              }
              onChange={(
                value
              ) =>
                updateSetting(
                  "auto_start_focus",
                  value
                )
              }
            />

          </div>

        </SettingsSection>


        {/* ===================================================
            TASKS + REMINDERS
            =================================================== */}

        <SettingsSection
          icon={
            <Bell
              size={20}
            />
          }
          eyebrow="TASKS & REMINDERS"
          title="Attention management"
          description="Control when NEXA surfaces tasks and how reminders return after being deferred."
        >

          <div className="settings-grid three">

            <SettingsField
              label="Reminder lead time"
              hint="Default warning before a scheduled task."
            >

              <NumberInput
                value={
                  settings
                    .default_reminder_minutes_before
                }
                min={0}
                max={1440}
                suffix="min"
                onChange={(
                  value
                ) =>
                  updateSetting(
                    "default_reminder_minutes_before",
                    value
                  )
                }
              />

            </SettingsField>


            <SettingsField
              label="Default snooze"
              hint="How long a reminder moves out of the way."
            >

              <NumberInput
                value={
                  settings
                    .default_snooze_minutes
                }
                min={1}
                max={1440}
                suffix="min"
                onChange={(
                  value
                ) =>
                  updateSetting(
                    "default_snooze_minutes",
                    value
                  )
                }
              />

            </SettingsField>


            <SettingsField
              label="Next-task window"
              hint="When a scheduled task becomes 'due now'."
            >

              <NumberInput
                value={
                  settings
                    .next_task_countdown_minutes
                }
                min={1}
                max={60}
                suffix="min"
                onChange={(
                  value
                ) =>
                  updateSetting(
                    "next_task_countdown_minutes",
                    value
                  )
                }
              />

            </SettingsField>

          </div>


          <div className="settings-toggle-stack">

            <SettingsToggle
              icon={
                <Bell
                  size={17}
                />
              }
              title="Enable reminders by default"
              description="New scheduled tasks begin with reminders enabled."
              checked={
                settings
                  .default_reminder_enabled
              }
              onChange={(
                value
              ) =>
                updateSetting(
                  "default_reminder_enabled",
                  value
                )
              }
            />


            <SettingsToggle
              icon={
                <Zap
                  size={17}
                />
              }
              title="Overdue nudges"
              description="Keep overdue work visible until you make a decision about it."
              checked={
                settings
                  .overdue_nudges_enabled
              }
              onChange={(
                value
              ) =>
                updateSetting(
                  "overdue_nudges_enabled",
                  value
                )
              }
            />


            <SettingsToggle
              icon={
                <Sparkles
                  size={17}
                />
              }
              title="Next-task prompts"
              description="Let NEXA bring the next relevant task forward automatically."
              checked={
                settings
                  .next_task_prompt_enabled
              }
              onChange={(
                value
              ) =>
                updateSetting(
                  "next_task_prompt_enabled",
                  value
                )
              }
            />

          </div>

        </SettingsSection>


        {/* ===================================================
            AUDIO
            =================================================== */}

        <SettingsSection
          icon={
            <Volume2
              size={20}
            />
          }
          eyebrow="AUDIO"
          title="NEXA voice & feedback"
          description="Choose when NEXA speaks. Essential interaction beeps remain available independently."
        >

          <div className="settings-audio-stack">

            <div className="settings-fixed-control">

              <div className="settings-control-icon always">

                <Volume2
                  size={17}
                />

              </div>


              <div className="settings-control-copy">

                <div className="settings-control-title">

                  <strong>
                    Interaction beeps
                  </strong>


                  <span className="settings-always-badge">

                    <Check
                      size={11}
                    />

                    Always on

                  </span>

                </div>


                <p>
                  Short feedback tones confirm button presses,
                  errors and important device interactions.
                </p>

              </div>

            </div>


            <SettingsToggle
              icon={
                <Sparkles
                  size={17}
                />
              }
              title="Voice announcements"
              description="Allow NEXA to speak greetings, task prompts, focus status and other contextual sentences."
              checked={
                settings
                  .sound_enabled
              }
              onChange={(
                value
              ) =>
                updateSetting(
                  "sound_enabled",
                  value
                )
              }
            />


            <SettingsToggle
              icon={
                <Volume2
                  size={17}
                />
              }
              title="Startup welcome tune"
              description="Play NEXA's short welcome gesture when the desk device powers on."
              checked={
                settings
                  .startup_chime_enabled
              }
              onChange={(
                value
              ) =>
                updateSetting(
                  "startup_chime_enabled",
                  value
                )
              }
            />

          </div>

        </SettingsSection>


        {/* ===================================================
            DEVICE BEHAVIOUR
            =================================================== */}

        <SettingsSection
          icon={
            <Settings2
              size={20}
            />
          }
          eyebrow="PHYSICAL DEVICE"
          title="Desk behaviour"
          description="Control the pace of the idle display and how quickly NEXA moves through passive information."
        >

          <div className="settings-grid one">

            <SettingsField
              label="Idle-screen rotation"
              hint="Time each carousel screen remains visible before NEXA moves to the next."
            >

              <div className="settings-rotation-control">

                <input
                  type="range"
                  min={3}
                  max={30}
                  step={1}
                  value={
                    settings
                      .device_idle_rotation_seconds
                  }
                  onChange={(
                    event
                  ) =>
                    updateSetting(
                      "device_idle_rotation_seconds",
                      Number(
                        event.target
                          .value
                      )
                    )
                  }
                />


                <strong>
                  {
                    settings
                      .device_idle_rotation_seconds
                  }s
                </strong>

              </div>

            </SettingsField>

          </div>

        </SettingsSection>


        {/* ===================================================
            QUIET HOURS
            =================================================== */}

        <SettingsSection
          icon={
            <Moon
              size={20}
            />
          }
          eyebrow="QUIET HOURS"
          title="Protect downtime"
          description="Store the period when NEXA should treat interruptions more conservatively."
        >

          <SettingsToggle
            icon={
              <Moon
                size={17}
              />
            }
            title="Enable quiet hours"
            description="Keep a defined start and end time available for quiet-mode behaviour."
            checked={
              settings
                .quiet_hours_enabled
            }
            onChange={(
              value
            ) =>
              updateSetting(
                "quiet_hours_enabled",
                value
              )
            }
          />


          {settings
            .quiet_hours_enabled && (

            <div className="settings-grid two settings-quiet-grid">

              <SettingsField
                label="Starts"
              >

                <input
                  type="time"
                  value={
                    settings
                      .quiet_hours_start
                  }
                  onChange={(
                    event
                  ) =>
                    updateSetting(
                      "quiet_hours_start",
                      event.target
                        .value
                    )
                  }
                />

              </SettingsField>


              <SettingsField
                label="Ends"
              >

                <input
                  type="time"
                  value={
                    settings
                      .quiet_hours_end
                  }
                  onChange={(
                    event
                  ) =>
                    updateSetting(
                      "quiet_hours_end",
                      event.target
                        .value
                    )
                  }
                />

              </SettingsField>

            </div>

          )}

        </SettingsSection>


        {/* ===================================================
            BOTTOM SAVE BAR
            =================================================== */}

        {changed && (

          <div className="settings-unsaved-bar">

            <div>

              <span className="settings-unsaved-dot" />

              <div>

                <strong>
                  Unsaved changes
                </strong>

                <span>
                  Save to apply these preferences across NEXA.
                </span>

              </div>

            </div>


            <div className="settings-unsaved-actions">

              <button
                type="button"
                className="settings-discard-button"
                onClick={
                  discardChanges
                }
              >

                Discard

              </button>


              <button
                type="button"
                className="settings-save-button"
                disabled={
                  saving
                }
                onClick={
                  saveSettings
                }
              >

                {saving ? (

                  <Loader2
                    className="settings-spin"
                    size={15}
                  />

                ) : (

                  <Save
                    size={15}
                  />

                )}

                Save changes

              </button>

            </div>

          </div>

        )}

      </div>

    </section>
  );
}


// ============================================================
// SECTION
// ============================================================

function SettingsSection({
  icon,
  eyebrow,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="settings-section">

      <header className="settings-section-header">

        <div className="settings-section-icon">
          {icon}
        </div>


        <div>

          <span>
            {eyebrow}
          </span>

          <h2>
            {title}
          </h2>

          <p>
            {description}
          </p>

        </div>

      </header>


      <div className="settings-section-content">
        {children}
      </div>

    </section>
  );
}


// ============================================================
// FIELD
// ============================================================

function SettingsField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="settings-field">

      <span className="settings-field-label">
        {label}
      </span>


      {children}


      {hint && (

        <small>
          {hint}
        </small>

      )}

    </label>
  );
}


// ============================================================
// NUMBER INPUT
// ============================================================

function NumberInput({
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange:
    (
      value: number
    ) =>
      void;
}) {
  return (
    <div className="settings-number-input">

      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(
          event
        ) =>
          onChange(
            Number(
              event.target
                .value
            )
          )
        }
      />


      <span>
        {suffix}
      </span>

    </div>
  );
}


// ============================================================
// TOGGLE
// ============================================================

function SettingsToggle({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange:
    (
      value: boolean
    ) =>
      void;
}) {
  return (
    <div className="settings-toggle-row">

      <div className="settings-control-icon">
        {icon}
      </div>


      <div className="settings-control-copy">

        <strong>
          {title}
        </strong>

        <p>
          {description}
        </p>

      </div>


      <label className="settings-switch">

        <input
          type="checkbox"
          checked={
            checked
          }
          onChange={(
            event
          ) =>
            onChange(
              event.target
                .checked
            )
          }
        />


        <span />

      </label>

    </div>
  );
}


// ============================================================
// HELPERS
// ============================================================

function clamp(
  value: number,
  min: number,
  max: number
) {
  if (
    Number.isNaN(
      value
    )
  ) {
    return min;
  }


  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}


function trimTime(
  value:
    string |
    null |
    undefined
) {
  if (!value) {
    return "";
  }


  return value.slice(
    0,
    5
  );
}