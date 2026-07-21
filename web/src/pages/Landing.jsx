import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createLesson, createSession, deleteLesson, getLesson, getLessons, updateLesson } from "../api";
import DemoSwitcher from "../components/DemoSwitcher";
import Header from "../components/Header";
import {
  ArrowIcon,
  BookIcon,
  CheckIcon,
  FileIcon,
  ShieldIcon,
  TargetIcon,
  UploadIcon,
  UserIcon,
} from "../components/Icons";

const formatDate = (date) =>
  new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));

const lessonPrompt = `Create a self-contained test lesson for Pragyanta, an evidence-based tutor.

Topic: [YOUR TOPIC]
Audience: Beginner
Target length: 900 to 1,200 words
Purpose: This lesson will be pasted into Word, exported as a selectable-text PDF, and uploaded to Pragyanta to test the full tutor flow.

Return two separate sections:

SECTION A: PDF LESSON CONTENT
SECTION B: TEST SCRIPT FOR PRAGYANTA

Only SECTION A should go into the PDF.

SECTION A requirements:
- Use plain text headings only.
- Do not add page headers.
- Do not add page footers.
- Do not add page numbers.
- Do not use tables, columns, text boxes, watermarks, or decorative layout.
- Do not include external links or outside citations.
- Keep paragraphs short.
- Explain the topic in a way a beginner can answer in their own words later.
- Include clear standalone sentences the tutor can quote as source evidence.
- Teach in this order when possible: what it is, why it matters, how to use it, common mistakes.
- Include at least two worked examples.
- Explain each worked example in full sentences after the code or example block.
- Include at least one realistic example with labels such as name, age, city, price, score, or similar.
- Include exactly three common misconceptions.
- Include exactly five Check your understanding questions, numbered 1 to 5.
- Include an answer key for only questions 1, 2, 3, and 4.
- Make question 5 related to the topic but intentionally unsupported by the lesson.
- Do not answer or explain question 5 anywhere in SECTION A.
- Everything in the answer key must be supported directly by the lesson.

Use this structure for SECTION A:
1. Chapter title
2. Lesson metadata
3. Learning objectives
4. Key vocabulary
5. Main explanation
6. Worked examples
7. Common misconceptions
8. Check your understanding
9. Answer key
10. Short summary

SECTION B requirements:
- Supported question 1
- Supported question 2
- Misconception test input
- Expected correction
- Verification answer
- Missing-source/off-topic question

The missing-source/off-topic question must not be answered or explained in SECTION A.

Return clean document-ready text only. Do not include headings like SECTION A or SECTION B inside the PDF content itself.`;

