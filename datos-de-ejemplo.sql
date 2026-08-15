-- ============================================================================
-- DATOS DE EJEMPLO PARA STAFF BOARD
-- Crea 8 personas de prueba, eventos, tareas, chats, evidencias, calendario,
-- historial y notificaciones. NO toca nada de lo que ya existe.
-- Todas las cuentas de ejemplo entran con la contraseña:  Demo1234!
-- ============================================================================

do $$
declare u record;
begin
  for u in
    select * from (values
      ('a1111111-1111-4111-8111-111111111111','ana.martinez@colegio.edu.do','Ana Martínez','member','Docente de Ciencias','Académica','AM','#18854e'),
      ('a2222222-2222-4222-8222-222222222222','carlos.ruiz@colegio.edu.do','Carlos Ruiz','member','Coordinador de Convivencia','Bienestar','CR','#7a5cff'),
      ('a3333333-3333-4333-8333-333333333333','daniela.fermin@colegio.edu.do','Daniela Fermín','member','Docente de Artes','Académica','DF','#e11d48'),
      ('a4444444-4444-4444-8444-444444444444','marta.pena@colegio.edu.do','Marta Peña','admin','Directora Académica','Dirección','MP','#0f4f33'),
      ('a5555555-5555-4555-8555-555555555555','jose.almonte@colegio.edu.do','José Almonte','member','Docente de Educación Física','Deportes','JA','#d97706'),
      ('a6666666-6666-4666-8666-666666666666','lucia.santos@colegio.edu.do','Lucía Santos','member','Psicóloga Escolar','Orientación','LS','#0284c7'),
      ('a7777777-7777-4777-8777-777777777777','pedro.jimenez@colegio.edu.do','Pedro Jiménez','member','Encargado de Mantenimiento','Servicios Generales','PJ','#455a4d'),
      ('a8888888-8888-4888-8888-888888888888','rosa.perez@colegio.edu.do','Rosa Pérez','member','Secretaria Académica','Administración','RP','#27a663')
    ) as t(id, email, nombre, rol, cargo, area, iniciales, color)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id::uuid, 'authenticated', 'authenticated',
      u.email, crypt('Demo1234!', gen_salt('bf')),
      now(), now() - interval '200 days', now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false
    ) on conflict (id) do nothing;

    begin
      insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
      values (gen_random_uuid(), u.id::uuid,
              jsonb_build_object('sub', u.id, 'email', u.email, 'email_verified', true),
              'email', u.id, now(), now(), now());
    exception when others then null;
    end;

    insert into public.profiles (id, name, email, role, title, area, status, initials, color, joined_at)
    values (u.id::uuid, u.nombre, u.email, u.rol, u.cargo, u.area, 'active', u.iniciales, u.color,
            current_date - (random()*300)::int)
    on conflict do nothing;
  end loop;
