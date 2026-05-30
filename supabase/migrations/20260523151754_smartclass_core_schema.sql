/*
  # SmartClass Core Database Schema

  ## Purpose
  Establishes the foundational tables for the SmartClass educational platform.

  ## New Tables
  1. `departments` - Academic departments (e.g., Computer Science, Mathematics)
  2. `levels` - Academic year levels per department (100L, 200L, etc.)
  3. `courses` - Subject/course definitions linked to levels
  4. `classes` - Physical class groups with a class representative
  5. `class_enrollments` - Many-to-many: students enrolled in classes
  6. `profiles` - Extended user profile data linked to auth.users
  7. `timetable` - Recurring schedule patterns for classes
  8. `sessions` - Actual class instances (with QR token info)
  9. `attendance` - Scan records with status, GPS, timestamps
  10. `alerts` - Notification history with delivery status
  11. `materials` - PDF metadata stored in Supabase Storage
  12. `ai_conversations` - Chat logs with citations

  ## Security
  - RLS enabled on all tables
  - Policies scoped per role: student, class_rep, teacher, dept_admin, super_admin
*/

-- Enable pgvector for AI embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view departments"
  ON departments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admin can insert departments"
  ON departments FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'super_admin'
  );

CREATE POLICY "Super admin can update departments"
  ON departments FOR UPDATE
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'super_admin'
  )
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'super_admin'
  );

-- Levels (academic year levels per department)
CREATE TABLE IF NOT EXISTS levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  name text NOT NULL,
  year integer NOT NULL CHECK (year BETWEEN 100 AND 900),
  created_at timestamptz DEFAULT now(),
  UNIQUE(department_id, year)
);

ALTER TABLE levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view levels"
  ON levels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Dept admin or super admin can insert levels"
  ON levels FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('dept_admin', 'super_admin')
  );

CREATE POLICY "Dept admin or super admin can update levels"
  ON levels FOR UPDATE
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('dept_admin', 'super_admin')
  )
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('dept_admin', 'super_admin')
  );

-- Profiles (extends auth.users with role, department, approval)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'class_rep', 'teacher', 'dept_admin', 'super_admin')),
  department_id uuid REFERENCES departments(id),
  level_id uuid REFERENCES levels(id),
  approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  device_fingerprint text DEFAULT '',
  avatar_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('dept_admin', 'super_admin', 'teacher')
  );

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('dept_admin', 'super_admin')
  )
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('dept_admin', 'super_admin')
  );

-- Courses
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id uuid REFERENCES levels(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id),
  code text NOT NULL,
  name text NOT NULL,
  teacher_id uuid REFERENCES profiles(id),
  credit_units integer DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  UNIQUE(level_id, code)
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view courses"
  ON courses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Dept admin or super admin can insert courses"
  ON courses FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('dept_admin', 'super_admin')
  );

CREATE POLICY "Dept admin, super admin, or assigned teacher can update courses"
  ON courses FOR UPDATE
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('dept_admin', 'super_admin')
    OR teacher_id = auth.uid()
  )
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('dept_admin', 'super_admin')
    OR teacher_id = auth.uid()
  );

-- Classes (physical class groups)
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  name text NOT NULL,
  capacity integer DEFAULT 50,
  rep_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view classes"
  ON classes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Dept admin or super admin can insert classes"
  ON classes FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('dept_admin', 'super_admin')
  );

CREATE POLICY "Class rep or admin can update classes"
  ON classes FOR UPDATE
  TO authenticated
  USING (
    rep_id = auth.uid()
    OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('dept_admin', 'super_admin')
  )
  WITH CHECK (
    rep_id = auth.uid()
    OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('dept_admin', 'super_admin')
  );

-- Class Enrollments
CREATE TABLE IF NOT EXISTS class_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  enrolled_at timestamptz DEFAULT now(),
  UNIQUE(class_id, student_id)
);

ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own enrollments"
  ON class_enrollments FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Teachers and admins can view enrollments"
  ON class_enrollments FOR SELECT
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('teacher', 'dept_admin', 'super_admin', 'class_rep')
  );

CREATE POLICY "Students can enroll themselves"
  ON class_enrollments FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins can manage enrollments"
  ON class_enrollments FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('dept_admin', 'super_admin')
  );

-- Timetable (recurring schedule patterns)
CREATE TABLE IF NOT EXISTS timetable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id),
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  venue text DEFAULT '',
  recurrence text DEFAULT 'weekly',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view timetable"
  ON timetable FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teacher or dept admin can insert timetable"
  ON timetable FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('teacher', 'dept_admin', 'super_admin', 'class_rep')
  );

