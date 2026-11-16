-- Rollback del Script 01 (restaura funciones originales; las columnas nuevas quedan, son inofensivas)
BEGIN;
DROP FUNCTION IF EXISTS public.mak_abrir_caja_dia(numeric,text);
DROP FUNCTION IF EXISTS public.mak_cerrar_caja_dia(numeric,text,numeric);
DROP FUNCTION IF EXISTS public.mak_info_apertura_caja();
DROP FUNCTION IF EXISTS public.mak_historial_cajas(int);
CREATE OR REPLACE FUNCTION public.mak_abrir_caja_dia(p_fondo numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_usuario UUID := auth.uid();
    v_fecha DATE;
    v_caja public.mak_caja_dias%ROWTYPE;
BEGIN

    IF v_usuario IS NULL OR NOT EXISTS (
        SELECT 1
        FROM public.admin_usuarios
        WHERE auth_user_id = v_usuario
          AND activo = TRUE
          AND rol IN ('dueno', 'administrador')
    ) THEN
        RAISE EXCEPTION
            'Solo administración puede abrir caja.';
    END IF;

    IF p_fondo IS NULL
       OR p_fondo < 0
       OR p_fondo > 9999999999.99
       OR p_fondo <> ROUND(p_fondo, 2) THEN
        RAISE EXCEPTION 'Fondo inicial inválido.';
    END IF;

    v_fecha := (
        clock_timestamp()
        AT TIME ZONE 'America/Guayaquil'
    )::DATE;

    -- Serializar aperturas concurrentes
    PERFORM pg_advisory_xact_lock(742017, 1);

    IF EXISTS (
        SELECT 1
        FROM public.mak_caja_dias
        WHERE estado = 'abierta'
    ) THEN
        RAISE EXCEPTION
            'Ya existe una caja abierta.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.mak_caja_dias
        WHERE fecha = v_fecha
    ) THEN
        RAISE EXCEPTION
            'Ya existe una caja registrada para hoy.';
    END IF;

    INSERT INTO public.mak_caja_dias (
        fecha,
        fondo_inicial,
        abierta_por
    )
    VALUES (
        v_fecha,
        p_fondo,
        v_usuario
    )
    RETURNING * INTO v_caja;

    RETURN jsonb_build_object(
        'id', v_caja.id,
        'fecha', v_caja.fecha,
        'fondo_inicial', v_caja.fondo_inicial,
        'estado', v_caja.estado,
        'abierta_at', v_caja.abierta_at
    );

