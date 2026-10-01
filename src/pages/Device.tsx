import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  CheckCircle2,
  Cloud,
  Cpu,
  Loader2,
  Monitor,
  RefreshCw,
  Send,
  Signal,
  SignalZero,
  Timer,
  Wifi,
  WifiOff,
} from "lucide-react";

import PageHeader from "../components/PageHeader";
import { supabase } from "../lib/supabase";

import {
  getNexaManager,
  runNexaAction,
  type NexaManager,
} from "../lib/nexa";

import "./Device.css";


// ============================================================
// TYPES
// ============================================================

type DeviceRow = {
  id: string;
  user_id: string;

  name: string | null;

  enabled: boolean | null;

  firmware_version: string | null;

  last_seen: string | null;

  created_at: string;
};


type DeviceStateRow = {
  device_id: string;

  mode:
    | "home"
    | "task"
    | "focus"
    | "message";

  line1: string | null;
  line2: string | null;

  focus_minutes: number | null;

  updated_at: string | null;
};


type ConnectionState =
  | "online"
  | "offline"
  | "disabled"
  | "unknown";


const MESSAGE_SECONDS = 60;


// ============================================================
// PAGE
// ============================================================

export default function Device() {

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
    manager,
    setManager,
  ] =
    useState<NexaManager | null>(
      null
    );


  const [
    line1,
    setLine1,
  ] =
    useState(
      "NEXA"
    );


  const [
    line2,
    setLine2,
  ] =
    useState(
      "READY"
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );


  const [
    refreshing,
    setRefreshing,
  ] =
    useState(
      false
    );


  const [
    sending,
    setSending,
  ] =
    useState(
      false
    );


  const [
    error,
    setError,
  ] =
    useState(
      ""
    );


  const [
    success,
    setSuccess,
  ] =
    useState(
      ""
    );


  const [
    now,
    setNow,
  ] =
    useState(
      Date.now()
    );


  const draftDirtyRef =
    useRef(
      false
    );


  // =========================================================
  // LOAD
  // =========================================================

  const loadDevice =
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


        setError(
          ""
        );


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


          if (
            !user
          ) {

            throw new Error(
              "Authentication session not found."
            );

          }


          const {
            data:
              deviceData,

            error:
              deviceError,
          } =
            await supabase
              .from(
                "devices"
              )
              .select(
                `
                  id,
                  user_id,
                  name,
                  enabled,
                  firmware_version,
                  last_seen,
                  created_at
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
              .limit(
                1
              )
              .maybeSingle();


          if (
            deviceError
          ) {

            throw deviceError;

          }


          if (
            !deviceData
          ) {

            setDevice(
              null
            );


            setDeviceState(
              null
            );


            setManager(
              null
            );


            return;

          }


          const typedDevice = deviceData as DeviceRow;


          setDevice(
            typedDevice
          );


          const [
            stateResult,
            managerResult,
          ] =
            await Promise.all([

              supabase
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
                  typedDevice.id
                )
                .maybeSingle(),

              getNexaManager(),

            ]);


          if (
            stateResult.error
          ) {

            throw stateResult.error;

          }


         const typedState =
  stateResult.data as DeviceStateRow | null;


          setDeviceState(
            typedState
          );


          setManager(
            managerResult
          );


          if (
            !draftDirtyRef.current
          ) {

            setLine1(
              cleanLCDText(
                managerResult
                  .display
                  .line1
                ||
                "NEXA"
              )
            );


            setLine2(
              cleanLCDText(
                managerResult
                  .display
                  .line2
                ||
                "READY"
              )
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

              : "Could not load NEXA device."
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


  // =========================================================
  // INITIAL LOAD + REALTIME
  // =========================================================

  useEffect(
    () => {

      void loadDevice();


      const channel =
        supabase
          .channel(
            "nexa-device-live"
          )

          .on(
            "postgres_changes",
            {
              event:
                "*",

              schema:
                "public",

              table:
                "devices",
            },
            () => {

              void loadDevice();

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
                "device_state",
            },
            () => {

              void loadDevice();

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
                "focus_sessions",
            },
            () => {

              void loadDevice();

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

              void loadDevice();

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

              void loadDevice();

            }
          )

          .subscribe();


      const refresh =
        window.setInterval(
          () => {

            void loadDevice();

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
          5000
        );


      return () => {

        window.clearInterval(
          refresh
        );


        window.clearInterval(
          clock
        );


        void supabase
          .removeChannel(
            channel
          );

      };

    },
    [
      loadDevice,
    ]
  );


  // =========================================================
  // CONNECTION
  // =========================================================

  const connectionState:
    ConnectionState =
    useMemo(
      () => {

        if (
          !device
        ) {

          return "unknown";

        }


        if (
          device.enabled ===
          false
        ) {

          return "disabled";

        }


        if (
          !device.last_seen
        ) {

          return "offline";

        }


        const ageSeconds =
          (
            now
            -
            new Date(
              device.last_seen
            ).getTime()
          )
          /
          1000;


        return (
          ageSeconds <= 90
            ? "online"
            : "offline"
        );

      },
      [
        device,
        now,
      ]
    );


  const online =
    connectionState ===
    "online";


  // =========================================================
  // AUTHORITATIVE LIVE DISPLAY
  // =========================================================

  const liveLine1 =
    cleanLCDText(
      manager
        ?.display
        .line1
      ||
      "NEXA"
    );


  const liveLine2 =
    cleanLCDText(
      manager
        ?.display
        .line2
      ||
      "READY"
    );


  const liveMode =
    manager
      ?.display
      .type;


  // =========================================================
  // SEND MESSAGE
  // =========================================================

  async function sendDisplay() {

    if (
      !device
    ) {

      setError(
        "No NEXA device is linked."
      );


      return;

    }


    const safeLine1 =
      cleanLCDText(
        line1
      );


    const safeLine2 =
      cleanLCDText(
        line2
      );


    if (
      !safeLine1
      &&
      !safeLine2
    ) {

      setError(
        "Enter something for the NEXA display."
      );


      return;

    }


    setSending(
      true
    );


    setError(
      ""
    );


    try {

      const result =
        await runNexaAction(
          "send_message",
          {
            line1:
              safeLine1,

            line2:
              safeLine2,

            seconds:
              MESSAGE_SECONDS,
          }
        );


      setManager(
        result.manager
      );


      setLine1(
        cleanLCDText(
          result
            .manager
            .display
            .line1
          ||
          safeLine1
        )
      );


      setLine2(
        cleanLCDText(
          result
            .manager
            .display
            .line2
          ||
          safeLine2
        )
      );


      draftDirtyRef.current =
        false;


      notifySuccess(
        online

          ? "Display sent to NEXA."

          : `Display saved for ${MESSAGE_SECONDS} seconds.`
      );


      await loadDevice();

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

          : "Could not update NEXA."
      );

    }

    finally {

      setSending(
        false
      );

    }

  }


  // =========================================================
  // DRAFT EDITING
  // =========================================================

  function updateLine1(
    value:
      string
  ) {

    draftDirtyRef.current =
      true;


    setLine1(
      cleanLCDText(
        value
      )
    );

  }


  function updateLine2(
    value:
      string
  ) {

    draftDirtyRef.current =
      true;


    setLine2(
      cleanLCDText(
        value
      )
    );

  }


  // =========================================================
  // SUCCESS
  // =========================================================

  function notifySuccess(
    message:
      string
  ) {

    setSuccess(
      message
    );


    window.setTimeout(
      () => {

        setSuccess(
          ""
        );

      },
      2400
    );

  }


  // =========================================================
  // LOADING
  // =========================================================

  if (
    loading
  ) {

    return (

      <section className="device-page device-loading-page">

        <div className="device-loading">

          <div className="device-loading-icon">

            <Loader2
              size={22}
            />

          </div>


          <div>

            <strong>
              Connecting to NEXA
            </strong>


            <span>
              Reading your physical desk companion.
            </span>

          </div>

        </div>

      </section>

    );

  }


  // =========================================================
  // HEADER
  // =========================================================

  const headerAction = (

    <div
      className={
        `device-header-status ${connectionState}`
      }
    >

      <span className="device-header-status-dot" />


      {
        online

          ? (
              <Wifi
                size={16}
              />
            )

          : (
              <WifiOff
                size={16}
              />
            )
      }


      <strong>

        {
          device
            ?.name
          ||
          "NEXA"
        }

      </strong>


      <span>

        {
          connectionLabel(
            connectionState
          )
        }

      </span>

    </div>

  );


  // =========================================================
  // NO DEVICE
  // =========================================================

  if (
    !device
  ) {

    return (

      <section className="device-page">

        <PageHeader
          eyebrow="PHYSICAL NEXA"
          title="Device"
          description="Your digital workspace and desk companion, connected as one calm system."
        />


        <div className="device-page-body">

          {
            error
            &&
            (

              <div className="device-notice error">

                {error}

              </div>

            )
          }


          <div className="device-empty">

            <div className="device-empty-icon">

              <Cpu
                size={25}
              />

            </div>


            <div>

              <span>
                NO DEVICE LINKED
              </span>


              <h2>
                NEXA is not connected to this workspace yet.
              </h2>


              <p>
                Once NEXA-01 is linked to this account,
                its connection, LCD state and firmware information
                will appear here.
              </p>

            </div>

          </div>

        </div>

      </section>

    );

  }


  // =========================================================
  // UI
  // =========================================================

  return (

    <section className="device-page">

      <PageHeader
        eyebrow="PHYSICAL NEXA"
        title="Device"
        description="See what your desk companion is doing, confirm its connection, and control the 16 × 2 display."
        action={
          headerAction
        }
      />


      <div className="device-page-body">

        {
          error
          &&
          (

            <div className="device-notice error">

              {error}

            </div>

          )
        }


        {
          success
          &&
          (

            <div className="device-notice success">

              <CheckCircle2
                size={16}
              />

              {success}

            </div>

          )
        }


        <section className="device-primary-grid">

          {/* CONNECTION */}

          <article className="device-connection-card">

            <div className="device-card-heading">

              <div className="device-card-heading-icon">

                <Cpu
                  size={21}
                />

              </div>


              <div>

                <span>
                  CONNECTED DEVICE
                </span>


                <h2>

                  {
                    device.name
                    ||
                    "NEXA-01"
                  }

                </h2>

              </div>

            </div>


            <div className="device-health-row">

              <div
                className={
                  `device-health-indicator ${connectionState}`
                }
              >

                {
                  online

                    ? (
                        <Signal
                          size={19}
                        />
                      )

                    : (
                        <SignalZero
                          size={19}
                        />
                      )
                }

              </div>


              <div>

                <span>
                  CONNECTION
                </span>


                <strong>

                  {
                    connectionLabel(
                      connectionState
                    )
                  }

                </strong>


                <small>

                  {
                    lastSeenLabel(
                      device.last_seen,
                      now
                    )
                  }

                </small>

              </div>

            </div>


            <div className="device-info-list">

              <DeviceInfoRow
                label="Firmware"
                value={
                  device
                    .firmware_version
                  ||
                  "Unknown"
                }
                icon={
                  <Cpu
                    size={15}
                  />
                }
              />


              <DeviceInfoRow
                label="Cloud mode"
                value={
                  modeLabel(
                    liveMode
                  )
                }
                icon={
                  <Cloud
                    size={15}
                  />
                }
              />


              <DeviceInfoRow
                label="Focus duration"
                value={
                  `${
                    deviceState
                      ?.focus_minutes
                    ??
                    25
                  } min`
                }
                icon={
                  <Timer
                    size={15}
                  />
                }
              />


              <DeviceInfoRow
                label="State updated"
                value={
                  stateUpdatedLabel(
                    deviceState
                      ?.updated_at,
                    now
                  )
                }
                icon={
                  <RefreshCw
                    size={15}
                  />
                }
              />

            </div>


            <button
              type="button"

              className="device-refresh-button"

              disabled={
                refreshing
              }

              onClick={
                () =>
                  void loadDevice(
                    true
                  )
              }
            >

              <RefreshCw
                size={15}

                className={
                  refreshing
                    ? "device-spin"
                    : ""
                }
              />

              Refresh device status

            </button>

          </article>


          {/* DISPLAY MESSAGE */}

          <article className="device-display-card">

            <div className="device-display-heading">

              <div>

                <span>
                  DISPLAY MESSAGE
                </span>


                <h2>
                  16 × 2 LCD
                </h2>


                <p>
                  Preview the temporary message you want NEXA to show.
                </p>

              </div>


              <div className="device-monitor-icon">

                <Monitor
                  size={19}
                />

              </div>

            </div>


            <LCDPreview
              line1={
                line1
              }

              line2={
                line2
              }
            />


            <div className="device-display-editor">

              <label className="device-display-field">

                <div>

                  <span>
                    Line 1
                  </span>


                  <small>
                    {line1.length}/16
                  </small>

                </div>


                <input
                  maxLength={
                    16
                  }

                  value={
                    line1
                  }

                  onChange={
                    (
                      event
                    ) =>
                      updateLine1(
                        event
                          .target
                          .value
                      )
                  }
                />

              </label>


              <label className="device-display-field">

                <div>

                  <span>
                    Line 2
                  </span>


                  <small>
                    {line2.length}/16
                  </small>

                </div>


                <input
                  maxLength={
                    16
                  }

                  value={
                    line2
                  }

                  onChange={
                    (
                      event
                    ) =>
                      updateLine2(
                        event
                          .target
                          .value
                      )
                  }
                />

              </label>


              <button
                type="button"

                className="device-send-button"

                disabled={
                  sending
                }

                onClick={
                  sendDisplay
                }
              >

                {
                  sending

                    ? (
                        <Loader2
                          className="device-spin"
                          size={17}
                        />
                      )

                    : online

                      ? (
                          <Send
                            size={17}
                          />
                        )

                      : (
                          <Cloud
                            size={17}
                          />
                        )
                }


                {
                  sending

                    ? "Sending..."

                    : online

                      ? "Send to NEXA"

                      : "Save message"
                }

              </button>


              <p className="device-offline-note">

                <Cloud
                  size={13}
                />

                Message override lasts {MESSAGE_SECONDS} seconds,
                then NEXA automatically returns to its authoritative
                Focus, Task, Reminder, Break or Idle display.

              </p>

            </div>

          </article>

        </section>


        {/* DEVICE STATE */}

        <section className="device-secondary-section">

          <div className="device-section-heading">

            <div>

              <span>
                DEVICE STATE
              </span>


              <h2>
                How NEXA is behaving
              </h2>

            </div>


            <span className="device-section-note">

              Cloud-synchronised

            </span>

          </div>


          <div className="device-state-grid">

            <DeviceStateCard
              icon={
                online

                  ? (
                      <Wifi
                        size={18}
                      />
                    )

                  : (
                      <WifiOff
                        size={18}
                      />
                    )
              }

              label="Connection"

              value={
                connectionLabel(
                  connectionState
                )
              }

              description={
                online

                  ? "The desk device is currently checking in with NEXA cloud."

                  : "No recent heartbeat has been received from the desk device."
              }

              tone={
                online
                  ? "green"
                  : "red"
              }
            />


            <DeviceStateCard
              icon={
                <Cloud
                  size={18}
                />
              }

              label="Cloud mode"

              value={
                modeLabel(
                  liveMode
                )
              }

              description="The authoritative display mode currently selected by the NEXA state engine."

              tone="violet"
            />


            <DeviceStateCard
              icon={
                <Monitor
                  size={18}
                />
              }

              label="Live display"

              value={
                `${
                  liveLine1
                  ||
                  "—"
                } / ${
                  liveLine2
                  ||
                  "—"
                }`
              }

              description="The two lines NEXA should be showing according to the authoritative manager."

              tone="blue"
            />

          </div>

        </section>

      </div>

    </section>

  );

}


// ============================================================
// LCD PREVIEW
// ============================================================

function LCDPreview({
  line1,
  line2,
}: {
  line1:
    string;

  line2:
    string;
}) {

  return (

    <div className="device-lcd-shell">

      <div className="device-lcd-bezel">

        <div className="device-lcd-screen">

          <div className="device-lcd-grid" />


          <div className="device-lcd-row">

            {
              lcdCharacters(
                line1
              )
                .map(
                  (
                    character,
                    index
                  ) => (

                    <span
                      key={
                        `l1-${index}`
                      }
                    >

                      {character}

                    </span>

                  )
                )
            }

          </div>


          <div className="device-lcd-row">

            {
              lcdCharacters(
                line2
              )
                .map(
                  (
                    character,
                    index
                  ) => (

                    <span
                      key={
                        `l2-${index}`
                      }
                    >

                      {character}

                    </span>

                  )
                )
            }

          </div>

        </div>

      </div>

    </div>

  );

}


// ============================================================
// INFO ROW
// ============================================================

function DeviceInfoRow({
  label,
  value,
  icon,
}: {
  label:
    string;

  value:
    string;

  icon:
    ReactNode;
}) {

  return (

    <div className="device-info-row">

      <div className="device-info-icon">

        {icon}

      </div>


      <span>

        {label}

      </span>


      <strong>

        {value}

      </strong>

    </div>

  );

}


// ============================================================
// STATE CARD
// ============================================================

function DeviceStateCard({
  icon,
  label,
  value,
  description,
  tone,
}: {
  icon:
    ReactNode;

  label:
    string;

  value:
    string;

  description:
    string;

  tone:
    | "green"
    | "red"
    | "violet"
    | "blue";
}) {

  return (

    <article className="device-state-card">

      <div
        className={
          `device-state-icon ${tone}`
        }
      >

        {icon}

      </div>


      <div>

        <span>

          {label}

        </span>


        <strong>

          {value}

        </strong>


        <p>

          {description}

        </p>

      </div>

    </article>

  );

}


// ============================================================
// HELPERS
// ============================================================

function cleanLCDText(
  value:
    string
) {

  return value
    .replace(
      /[\r\n]/g,
      " "
    )
    .slice(
      0,
      16
    );

}


function lcdCharacters(
  value:
    string
) {

  return cleanLCDText(
    value
  )
    .padEnd(
      16,
      " "
    )
    .split(
      ""
    );

}


function connectionLabel(
  state:
    ConnectionState
) {

  switch (
    state
  ) {

    case "online":
      return "Online";


    case "disabled":
      return "Disabled";


    case "offline":
      return "Offline";


    default:
      return "Unavailable";

  }

}


function modeLabel(
  mode:
    NexaManager["display"]["type"]
    |
    undefined
) {

  switch (
    mode
  ) {

    case "task":
      return "Task";


    case "focus":
      return "Focus";


    case "message":
      return "Message";


    case "reminder":
      return "Reminder";


    case "break":
      return "Break";


    case "idle":
      return "Idle";


    default:
      return "Unknown";

  }

}


function lastSeenLabel(
  value:
    string |
    null,

  currentTime:
    number
) {

  if (
    !value
  ) {

    return "Never synced";

  }


  const seconds =
    Math.max(
      0,

      Math.floor(
        (
          currentTime
          -
          new Date(
            value
          ).getTime()
        )
        /
        1000
      )
    );


  if (
    seconds < 10
  ) {

    return "Synced just now";

  }


  if (
    seconds < 60
  ) {

    return `Synced ${seconds}s ago`;

  }


  const minutes =
    Math.floor(
      seconds
      /
      60
    );


  if (
    minutes < 60
  ) {

    return `Synced ${minutes}m ago`;

  }


  const hours =
    Math.floor(
      minutes
      /
      60
    );


  if (
    hours < 24
  ) {

    return `Synced ${hours}h ago`;

  }


  const days =
    Math.floor(
      hours
      /
      24
    );


  return `Synced ${days}d ago`;

}


function stateUpdatedLabel(
  value:
    string |
    null |
    undefined,

  currentTime:
    number
) {

  if (
    !value
  ) {

    return "Unknown";

  }


  return lastSeenLabel(
    value,
    currentTime
  )
    .replace(
      "Synced",
      "Updated"
    );

}