end $$;
-- ============================================================================
-- EVENTOS DE EJEMPLO (uno por cada estado del ciclo de vida)
-- ============================================================================
insert into public.events (id, name, description, cover_emoji, color, created_date, event_date, due_date, status, created_by)
values
 ('e1111111-1111-4111-8111-111111111111','Feria Científica 2026',
  'Exposición de proyectos de ciencias de todos los grados. Montaje en el patio techado.',
  '🔬','sky', current_date - 20, current_date + 18, current_date + 16, 'publicado','a1111111-1111-4111-8111-111111111111'),

 ('e2222222-2222-4222-8222-222222222222','Graduación Sexto Grado',
  'Acto de graduación de la promoción 2026. Incluye ensayo general, decoración y protocolo.',
  '🎓','brand', current_date - 35, current_date + 40, current_date + 38, 'publicado','a4444444-4444-4444-8444-444444444444'),

 ('e3333333-3333-4333-8333-333333333333','Semana de la Familia',
  'Actividades con padres y madres durante toda la semana: charlas, convivencia y muestra artística.',
  '🤝','amber', current_date - 5, current_date + 55, current_date + 50, 'borrador','a2222222-2222-4222-8222-222222222222'),

 ('e4444444-4444-4444-8444-444444444444','Acto Cívico de la Independencia',
  'Acto cívico del 27 de febrero. Desfile de banderas, himno y palabras alusivas.',
  '🇩🇴','rose', current_date - 120, current_date - 30, current_date - 32, 'finalizado','a3333333-3333-4333-8333-333333333333'),

 ('e5555555-5555-4555-8555-555555555555','Capacitación: Evaluación por Competencias',
  'Jornada de formación docente sobre instrumentos de evaluación. Facilita el equipo de Dirección.',
  '📚','violet', current_date - 10, current_date + 7, current_date + 5, 'publicado','a4444444-4444-4444-8444-444444444444'),

 ('e6666666-6666-4666-8666-666666666666','Convivencia Navideña 2025',
  'Compartir de fin de año con todo el personal. Cena, intercambio de regalos y reconocimientos.',
  '🎄','brand', current_date - 260, current_date - 240, current_date - 242, 'archivado','a4444444-4444-4444-8444-444444444444')
on conflict (id) do nothing;
-- ============================================================================
-- TAREAS DE EJEMPLO (con lugares ocupados, líderes, lista de espera y evidencias)
-- ============================================================================
insert into public.event_tasks
 (id, event_id, name, description, color, priority, status, due_date, max_collaborators,
  slots, requires_leader, leader_id, waitlist, evidence, attachments)
