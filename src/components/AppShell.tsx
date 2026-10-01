import nexaLogo from "../assets/nexa-logo.png";
import {
  type LucideIcon,
  CalendarClock,
  CheckSquare,
  ChevronRight,
  Cpu,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Settings,
  Timer,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

import "./AppShell.css";


type AppShellProps = {
  email?: string;

  onSignOut:
    () => void;
};


type NavigationItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  end?: boolean;
};


type DeviceStatus = {
  loading: boolean;
  online: boolean;
  name: string;
  state: string;
  lastSeenText: string;
};


const navigation: NavigationItem[] = [
  {
    label: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    end: true,
  },

  {
    label: "Today",
    path: "/today",
    icon: CalendarClock,
  },

  {
    label: "Tasks",
    path: "/tasks",
    icon: CheckSquare,
  },

  {
    label: "Focus",
    path: "/focus",
    icon: Timer,
  },

  {
    label: "Device",
    path: "/device",
    icon: Cpu,
  },

  {
    label: "Settings",
    path: "/settings",
    icon: Settings,
  },
];


function formatLastSeen(
  value?: string | null
) {
  if (!value) {
    return "Not synced yet";
  }

  const date =
    new Date(value);

  const difference =
    Math.max(
      0,
      Date.now() -
        date.getTime()
    );

  const seconds =
    Math.floor(
      difference / 1000
    );

  if (seconds < 10) {
    return "Synced just now";
  }

  if (seconds < 60) {
    return `Synced ${seconds}s ago`;
  }

  const minutes =
    Math.floor(
      seconds / 60
    );

  if (minutes < 60) {
    return `Synced ${minutes}m ago`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (hours < 24) {
    return `Synced ${hours}h ago`;
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }
  ).format(date);
}


