// Context provider for the survey builder.
// Holds title/description/questions and exposes all UI handlers.
// Also listens for "survey:generated" and maps backend surveys into the builder shape.

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect, // used for initialization + event listener
} from "react";

const CreateSurveyContext = createContext();

export const CreateSurveyProviderMock = ({ children }) => {
  // Core builder state (kept as-is)
  const [surveyTitle, setSurveyTitle] = useState("My Survey Title");
  const [surveyDescription, setSurveyDescription] = useState("This is a sample survey.");
  const [questions, setQuestions] = useState([]);
  const [dupList, setDupList] = useState([]);
  const [isAddingOption, setIsAddingOption] = useState(false);
  const defaultQuestionType = "shortAnswer";

  // Convert backend "survey" JSON into your internal question shape.
  // (Rating collapsed into shortAnswer because the builder doesn't have a rating control.)
  const mapSurveyToQuestions = (survey) => {
    if (!survey || !Array.isArray(survey.questions)) return [];
    const toType = (t) => {
      switch (t) {
        case "multiple_choice_single": return "singleChoice";
        case "multiple_choice_multi":  return "multipleChoice";
        case "open_text":              return "shortAnswer";
        case "rating":                 return "shortAnswer";
        default:                       return "shortAnswer";
      }
    };
    const mkId = () => Date.now() + Math.random();
    return survey.questions.map((q) => ({
      id: q?.id || mkId(),
      type: toType(q?.type),
      title: q?.text || "",
      saved: true, // mark as saved so respondent UI is shown
      options: Array.isArray(q?.choices)
        ? q.choices.map((c) => ({
            id: c?.id || mkId(),
            text: c?.label || "",
          }))
        : [],
    }));
  };

  // Initialize from localStorage (if a survey was generated earlier)
  // and subscribe to "survey:generated" events from the page.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("lastGeneratedSurvey");
      if (raw) {
        const s = JSON.parse(raw);
        const mapped = mapSurveyToQuestions(s);
        if (mapped.length) setQuestions(mapped);
      }
    } catch {}

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
  }, []);

  // UI actions below are unchanged; comments describe intent.

  const addNewQuestion = (type = defaultQuestionType) => {
    // Adds a blank question with defaults depending on type.
    const newQuestion = {
      id: Date.now() + Math.random(),
      type,
      title: "",
      saved: false,
      options:
        type === "multipleChoice" || type === "singleChoice"
          ? [
              { id: Date.now() + Math.random(), text: "" },
              { id: Date.now() + Math.random() + 1, text: "" },
            ]
          : [],
    };
    setQuestions((prev) => [...prev, newQuestion]);
  };

  const handleDeleteQuestion = (index) => {
    // Remove question at index
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddOption = useCallback(
    (questionIndex) => {
      // Guard to avoid rapid double-adds
      if (isAddingOption) {
        console.log("Already adding option, skipping...");
        return;
      }

      setIsAddingOption(true);
      setQuestions((prev) => {
        const newQuestions = [...prev];
        if (!newQuestions[questionIndex].options) {
          newQuestions[questionIndex].options = [];
        }
        const newOption = { id: Date.now() + Math.random(), text: "" };
        newQuestions[questionIndex].options.push(newOption);

        // Reset flag on next tick
        setTimeout(() => {
          setIsAddingOption(false);
        }, 0);

        return newQuestions;
      });
    },
    [isAddingOption]
  );

  const handleTitleChange = (questionIndex, title) => {
    // Edit the question title inline
    setQuestions((prev) => {
      const newQuestions = [...prev];
      newQuestions[questionIndex].title = title;
      return newQuestions;
    });
  };

  const handleQuestionTypeChange = (questionIndex, type) => {
    // Change question type + ensure options exist for choice types
    setQuestions((prev) => {
      const newQuestions = [...prev];
      newQuestions[questionIndex].type = type;

      if (type === "multipleChoice" || type === "singleChoice") {
        if (
          !newQuestions[questionIndex].options ||
          newQuestions[questionIndex].options.length < 2
        ) {
          newQuestions[questionIndex].options = [
            { id: Date.now() + Math.random(), text: "" },
            { id: Date.now() + Math.random() + 1, text: "" },
          ];
        }
      } else {
        newQuestions[questionIndex].options = [];
      }

      return newQuestions;
    });
  };

  const handleOptionChange = (questionIndex, optionIndex, value) => {
    // Update the text for a specific option
    setQuestions((prev) => {
      const newQuestions = [...prev];
      if (newQuestions[questionIndex].options) {
        newQuestions[questionIndex].options[optionIndex].text = value;
      }
      return newQuestions;
    });
  };

  const handleSaveQuestion = (questionIndex) => {
    // Mark a question as saved (locks editor; shows respondent UI)
    setQuestions((prev) => {
      const newQuestions = [...prev];
      newQuestions[questionIndex].saved = true;
      return newQuestions;
    });
  };

  const handleEditQuestion = (questionIndex) => {
    // Unlock a saved question for editing again
    setQuestions((prev) => {
      const newQuestions = [...prev];
      newQuestions[questionIndex].saved = false;
      return newQuestions;
    });
  };

  const handleDuplicate = (questionIndex) => {
    // Append a shallow copy with a new id
    const questionToDuplicate = questions[questionIndex];
    const duplicatedQuestion = {
      ...questionToDuplicate,
      id: Date.now(),
      saved: false,
    };
    setQuestions((prev) => [...prev, duplicatedQuestion]);
  };

  const handleDeleteOption = (questionIndex, optionId) => {
    // Remove a single option by id
    setQuestions((prev) => {
      const newQuestions = [...prev];
      if (newQuestions[questionIndex].options) {
        const optionIndex = newQuestions[questionIndex].options.findIndex(
          (option) => option.id === optionId
        );
        if (optionIndex !== -1) {
          newQuestions[questionIndex].options.splice(optionIndex, 1);
        }
      }
      return newQuestions;
    });
  };

  const onDragEnd = (result) => {
    // Drag-and-drop reordering (vertical list)
    if (!result.destination) return;
    const items = Array.from(questions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setQuestions(items);
  };

  const handleCreateSurvey = () => {
    // Placeholder hook: this is where you'd persist the whole draft if needed
    console.log("Mock create survey:", {
      title: surveyTitle,
      description: surveyDescription,
      questions,
    });
  };

  return (
    <CreateSurveyContext.Provider
      value={{
        surveyTitle,
        setSurveyTitle,
        surveyDescription,
        setSurveyDescription,
        questions,
        setQuestions,
        defaultQuestionType,
        addNewQuestion,
        handleDeleteQuestion,
        handleAddOption,
        handleTitleChange,
        handleQuestionTypeChange,
        handleOptionChange,
        handleSaveQuestion,
        handleEditQuestion,
        handleDuplicate,
        handleDeleteOption,
        onDragEnd,
        dupList,
        handleCreateSurvey,
      }}
    >
      {children}
    </CreateSurveyContext.Provider>
  );
};

// Hook used by child components.
export const useCreateSurveyProvider = () => useContext(CreateSurveyContext);