CREATE POLICY "Teacher or dept admin can update timetable"
  ON timetable FOR UPDATE
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('teacher', 'dept_admin', 'super_admin', 'class_rep')
  )
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('teacher', 'dept_admin', 'super_admin', 'class_rep')
  );

CREATE POLICY "Teacher or dept admin can delete timetable"
  ON timetable FOR DELETE
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('teacher', 'dept_admin', 'super_admin')
  );

-- Sessions (actual class instances)
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timetable_id uuid REFERENCES timetable(id),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id),
  session_date date NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  venue text DEFAULT '',
  qr_token text DEFAULT '',
  qr_expires_at timestamptz,
  is_active boolean DEFAULT false,
  is_makeup boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teacher or class rep can create sessions"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('teacher', 'dept_admin', 'super_admin', 'class_rep')
  );

CREATE POLICY "Teacher or class rep can update sessions"
  ON sessions FOR UPDATE
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('teacher', 'dept_admin', 'super_admin', 'class_rep')
  )
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('teacher', 'dept_admin', 'super_admin', 'class_rep')
  );

-- Attendance records
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id),
  course_id uuid REFERENCES courses(id),
  student_id uuid REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'absent' CHECK (status IN ('early', 'present', 'late', 'absent')),
  scanned_at timestamptz DEFAULT now(),
  gps_lat double precision,
  gps_lng double precision,
  device_fingerprint text DEFAULT '',
  UNIQUE(session_id, student_id)
);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Teachers and admins can view attendance for their classes"
  ON attendance FOR SELECT
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('teacher', 'dept_admin', 'super_admin', 'class_rep')
  );

CREATE POLICY "Students can insert own attendance"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES profiles(id),
  recipient_id uuid REFERENCES profiles(id),
  title text NOT NULL,
  body text NOT NULL,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  type text DEFAULT 'general',
  course_id uuid REFERENCES courses(id),
  is_read boolean DEFAULT false,
  delivery_status text DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'delivered', 'failed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid() OR sender_id = auth.uid());

CREATE POLICY "Authenticated users can send alerts"
  ON alerts FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can mark own alerts as read"
  ON alerts FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Materials (PDF metadata)
CREATE TABLE IF NOT EXISTS materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES profiles(id),
  title text NOT NULL,
  file_path text NOT NULL,
  file_size bigint DEFAULT 0,
  processing_status text DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'processed', 'failed')),
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view and manage own materials"
  ON materials FOR SELECT
  TO authenticated
  USING (
    teacher_id = auth.uid()
    OR (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('dept_admin', 'super_admin')
    OR EXISTS (
      SELECT 1 FROM class_enrollments ce
      JOIN classes cl ON cl.id = ce.class_id
      WHERE ce.student_id = auth.uid()
      AND cl.course_id = materials.course_id
    )
  );

CREATE POLICY "Teachers can insert materials"
  ON materials FOR INSERT
  TO authenticated
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can update own materials"
  ON materials FOR UPDATE
  TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Material embeddings (pgvector for RAG)
CREATE TABLE IF NOT EXISTS material_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid REFERENCES materials(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id),
  chunk_index integer DEFAULT 0,
  content text NOT NULL,
  source_doc text DEFAULT '',
  page_num integer DEFAULT 0,
  embedding vector(1536),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE material_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled students and teachers can view embeddings"
  ON material_embeddings FOR SELECT
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('teacher', 'dept_admin', 'super_admin')
    OR EXISTS (
      SELECT 1 FROM class_enrollments ce
      JOIN classes cl ON cl.id = ce.class_id
      WHERE ce.student_id = auth.uid()
      AND cl.course_id = material_embeddings.course_id
    )
  );

CREATE POLICY "System can insert embeddings"
  ON material_embeddings FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('teacher', 'dept_admin', 'super_admin')
  );

-- HNSW index for fast vector similarity search
CREATE INDEX IF NOT EXISTS material_embeddings_hnsw_idx
  ON material_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- AI Conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES profiles(id),
  course_id uuid REFERENCES courses(id),
  question text NOT NULL,
  answer text NOT NULL,
  sources jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own conversations"
  ON ai_conversations FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Teachers can view course conversations"
  ON ai_conversations FOR SELECT
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) IN ('teacher', 'dept_admin', 'super_admin')
  );

CREATE POLICY "Students can insert own conversations"
  ON ai_conversations FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_approval ON profiles(approval_status);
CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_course ON sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_sessions_class ON sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_timetable_class ON timetable(class_id);
CREATE INDEX IF NOT EXISTS idx_alerts_recipient ON alerts(recipient_id);
CREATE INDEX IF NOT EXISTS idx_materials_course ON materials(course_id);