END;
$function$;
CREATE OR REPLACE FUNCTION public.mak_cerrar_caja_dia(p_efectivo_contado numeric, p_observaciones text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_usuario UUID := auth.uid();
    v_caja public.mak_caja_dias%ROWTYPE;
    v_esperado NUMERIC(12,2);
    v_diferencia NUMERIC(12,2);
    v_pagos NUMERIC(12,2);
    v_ventas NUMERIC(12,2);
    v_gastos NUMERIC(12,2);
    v_ledger_pagos NUMERIC(12,2);
    v_ledger_ventas NUMERIC(12,2);
    v_ledger_gastos NUMERIC(12,2);
    v_cierre_at TIMESTAMPTZ;
BEGIN
    IF v_usuario IS NULL OR NOT EXISTS (
        SELECT 1
        FROM public.admin_usuarios
        WHERE auth_user_id = v_usuario
          AND activo = TRUE
          AND rol IN ('dueno', 'administrador')
    ) THEN
        RAISE EXCEPTION 'Solo administración puede cerrar caja.';
    END IF;

    IF p_efectivo_contado IS NULL
       OR p_efectivo_contado::TEXT IN
          ('NaN', 'Infinity', '-Infinity')
       OR p_efectivo_contado < 0
       OR p_efectivo_contado > 9999999999.99
       OR p_efectivo_contado <> ROUND(p_efectivo_contado, 2)
    THEN
        RAISE EXCEPTION 'Efectivo contado inválido.';
    END IF;

    -- Bloquear temporalmente escrituras financieras
    -- para evitar operaciones simultáneas durante el cierre.

    LOCK TABLE public.pagos,
               public.ventas,
               public.gastos
    IN SHARE ROW EXCLUSIVE MODE;

    SELECT *
    INTO v_caja
    FROM public.mak_caja_dias
    WHERE estado = 'abierta'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe una caja abierta.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.mak_caja_entregas
        WHERE caja_dia_id = v_caja.id
          AND estado IN ('pendiente', 'disputada')
    ) THEN
        RAISE EXCEPTION
            'Existen entregas pendientes o disputadas.';
    END IF;

    v_cierre_at := clock_timestamp();

    -- Verificar pagos efectivos desde la apertura.

    SELECT COALESCE(SUM(monto), 0)
    INTO v_pagos
    FROM public.pagos
    WHERE metodo_pago = 'efectivo'
      AND estado_registro = 'confirmado'
      AND fecha_pago >= v_caja.abierta_at
      AND fecha_pago <= v_cierre_at;

    SELECT COALESCE(SUM(total), 0)
    INTO v_ventas
    FROM public.ventas
    WHERE metodo_pago = 'efectivo'
      AND estado_pago = 'pagado'
      AND COALESCE(fecha_pago_confirmado, fecha)
          >= v_caja.abierta_at
      AND COALESCE(fecha_pago_confirmado, fecha)
          <= v_cierre_at;

    SELECT COALESCE(SUM(monto), 0)
    INTO v_gastos
    FROM public.gastos
    WHERE metodo_pago = 'efectivo'
      AND fecha >= v_caja.abierta_at
      AND fecha <= v_cierre_at;

    -- Comparar cada fuente con el libro de movimientos.

    SELECT
        COALESCE(SUM(monto) FILTER
            (WHERE origen = 'pago'), 0),
        COALESCE(SUM(monto) FILTER
            (WHERE origen = 'venta'), 0),
        COALESCE(SUM(monto) FILTER
            (WHERE origen = 'gasto'), 0)
    INTO
        v_ledger_pagos,
        v_ledger_ventas,
        v_ledger_gastos
    FROM public.mak_caja_movimientos
    WHERE caja_dia_id = v_caja.id;

    IF v_pagos <> v_ledger_pagos
       OR v_ventas <> v_ledger_ventas
       OR -v_gastos <> v_ledger_gastos
    THEN
        RAISE EXCEPTION
            'Existen cobros o gastos sin conciliar. '
            'No se puede cerrar la caja.';
    END IF;

    SELECT
        v_caja.fondo_inicial + COALESCE(SUM(monto), 0)
    INTO v_esperado
    FROM public.mak_caja_movimientos
    WHERE caja_dia_id = v_caja.id;

    v_diferencia := ROUND(
        p_efectivo_contado - v_esperado, 2
    );

    IF v_diferencia <> 0
       AND NULLIF(TRIM(COALESCE(p_observaciones, '')), '')
           IS NULL
    THEN
        RAISE EXCEPTION
            'Debes justificar el faltante o sobrante.';
    END IF;

    UPDATE public.mak_caja_dias
    SET
        estado = 'cerrada',
        cerrada_por = v_usuario,
        cerrada_at = v_cierre_at,
        efectivo_contado_cierre = p_efectivo_contado,
        observaciones =
            NULLIF(TRIM(COALESCE(p_observaciones, '')), '')
    WHERE id = v_caja.id;

    RETURN jsonb_build_object(
        'caja_id', v_caja.id,
        'estado', 'cerrada',
        'fondo_inicial', v_caja.fondo_inicial,
        'efectivo_esperado', v_esperado,
        'efectivo_contado', p_efectivo_contado,
        'diferencia', v_diferencia,
        'cerrada_at', v_cierre_at
    );
END;
$function$;
REVOKE ALL ON FUNCTION public.mak_abrir_caja_dia(numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mak_cerrar_caja_dia(numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mak_abrir_caja_dia(numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mak_cerrar_caja_dia(numeric,text) TO authenticated;
COMMIT;
