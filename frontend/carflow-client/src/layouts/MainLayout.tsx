import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-page">
      <Navbar />
      <main className="w-full flex-1 px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