values
 -- Feria Científica
 ('11111111-aaaa-4aaa-8aaa-000000000001','e1111111-1111-4111-8111-111111111111',
  'Montaje de stands','Armar las 24 mesas con manteles y rótulos por área.','sky','alta','en_proceso',
  current_date + 14, 4,
  jsonb_build_array(
    jsonb_build_object('userId','a7777777-7777-4777-8777-777777777777','claimedAt', now() - interval '3 days'),
    jsonb_build_object('userId','a5555555-5555-4555-8555-555555555555','claimedAt', now() - interval '2 days'),
    jsonb_build_object('userId', null, 'claimedAt', null),
    jsonb_build_object('userId', null, 'claimedAt', null)),
  true,'a7777777-7777-4777-8777-777777777777','[]'::jsonb,'[]'::jsonb,'[]'::jsonb),

 ('11111111-aaaa-4aaa-8aaa-000000000002','e1111111-1111-4111-8111-111111111111',
  'Jurado y rúbricas','Definir criterios de evaluación e invitar a dos jurados externos.','violet','media','sin_iniciar',
  current_date + 10, 2,
  jsonb_build_array(
    jsonb_build_object('userId','a1111111-1111-4111-8111-111111111111','claimedAt', now() - interval '5 days'),
    jsonb_build_object('userId', null, 'claimedAt', null)),
  false, null,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb),

 -- Tarea LLENA con lista de espera, para ver ese caso
 ('11111111-aaaa-4aaa-8aaa-000000000003','e1111111-1111-4111-8111-111111111111',
  'Decoración del patio','Guirnaldas, globos y señalización de las áreas temáticas.','amber','media','en_proceso',
  current_date + 12, 2,
  jsonb_build_array(
    jsonb_build_object('userId','a3333333-3333-4333-8333-333333333333','claimedAt', now() - interval '6 days'),
    jsonb_build_object('userId','a8888888-8888-4888-8888-888888888888','claimedAt', now() - interval '4 days')),
  false, null,
  jsonb_build_array('a6666666-6666-4666-8666-666666666666','a2222222-2222-4222-8222-222222222222'),
  '[]'::jsonb,'[]'::jsonb),

 -- Tarea VENCIDA, para ver el aviso en rojo
 ('11111111-aaaa-4aaa-8aaa-000000000004','e1111111-1111-4111-8111-111111111111',
  'Convocatoria a las familias','Enviar circular y confirmar asistencia de representantes.','rose','alta','en_proceso',
  current_date - 2, 2,
  jsonb_build_array(
    jsonb_build_object('userId','a8888888-8888-4888-8888-888888888888','claimedAt', now() - interval '9 days'),
    jsonb_build_object('userId', null, 'claimedAt', null)),
  false, null,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb),

 -- Graduación
 ('22222222-aaaa-4aaa-8aaa-000000000001','e2222222-2222-4222-8222-222222222222',
  'Protocolo y libreto','Redactar el libreto del acto y el orden de entrega de diplomas.','brand','alta','en_proceso',
  current_date + 30, 2,
  jsonb_build_array(
    jsonb_build_object('userId','a4444444-4444-4444-8444-444444444444','claimedAt', now() - interval '12 days'),
    jsonb_build_object('userId','a8888888-8888-4888-8888-888888888888','claimedAt', now() - interval '11 days')),
  true,'a4444444-4444-4444-8444-444444444444','[]'::jsonb,'[]'::jsonb,'[]'::jsonb),

 ('22222222-aaaa-4aaa-8aaa-000000000002','e2222222-2222-4222-8222-222222222222',
  'Diplomas e impresión','Verificar nombres, imprimir y encarpetar los 62 diplomas.','sky','alta','sin_iniciar',
  current_date + 25, 3,
  jsonb_build_array(
    jsonb_build_object('userId','a8888888-8888-4888-8888-888888888888','claimedAt', now() - interval '8 days'),
    jsonb_build_object('userId', null, 'claimedAt', null),
    jsonb_build_object('userId', null, 'claimedAt', null)),
  false, null,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb),

 ('22222222-aaaa-4aaa-8aaa-000000000003','e2222222-2222-4222-8222-222222222222',
  'Ensayo general','Coordinar el ensayo con los estudiantes una semana antes.','violet','media','sin_iniciar',
  current_date + 33, 4,
  jsonb_build_array(
    jsonb_build_object('userId','a5555555-5555-4555-8555-555555555555','claimedAt', now() - interval '7 days'),
    jsonb_build_object('userId','a6666666-6666-4666-8666-666666666666','claimedAt', now() - interval '7 days'),
    jsonb_build_object('userId', null, 'claimedAt', null),
    jsonb_build_object('userId', null, 'claimedAt', null)),
  false, null,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb),

 -- Capacitación (una a punto de vencer)
 ('55555555-aaaa-4aaa-8aaa-000000000001','e5555555-5555-4555-8555-555555555555',
  'Material de apoyo','Preparar la presentación y las guías impresas para 40 docentes.','violet','alta','en_proceso',
  current_date + 3, 2,
  jsonb_build_array(
    jsonb_build_object('userId','a4444444-4444-4444-8444-444444444444','claimedAt', now() - interval '4 days'),
    jsonb_build_object('userId','a1111111-1111-4111-8111-111111111111','claimedAt', now() - interval '3 days')),
  false, null,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb),

 ('55555555-aaaa-4aaa-8aaa-000000000002','e5555555-5555-4555-8555-555555555555',
  'Refrigerio y logística','Coordinar el refrigerio y acondicionar el salón de usos múltiples.','amber','baja','sin_iniciar',
  current_date + 5, 2,
  jsonb_build_array(
    jsonb_build_object('userId','a7777777-7777-4777-8777-777777777777','claimedAt', now() - interval '2 days'),
    jsonb_build_object('userId', null, 'claimedAt', null)),
  false, null,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb),

 -- Semana de la Familia (evento en BORRADOR: solo lo ve su creador)
 ('33333333-aaaa-4aaa-8aaa-000000000001','e3333333-3333-4333-8333-333333333333',
  'Charla para padres','Contactar al conferencista y confirmar tema y horario.','brand','media','sin_iniciar',
  current_date + 45, 2,
  jsonb_build_array(
    jsonb_build_object('userId', null, 'claimedAt', null),
    jsonb_build_object('userId', null, 'claimedAt', null)),
  false, null,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb),

 ('33333333-aaaa-4aaa-8aaa-000000000002','e3333333-3333-4333-8333-333333333333',
  'Muestra artística','Seleccionar las presentaciones de cada grado.','rose','baja','sin_iniciar',
  current_date + 48, 3,
  jsonb_build_array(
    jsonb_build_object('userId', null, 'claimedAt', null),
    jsonb_build_object('userId', null, 'claimedAt', null),
    jsonb_build_object('userId', null, 'claimedAt', null)),
  false, null,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb),

 -- Acto Cívico (evento FINALIZADO: tareas terminadas con evidencia)
 ('44444444-aaaa-4aaa-8aaa-000000000001','e4444444-4444-4444-8444-444444444444',
  'Ensayo del himno','Practicar con el coro durante dos semanas.','brand','media','terminada',
  current_date - 35, 2,
  jsonb_build_array(
    jsonb_build_object('userId','a3333333-3333-4333-8333-333333333333','claimedAt', now() - interval '70 days'),
    jsonb_build_object('userId','a6666666-6666-4666-8666-666666666666','claimedAt', now() - interval '69 days')),
  false, null,'[]'::jsonb,
  jsonb_build_array(jsonb_build_object(
    'id','ev-demo-1','type','file','name','Ensayo del coro (acta).pdf','url',null,
    'uploadedBy','a3333333-3333-4333-8333-333333333333','uploadedAt', now() - interval '36 days')),
  '[]'::jsonb),

 ('44444444-aaaa-4aaa-8aaa-000000000002','e4444444-4444-4444-8444-444444444444',
  'Banderas y escenario','Montar el asta, las banderas y el sonido.','sky','alta','terminada',
  current_date - 33, 3,
  jsonb_build_array(
    jsonb_build_object('userId','a7777777-7777-4777-8777-777777777777','claimedAt', now() - interval '68 days'),
    jsonb_build_object('userId','a5555555-5555-4555-8555-555555555555','claimedAt', now() - interval '68 days'),
    jsonb_build_object('userId','a2222222-2222-4222-8222-222222222222','claimedAt', now() - interval '67 days')),
  true,'a7777777-7777-4777-8777-777777777777','[]'::jsonb,'[]'::jsonb,
  jsonb_build_array(jsonb_build_object(
    'id','ev-demo-2','type','file','name','Checklist de montaje.pdf','url',null,
    'uploadedBy','a7777777-7777-4777-8777-777777777777','uploadedAt', now() - interval '34 days')))
