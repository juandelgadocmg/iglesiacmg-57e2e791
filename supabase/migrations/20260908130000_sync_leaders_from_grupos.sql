-- Sync Casa de Paz leaders from Grupos to Leaders table
DO $$
DECLARE
    g RECORD;
    p_name TEXT;
    l_id UUID;
BEGIN
    FOR g IN
        SELECT id, lider_id FROM public.grupos 
        WHERE LOWER(tipo::text) IN ('casas de paz', 'grupos encuentro') 
        AND estado = 'Activo' 
        AND lider_id IS NOT NULL
    LOOP
        -- Obtener el nombre completo de la persona asignada como líder en el módulo Grupos
        SELECT trim(nombres || ' ' || apellidos) INTO p_name 
        FROM public.personas 
        WHERE id = g.lider_id;
        
        IF p_name IS NOT NULL THEN
            -- Buscar si ya existe ese líder en la tabla leaders
            SELECT id INTO l_id FROM public.leaders WHERE full_name ILIKE p_name LIMIT 1;
            
            IF l_id IS NOT NULL THEN
                -- Si existe, actualizamos su casa de paz
                UPDATE public.leaders SET casa_de_paz_id = g.id WHERE id = l_id;
            ELSE
                -- Si no existe, lo creamos con un ID nuevo para que aparezca en el directorio
                l_id := gen_random_uuid();
                INSERT INTO public.leaders (id, full_name, casa_de_paz_id)
                VALUES (l_id, p_name, g.id);
            END IF;
        END IF;
    END LOOP;
END;
$$;
