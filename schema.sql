-- X Vistoria Condominial — PostgreSQL Schema
-- Version 1.0 — 2026-03

-- ENUMs
CREATE TYPE role_usuario AS ENUM ('master', 'admin', 'supervisor', 'sindico');
CREATE TYPE status_visita AS ENUM ('nao_iniciada', 'em_andamento', 'pausada', 'aguardando_aprovacao', 'aprovada', 'enviada_sindico', 'concluida');
CREATE TYPE tipo_resposta AS ENUM ('ok', 'nao_ok', 'na', 'observacao');
CREATE TYPE prioridade_pendencia AS ENUM ('baixa', 'media', 'alta', 'urgente');
CREATE TYPE status_pendencia AS ENUM ('aberta', 'em_tratativa', 'resolvida');

-- Empresas (administradoras)
CREATE TABLE empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18) UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  telefone VARCHAR(20),
  logo_url TEXT,
  ativo BOOLEAN DEFAULT true,
  plano VARCHAR(50) DEFAULT 'basico',
  layout_questionario VARCHAR(20) DEFAULT 'quiz',
  assinatura_admin_nome VARCHAR(255),
  assinatura_admin_cargo VARCHAR(100),
  assinatura_admin_documento VARCHAR(50),
  assinatura_admin_img TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Usuários
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  role role_usuario NOT NULL DEFAULT 'supervisor',
  telefone VARCHAR(20),
  avatar_url TEXT,
  ativo BOOLEAN DEFAULT true,
  pode_editar BOOLEAN DEFAULT false,
  pode_excluir BOOLEAN DEFAULT false,
  reset_token VARCHAR(255),
  reset_token_expira TIMESTAMPTZ,
  cargo VARCHAR(100),
  documento VARCHAR(50),
  ultimo_login TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Condomínios
CREATE TABLE condominios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  endereco TEXT,
  cidade VARCHAR(100),
  estado VARCHAR(2),
  cep VARCHAR(10),
  sindico_nome VARCHAR(255),
  sindico_email VARCHAR(255),
  sindico_telefone VARCHAR(20),
  total_unidades INTEGER,
  foto_url TEXT,
  qr_token VARCHAR(12) UNIQUE,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Espaços do condomínio (salão de festas, churrasqueira, etc.)
CREATE TABLE espacos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  qr_token VARCHAR(12) UNIQUE,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Supervisor <-> Condomínio (N:N)
CREATE TABLE supervisor_condominios (
  supervisor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (supervisor_id, condominio_id)
);

-- Categorias de checklist
CREATE TABLE categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  icone VARCHAR(50),
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Perguntas padrão
CREATE TABLE perguntas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  descricao TEXT,
  requer_sim_nao BOOLEAN DEFAULT true,
  requer_foto BOOLEAN DEFAULT false,
  requer_observacao BOOLEAN DEFAULT false,
  requer_avaliacao BOOLEAN DEFAULT false,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Templates de checklist
CREATE TABLE checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Perguntas dentro de um template
CREATE TABLE template_perguntas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  pergunta_id UUID NOT NULL REFERENCES perguntas(id) ON DELETE CASCADE,
  ordem INTEGER DEFAULT 0,
  obrigatoria BOOLEAN DEFAULT true
);

-- Visitas
CREATE TABLE visitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  template_id UUID REFERENCES checklist_templates(id),
  protocolo VARCHAR(6) UNIQUE,
  status status_visita DEFAULT 'nao_iniciada',
  titulo VARCHAR(255),
  observacoes_gerais TEXT,
  localizacao_lat DOUBLE PRECISION,
  localizacao_lng DOUBLE PRECISION,
  iniciada_em TIMESTAMPTZ,
  pausada_em TIMESTAMPTZ,
  finalizada_em TIMESTAMPTZ,
  aprovada_em TIMESTAMPTZ,
  aprovada_por UUID REFERENCES usuarios(id),
  enviada_sindico_em TIMESTAMPTZ,
  pdf_url TEXT,
  selfie_url TEXT,
  identificacao_em TIMESTAMPTZ,
  identificacao_lat DOUBLE PRECISION,
  identificacao_lng DOUBLE PRECISION,
  tempo_total_segundos INTEGER DEFAULT 0,
  visivel_portal BOOLEAN DEFAULT false,
  espaco_id UUID REFERENCES espacos(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Respostas do checklist
CREATE TABLE respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visita_id UUID NOT NULL REFERENCES visitas(id) ON DELETE CASCADE,
  pergunta_id UUID NOT NULL REFERENCES perguntas(id) ON DELETE CASCADE,
  UNIQUE (visita_id, pergunta_id),
  resultado tipo_resposta,
  observacao TEXT,
  audio_url TEXT,
  transcricao_bruta TEXT,
  transcricao_corrigida TEXT,
  avaliacao INTEGER,
  respondido_em TIMESTAMPTZ DEFAULT NOW()
);

