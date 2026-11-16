-- =====================================================================
-- MAK-FITNESS · Script 01 · Caja con cadena de efectivo
-- Cierre (contado) -> retiro explícito -> efectivo dejado -> apertura (contado, comparado)
-- Ejecutar completo en Supabase SQL Editor. Es idempotente.
-- Para probar sin aplicar: reemplaza el último COMMIT por ROLLBACK.
-- =====================================================================
BEGIN;

ALTER TABLE public.mak_caja_dias
  ADD COLUMN IF NOT EXISTS efectivo_esperado_cierre numeric(12,2),
  ADD COLUMN IF NOT EXISTS diferencia_cierre        numeric(12,2),
  ADD COLUMN IF NOT EXISTS efectivo_dejado          numeric(12,2),
  ADD COLUMN IF NOT EXISTS retiro_cierre            numeric(12,2),
  ADD COLUMN IF NOT EXISTS apertura_esperada        numeric(12,2),
  ADD COLUMN IF NOT EXISTS apertura_diferencia      numeric(12,2),
  ADD COLUMN IF NOT EXISTS apertura_justificacion   text;

-- Cajas ya cerradas: se completa lo que se puede calcular (no inventa "dejado").
UPDATE public.mak_caja_dias c
SET efectivo_esperado_cierre = c.fondo_inicial + COALESCE((
        SELECT SUM(m.monto) FROM public.mak_caja_movimientos m WHERE m.caja_dia_id = c.id), 0),
    diferencia_cierre = c.efectivo_contado_cierre - (c.fondo_inicial + COALESCE((
        SELECT SUM(m.monto) FROM public.mak_caja_movimientos m WHERE m.caja_dia_id = c.id), 0))
WHERE c.estado = 'cerrada' AND c.efectivo_contado_cierre IS NOT NULL
  AND c.efectivo_esperado_cierre IS NULL;

-- ---------------------------------------------------------------------
-- Funciones viejas (firma anterior) fuera, para evitar ambigüedad en RPC
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.mak_abrir_caja_dia(numeric);
DROP FUNCTION IF EXISTS public.mak_cerrar_caja_dia(numeric, text);

-- ---------------------------------------------------------------------
-- Info previa a la apertura (solo administración)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mak_info_apertura_caja()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $$
DECLARE
  v_usuario uuid := auth.uid();
  v_hoy date := (clock_timestamp() AT TIME ZONE 'America/Guayaquil')::date;
  v_ult public.mak_caja_dias%ROWTYPE;
  v_abierta public.mak_caja_dias%ROWTYPE;
BEGIN
  IF v_usuario IS NULL OR NOT EXISTS (
     SELECT 1 FROM public.admin_usuarios
     WHERE auth_user_id = v_usuario AND activo AND rol IN ('dueno','administrador')) THEN
    RAISE EXCEPTION 'Solo administración puede ver esto.';
  END IF;

  SELECT * INTO v_abierta FROM public.mak_caja_dias WHERE estado = 'abierta' LIMIT 1;
  SELECT * INTO v_ult FROM public.mak_caja_dias WHERE estado = 'cerrada'
    ORDER BY cerrada_at DESC NULLS LAST LIMIT 1;

  RETURN jsonb_build_object(
    'hoy', v_hoy,
    'hay_caja_abierta', v_abierta.id IS NOT NULL,
    'caja_abierta_fecha', v_abierta.fecha,
    'caja_abierta_vencida', v_abierta.id IS NOT NULL AND v_abierta.fecha < v_hoy,
    'ya_hubo_caja_hoy', EXISTS (SELECT 1 FROM public.mak_caja_dias WHERE fecha = v_hoy),
    -- NULL si la última caja es anterior a este sistema (no hay cadena que comparar)
    'efectivo_dejado_ultimo', v_ult.efectivo_dejado,
    'fecha_ultimo_cierre', v_ult.cerrada_at
  );
END;
$$;

