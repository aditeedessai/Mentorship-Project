/**
 * academicOptions.js
 * ------------------
 * Single source of truth for every dropdown rendered on the
 * StudentProfilePage.  Keeping the data here (rather than inline
 * in JSX) makes it easy to maintain and avoids duplication.
 *
 * The `value` fields in EDUCATION_LEVELS correspond to the CHECK
 * constraint on `student_profiles.education_level`:
 *   'primary' | 'middle_school' | 'high_school' |
 *   'graduate' | 'post_graduate' | 'other'
 */

// ───────────────────────────────────────────
// 1. Current Level of Study
// ───────────────────────────────────────────
export const EDUCATION_LEVELS = [
  { label: "Primary School", value: "primary" },
  { label: "Middle School", value: "middle_school" },
  { label: "High School", value: "high_school" },
  { label: "Undergraduate / College", value: "graduate" },
  { label: "Postgraduate", value: "post_graduate" },
  { label: "Diploma / Vocational", value: "other" },
  { label: "Other", value: "other" },
];

// ───────────────────────────────────────────
// 2. Current Grade / Year of Study
//    (keyed by education_level value)
// ───────────────────────────────────────────
export const GRADES_BY_LEVEL = {
  primary: ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5"],
  middle_school: ["Grade 6", "Grade 7", "Grade 8"],
  high_school: ["Grade 9", "Grade 10", "Grade 11", "Grade 12"],
  graduate: [
    "First Year",
    "Second Year",
    "Third Year",
    "Fourth Year",
    "Final Year",
  ],
  post_graduate: ["First Year", "Second Year", "Final Year"],
  other: ["Not Applicable"],
};

// ───────────────────────────────────────────
// 3. Field / Stream / Major
//    (keyed by education_level value)
// ───────────────────────────────────────────
export const FIELDS_BY_LEVEL = {
  primary: ["Not Applicable"],
  middle_school: ["Not Applicable"],
  high_school: [
    "Science",
    "Commerce",
    "Arts / Humanities",
    "Vocational",
    "Other",
  ],
  graduate: [
    "Computer Science",
    "Information Technology",
    "BCA",
    "BSc",
    "BCom",
    "BA",
    "Engineering",
    "Medicine",
    "Management",
    "Arts / Humanities",
    "Other",
  ],
  post_graduate: [
    "Computer Science",
    "Information Technology",
    "MBA",
    "MSc",
    "MCom",
    "MA",
    "Engineering",
    "Medicine",
    "Management",
    "Arts / Humanities",
    "Other",
  ],
  other: ["Not Applicable", "Other"],
};

// ───────────────────────────────────────────
// 4. Type of Curriculum
// ───────────────────────────────────────────
export const CURRICULUM_OPTIONS = [
  "CBSE",
  "ICSE",
  "State Board",
  "IB",
  "Cambridge / IGCSE",
  "NIOS",
  "University Curriculum",
  "Other",
];