on conflict (id) do nothing;

-- Vincular las tareas a sus eventos por si la columna taskIds se usa en algún lado
-- ============================================================================
-- CHATS DE TAREA, CALENDARIO, HISTORIAL Y NOTIFICACIONES
-- ============================================================================

-- Conversación de ejemplo en "Montaje de stands"
insert into public.task_chat_messages (id, task_id, author_id, text, reactions, created_at) values
 ('c1111111-0001-4001-8001-000000000001','11111111-aaaa-4aaa-8aaa-000000000001','a7777777-7777-4777-8777-777777777777',
  'Buen día. Ya tengo las 24 mesas apartadas en el depósito. ¿Las bajamos el jueves?',
  jsonb_build_object('👍', jsonb_build_array('a5555555-5555-4555-8555-555555555555')), now() - interval '3 days'),
 ('c1111111-0001-4001-8001-000000000002','11111111-aaaa-4aaa-8aaa-000000000001','a5555555-5555-4555-8555-555555555555',
  'Perfecto Pedro. Yo puedo desde las 2 de la tarde con dos muchachos de sexto.','{}'::jsonb, now() - interval '3 days' + interval '40 minutes'),
 ('c1111111-0001-4001-8001-000000000003','11111111-aaaa-4aaa-8aaa-000000000001','a7777777-7777-4777-8777-777777777777',
  'Nos faltan manteles. Voy a pedir cotización hoy mismo.',
  jsonb_build_object('✅', jsonb_build_array('a5555555-5555-4555-8555-555555555555')), now() - interval '2 days'),
 ('c1111111-0001-4001-8001-000000000004','11111111-aaaa-4aaa-8aaa-000000000001','a5555555-5555-4555-8555-555555555555',
  'Dale. Cuando tengas el número me avisas y lo subimos aquí mismo.','{}'::jsonb, now() - interval '1 day')