-- ---------------------------------------------------------------------
-- Abrir: el fondo ES el efectivo físico contado.
-- Se compara con lo dejado en el último cierre; si difiere exige justificación.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mak_abrir_caja_dia(
  p_fondo numeric,
  p_justificacion text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $$
DECLARE
  v_usuario uuid := auth.uid();
  v_fecha date;
  v_caja public.mak_caja_dias%ROWTYPE;
  v_ult public.mak_caja_dias%ROWTYPE;
  v_esperada numeric(12,2);
  v_dif numeric(12,2);
  v_just text := NULLIF(TRIM(COALESCE(p_justificacion,'')), '');
BEGIN
  IF v_usuario IS NULL OR NOT EXISTS (
     SELECT 1 FROM public.admin_usuarios
     WHERE auth_user_id = v_usuario AND activo AND rol IN ('dueno','administrador')) THEN
    RAISE EXCEPTION 'Solo administración puede abrir caja.';
  END IF;

  IF p_fondo IS NULL OR p_fondo < 0 OR p_fondo > 9999999999.99
     OR p_fondo <> ROUND(p_fondo, 2) THEN
    RAISE EXCEPTION 'Efectivo inicial inválido.';
  END IF;

  v_fecha := (clock_timestamp() AT TIME ZONE 'America/Guayaquil')::date;
  PERFORM pg_advisory_xact_lock(742017, 1);

  IF EXISTS (SELECT 1 FROM public.mak_caja_dias WHERE estado = 'abierta') THEN
    RAISE EXCEPTION 'Ya existe una caja abierta.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.mak_caja_dias WHERE fecha = v_fecha) THEN
    RAISE EXCEPTION 'Ya existe una caja registrada para hoy.';
  END IF;

  SELECT * INTO v_ult FROM public.mak_caja_dias WHERE estado = 'cerrada'
    ORDER BY cerrada_at DESC NULLS LAST LIMIT 1;
  v_esperada := v_ult.efectivo_dejado;           -- NULL si es cadena nueva / caja legada
  IF v_esperada IS NOT NULL THEN
    v_dif := ROUND(p_fondo - v_esperada, 2);
    IF v_dif <> 0 AND (v_just IS NULL OR length(v_just) < 10) THEN
      RAISE EXCEPTION 'El efectivo contado no coincide con lo dejado en el último cierre. Explica la diferencia (mínimo 10 caracteres).';
    END IF;
  END IF;

  INSERT INTO public.mak_caja_dias
    (fecha, fondo_inicial, abierta_por, apertura_esperada, apertura_diferencia, apertura_justificacion)
  VALUES (v_fecha, p_fondo, v_usuario, v_esperada, v_dif, CASE WHEN v_dif <> 0 THEN v_just END)
  RETURNING * INTO v_caja;

  RETURN jsonb_build_object(
    'id', v_caja.id, 'fecha', v_caja.fecha, 'fondo_inicial', v_caja.fondo_inicial,
    'estado', v_caja.estado, 'abierta_at', v_caja.abierta_at,
    'apertura_esperada', v_esperada, 'apertura_diferencia', v_dif);
END;
$$;

-- ---------------------------------------------------------------------
-- Cerrar: efectivo contado + cuánto queda en caja para mañana.
-- retiro = contado - dejado (queda registrado, no se pierde).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mak_cerrar_caja_dia(
  p_efectivo_contado numeric,
  p_observaciones text DEFAULT NULL,
  p_efectivo_dejado numeric DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $$
DECLARE
  v_usuario uuid := auth.uid();
  v_caja public.mak_caja_dias%ROWTYPE;
  v_esperado numeric(12,2);
  v_dif numeric(12,2);
  v_dejado numeric(12,2);
  v_retiro numeric(12,2);
  v_pagos numeric(12,2); v_ventas numeric(12,2); v_gastos numeric(12,2);
  v_lp numeric(12,2); v_lv numeric(12,2); v_lg numeric(12,2);
  v_cierre_at timestamptz;
  v_obs text := NULLIF(TRIM(COALESCE(p_observaciones,'')), '');
BEGIN
  IF v_usuario IS NULL OR NOT EXISTS (
     SELECT 1 FROM public.admin_usuarios
     WHERE auth_user_id = v_usuario AND activo AND rol IN ('dueno','administrador')) THEN
    RAISE EXCEPTION 'Solo administración puede cerrar caja.';
  END IF;

  IF p_efectivo_contado IS NULL OR p_efectivo_contado::text IN ('NaN','Infinity','-Infinity')
     OR p_efectivo_contado < 0 OR p_efectivo_contado > 9999999999.99
     OR p_efectivo_contado <> ROUND(p_efectivo_contado, 2) THEN
    RAISE EXCEPTION 'Efectivo contado inválido.';
  END IF;

  v_dejado := COALESCE(p_efectivo_dejado, p_efectivo_contado);
  IF v_dejado::text IN ('NaN','Infinity','-Infinity') OR v_dejado < 0
     OR v_dejado > p_efectivo_contado OR v_dejado <> ROUND(v_dejado, 2) THEN
    RAISE EXCEPTION 'El efectivo que queda en caja no puede ser mayor al contado.';
  END IF;
  v_retiro := ROUND(p_efectivo_contado - v_dejado, 2);

  LOCK TABLE public.pagos, public.ventas, public.gastos IN SHARE ROW EXCLUSIVE MODE;

  SELECT * INTO v_caja FROM public.mak_caja_dias WHERE estado = 'abierta' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No existe una caja abierta.'; END IF;

  IF EXISTS (SELECT 1 FROM public.mak_caja_entregas
             WHERE caja_dia_id = v_caja.id AND estado IN ('pendiente','disputada')) THEN
    RAISE EXCEPTION 'Existen entregas pendientes o disputadas.';
  END IF;

  v_cierre_at := clock_timestamp();

  SELECT COALESCE(SUM(monto),0) INTO v_pagos FROM public.pagos
   WHERE metodo_pago='efectivo' AND estado_registro='confirmado'
     AND fecha_pago >= v_caja.abierta_at AND fecha_pago <= v_cierre_at;
  SELECT COALESCE(SUM(total),0) INTO v_ventas FROM public.ventas
   WHERE metodo_pago='efectivo' AND estado_pago='pagado'
     AND COALESCE(fecha_pago_confirmado, fecha) >= v_caja.abierta_at
     AND COALESCE(fecha_pago_confirmado, fecha) <= v_cierre_at;
  SELECT COALESCE(SUM(monto),0) INTO v_gastos FROM public.gastos
   WHERE metodo_pago='efectivo' AND fecha >= v_caja.abierta_at AND fecha <= v_cierre_at;

  SELECT COALESCE(SUM(monto) FILTER (WHERE origen='pago'),0),
         COALESCE(SUM(monto) FILTER (WHERE origen='venta'),0),
         COALESCE(SUM(monto) FILTER (WHERE origen='gasto'),0)
    INTO v_lp, v_lv, v_lg
    FROM public.mak_caja_movimientos WHERE caja_dia_id = v_caja.id;

  IF v_pagos <> v_lp OR v_ventas <> v_lv OR -v_gastos <> v_lg THEN
    RAISE EXCEPTION 'Existen cobros o gastos sin conciliar. No se puede cerrar la caja.';
  END IF;

  SELECT v_caja.fondo_inicial + COALESCE(SUM(monto),0) INTO v_esperado
    FROM public.mak_caja_movimientos WHERE caja_dia_id = v_caja.id;

  v_dif := ROUND(p_efectivo_contado - v_esperado, 2);
  IF v_dif <> 0 AND (v_obs IS NULL OR length(v_obs) < 10) THEN
    RAISE EXCEPTION 'Debes justificar el faltante o sobrante (mínimo 10 caracteres).';
  END IF;

  UPDATE public.mak_caja_dias SET
    estado='cerrada', cerrada_por=v_usuario, cerrada_at=v_cierre_at,
    efectivo_contado_cierre=p_efectivo_contado,
    efectivo_esperado_cierre=v_esperado, diferencia_cierre=v_dif,
    efectivo_dejado=v_dejado, retiro_cierre=v_retiro,
    observaciones=v_obs
  WHERE id = v_caja.id;

  RETURN jsonb_build_object(
    'caja_id', v_caja.id, 'estado','cerrada', 'fondo_inicial', v_caja.fondo_inicial,
    'efectivo_esperado', v_esperado, 'efectivo_contado', p_efectivo_contado,
    'diferencia', v_dif, 'efectivo_dejado', v_dejado, 'retiro', v_retiro,
    'cerrada_at', v_cierre_at);
END;
$$;

-- ---------------------------------------------------------------------
-- Historial de cajas con diferencias (solo administración)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mak_historial_cajas(p_limite int DEFAULT 31)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $$
DECLARE v_usuario uuid := auth.uid();
BEGIN
  IF v_usuario IS NULL OR NOT EXISTS (
     SELECT 1 FROM public.admin_usuarios
     WHERE auth_user_id = v_usuario AND activo AND rol IN ('dueno','administrador')) THEN
    RAISE EXCEPTION 'Solo administración puede ver el historial de caja.';
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(to_jsonb(t) ORDER BY t.fecha DESC)
    FROM (
      SELECT id, fecha, estado, fondo_inicial, apertura_esperada, apertura_diferencia,
             apertura_justificacion, efectivo_esperado_cierre, efectivo_contado_cierre,
             diferencia_cierre, retiro_cierre, efectivo_dejado, observaciones
      FROM public.mak_caja_dias
      ORDER BY fecha DESC
      LIMIT LEAST(GREATEST(COALESCE(p_limite,31),1),200)
    ) t), '[]'::jsonb);
END;
$$;

-- Permisos: nada para anon / público
REVOKE ALL ON FUNCTION public.mak_info_apertura_caja()            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mak_abrir_caja_dia(numeric,text)     FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mak_cerrar_caja_dia(numeric,text,numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mak_historial_cajas(int)             FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mak_info_apertura_caja()            TO authenticated;
GRANT EXECUTE ON FUNCTION public.mak_abrir_caja_dia(numeric,text)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.mak_cerrar_caja_dia(numeric,text,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mak_historial_cajas(int)             TO authenticated;

COMMIT;
