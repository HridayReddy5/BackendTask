// Builder area (left side): title + description inputs + list of questions.
// - On description change, we stash the brief to localStorage so the page button can use it.
// - Listens for "survey:generated" and maps backend JSON to your builder's internal shape.

import { useCreateSurveyProvider } from "./CreateSurveyProvider";
import React, { useEffect, useState } from "react";
import { PlusIcon2 } from "./Icons";
import QuestionList from "./QuestionList";
import { motion } from "framer-motion";

const CreateSurvey = () => {
  const {
    questions,
    defaultQuestionType,
    setSurveyTitle,
    setSurveyDescription,
    surveyTitle,
    surveyDescription,
    addNewQuestion,
    setQuestions, // update the provider when a survey is generated
  } = useCreateSurveyProvider();

  const [titleLength, setTitleLength] = useState(0);
  const [descriptionLength, setDescriptionLength] = useState(0);
  const [titleError, setTitleError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");

  useEffect(() => {
    setTitleLength(surveyTitle?.length || 0);
    setDescriptionLength(surveyDescription?.length || 0);
  }, [surveyTitle, surveyDescription]);

  // Convert backend survey format -> builder's internal shape.
  // (No rating widget in builder, so rating is treated like a text field.)
  const mapSurveyToQuestions = (survey) => {
    if (!survey || !Array.isArray(survey.questions)) return [];
    const toType = (t) => {
      switch (t) {
        case "multiple_choice_single": return "singleChoice";
        case "multiple_choice_multi":  return "multipleChoice";
        case "open_text":              return "shortAnswer";
        case "rating":                 return "shortAnswer"; // fallback
        default:                       return "shortAnswer";
      }
    };
    const mkId = () => Date.now() + Math.random();
    return survey.questions.map((q) => ({
      id: q.id || mkId(),
      type: toType(q.type),
      title: q.text || "",
      saved: true, // saved => show respond UI; change to false if you want edit-first
      options: (Array.isArray(q.choices) ? q.choices : []).map((c) => ({
        id: c.id || mkId(),
        text: c.label || "",
      })),
    }));
  };

  // Listen for the "survey:generated" event (dispatched by the page button).
  useEffect(() => {
    const handler = (e) => {
      const s = e?.detail;
      if (!s) return;
      try {
        const mapped = mapSurveyToQuestions(s);
        setQuestions(mapped);
      } catch {}
    };
    window.addEventListener("survey:generated", handler);
    return () => window.removeEventListener("survey:generated", handler);
  }, [setQuestions]);

  return (
    <div className="flex h-full font-switzer lg:overflow-auto scrollbar-style flex-col gap-4 sm:gap-6 sm:p-4">
      <div className="flex flex-col space-y-6">
        {/* Title input (unchanged) */}
        <motion.div
          whileHover={{ boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}
          className="rounded-[12px] shadow-sm w-full border border-[#00000020] bg-white flex flex-col transition-all duration-300"
        >
          <motion.input
            type="text"
            maxLength={500}
            name="title"
            value={surveyTitle}
            onChange={(e) => {
              const value = e.target.value;
              setSurveyTitle(value);
              setTitleLength(value.length);
              setTitleError(value.length >= 500 ? "Title cannot exceed 500 characters." : "");
            }}
            placeholder="Enter survey title"
            className="text-[16px] px-5 pt-4 pb-1 text-primary outline-none border-none bg-transparent rounded-t-[12px] transition-all duration-200"
          />
          <div className="px-5 pb-3 text-right">
            <p className={`text-[10px] ${titleLength > 450 ? "text-amber-500" : "text-gray-400"}`}>
              {titleLength}/500
            </p>
            {titleError && <p className="text-red-500 text-sm">{titleError}</p>}
          </div>
        </motion.div>

        {/* Description input (unchanged) */}
        <motion.div
          whileHover={{ boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}
          className="rounded-[12px] shadow-sm w-full border border-[#00000020] bg-white flex flex-col transition-all duration-300"
        >
          <motion.input
            type="text"
            placeholder="Enter survey description"
            maxLength={100}
            name="description"
            value={surveyDescription}
            onChange={(e) => {
              const value = e.target.value;
              setSurveyDescription(value);
              setDescriptionLength(value.length);
              setDescriptionError(value.length >= 100 ? "Description cannot exceed 100 characters." : "");
              // Expose brief to the page-level button via localStorage
              try { localStorage.setItem("currentSurveyBrief", value); } catch {}
            }}
            className="text-[16px] px-5 pt-4 pb-1 text-primary outline-none border-none bg-transparent rounded-t-[12px] transition-all duration-200"
          />
          <div className="px-5 pb-3 text-right">
            <p className={`text-[10px] ${descriptionLength > 90 ? "text-amber-500" : "text-gray-400"}`}>
              {descriptionLength}/100
            </p>
            {descriptionError && (
              <p className="text-red-500 text-xs">{descriptionError}</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Right-side question list (original component) */}
      <div className="flex-1">
        <QuestionList questions={questions} />
      </div>

      {/* Add Question button (unchanged) */}
      <motion.div
        whileHover={{ scale: 1.01, borderColor: '#6851a7 ' }}
        className="border-2 py-4 md:py-5 lg:py-6 rounded-[12px] flex justify-center border-dotted border-[#6851a7] bg-[#6851a7]/5 transition-all duration-300"
      >
        <motion.button
          whileHover={{ scale: 1.05, boxShadow: "0 6px 20px rgba(108, 93, 211, 0.3)" }}
          whileTap={{ scale: 0.95 }}
          onClick={() => addNewQuestion(defaultQuestionType)}
          className="bg-[#6851a7] flex gap-2 items-center text-white py-3 px-6 rounded-full shadow-sm transition-all duration-300"
        >
          <PlusIcon2 className="h-4 w-4" />
          <span className="font-medium text-base">Add Question</span>
        </motion.button>
      </motion.div>
    </div>
  );
};

export default CreateSurvey;