on conflict (id) do nothing;

insert into public.task_chat_messages (id, task_id, author_id, text, reactions, created_at) values
 ('c2222222-0002-4002-8002-000000000001','22222222-aaaa-4aaa-8aaa-000000000001','a4444444-4444-4444-8444-444444444444',
  'Subí el borrador del libreto. Rosa, revisa por favor el orden de los nombres.',
  jsonb_build_object('👍', jsonb_build_array('a8888888-8888-4888-8888-888888888888')), now() - interval '5 days'),
 ('c2222222-0002-4002-8002-000000000002','22222222-aaaa-4aaa-8aaa-000000000002','a8888888-8888-4888-8888-888888888888',
  'Ya verifiqué los 62 nombres contra el registro. Hay dos con tilde faltante, los corrijo.',
  jsonb_build_object('❤️', jsonb_build_array('a4444444-4444-4444-8444-444444444444')), now() - interval '2 days')
on conflict (id) do nothing;

insert into public.task_chat_messages (id, task_id, author_id, text, reactions, created_at) values
 ('c3333333-0003-4003-8003-000000000001','11111111-aaaa-4aaa-8aaa-000000000003','a3333333-3333-4333-8333-333333333333',
  'Compré la guirnalda azul y blanca. Falta definir el color de los globos por área.','{}'::jsonb, now() - interval '4 days'),
 ('c3333333-0003-4003-8003-000000000002','11111111-aaaa-4aaa-8aaa-000000000003','a8888888-8888-4888-8888-888888888888',
  'Propongo: Biología verde, Física azul, Química amarillo. Así se distinguen de lejos.',
  jsonb_build_object('👍', jsonb_build_array('a3333333-3333-4333-8333-333333333333'), '✅', jsonb_build_array('a3333333-3333-4333-8333-333333333333')),
  now() - interval '3 days')
on conflict (id) do nothing;

-- Calendario institucional
insert into public.calendar_entries (id, date, title, kind, location, time, motto) values
 ('d0000001-0001-4001-8001-000000000001', date_trunc('month', current_date)::date + 2, 'Valor del mes: la Responsabilidad','valor', null, null,'Cumplo lo que prometo'),
 ('d0000001-0001-4001-8001-000000000002', current_date + 3, 'Reunión general de personal','reunion','Salón de usos múltiples','07:30 a. m.', null),
 ('d0000001-0001-4001-8001-000000000003', current_date + 7, 'Capacitación: Evaluación por Competencias','capacitacion','Biblioteca','08:00 a. m.', null),
 ('d0000001-0001-4001-8001-000000000004', current_date + 12, 'Entrega de informes del primer trimestre','informe','Secretaría','Todo el día', null),
 ('d0000001-0001-4001-8001-000000000005', current_date + 18, 'Feria Científica 2026','evento','Patio techado','09:00 a. m.', null),
 ('d0000001-0001-4001-8001-000000000006', current_date + 21, 'Ambientación del mural: Mes de la Patria','fecha','Pasillo principal', null,'Responsable: Daniela Fermín'),
 ('d0000001-0001-4001-8001-000000000007', current_date + 26, 'Simulacro de evacuación','fecha','Todo el plantel','10:15 a. m.', null),
 ('d0000001-0001-4001-8001-000000000008', current_date + 40, 'Graduación Sexto Grado','evento','Auditorio','05:00 p. m.', null)
