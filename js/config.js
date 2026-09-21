const PSO_CONFIG = {
  /* ===================== SUPABASE =====================
     El ranking y las cuentas ahora viven en Supabase (Postgres online).
     La web es 100% estática y habla DIRECTO con Supabase:
       - URL       : Project Settings → API → "Project URL"
       - ANON KEY  : Project Settings → API → "anon public" (la "publishable").

     ⚠ Esta anon key es PÚBLICA por diseño (la usa el front). Es SEGURA
       siempre que el ranking esté protegido con Row Level Security (RLS),
       cuyo SQL está en SUPABASE.sql. Si pegás mal RLS, cualquiera con la
       anon key puede leer/escribir.
     ⚠ NUNCA pongas acá la "service_role / secret" key: es de acceso total
       y NO debe estar en el front ni en el repo. Guardála solo en el server
       (que no usamos más) o rótala de una.
  ==================================================================== */
  SUPABASE_URL: "https://magestcsmgxegjbjcxef.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_ypyO6Mq-j6FX9S_klCcvwA_izVw6NAg",

  /* ============ ADMINISTRACIÓN (panel) ============
     Ya NO hay usuario/contraseña fijos acá (antes cualquiera podía verlos
     con "Ver código fuente" y editar la web entera). El panel admin ahora
     entra con una cuenta REAL de Supabase Auth marcada como admin.
     Ver "PANEL DE ADMINISTRACIÓN" en el README para crearla. */

  /* ============ API (ya no se usa; se dejó por compatibilidad) ============ */
  API_URL: ""
};
