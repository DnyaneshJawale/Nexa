import {
  useEffect,
  useState,
} from "react";

import type {
  Session,
} from "@supabase/supabase-js";

import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import {
  supabase,
} from "./lib/supabase";

import AppShell from "./components/AppShell";

import Dashboard from "./pages/Dashboard";
import Today from "./pages/Today";
import Tasks from "./pages/Tasks";
import Focus from "./pages/Focus";
import Device from "./pages/Device";
import Settings from "./pages/Settings";
import Login from "./pages/Login";


function App() {
  const [
    session,
    setSession,
  ] =
    useState<Session | null>(
      null
    );


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  useEffect(() => {

    supabase.auth
      .getSession()
      .then(
        ({
          data,
        }) => {

          setSession(
            data.session
          );

          setLoading(
            false
          );

        }
      );


    const {
      data: {
        subscription,
      },
    } =
      supabase.auth
        .onAuthStateChange(
          (
            _event,
            newSession
          ) => {

            setSession(
              newSession
            );

          }
        );


    return () => {
      subscription.unsubscribe();
    };

  }, []);


  async function handleSignOut() {
    await supabase.auth
      .signOut();
  }


  if (loading) {
    return (
      <div className="loading-screen">

        <div className="loading-logo">
          N
        </div>

        <span>
          Opening NEXA...
        </span>

      </div>
    );
  }


  if (!session) {
    return <Login />;
  }


  return (
    <BrowserRouter>

      <Routes>

        <Route
          element={
            <AppShell
              email={
                session
                  .user
                  .email
              }
              onSignOut={
                handleSignOut
              }
            />
          }
        >

          {/* Dashboard */}
          <Route
            index
            element={
              <Dashboard />
            }
          />


          {/* Today Manager */}
          <Route
            path="today"
            element={
              <Today />
            }
          />


          {/* Tasks */}
          <Route
            path="tasks"
            element={
              <Tasks />
            }
          />


          {/* Focus */}
          <Route
            path="focus"
            element={
              <Focus />
            }
          />


          {/* Device */}
          <Route
            path="device"
            element={
              <Device />
            }
          />


          {/* Settings */}
          <Route
            path="settings"
            element={
              <Settings />
            }
          />


          {/* Unknown route */}
          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />

        </Route>

      </Routes>

    </BrowserRouter>
  );
}


export default App;