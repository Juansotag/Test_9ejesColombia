-- ============================================================
-- Fix: permite guardar comentarios vía RPC (SECURITY DEFINER)
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

-- 1. Crear función RPC para guardar comentario vinculado a una sesión
CREATE OR REPLACE FUNCTION save_session_comment(
    p_session_id UUID,
    p_comment    TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER   -- se ejecuta con permisos del owner, bypasea RLS
AS $$
BEGIN
    UPDATE sessions
    SET comment = p_comment
    WHERE id = p_session_id;
END;
$$;

-- 2. Dar permiso de ejecución a la clave anónima
GRANT EXECUTE ON FUNCTION save_session_comment(UUID, TEXT) TO anon;
