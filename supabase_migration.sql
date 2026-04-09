-- ============================================================
-- DILEMA ELECTORAL 2026 — Esquema Supabase
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

-- ------------------------------------------------------------
-- 1. PREGUNTAS
-- ------------------------------------------------------------
CREATE TABLE questions (
    id          integer PRIMARY KEY,          -- mismo id del JSON (1-30)
    text        text    NOT NULL,
    context     text    NOT NULL              -- "Eje 1: Economía, Hacienda y Comercio"
);

-- ------------------------------------------------------------
-- 2. OPCIONES POR PREGUNTA (A-E)
-- ------------------------------------------------------------
CREATE TABLE question_options (
    id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
    question_id integer NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    option_key  char(1) NOT NULL,            -- 'A', 'B', 'C', 'D', 'E'
    option_text text    NOT NULL,
    UNIQUE (question_id, option_key)
);

CREATE INDEX idx_options_question ON question_options(question_id);

-- ------------------------------------------------------------
-- 3. CANDIDATOS
-- ------------------------------------------------------------
CREATE TABLE candidates (
    id           integer PRIMARY KEY,         -- mismo id del JSON (1-14)
    name         text    NOT NULL,
    party        text    NOT NULL,
    profile      text,                        -- "Centro/Derecha", "Izquierda progresista", etc.
    description  text,
    campaign_url text,
    -- Rutas de imagen (Supabase Storage URLs en producción)
    photo_url       text,                     -- "Candidatos/Ivan Cepeda.png"
    party_logo_url  text,                     -- "Partidos/Pacto Historico.png"
    profile_pic_url text                      -- "Perfil/izquierda_progresista.jpg"
);

-- ------------------------------------------------------------
-- 4. RESPUESTAS DE CANDIDATOS A LAS PREGUNTAS
-- Una fila por cada candidato + pregunta
-- ------------------------------------------------------------
CREATE TABLE candidate_answers (
    candidate_id integer NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    question_id  integer NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    answer       char(1) NOT NULL,            -- 'A', 'B', 'C', 'D', 'E'
    PRIMARY KEY (candidate_id, question_id)
);

CREATE INDEX idx_answers_candidate ON candidate_answers(candidate_id);
CREATE INDEX idx_answers_question  ON candidate_answers(question_id);

-- ------------------------------------------------------------
-- 5. RESPUESTAS DEL QUIZ (ya existente, se mantiene igual)
-- ------------------------------------------------------------
-- La tabla quiz_responses ya existe con:
-- id, created_at, respondent_name, top_candidate, top_percentage,
-- q1..q30, results (jsonb), comment

-- ------------------------------------------------------------
-- 6. POLÍTICAS RLS
-- Lectura pública (anon puede leer candidates, questions, options)
-- Solo el backend inserta en quiz_responses
-- ------------------------------------------------------------
ALTER TABLE questions         DISABLE ROW LEVEL SECURITY;
ALTER TABLE question_options  DISABLE ROW LEVEL SECURITY;
ALTER TABLE candidates        DISABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_answers DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- FIN DEL ESQUEMA
-- ============================================================
