// High-level page container that keeps your original layout untouched.
// - Reads the user's typed description from localStorage ("currentSurveyBrief").
// - Calls the backend `/v1` (or `/api`) generate endpoint.
// - Emits a window event "survey:generated" so CreateSurvey can auto-fill the sidebar.

import DashboardLayout from "../component/DashboardLayout";
import CreateSurvey from "../component/CreateSurvey";
import CreateSurveySidebar from "../component/CreateSurveySidebar";
import Header from "../component/Header";
import React from "react";

// Resolve API base in multiple environments (Vite / CRA / default):
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE) ||
  (typeof process !== "undefined" && process.env && process.env.REACT_APP_API_BASE) ||
  "http://localhost:8000";

const CreateSurveyPage = ({ surveySeriesId = "defaultId" }) => {
  // Lightweight UI state for button + errors + last survey id
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [lastSurveyId, setLastSurveyId] = React.useState(null);

  // Helper to try both route prefixes. Some templates use /v1, others /api.
  async function callGenerate(description, numQuestions = 8, language = "en") {
    const paths = ["/v1/surveys/generate", "/api/surveys/generate"];
    let lastErr = null;
    for (const p of paths) {
      try {
        const res = await fetch(`${API_BASE}${p}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description, num_questions: numQuestions, language }),
        });
        if (res.ok) return await res.json();
        if (res.status === 404) { lastErr = new Error("Endpoint not found"); continue; }
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail || err?.error || `Request failed: ${res.status}`);
      } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error("Generate endpoint not available");
  }

  // Click handler for the "Generate Survey" button.
  // Uses the currently typed description (stored by CreateSurvey in localStorage).
  const handleGenerateSurvey = async () => {
    const brief = (localStorage.getItem("currentSurveyBrief") || "").trim();
    if (!brief) {
      setError("Please enter a short survey description before generating.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await callGenerate(brief, 8, "en");

      // Persist the raw result (optional) and notify listeners via a DOM event.
      try { localStorage.setItem("lastGeneratedSurvey", JSON.stringify(data.survey)); } catch {}
      window.dispatchEvent(new CustomEvent("survey:generated", { detail: data.survey }));

      setLastSurveyId(data?.survey?.id || null);
      console.log("Generated survey:", data.survey);
    } catch (e) {
      setError(e.message || "Failed to generate survey");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col w-full h-full overflow-hidden">
        <div className="lg:minh-[90px]">
          <Header>
            <div className="flex items-center justify-between w-full">
              <h2 className="text-[26px] font-switzerMedium text-primary">
                Create a New Survey
              </h2>

              {/* Generate Survey button (position/layout unchanged) */}
              <button
                onClick={handleGenerateSurvey}
                disabled={loading}
                className={`px-4 py-2 rounded-lg font-semibold transition
                  ${loading ? "opacity-60 cursor-not-allowed" : "hover:opacity-90"}
                  bg-primary text-white`}
              >
                {loading ? "Generating…" : "Generate Survey"}
              </button>
            </div>
          </Header>
        </div>

        {/* Optional status line: last survey id or last error */}
        {(error || lastSurveyId) && (
          <div className="px-4 pt-2">
            {error ? (
              <p className="text-sm text-red-600">Error: {error}</p>
            ) : (
              <p className="text-sm text-emerald-700">Last generated survey ID: {lastSurveyId}</p>
            )}
          </div>
        )}

        {/* Original page layout: content + sidebar */}
        <div className="flex grow w-full overflow-hidden h-full">
          <div className="grow p-3 sm:p-2 w-full overflow-auto h-[calc(100vh-164px)] sm:h-[calc(100vh-192px)] md:h-[calc(100vh-192px)] lg:h-[calc(100vh-148px)] xl:h-full scrollbar-style">
            <div className="block lg:hidden">
              <CreateSurveySidebar surveySeriesId={surveySeriesId} />
            </div>
            <CreateSurvey />
          </div>
          <div className="hidden lg:block min-w-[280px] p-3 max-w-[280px] overflow-auto scrollbar-style h-[calc(100vh-89px)]">
            <CreateSurveySidebar surveySeriesId={surveySeriesId} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CreateSurveyPage;