-- Fotos das visitas
CREATE TABLE fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visita_id UUID NOT NULL REFERENCES visitas(id) ON DELETE CASCADE,
  resposta_id UUID REFERENCES respostas(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  legenda TEXT,
  tamanho_bytes INTEGER,
  localizacao_lat DOUBLE PRECISION,
  localizacao_lng DOUBLE PRECISION,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Pendências identificadas
CREATE TABLE pendencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visita_id UUID NOT NULL REFERENCES visitas(id) ON DELETE CASCADE,
  resposta_id UUID REFERENCES respostas(id),
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  prioridade prioridade_pendencia DEFAULT 'media',
  status status_pendencia DEFAULT 'aberta',
  responsavel VARCHAR(255),
  prazo DATE,
  resolvida_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Mensagens da timeline (admin <-> supervisor em tempo real)
CREATE TABLE mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visita_id UUID NOT NULL REFERENCES visitas(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES usuarios(id),
  texto TEXT NOT NULL,
  lida BOOLEAN DEFAULT false,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Confirmações do síndico
CREATE TABLE confirmacoes_sindico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visita_id UUID NOT NULL REFERENCES visitas(id) ON DELETE CASCADE,
  condominio_id UUID NOT NULL REFERENCES condominios(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  visualizado_em TIMESTAMPTZ,
  confirmado_em TIMESTAMPTZ,
  comentario TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Vistoria Livre (inspeção livre / free-form)
CREATE TABLE vistorias_livres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  titulo VARCHAR(255),
  status VARCHAR(20) DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'concluida', 'enviada')),
  localizacao_lat DOUBLE PRECISION,
  localizacao_lng DOUBLE PRECISION,
  finalizada_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Itens de uma vistoria livre
CREATE TABLE itens_vistoria_livre (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vistoria_livre_id UUID NOT NULL REFERENCES vistorias_livres(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  foto_url TEXT,
  thumbnail_url TEXT,
  localizacao_lat DOUBLE PRECISION,
  localizacao_lng DOUBLE PRECISION,
  ordem INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Itens de checklist configurados pelo admin (modelo)
CREATE TABLE checklist_livre_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CHECKLIST AVULSO (standalone checklist)
-- ============================================================

-- Modelos de checklist (templates reutilizáveis)
CREATE TABLE checklist_modelos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  criado_por UUID NOT NULL REFERENCES usuarios(id),
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Itens do modelo
CREATE TABLE checklist_modelo_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id UUID NOT NULL REFERENCES checklist_modelos(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  ordem INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Execuções (cada vez que alguém faz um checklist)
CREATE TABLE checklist_execucoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  modelo_id UUID REFERENCES checklist_modelos(id),
  executor_id UUID NOT NULL REFERENCES usuarios(id),
  titulo VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'em_andamento' CHECK (status IN ('em_andamento','concluida')),
  selfie_url TEXT,
  local_nome VARCHAR(255),
  inicio_lat DOUBLE PRECISION,
  inicio_lng DOUBLE PRECISION,
  inicio_endereco TEXT,
  fim_lat DOUBLE PRECISION,
  fim_lng DOUBLE PRECISION,
  fim_endereco TEXT,
  iniciado_em TIMESTAMPTZ DEFAULT NOW(),
  finalizado_em TIMESTAMPTZ,
  observacao TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Itens da execução
CREATE TABLE checklist_execucao_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execucao_id UUID NOT NULL REFERENCES checklist_execucoes(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  ordem INTEGER DEFAULT 0,
  conforme BOOLEAN,
  problema_descricao TEXT,
  problema_foto_url TEXT,
  problema_foto_thumb TEXT,
  verificado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_checklist_modelos_empresa ON checklist_modelos(empresa_id);
CREATE INDEX idx_checklist_modelo_itens_modelo ON checklist_modelo_itens(modelo_id);
CREATE INDEX idx_checklist_execucoes_empresa ON checklist_execucoes(empresa_id);
CREATE INDEX idx_checklist_execucoes_executor ON checklist_execucoes(executor_id);
CREATE INDEX idx_checklist_execucoes_modelo ON checklist_execucoes(modelo_id);
CREATE INDEX idx_checklist_execucao_itens_execucao ON checklist_execucao_itens(execucao_id);

-- Índices de performance
CREATE INDEX idx_visitas_empresa ON visitas(empresa_id);
CREATE INDEX idx_visitas_supervisor ON visitas(supervisor_id);
CREATE INDEX idx_visitas_condominio ON visitas(condominio_id);
CREATE INDEX idx_visitas_status ON visitas(status);
CREATE INDEX idx_visitas_protocolo ON visitas(protocolo);
CREATE INDEX idx_respostas_visita ON respostas(visita_id);
CREATE INDEX idx_fotos_visita ON fotos(visita_id);
CREATE INDEX idx_pendencias_visita ON pendencias(visita_id);
CREATE INDEX idx_mensagens_visita ON mensagens(visita_id);
CREATE INDEX idx_usuarios_empresa ON usuarios(empresa_id);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_condominios_empresa ON condominios(empresa_id);
CREATE INDEX idx_perguntas_categoria ON perguntas(categoria_id);
CREATE INDEX idx_respostas_pergunta ON respostas(pergunta_id);
CREATE INDEX idx_fotos_resposta ON fotos(resposta_id);
CREATE INDEX idx_pendencias_resposta ON pendencias(resposta_id);
CREATE INDEX idx_template_perguntas_template ON template_perguntas(template_id);
CREATE INDEX idx_template_perguntas_pergunta ON template_perguntas(pergunta_id);
CREATE INDEX idx_mensagens_autor ON mensagens(autor_id);
CREATE INDEX idx_vistorias_livres_empresa ON vistorias_livres(empresa_id);
CREATE INDEX idx_vistorias_livres_supervisor ON vistorias_livres(supervisor_id);
CREATE INDEX idx_vistorias_livres_condominio ON vistorias_livres(condominio_id);
CREATE INDEX idx_itens_vistoria_livre_vl ON itens_vistoria_livre(vistoria_livre_id);
CREATE INDEX idx_checklist_livre_itens_empresa ON checklist_livre_itens(empresa_id);

-- Trigger: atualiza atualizado_em automaticamente
CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_empresas_atualizado_em BEFORE UPDATE ON empresas FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
CREATE TRIGGER trg_usuarios_atualizado_em BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
CREATE TRIGGER trg_condominios_atualizado_em BEFORE UPDATE ON condominios FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
CREATE TRIGGER trg_visitas_atualizado_em BEFORE UPDATE ON visitas FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
CREATE TRIGGER trg_checklist_templates_atualizado_em BEFORE UPDATE ON checklist_templates FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
CREATE TRIGGER trg_pendencias_atualizado_em BEFORE UPDATE ON pendencias FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
CREATE TRIGGER trg_vistorias_livres_atualizado_em BEFORE UPDATE ON vistorias_livres FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
CREATE TRIGGER trg_checklist_modelos_atualizado_em BEFORE UPDATE ON checklist_modelos FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();
CREATE TRIGGER trg_checklist_execucoes_atualizado_em BEFORE UPDATE ON checklist_execucoes FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- Registro de atividades (audit log)
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  usuario_nome VARCHAR(255) NOT NULL,
  usuario_email VARCHAR(255),
  acao VARCHAR(20) NOT NULL CHECK (acao IN ('criar','editar','excluir','login','logout','exportar','compartilhar')),
  entidade VARCHAR(50) NOT NULL,
  entidade_id UUID,
  descricao TEXT NOT NULL,
  detalhes JSONB,
  ip VARCHAR(45),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_empresa ON audit_log(empresa_id);
CREATE INDEX idx_audit_log_usuario ON audit_log(usuario_id);
CREATE INDEX idx_audit_log_acao ON audit_log(acao);
CREATE INDEX idx_audit_log_entidade ON audit_log(entidade);
CREATE INDEX idx_audit_log_criado_em ON audit_log(criado_em DESC);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Empresa master
INSERT INTO empresas (id, nome, email, plano) VALUES
  ('00000000-0000-0000-0000-000000000001', 'X Vistoria', 'contato@xvistoria.com.br', 'master');

-- Usuário master
INSERT INTO usuarios (id, empresa_id, nome, email, senha_hash, role) VALUES
  ('00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   'Master X Vistoria',
   'master@xvistoria.com.br',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGniYGjRSSuNw3TQGFkuGwAL.5i',
   'master');

-- Categorias padrão (11)
INSERT INTO categorias (id, empresa_id, nome, icone, ordem) VALUES
  ('10000000-0000-0000-0000-000000000001', NULL, 'Portaria e Acesso', 'shield-check', 1),
  ('10000000-0000-0000-0000-000000000002', NULL, 'Áreas Comuns', 'layout', 2),
  ('10000000-0000-0000-0000-000000000003', NULL, 'Segurança e Vigilância', 'eye', 3),
  ('10000000-0000-0000-0000-000000000004', NULL, 'Limpeza e Conservação', 'sparkles', 4),
  ('10000000-0000-0000-0000-000000000005', NULL, 'Instalações Elétricas', 'zap', 5),
  ('10000000-0000-0000-0000-000000000006', NULL, 'Hidráulica e Encanamento', 'droplets', 6),
  ('10000000-0000-0000-0000-000000000007', NULL, 'Elevadores', 'arrow-up-down', 7),
  ('10000000-0000-0000-0000-000000000008', NULL, 'Incêndio e Emergência', 'flame', 8),
  ('10000000-0000-0000-0000-000000000009', NULL, 'Documentação e Contratos', 'file-text', 9),
  ('10000000-0000-0000-0000-000000000010', NULL, 'Funcionários', 'users', 10),
  ('10000000-0000-0000-0000-000000000011', NULL, 'Manutenção Preventiva', 'wrench', 11);

-- Perguntas por categoria (56 total)
-- Portaria e Acesso (5)
INSERT INTO perguntas (categoria_id, texto, ordem) VALUES
  ('10000000-0000-0000-0000-000000000001', 'O portão de entrada está funcionando corretamente?', 1),
  ('10000000-0000-0000-0000-000000000001', 'O interfone/videoporteiro está operacional?', 2),
  ('10000000-0000-0000-0000-000000000001', 'O controle de acesso de visitantes está sendo feito adequadamente?', 3),
  ('10000000-0000-0000-0000-000000000001', 'A iluminação da portaria está adequada?', 4),
  ('10000000-0000-0000-0000-000000000001', 'O porteiro está uniformizado e no posto?', 5);

-- Áreas Comuns (5)
INSERT INTO perguntas (categoria_id, texto, ordem) VALUES
  ('10000000-0000-0000-0000-000000000002', 'A piscina está limpa e com química em dia?', 1),
  ('10000000-0000-0000-0000-000000000002', 'O salão de festas está organizado e sem avarias?', 2),
  ('10000000-0000-0000-0000-000000000002', 'A academia está com equipamentos funcionando?', 3),
  ('10000000-0000-0000-0000-000000000002', 'O playground está em boas condições e seguro?', 4),
  ('10000000-0000-0000-0000-000000000002', 'As garagens estão organizadas e sinalizadas?', 5);

-- Segurança e Vigilância (5)
INSERT INTO perguntas (categoria_id, texto, ordem) VALUES
  ('10000000-0000-0000-0000-000000000003', 'As câmeras de segurança estão funcionando?', 1),
  ('10000000-0000-0000-0000-000000000003', 'O DVR/NVR está gravando normalmente?', 2),
  ('10000000-0000-0000-0000-000000000003', 'As cercas elétricas ou alarimes estão ativos?', 3),
  ('10000000-0000-0000-0000-000000000003', 'Os pontos cegos estão identificados e comunicados?', 4),
  ('10000000-0000-0000-0000-000000000003', 'O livro de ocorrências está sendo preenchido?', 5);

-- Limpeza e Conservação (5)
INSERT INTO perguntas (categoria_id, texto, ordem) VALUES
  ('10000000-0000-0000-0000-000000000004', 'Os corredores e halls estão limpos?', 1),
  ('10000000-0000-0000-0000-000000000004', 'A área de lixo está organizada e sem mau cheiro?', 2),
  ('10000000-0000-0000-0000-000000000004', 'Os banheiros de uso comum estão limpos e abastecidos?', 3),
  ('10000000-0000-0000-0000-000000000004', 'As paredes e pisos estão sem pichação ou danos?', 4),
  ('10000000-0000-0000-0000-000000000004', 'O jardim e paisagismo estão conservados?', 5);

-- Instalações Elétricas (5)
INSERT INTO perguntas (categoria_id, texto, ordem) VALUES
  ('10000000-0000-0000-0000-000000000005', 'O quadro de energia geral está organizado e identificado?', 1),
  ('10000000-0000-0000-0000-000000000005', 'A iluminação das áreas comuns está funcionando?', 2),
  ('10000000-0000-0000-0000-000000000005', 'Há lâmpadas queimadas a substituir?', 3),
  ('10000000-0000-0000-0000-000000000005', 'O gerador (se houver) está em condições de uso?', 4),
  ('10000000-0000-0000-0000-000000000005', 'As tomadas e instalações externas estão seguras?', 5);

-- Hidráulica (5)
INSERT INTO perguntas (categoria_id, texto, ordem) VALUES
  ('10000000-0000-0000-0000-000000000006', 'As caixas d''agua estão limpas e com nível adequado?', 1),
  ('10000000-0000-0000-0000-000000000006', 'Há vazamentos visíveis em tubulações ou registros?', 2),
  ('10000000-0000-0000-0000-000000000006', 'As bombas de água estão funcionando corretamente?', 3),
  ('10000000-0000-0000-0000-000000000006', 'Os ralos e grelhas estão desobstruídos?', 4),
  ('10000000-0000-0000-0000-000000000006', 'O hidrômetro geral está legível e sem avarias?', 5);

-- Elevadores (5)
INSERT INTO perguntas (categoria_id, texto, ordem) VALUES
  ('10000000-0000-0000-0000-000000000007', 'O elevador está em operação normal?', 1),
  ('10000000-0000-0000-0000-000000000007', 'O certificado de manutenção está dentro do prazo?', 2),
  ('10000000-0000-0000-0000-000000000007', 'A iluminação interna do elevador está funcionando?', 3),
  ('10000000-0000-0000-0000-000000000007', 'O alarme e telefone de emergência do elevador funcionam?', 4),
  ('10000000-0000-0000-0000-000000000007', 'As portas do elevador abrem e fecham corretamente?', 5);

-- Incêndio e Emergência (5)
INSERT INTO perguntas (categoria_id, texto, ordem) VALUES
  ('10000000-0000-0000-0000-000000000008', 'Os extintores estão dentro do prazo de validade?', 1),
  ('10000000-0000-0000-0000-000000000008', 'As mangueiras de incêndio estão em bom estado?', 2),
  ('10000000-0000-0000-0000-000000000008', 'As saídas de emergência estão desobstruídas e sinalizadas?', 3),
  ('10000000-0000-0000-0000-000000000008', 'O sistema de sprinklers (se houver) está operacional?', 4),
  ('10000000-0000-0000-0000-000000000008', 'O AVCB está válido e afixado em local visível?', 5);

-- Documentação (5)
INSERT INTO perguntas (categoria_id, texto, ordem) VALUES
  ('10000000-0000-0000-0000-000000000009', 'O alvará de funcionamento está válido?', 1),
  ('10000000-0000-0000-0000-000000000009', 'Os contratos de manutenção estão atualizados?', 2),
  ('10000000-0000-0000-0000-000000000009', 'O seguro do condomínio está vigente?', 3),
  ('10000000-0000-0000-0000-000000000009', 'As atas de assembleia estão arquivadas?', 4),
  ('10000000-0000-0000-0000-000000000009', 'O CNPJ e documentos fiscais estão em ordem?', 5);

-- Funcionários (5)
INSERT INTO perguntas (categoria_id, texto, ordem) VALUES
  ('10000000-0000-0000-0000-000000000010', 'Os funcionários estão uniformizados e identificados?', 1),
  ('10000000-0000-0000-0000-000000000010', 'O escala de trabalho está sendo cumprida?', 2),
  ('10000000-0000-0000-0000-000000000010', 'Os EPIs estão sendo utilizados adequadamente?', 3),
  ('10000000-0000-0000-0000-000000000010', 'O livro ponto está sendo preenchido corretamente?', 4),
  ('10000000-0000-0000-0000-000000000010', 'Há alguma reclamação de funcionário a registrar?', 5);

-- Manutenção Preventiva (6)
INSERT INTO perguntas (categoria_id, texto, ordem) VALUES
  ('10000000-0000-0000-0000-000000000011', 'O cronograma de manutenção preventiva está sendo seguido?', 1),
  ('10000000-0000-0000-0000-000000000011', 'Há serviços pendentes da última vistoria?', 2),
  ('10000000-0000-0000-0000-000000000011', 'A impermeabilização das áreas críticas está em bom estado?', 3),
  ('10000000-0000-0000-0000-000000000011', 'Os portões e grades estão lubrificados e sem ferrugem?', 4),
  ('10000000-0000-0000-0000-000000000011', 'A pintura geral do condomínio está conservada?', 5),
  ('10000000-0000-0000-0000-000000000011', 'Há infiltrações ou rachaduras visíveis a registrar?', 6);
