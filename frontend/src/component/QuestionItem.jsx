// A single question card in the builder.
// Two modes:
//  - Editor (when not saved): edit title/type/options
//  - Respondent (when saved): interactive inputs to capture answers (stored in localStorage)

import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Tooltip } from "react-tooltip";
import { FaStar } from "react-icons/fa";
import { CopyIcon2, DeleteIcon, EditIcon } from "./Icons";
import { DraggableIcon } from "./CommonIcons";
import { EmptyStarIcon, FilledStarIcon, SelectArrowIcon } from "./Icons.jsx";
import { useCreateSurveyProvider } from "./CreateSurveyProvider";
import RenderCheckboxOptions from "./RenderCheckboxOptions";
import RenderMultipleOptions from "./RenderMultipleOptions";
import { motion } from "framer-motion";

const QuestionItem = ({ question, index }) => {
  const {
    handleDeleteOption,
    handleAddOption,
    handleTitleChange,
    handleQuestionTypeChange,
    handleOptionChange,
    handleDeleteQuestion,
    handleSaveQuestion,
    handleEditQuestion,
    handleDuplicate,
    dupList,
  } = useCreateSurveyProvider();

  // ------------------------------------------
  // Persisted respondent answer (per question)
  // Uses localStorage key "draftResponses"
  // ------------------------------------------
  const loadInitial = React.useCallback(() => {
    try {
      const all = JSON.parse(localStorage.getItem("draftResponses") || "{}");
      return all[question.id] ?? (
        question.type === "multipleChoice" ? [] :
        question.type === "scale" || question.type === "npsScore" ? 0 :
        ""
      );
    } catch {
      return question.type === "multipleChoice" ? [] :
             question.type === "scale" || question.type === "npsScore" ? 0 : "";
    }
  }, [question.id, question.type]);

  const [answer, setAnswer] = React.useState(loadInitial);

  React.useEffect(() => {
    // Reload if this item becomes a different question (id change)
    setAnswer(loadInitial());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  const persist = (val) => {
    setAnswer(val);
    try {
      const all = JSON.parse(localStorage.getItem("draftResponses") || "{}");
      all[question.id] = val;
      localStorage.setItem("draftResponses", JSON.stringify(all));
    } catch {}
  };

  // Toggle helper for multi-select answers
  const toggleMulti = (val) => {
    const arr = Array.isArray(answer) ? answer.slice() : [];
    const i = arr.indexOf(val);
    if (i === -1) arr.push(val);
    else arr.splice(i, 1);
    persist(arr);
  };

  // ------------------------------------------
  // Render inputs for respondents (when saved)
  // ------------------------------------------
  const renderRespondUI = (q, questionIndex) => {
    if (!q.saved) return null;

    if (q.type === "singleChoice") {
      return (
        <div className="space-y-2 mt-2">
          {(q.options || []).map((opt) => {
            const val = opt.id ?? opt.text;
            return (
              <label key={val} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`q_${q.id}`}
                  value={val}
                  checked={answer === val}
                  onChange={() => persist(val)}
                />
                <span>{opt.text || "Option"}</span>
              </label>
            );
          })}
        </div>
      );
    }

    if (q.type === "multipleChoice") {
      return (
        <div className="space-y-2 mt-2">
          {(q.options || []).map((opt) => {
            const val = opt.id ?? opt.text;
            const checked = Array.isArray(answer) && answer.includes(val);
            return (
              <label key={val} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!checked}
                  onChange={() => toggleMulti(val)}
                />
                <span>{opt.text || "Option"}</span>
              </label>
            );
          })}
        </div>
      );
    }

    if (q.type === "openQuestion") {
      return (
        <div className="w-full my-2 border border-gray-200 rounded-lg bg-[#f9f9fc]">
          <textarea
            className="w-full h-24 p-3 bg-transparent border-none outline-none resize-none text-gray-600 placeholder-gray-400"
            placeholder="Enter your long answer here..."
            value={typeof answer === "string" ? answer : ""}
            onChange={(e) => persist(e.target.value)}
          />
        </div>
      );
    }

    if (q.type === "shortAnswer") {
      return (
        <div className="w-full my-2 border border-gray-200 rounded-lg bg-[#f9f9fc]">
          <input
            className="w-full p-2 bg-transparent border-none outline-none text-gray-600 placeholder-gray-400"
            placeholder="Enter your short answer here..."
            value={typeof answer === "string" ? answer : ""}
            onChange={(e) => persist(e.target.value)}
          />
        </div>
      );
    }

    if (q.type === "scale" || q.type === "npsScore") {
      // Clickable stars as a simple rating UI.
      const max = q.type === "npsScore" ? 11 : 10; // 0–10 vs 1–10
      const base = q.type === "npsScore" ? 0 : 1;

      return (
        <div className="w-full my-4 bg-white rounded-lg">
          <div className="flex flex-col items-center justify-center py-4">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {Array.from({ length: max }, (_, idx) => {
                const val = base === 0 ? idx : idx + 1;
                const active = Number(answer) >= val;
                return (
                  <button
                    type="button"
                    key={val}
                    className="cursor-pointer group relative"
                    onClick={() => persist(val)}
                    aria-label={`Rate ${val}`}
                  >
                    {active ? <FilledStarIcon /> : <EmptyStarIcon />}
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Selected: {answer || (q.type === "npsScore" ? 0 : 1)}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // Editor inputs (original builder controls) – visible when not saved.
  const renderEditorUI = (q, questionIndex) => {
    switch (q.type) {
      case "multipleChoice":
        return (q.options || []).map((option, optionIndex) => (
          <RenderCheckboxOptions
            key={option.id}
            questionIndex={questionIndex}
            question={q}
            option={option}
            optionIndex={optionIndex}
            dupList={dupList}
          />
        ));
      case "singleChoice":
        return (q.options || []).map((option, optionIndex) => (
          <RenderMultipleOptions
            key={option.id}
            questionIndex={questionIndex}
            question={q}
            option={option}
            optionIndex={optionIndex}
            dupList={dupList}
          />
        ));
      case "openQuestion":
        return (
          <div className="w-full my-2 border border-gray-200 rounded-lg bg-[#f9f9fc]">
            <textarea
              className="w-full h-24 p-3 bg-transparent border-none outline-none resize-none text-gray-600 placeholder-gray-400"
              disabled={true}
              placeholder="Enter your long answer here..."
              onChange={(e) => handleOptionChange(questionIndex, 0, e.target.value)}
            />
          </div>
        );
      case "shortAnswer":
        return (
          <div className="w-full my-2 border border-gray-200 rounded-lg bg-[#f9f9fc]">
            <input
              className="w-full p-2 bg-transparent border-none outline-none text-gray-600 placeholder-gray-400"
              disabled={true}
              placeholder="Enter your short answer here..."
              onChange={(e) => handleOptionChange(questionIndex, 0, e.target.value)}
            />
          </div>
        );
      case "scale":
      case "npsScore":
        // Visual-only stars in editor mode
        return (
          <div className="w-full my-4 bg-white rounded-lg">
            <div className="flex flex-col items-center justify-center py-4">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {[...Array(10)].map((_, idx) => (
                  <div key={idx} className="cursor-pointer group relative">
                    <EmptyStarIcon />
                    <FilledStarIcon />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Mode toggles
  const showEditor = !question.saved;
  const showRespondent = !!question.saved;

  return (
    <Draggable draggableId={question.id.toString()} index={index}>
      {(provided) => (
        <div
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          ref={provided.innerRef}
          className={`flex font-switzer rounded-[12px] mb-4 flex-col p-4 border-2 transition-all duration-200 shadow-sm hover:shadow-md ${
            question.isTag
              ? "border-[#4d3b7c] bg-[#f7f5fb]"
              : question.saved
              ? "border-[#6851a7] bg-white"
              : "border-[#6851a7] bg-white"
          }`}
        >
          {/* Optional tag chip */}
          {question.isTag && (
            <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-[#f7f5fb] w-fit rounded-full">
              <FaStar className="text-[#6851a7] text-xs" />
              <span className="text-xs text-gray-700 font-medium">
                Tag: {question.title}
              </span>
            </div>
          )}

          {/* Form wrapper to reuse your existing "Save Question" submit behavior */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveQuestion(index);
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center mb-2 cursor-move">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <DraggableIcon className="text-gray-400 opacity-50" />
              </motion.div>
            </div>

            {/* Title + type */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 mb-3">
              {question.saved || question.isTag ? (
                <p className="px-2 py-1.5 text-gray-800 font-normal text-base sm:col-span-8 bg-transparent border border-gray-200 rounded-lg">
                  {question.title || "Enter your question"}
                </p>
              ) : (
                <motion.input
                  whileFocus={{ boxShadow: "0 0 0 2px rgba(104, 81, 167, 0.15)" }}
                  type="text"
                  required
                  value={question.title}
                  placeholder="Enter your question here..."
                  onChange={(e) => handleTitleChange(index, e.target.value)}
                  className="px-2 py-1.5 text-gray-800 outline-none font-normal text-base sm:col-span-8 bg-transparent border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#6851a7] focus:border-transparent transition-all duration-200"
                />
              )}

              {!question.saved && !question.isTag ? (
                <div className="relative sm:col-span-4">
                  <motion.select
                    whileHover={{ boxShadow: "0 0 0 1px rgba(104, 81, 167, 0.1)" }}
                    value={question.type}
                    onChange={(e) => handleQuestionTypeChange(index, e.target.value)}
                    className="cursor-pointer text-sm px-2 py-1.5 border border-[#6851a7] rounded-lg bg-white appearance-none focus:outline-none focus:ring-1 focus:ring-[#6851a7] focus:border-transparent transition-all duration-200 text-gray-700 w-full pr-8"
                  >
                    <option value="singleChoice">Single Choice</option>
                    <option value="multipleChoice">Multiple Choice</option>
                    <option value="openQuestion">Long Answer</option>
                    <option value="shortAnswer">Short Answer</option>
                    <option value="scale">Ratings</option>
                    <option value="npsScore">NPS Score</option>
                  </motion.select>
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <SelectArrowIcon width={14} height={14} />
                  </div>
                </div>
              ) : question.isTag ? (
                <div className="flex items-center justify-end sm:col-span-4">
                  <motion.span
                    whileHover={{ scale: 1.02 }}
                    className="px-2 py-1.5 bg-[#e8e3f4] text-[#6851a7] rounded-lg text-xs font-medium w-full text-center"
                  >
                    {question.type === "singleChoice"
                      ? "Single Choice Question"
                      : "Multiple Choice Question"}
                  </motion.span>
                </div>
              ) : (
                <div className="flex items-center justify-end sm:col-span-4">
                  <motion.span
                    whileHover={{ scale: 1.02 }}
                    className="px-2 py-1.5 bg-[#f4f2fb] text-[#6851a7] rounded-lg text-xs font-medium w-full text-center"
                  >
                    {question.type === "singleChoice"
                      ? "Single Choice"
                      : question.type === "multipleChoice"
                      ? "Multiple Choice"
                      : question.type === "openQuestion"
                      ? "Long Answer"
                      : question.type === "shortAnswer"
                      ? "Short Answer"
                      : question.type === "scale"
                      ? "Rating Scale"
                      : question.type === "npsScore"
                      ? "NPS Score"
                      : "Unknown"}
                  </motion.span>
                </div>
              )}
            </div>

            {/* Editor vs Respondent rendering */}
            <div className="mb-2">
              {/* EDITOR (when not saved) */}
              {showEditor && ["multipleChoice", "singleChoice"].includes(question.type) && (
                <div className="space-y-2">{renderEditorUI(question, index)}</div>
              )}
              {showEditor && ["openQuestion", "shortAnswer", "scale", "npsScore"].includes(question.type) && (
                <div>{renderEditorUI(question, index)}</div>
              )}

              {/* RESPONDENT (when saved) */}
              {showRespondent && (
                <div>{renderRespondUI(question, index)}</div>
              )}
            </div>

            {/* Actions (delete/duplicate/save/edit) */}
            <div className="flex justify-end items-center gap-2">
              {!question.saved && (
                <>
                  {!question.isTag && (
                    <>
                      <Tooltip id="delete-btn" />
                      <motion.button
                        whileHover={{ scale: 1.05, backgroundColor: "rgba(239, 68, 68, 0.1)" }}
                        whileTap={{ scale: 0.97 }}
                        data-tooltip-id="delete-btn"
                        data-tooltip-content="Delete Question"
                        data-tooltip-place="top"
                        onClick={() => handleDeleteQuestion(index)}
                        type="button"
                        className="p-2 rounded-full hover:bg-red-50 transition-all duration-200"
                      >
                        <DeleteIcon className="text-red-500 w-4 h-4" />
                      </motion.button>

                      <Tooltip id="copy-btn" />
                      <motion.button
                        whileHover={{ scale: 1.05, backgroundColor: "rgba(104, 81, 167, 0.1)" }}
                        whileTap={{ scale: 0.97 }}
                        data-tooltip-id="copy-btn"
                        data-tooltip-content="Duplicate Question"
                        data-tooltip-place="top"
                        type="button"
                        onClick={() => handleDuplicate(index)}
                        className="p-2 rounded-full hover:bg-purple-50 transition-all duration-200"
                      >
                        <CopyIcon2 className="text-[#6851a7] w-4 h-4" />
                      </motion.button>
                    </>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className={`px-5 py-2 text-white font-medium rounded-full shadow-sm transition-all duration-200 ${
                      question.isTag ? "bg-[#6851a7] hover:bg-[#5b4691]" : "bg-[#6851a7] hover:bg-[#5b4691]"
                    }`}
                  >
                    Save Question
                  </motion.button>
                </>
              )}

              {question.saved && (
                <>
                  <Tooltip id="delete-saved-btn" />
                  <motion.button
                    whileHover={{ scale: 1.05, backgroundColor: "rgba(239, 68, 68, 0.1)" }}
                    whileTap={{ scale: 0.97 }}
                    data-tooltip-id="delete-saved-btn"
                    data-tooltip-content="Delete Question"
                    data-tooltip-place="top"
                    onClick={() => handleDeleteQuestion(index)}
                    type="button"
                    className="p-2 rounded-full hover:bg-red-50 transition-all duration-200"
                  >
                    <DeleteIcon className="text-red-500 w-4 h-4" />
                  </motion.button>

                  <Tooltip id="edit-btn" />
                  <motion.button
                    whileHover={{ scale: 1.05, backgroundColor: "rgba(104, 81, 167, 0.1)" }}
                    whileTap={{ scale: 0.97 }}
                    data-tooltip-id="edit-btn"
                    data-tooltip-content="Edit Question"
                    data-tooltip-place="top"
                    onClick={() => handleEditQuestion(index)}
                    className="p-2 rounded-full hover:bg-purple-50 transition-all duration-200"
                  >
                    <EditIcon className="text-[#6851a7] w-4 h-4" />
                  </motion.button>
                </>
              )}
            </div>
          </form>
        </div>
      )}
    </Draggable>
  );
};

export default QuestionItem;