export default function Landing() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pdf");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [uploadState, setUploadState] = useState("idle");
  const [error, setError] = useState("");
  const [demoState, setDemoState] = useState("default");
  const [promptCopied, setPromptCopied] = useState(false);
  const [lessonAction, setLessonAction] = useState("");
  const [editingLesson, setEditingLesson] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const inputRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const role = new URLSearchParams(location.search).get("role") || "teacher";
  const isStudentView = role === "student";

  useEffect(() => {
    getLessons()
      .then(setLessons)
      .catch(() =>
        setError("Lessons could not be loaded. Refresh the page to try again."),
      )
      .finally(() => setLoading(false));
  }, []);

  const startLesson = async (lessonId, isDemo = false) => {
    const result = await createSession({
      lesson_id: lessonId,
      learner_level: "beginner",
      is_demo: isDemo,
    });
    navigate(`/learn/${result.session_id}?role=student`);
  };

  const upload = async () => {
    setError("");
    if (tab === "pdf" && !file) {
      setError("Choose a PDF file before uploading.");
      return;
    }
    if (tab === "text" && (!title.trim() || !text.trim())) {
      setError("Add a title and lesson text before uploading.");
      return;
    }
    setUploadState("uploading");
    try {
      await new Promise((r) => setTimeout(r, 650));
      setUploadState("processing");
      const lesson = await createLesson({ title, text, file });
      setLessons((items) => [lesson, ...items]);
      setUploadState("success");
      setTitle("");
      setText("");
      setFile(null);
      setTimeout(() => setUploadState("idle"), 2500);
    } catch (e) {
      setError(e.message);
      setUploadState("error");
    }
  };

  const changeDemo = (state) => {
    setDemoState(state);
    setError("");
    setUploadState("idle");
    if (state === "empty") setLessons([]);
    else getLessons().then(setLessons);
    if (state === "uploading") setUploadState("processing");
    if (state === "upload_error") {
      setUploadState("error");
      setError(
        "The lesson could not be processed. Check the file and try again.",
      );
    }
  };

  const copyLessonPrompt = async () => {
    await navigator.clipboard.writeText(lessonPrompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 1800);
  };

  const renameLesson = async (lesson) => {
    const nextTitle = window.prompt("Rename lesson", lesson.title)?.trim();
    if (!nextTitle || nextTitle === lesson.title) return;
    setError("");
    setLessonAction(lesson.lesson_id);
    try {
      const updated = await updateLesson(lesson.lesson_id, { title: nextTitle });
      setLessons((items) => items.map((item) => item.lesson_id === lesson.lesson_id ? updated : item));
    } catch (e) {
      setError(e.message || "The lesson could not be renamed.");
    } finally {
      setLessonAction("");
    }
  };

  const openEditor = async (lesson) => {
    setError("");
    setEditingLesson(lesson);
    setEditTitle(lesson.title);
    setEditText("");
    setEditLoading(true);
    try {
      const detail = await getLesson(lesson.lesson_id);
      setEditTitle(detail.title);
      setEditText(detail.text || "");
    } catch (e) {
      setError(e.message || "The lesson could not be loaded for editing.");
      setEditingLesson(null);
    } finally {
      setEditLoading(false);
    }
  };

  const saveLessonEdit = async (event) => {
    event.preventDefault();
    if (!editingLesson || !editTitle.trim() || !editText.trim()) {
      setError("Add a title and lesson text before saving.");
      return;
    }
    setError("");
    setLessonAction(editingLesson.lesson_id);
    try {
      const updated = await updateLesson(editingLesson.lesson_id, { title: editTitle.trim(), text: editText.trim() });
      setLessons((items) => items.map((item) => item.lesson_id === editingLesson.lesson_id ? updated : item));
      setEditingLesson(null);
    } catch (e) {
      setError(e.message || "The lesson could not be saved.");
    } finally {
      setLessonAction("");
    }
  };

  const removeLesson = async (lesson) => {
    if (!window.confirm(`Delete "${lesson.title}"? This also removes its sessions, messages, practice questions, and reports.`)) return;
    setError("");
    setLessonAction(lesson.lesson_id);
    try {
      await deleteLesson(lesson.lesson_id);
      setLessons((items) => items.filter((item) => item.lesson_id !== lesson.lesson_id));
    } catch (e) {
      setError(e.message || "The lesson could not be deleted.");
    } finally {
      setLessonAction("");
    }
  };

  const orderedLessons = [...lessons].sort(
    (left, right) =>
      Number(Boolean(right.featured_prompt)) -
      Number(Boolean(left.featured_prompt)),
  );

  return (
    <div className="page landing-page">
      <Header mode={role} roleTargets={{ teacher: "/?role=teacher", student: "/?role=student" }} />
      <main className="landing-main">
        <section className="hero-copy">
          <div>
            <div className="overline">
              <span />
              {isStudentView ? "Grounded learning" : "Evidence-based teaching"}
            </div>
            <h1>{isStudentView ? "Learn from sources your teacher trusts." : "Teach from sources you trust."}</h1>
            <p>
              {isStudentView
                ? "Pragyanta explains only from lesson material your teacher approved, so every answer stays grounded in the same source."
                : "Pragyanta answers only from teacher-approved material, so every explanation stays grounded in your lesson."}
            </p>
          </div>
          <aside className="hero-promise">
            <span>
              <ShieldIcon />
            </span>
            <p>
              {isStudentView ? "Answers stay grounded in your lesson source." : <>Answers stay grounded in<br />teacher-approved material.</>}
            </p>
          </aside>
        </section>
        {!loading && lessons.length > 0 && (
          <section className="stat-strip" aria-label="Curriculum at a glance">
            <div className="stat-tile">
              <span className="stat-icon">
                <BookIcon size={19} />
              </span>
              <div>
                <strong>{lessons.length}</strong>
                <small>
                  {lessons.length === 1 ? "lesson" : "lessons"} in the library
                </small>
              </div>
            </div>
            <div className="stat-tile">
              <span className="stat-icon">
                <TargetIcon size={19} />
              </span>
              <div>
                <strong>
                  {lessons
                    .reduce((sum, l) => sum + (l.question_count || 0), 0)
                    .toLocaleString()}
                </strong>
                <small>grounded practice questions</small>
              </div>
            </div>
            <div className="stat-tile">
              <span className="stat-icon">
                <ShieldIcon size={19} />
              </span>
              <div>
                <strong>100%</strong>
                <small>answers cited to your material</small>
              </div>
            </div>
          </section>
        )}
        <section className="library-section" id="lessons">
          <div className="section-heading">
            <div>
              <h2>Your lessons</h2>
              <span className="heading-rule" />
            </div>
            <p>
              {lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}{" "}
              ready
            </p>
          </div>
          {loading ? (
            <div className="skeleton-card" aria-live="polite">
              Loading your lessons…
            </div>
          ) : error && !lessons.length ? (
            <div className="empty-card error-card">
              <h3>Lessons are unavailable</h3>
              <p>{error}</p>
            </div>
          ) : lessons.length === 0 ? (
            <div className="empty-card">
              <div className="empty-icon">
                <BookIcon />
              </div>
              <h3>{isStudentView ? "Lessons are ready to explore" : "Your lesson library is ready"}</h3>
              <p>
                {isStudentView
                  ? "Open a lesson, ask grounded questions, and practise from the same source material."
                  : "Upload a PDF or paste lesson text to create your first evidence-based tutor."}
              </p>
              {!isStudentView && <button
                className="text-button"
                onClick={() =>
                  document
                    .getElementById("upload")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Add your first lesson <ArrowIcon />
              </button>}
            </div>
          ) : (
            <div className="lesson-grid">
              {orderedLessons.map((lesson) => (
                <article
                  className={`lesson-card ${lesson.featured_prompt ? "showcase-lesson" : ""}`}
                  key={lesson.lesson_id}
                >
                  <div className="lesson-card-top">
                    <div className="lesson-document">
                      <FileIcon size={30} />
                    </div>
                    <span className="lesson-label">
                      {lesson.featured_prompt
                        ? "Guided showcase"
                        : "Teacher-approved lesson"}
                    </span>
                  </div>
                  <h3>{lesson.title}</h3>
                  <div className="lesson-meta">
                    <span>
                      <BookIcon size={16} />
                      {lesson.chunk_count} sections
                    </span>
                    {lesson.question_count > 0 && (
                      <span>
                        <i />
                        {lesson.question_count} practice questions
                      </span>
                    )}
                    <span className="lesson-date">
                      {formatDate(lesson.created_at)}
                    </span>
                  </div>
                  <div className="lesson-actions">
                    <button
                      className="primary-button wide"
                      onClick={() => startLesson(lesson.lesson_id, Boolean(lesson.featured_prompt))}
                    >
                      <UserIcon />
                      {lesson.featured_prompt
                        ? (isStudentView ? "Open guided lesson" : "Try guided demo")
                        : "Open as student"}{" "}
                      <ArrowIcon />
                    </button>
                    <div className="lesson-subactions">
                      <button
                        className="secondary-button"
                        onClick={() =>
                          navigate(`/practice/${lesson.lesson_id}?role=student`)
                        }
                      >
                        <TargetIcon size={15} />
                        Practice
                      </button>
                      {!isStudentView && <button
                        className="secondary-button"
                        onClick={() =>
                          navigate(`/report/${lesson.lesson_id}?role=teacher`)
                        }
                      >
                        Report
                      </button>}
                      {!isStudentView && <button
                        className="secondary-button"
                        disabled={lessonAction === lesson.lesson_id}
                        onClick={() => openEditor(lesson)}
                      >
                        Edit
                      </button>}
                      {!isStudentView && <button
                        className="secondary-button"
                        disabled={lessonAction === lesson.lesson_id}
                        onClick={() => renameLesson(lesson)}
                      >
                        Rename
                      </button>}
                      {!isStudentView && <button
                        className="secondary-button danger"
                        disabled={lessonAction === lesson.lesson_id}
                        onClick={() => removeLesson(lesson)}
                      >
                        Delete
                      </button>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        {!isStudentView && <section className="upload-section" id="upload">
          <div className="section-heading">
            <div>
              <h2>Upload lesson</h2>
              <span className="heading-rule" />
            </div>
            <p>PDF or text</p>
          </div>
          <div className="upload-card">
            <div className="tabs" role="tablist">
              <button
                role="tab"
                aria-selected={tab === "pdf"}
                className={tab === "pdf" ? "active" : ""}
                onClick={() => setTab("pdf")}
              >
                Upload PDF
              </button>
              <button
                role="tab"
                aria-selected={tab === "text"}
                className={tab === "text" ? "active" : ""}
                onClick={() => setTab("text")}
              >
                Paste text
              </button>
            </div>
            {tab === "pdf" ? (
              <div
                className={`drop-zone ${file ? "has-file" : ""}`}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f?.type === "application/pdf") setFile(f);
                  else
                    setError(
                      "Choose a PDF file. Other file types are not supported.",
                    );
                }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files[0])}
                  hidden
                />
                <div className="upload-icon">
                  {file ? <CheckIcon /> : <UploadIcon />}
                </div>
                <h3>{file ? file.name : "Drop your lesson PDF here"}</h3>
                <p>
                  {file
                    ? `${Math.max(1, Math.round(file.size / 1024))} KB · Ready to upload`
                    : "or click to choose a file · PDF up to 10 MB"}
                </p>
              </div>
            ) : (
              <div className="paste-form">
                <label>
                  Lesson title
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Introduction to Python"
                  />
                </label>
                <label>
                  Lesson material
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste the teacher-approved lesson text here…"
                  />
                </label>
              </div>
            )}
            {["uploading", "processing"].includes(uploadState) && (
              <div className="processing-card" role="status">
                <div>
                  <span className="processing-icon">
                    <FileIcon />
                  </span>
                  <div>
                    <strong>{file?.name || "Preparing your lesson"}</strong>
                    <small>
                      {uploadState === "uploading"
                        ? "Uploading teacher-approved material"
                        : "Extracting source sections"}
                    </small>
                  </div>
                </div>
                <div className="progress-track">
                  <span className={uploadState} />
                </div>
                <ol>
                  <li className="done">Upload complete</li>
                  <li className="active">Extracting source sections</li>
                  <li>Creating lesson</li>
                </ol>
              </div>
            )}
            {error && (
              <div className="form-error" role="alert">
                <span>!</span>
                {error}
              </div>
            )}
            {uploadState === "success" ? (
              <div className="upload-success" role="status">
                <CheckIcon /> Lesson processed and ready for students.
              </div>
            ) : (
              !["uploading", "processing"].includes(uploadState) && (
                <button className="primary-button full" onClick={upload}>
                  Upload lesson <ArrowIcon />
                </button>
              )
            )}
              <div className="lesson-prompt-helper">
              <div className="prompt-helper-head">
                <div>
                  <strong>Create a test PDF lesson</strong>
                  <span>Copy this prompt, generate the lesson, paste only the lesson content into Word, export as PDF, then upload.</span>
                </div>
                <button className="secondary-button" onClick={copyLessonPrompt}>
                  {promptCopied ? "Copied" : "Copy prompt"}
                </button>
              </div>
              <p className="prompt-helper-note">Pragyanta answers from the uploaded lesson and its extracted source sections. It does not use a live external knowledge API in the current submission flow, so stronger lesson content produces stronger grounded answers.</p>
              <pre>{lessonPrompt}</pre>
            </div>
          </div>
        </section>}
      </main>
      {editingLesson && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="edit-lesson-title">
          <form className="lesson-editor" onSubmit={saveLessonEdit}>
            <div className="editor-head">
              <div>
                <span className="overline"><i />Teacher material</span>
                <h2 id="edit-lesson-title">Edit lesson</h2>
              </div>
              <button type="button" className="secondary-button" onClick={() => setEditingLesson(null)}>Close</button>
            </div>
            {editLoading ? (
              <div className="editor-loading">Loading lesson material...</div>
            ) : (
              <>
                <label>
                  Lesson title
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                </label>
                <label>
                  Lesson material
                  <textarea value={editText} onChange={(e) => setEditText(e.target.value)} />
                </label>
                <p className="editor-note">Saving changed material will rebuild source sections and clear old sessions, practice questions, and reports for this lesson.</p>
                <div className="editor-actions">
                  <button type="button" className="secondary-button" onClick={() => setEditingLesson(null)}>Cancel</button>
                  <button className="primary-button" disabled={lessonAction === editingLesson.lesson_id}>Save lesson</button>
                </div>
              </>
            )}
          </form>
        </div>
      )}
      <footer>
        <span>Pragyanta</span>
        <p>Answers grounded in evidence. Understanding verified.</p>
      </footer>
      <DemoSwitcher page="landing" value={demoState} onChange={changeDemo} />
    </div>
  );
}
