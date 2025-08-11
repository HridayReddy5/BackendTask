// Right-hand sidebar that shows progress + list of questions (via CreateSurveyContent).
// Progress is computed from three simple conditions: title set, description set, and all questions saved.

import React, { useState } from "react";
import { useCreateSurveyProvider } from "./CreateSurveyProvider";
import CreateSurveyContent from "./CreateSurveyContent";

const CreateSurveySidebar = ({ surveySeriesId }) => {
  const { questions, surveyTitle, surveyDescription } = useCreateSurveyProvider();

  // Simple 0–100% progress indicator
  const progress = Math.floor(
    ((surveyTitle.trim() !== "") +
     (surveyDescription.trim() !== "") +
     (questions.length > 0 && !questions.some(q => !q.saved))) /
    3 *
    100
  );

  return (
    <aside className="p-4 bg-white rounded shadow">
      <div className="mb-4">
        {/* reserved area for series info / metadata if needed */}
      </div>

      <div className="mb-6">
        <h3 className="font-medium">Progress</h3>
        <div className="mt-2 bg-gray-100 h-2 rounded-full overflow-hidden">
          <div className="bg-green-500 h-full" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-1 text-sm font-semibold">{progress}% complete</p>
      </div>

      {/* Renders the list of question titles with drag handles */}
      <CreateSurveyContent />
    </aside>
  );
};

export default CreateSurveySidebar;
