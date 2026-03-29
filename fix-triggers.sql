CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_checklist_modelos_atualizado_em') THEN
    CREATE TRIGGER trg_checklist_modelos_atualizado_em BEFORE UPDATE ON checklist_modelos FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_checklist_execucoes_atualizado_em') THEN
    CREATE TRIGGER trg_checklist_execucoes_atualizado_em BEFORE UPDATE ON checklist_execucoes FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_empresas_atualizado_em') THEN
    CREATE TRIGGER trg_empresas_atualizado_em BEFORE UPDATE ON empresas FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_usuarios_atualizado_em') THEN
    CREATE TRIGGER trg_usuarios_atualizado_em BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_condominios_atualizado_em') THEN
    CREATE TRIGGER trg_condominios_atualizado_em BEFORE UPDATE ON condominios FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_visitas_atualizado_em') THEN
    CREATE TRIGGER trg_visitas_atualizado_em BEFORE UPDATE ON visitas FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_checklist_templates_atualizado_em') THEN
    CREATE TRIGGER trg_checklist_templates_atualizado_em BEFORE UPDATE ON checklist_templates FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pendencias_atualizado_em') THEN
    CREATE TRIGGER trg_pendencias_atualizado_em BEFORE UPDATE ON pendencias FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_vistorias_livres_atualizado_em') THEN
    CREATE TRIGGER trg_vistorias_livres_atualizado_em BEFORE UPDATE ON vistorias_livres FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
  END IF;
END $$;