on conflict (id) do nothing;

-- Historial de actividad
insert into public.history_log (user_id, action, detail, type, created_at) values
 ('a1111111-1111-4111-8111-111111111111','creó el evento','Feria Científica 2026','Evento', now() - interval '20 days'),
 ('a1111111-1111-4111-8111-111111111111','publicó el evento','Feria Científica 2026','Evento', now() - interval '19 days'),
 ('a1111111-1111-4111-8111-111111111111','creó la tarea','Montaje de stands','Tarea', now() - interval '19 days'),
 ('a7777777-7777-4777-8777-777777777777','se inscribió en','Montaje de stands','Tarea', now() - interval '3 days'),
 ('a5555555-5555-4555-8555-555555555555','se inscribió en','Montaje de stands','Tarea', now() - interval '2 days'),
 ('a3333333-3333-4333-8333-333333333333','se inscribió en','Decoración del patio','Tarea', now() - interval '6 days'),
 ('a8888888-8888-4888-8888-888888888888','se inscribió en','Decoración del patio','Tarea', now() - interval '4 days'),
 ('a4444444-4444-4444-8444-444444444444','creó el evento','Graduación Sexto Grado','Evento', now() - interval '35 days'),
 ('a4444444-4444-4444-8444-444444444444','publicó el evento','Graduación Sexto Grado','Evento', now() - interval '34 days'),
 ('a8888888-8888-4888-8888-888888888888','agregó un documento en','Protocolo y libreto','Tarea', now() - interval '5 days'),
 ('a3333333-3333-4333-8333-333333333333','cambió el estado de','Ensayo del himno → terminada','Tarea', now() - interval '36 days'),
 ('a7777777-7777-4777-8777-777777777777','cambió el estado de','Banderas y escenario → terminada','Tarea', now() - interval '34 days'),
 ('a3333333-3333-4333-8333-333333333333','cambió el estado de','Acto Cívico de la Independencia','Evento', now() - interval '30 days'),
 ('a4444444-4444-4444-8444-444444444444','agregó al calendario institucional','Simulacro de evacuación','Calendario', now() - interval '8 days'),
 ('a4444444-4444-4444-8444-444444444444','actualizó la configuración institucional','CARACOLI GLOBAL SCHOOL','Configuración', now() - interval '15 days'),
 ('a2222222-2222-4222-8222-222222222222','creó el evento','Semana de la Familia','Evento', now() - interval '5 days')
on conflict do nothing;

-- Notificaciones
insert into public.notifications (id, title, detail, audience_all, audience_users, created_at) values
 ('f0000001-0001-4001-8001-000000000001','Nuevo evento publicado','Ana Martínez publicó Feria Científica 2026', true,'[]'::jsonb, now() - interval '19 days'),
 ('f0000001-0001-4001-8001-000000000002','Nuevo evento publicado','Marta Peña publicó Graduación Sexto Grado', true,'[]'::jsonb, now() - interval '34 days'),
 ('f0000001-0001-4001-8001-000000000003','Calendario institucional actualizado','Marta Peña agregó "Simulacro de evacuación"', true,'[]'::jsonb, now() - interval '8 days'),
 ('f0000001-0001-4001-8001-000000000004','Fecha límite próxima','Material de apoyo — faltan 3 días', false,
  jsonb_build_array('a4444444-4444-4444-8444-444444444444','a1111111-1111-4111-8111-111111111111'), now() - interval '1 day'),
 ('f0000001-0001-4001-8001-000000000005','Fecha límite vencida','Convocatoria a las familias venció hace 2 días', false,
  jsonb_build_array('a8888888-8888-4888-8888-888888888888','a1111111-1111-4111-8111-111111111111'), now() - interval '2 hours')
on conflict (id) do nothing;
