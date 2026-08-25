import { Routes, Route } from "react-router";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Streaming from "./pages/Streaming";
import Analytics from "./pages/Analytics";

export default function App() {
    return (
        <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-zinc-700 selection:text-white">
            {/* Navigation Header */}
            <Navbar />

            {/* Main Content View with Top Padding for Fixed Navbar */}
            <main className="flex-1 pt-20 max-w-375 w-full mx-auto px-4 sm:px-6">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/streaming" element={<Streaming />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="*" element={<Home />} />
                </Routes>
            </main>

            {/* Footer */}
            <Footer />
        </div>
    )
}