export default function AppShell({
  email,
  onSignOut,
}: AppShellProps) {

  const navigate =
    useNavigate();

  const location =
    useLocation();


  const [
    mobileMoreOpen,
    setMobileMoreOpen,
  ] = useState(false);


  const [
    deviceStatus,
    setDeviceStatus,
  ] = useState<DeviceStatus>({
    loading: true,
    online: false,
    name: "NEXA-01",
    state: "Checking",
    lastSeenText:
      "Checking device",
  });


  const loadDeviceStatus =
    useCallback(
      async () => {

        try {

          const {
            data: {
              user,
            },
          } =
            await supabase
              .auth
              .getUser();


          if (!user) {

            setDeviceStatus({
              loading: false,
              online: false,
              name: "NEXA-01",
              state: "Offline",
              lastSeenText:
                "Sign in required",
            });

            return;
          }


          const {
            data,
            error,
          } =
            await supabase
              .from("devices")
              .select(
                `
                  id,
                  name,
                  enabled,
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
              .limit(1)
              .maybeSingle();


          if (error) {
            throw error;
          }


          if (!data) {

            setDeviceStatus({
              loading: false,
              online: false,
              name: "NEXA-01",
              state: "Not linked",
              lastSeenText:
                "No device found",
            });

            return;
          }


          const lastSeen =
            data.last_seen
              ? new Date(
                  data.last_seen
                ).getTime()
              : 0;


          const ageSeconds =
            lastSeen
              ? (
                  Date.now() -
                  lastSeen
                ) / 1000
              : Infinity;


          const enabled =
            data.enabled !== false;


          /*
            ESP8266 normally syncs every ~8 seconds.

            90 seconds gives enough tolerance for
            Wi-Fi/API hiccups without incorrectly
            showing NEXA offline immediately.
          */

          const online =
            enabled &&
            ageSeconds <= 90;


          let state =
            "Offline";


          if (!enabled) {

            state =
              "Disabled";

          } else if (online) {

            state =
              "Online";
          }


          setDeviceStatus({
            loading: false,
            online,
            name:
              data.name ||
              "NEXA-01",

            state,

            lastSeenText:
              formatLastSeen(
                data.last_seen
              ),
          });

        } catch (error) {

          console.error(
            "Could not load NEXA device status:",
            error
          );


          setDeviceStatus({
            loading: false,
            online: false,
            name: "NEXA-01",
            state: "Unavailable",
            lastSeenText:
              "Status unavailable",
          });
        }
      },
      []
    );


  useEffect(
    () => {

      loadDeviceStatus();


      const interval =
        window.setInterval(
          loadDeviceStatus,
          15000
        );


      return () => {

        window.clearInterval(
          interval
        );
      };
    },
    [
      loadDeviceStatus,
    ]
  );


  /*
    Close mobile menu whenever
    navigation changes.
  */

  useEffect(
    () => {

      setMobileMoreOpen(
        false
      );
    },
    [
      location.pathname,
    ]
  );


  /*
    ESC closes the More sheet.
  */

  useEffect(
    () => {

      if (!mobileMoreOpen) {
        return;
      }


      const onKeyDown =
        (
          event:
            KeyboardEvent
        ) => {

          if (
            event.key ===
            "Escape"
          ) {

            setMobileMoreOpen(
              false
            );
          }
        };


      document.addEventListener(
        "keydown",
        onKeyDown
      );


      return () => {

        document
          .removeEventListener(
            "keydown",
            onKeyDown
          );
      };
    },
    [
      mobileMoreOpen,
    ]
  );


  /*
    Prevent the page behind the
    mobile sheet from moving.
  */

  useEffect(
    () => {

      if (!mobileMoreOpen) {
        return;
      }


      const previous =
        document.body.style
          .overflow;


      document.body.style
        .overflow =
          "hidden";


      return () => {

        document.body.style
          .overflow =
            previous;
      };
    },
    [
      mobileMoreOpen,
    ]
  );


  const moreIsActive =
    useMemo(
      () =>
        location.pathname
          .startsWith(
            "/device"
          )
        ||
        location.pathname
          .startsWith(
            "/settings"
          ),
      [
        location.pathname,
      ]
    );


  const userInitial =
    email
      ?.trim()
      .charAt(0)
      .toUpperCase()
    ||
    "N";


  function openRoute(
    path: string
  ) {

    setMobileMoreOpen(
      false
    );

    navigate(path);
  }


  function handleSignOut() {

    setMobileMoreOpen(
      false
    );

    onSignOut();
  }


  return (
    <div className="nexa-shell">

      {/* ==================================================
          AMBIENT BACKGROUND
          ================================================== */}

      <div className="nexa-ambient nexa-ambient-one" />

      <div className="nexa-ambient nexa-ambient-two" />


      {/* ==================================================
          DESKTOP / TABLET SIDEBAR
          ================================================== */}

      <aside className="nexa-sidebar">

        <div className="nexa-sidebar-surface">

          {/* BRAND */}

          <button
            type="button"
            className="nexa-brand"
            onClick={() =>
              navigate("/")
            }
            aria-label="Open NEXA Dashboard"
          >

            <div className="nexa-brand-logo">

  <img
    src={nexaLogo}
    alt=""
    className="nexa-brand-logo-image"
  />

</div>


            <div className="nexa-brand-copy">

              <strong>
                NEXA
              </strong>

              <span>
                Focus beautifully.
              </span>

            </div>

          </button>


          {/* NAVIGATION */}

          <div className="nexa-navigation-area">

            <div className="nexa-nav-label">
              Workspace
            </div>


            <nav
              className="nexa-nav"
              aria-label="Main navigation"
            >

              {navigation.map(
                ({
                  label,
                  path,
                  icon:
                    Icon,
                  end,
                }) => (

                  <NavLink
                    key={path}
                    to={path}
                    end={end}
                    title={label}
                    className={({
                      isActive,
                    }) =>
                      `nexa-nav-item ${
                        isActive
                          ? "active"
                          : ""
                      }`
                    }
                  >

                    <div className="nexa-nav-icon">

                      <Icon
                        size={19}
                        strokeWidth={1.9}
                      />

                    </div>


                    <span className="nexa-nav-text">

                      {label}

                    </span>


                    <span className="nexa-active-dot" />

                  </NavLink>

                )
              )}

            </nav>

          </div>


          {/* SIDEBAR FOOTER */}

          <div className="nexa-sidebar-footer">

            <button
              type="button"
              className="nexa-device-status"
              onClick={() =>
                navigate(
                  "/device"
                )
              }
            >

              <div
                className={`nexa-device-status-icon ${
                  deviceStatus.online
                    ? "online"
                    : ""
                }`}
              >

                {deviceStatus.online ? (

                  <Wifi
                    size={17}
                    strokeWidth={2}
                  />

                ) : (

                  <WifiOff
                    size={17}
                    strokeWidth={2}
                  />

                )}

              </div>


              <div className="nexa-device-status-copy">

                <div className="nexa-device-status-title">

                  <strong>
                    {deviceStatus.name}
                  </strong>


                  <span
                    className={
                      deviceStatus.online
                        ? "online"
                        : ""
                    }
                  >

                    <i />

                    {deviceStatus.loading
                      ? "Checking"
                      : deviceStatus.state}

                  </span>

                </div>


                <small>

                  {
                    deviceStatus
                      .lastSeenText
                  }

                </small>

              </div>


              <ChevronRight
                className="nexa-device-arrow"
                size={15}
              />

            </button>


            <div className="nexa-profile">

              <div className="nexa-avatar">

                {userInitial}

              </div>


              <div className="nexa-profile-copy">

                <strong>
                  My workspace
                </strong>

                <span>
                  {email ||
                    "NEXA User"}
                </span>

              </div>


              <button
                type="button"
                className="nexa-logout"
                onClick={
                  onSignOut
                }
                aria-label="Sign out"
                title="Sign out"
              >

                <LogOut
                  size={17}
                  strokeWidth={1.9}
                />

              </button>

            </div>

          </div>

        </div>

      </aside>


      {/* ==================================================
          MOBILE HEADER
          ================================================== */}

      <header className="nexa-mobile-header">

        <button
          type="button"
          className="nexa-mobile-brand"
          onClick={() =>
            navigate("/")
          }
        >

          <div className="nexa-mobile-logo">

  <img
    src={nexaLogo}
    alt=""
    className="nexa-mobile-logo-image"
  />

</div>

          <strong>
            NEXA
          </strong>

        </button>


        <button
          type="button"
          className={`nexa-mobile-status ${
            deviceStatus.online
              ? "online"
              : ""
          }`}
          onClick={() =>
            navigate(
              "/device"
            )
          }
        >

          <i />

          {deviceStatus.loading
            ? "Syncing"
            : deviceStatus.state}

        </button>

      </header>


      {/* ==================================================
          PAGE CONTENT
          ONLY THIS AREA SCROLLS ON DESKTOP
          ================================================== */}

      <main className="nexa-main-content">

        <Outlet />

      </main>


      {/* ==================================================
          MOBILE BOTTOM NAVIGATION
          ================================================== */}

      <nav
        className="nexa-mobile-navigation"
        aria-label="Mobile navigation"
      >

        <NavLink
          to="/"
          end
          className={({
            isActive,
          }) =>
            `nexa-mobile-nav-item ${
              isActive
                ? "active"
                : ""
            }`
          }
        >

          <LayoutDashboard
            size={20}
            strokeWidth={1.9}
          />

          <span>
            Home
          </span>

        </NavLink>


        <NavLink
          to="/today"
          className={({
            isActive,
          }) =>
            `nexa-mobile-nav-item ${
              isActive
                ? "active"
                : ""
            }`
          }
        >

          <CalendarClock
            size={20}
            strokeWidth={1.9}
          />

          <span>
            Today
          </span>

        </NavLink>


        <NavLink
          to="/tasks"
          className={({
            isActive,
          }) =>
            `nexa-mobile-nav-item ${
              isActive
                ? "active"
                : ""
            }`
          }
        >

          <CheckSquare
            size={20}
            strokeWidth={1.9}
          />

          <span>
            Tasks
          </span>

        </NavLink>


        <NavLink
          to="/focus"
          className={({
            isActive,
          }) =>
            `nexa-mobile-nav-item ${
              isActive
                ? "active"
                : ""
            }`
          }
        >

          <Timer
            size={20}
            strokeWidth={1.9}
          />

          <span>
            Focus
          </span>

        </NavLink>


        <button
          type="button"
          className={`nexa-mobile-nav-item ${
            moreIsActive ||
            mobileMoreOpen
              ? "active"
              : ""
          }`}
          onClick={() =>
            setMobileMoreOpen(
              true
            )
          }
        >

          <MoreHorizontal
            size={21}
            strokeWidth={1.9}
          />

          <span>
            More
          </span>

        </button>

      </nav>


      {/* ==================================================
          MOBILE MORE SHEET
          ================================================== */}

      {mobileMoreOpen && (

        <div className="nexa-more-layer">

          <button
            type="button"
            className="nexa-more-backdrop"
            onClick={() =>
              setMobileMoreOpen(
                false
              )
            }
            aria-label="Close more menu"
          />


          <section
            className="nexa-more-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="NEXA menu"
          >

            <div className="nexa-sheet-handle" />


            <div className="nexa-sheet-header">

              <div>

                <span>
                  NEXA workspace
                </span>

                <h2>
                  More
                </h2>

              </div>


              <button
                type="button"
                className="nexa-sheet-close"
                onClick={() =>
                  setMobileMoreOpen(
                    false
                  )
                }
                aria-label="Close menu"
              >

                <X
                  size={18}
                />

              </button>

            </div>


            {/* DEVICE STATUS */}

            <button
              type="button"
              className="nexa-sheet-device"
              onClick={() =>
                openRoute(
                  "/device"
                )
              }
            >

              <div
                className={`nexa-sheet-device-icon ${
                  deviceStatus.online
                    ? "online"
                    : ""
                }`}
              >

                {deviceStatus.online ? (

                  <Wifi
                    size={19}
                  />

                ) : (

                  <WifiOff
                    size={19}
                  />

                )}

              </div>


              <div className="nexa-sheet-device-copy">

                <div>

                  <strong>
                    {deviceStatus.name}
                  </strong>

                  <span
                    className={
                      deviceStatus.online
                        ? "online"
                        : ""
                    }
                  >

                    <i />

                    {
                      deviceStatus
                        .state
                    }

                  </span>

                </div>


                <small>

                  {
                    deviceStatus
                      .lastSeenText
                  }

                </small>

              </div>


              <ChevronRight
                size={17}
              />

            </button>


            {/* MENU OPTIONS */}

            <div className="nexa-more-options">

              <button
                type="button"
                onClick={() =>
                  openRoute(
                    "/device"
                  )
                }
              >

                <div className="nexa-more-option-icon">

                  <Cpu
                    size={20}
                  />

                </div>


                <div>

                  <strong>
                    Device
                  </strong>

                  <span>
                    Connection and NEXA hardware
                  </span>

                </div>


                <ChevronRight
                  size={17}
                />

              </button>


              <button
                type="button"
                onClick={() =>
                  openRoute(
                    "/settings"
                  )
                }
              >

                <div className="nexa-more-option-icon">

                  <Settings
                    size={20}
                  />

                </div>


                <div>

                  <strong>
                    Settings
                  </strong>

                  <span>
                    Focus, reminders and voice
                  </span>

                </div>


                <ChevronRight
                  size={17}
                />

              </button>

            </div>


            {/* MOBILE PROFILE */}

            <div className="nexa-mobile-profile">

              <div className="nexa-avatar">

                {userInitial}

              </div>


              <div className="nexa-mobile-profile-copy">

                <strong>
                  My workspace
                </strong>

                <span>
                  {email ||
                    "NEXA User"}
                </span>

              </div>


              <button
                type="button"
                className="nexa-mobile-signout"
                onClick={
                  handleSignOut
                }
              >

                <LogOut
                  size={17}
                />

                Sign out

              </button>

            </div>

          </section>

        </div>

      )}

    </div>
  );
}