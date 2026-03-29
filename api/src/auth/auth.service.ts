import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SQL } from '../database/database.module';
import { AuditService } from '../audit/audit.service';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(SQL) private readonly sql: any,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  async login(email: string, senha: string) {
    const [usuario] = await this.sql`
      SELECT u.*, e.nome as empresa_nome
      FROM usuarios u
      LEFT JOIN empresas e ON e.id = u.empresa_id
      WHERE u.email = ${email} AND u.ativo = true
    `;

    if (!usuario) {
      this.logger.warn(`Login falhou: email não encontrado (${email})`);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const senhaOk = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaOk) {
      this.logger.warn(`Login falhou: senha incorreta (${email})`);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    await this.sql`
      UPDATE usuarios SET ultimo_login = NOW() WHERE id = ${usuario.id}
    `;

    const payload = {
      sub: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      role: usuario.role,
      empresa_id: usuario.empresa_id,
      pode_editar: usuario.pode_editar || false,
      pode_excluir: usuario.pode_excluir || false,
    };

    this.logger.log(`Login bem-sucedido: ${email} (${usuario.role})`);

    this.auditService.registrar({
      empresa_id: usuario.empresa_id,
      usuario_id: usuario.id,
      usuario_nome: usuario.nome,
      usuario_email: usuario.email,
      acao: 'login',
      entidade: 'sistema',
      descricao: `Login realizado por ${usuario.nome}`,
    });

    return {
      access_token: this.jwtService.sign(payload),
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        empresa_id: usuario.empresa_id,
        empresa_nome: usuario.empresa_nome,
        avatar_url: usuario.avatar_url,
        pode_editar: usuario.pode_editar || false,
        pode_excluir: usuario.pode_excluir || false,
      },
    };
  }

  async me(userId: string) {
    const [usuario] = await this.sql`
      SELECT u.id, u.nome, u.email, u.role, u.telefone, u.avatar_url,
             u.empresa_id, u.pode_editar, u.pode_excluir,
             e.nome as empresa_nome, e.logo_url as empresa_logo
      FROM usuarios u
      LEFT JOIN empresas e ON e.id = u.empresa_id
      WHERE u.id = ${userId} AND u.ativo = true
    `;
    if (!usuario) throw new UnauthorizedException();
    return usuario;
  }

  async register(data: {
    empresa_nome: string;
    cnpj?: string;
    nome: string;
    email: string;
    senha: string;
    telefone?: string;
  }) {
    const [existing] = await this.sql`
      SELECT id FROM usuarios WHERE email = ${data.email}
    `;
    if (existing) {
      throw new ConflictException('Email já cadastrado');
    }

    if (data.cnpj) {
      const [existingEmpresa] = await this.sql`
        SELECT id FROM empresas WHERE cnpj = ${data.cnpj}
      `;
      if (existingEmpresa) {
        throw new ConflictException('CNPJ já cadastrado');
      }
    }

    const senhaHash = await bcrypt.hash(data.senha, 12);

    const [empresa] = await this.sql`
      INSERT INTO empresas (nome, cnpj, email, telefone)
      VALUES (${data.empresa_nome}, ${data.cnpj || null}, ${data.email}, ${data.telefone || null})
      RETURNING id
    `;

    const [usuario] = await this.sql`
      INSERT INTO usuarios (empresa_id, nome, email, senha_hash, role, telefone, pode_editar, pode_excluir)
      VALUES (${empresa.id}, ${data.nome}, ${data.email}, ${senhaHash}, 'admin', ${data.telefone || null}, true, true)
      RETURNING id, nome, email, role, empresa_id
    `;

    // Criar condomínio de exemplo
    const [condExemplo] = await this.sql`
      INSERT INTO condominios (empresa_id, nome, endereco, cidade, estado, cep, sindico_nome, sindico_email, sindico_telefone, total_unidades)
      VALUES (
        ${empresa.id},
        'Condomínio Exemplo',
        'Rua das Flores, 123 - Centro',
        'São Paulo',
        'SP',
        '01001-000',
        'João da Silva',
        'sindico@exemplo.com',
        '(11) 99999-0000',
        48
      )
      RETURNING id
    `;

    // Criar template de exemplo com perguntas da categoria "Portaria e Acesso"
    const [templateExemplo] = await this.sql`
      INSERT INTO checklist_templates (empresa_id, nome, descricao)
      VALUES (${empresa.id}, 'Checklist Portaria (Exemplo)', 'Template de exemplo com perguntas de Portaria e Acesso')
      RETURNING id
    `;

    const perguntasPortaria = await this.sql`
      SELECT id, ordem FROM perguntas
      WHERE categoria_id = '10000000-0000-0000-0000-000000000001' AND ativo = true
      ORDER BY ordem
    `;

    for (const p of perguntasPortaria) {
      await this.sql`
        INSERT INTO template_perguntas (template_id, pergunta_id, ordem, obrigatoria)
        VALUES (${templateExemplo.id}, ${p.id}, ${p.ordem}, true)
      `;
    }

    // Criar vistoria de exemplo concluída
    const protocolo = String(Math.floor(100000 + Math.random() * 900000));
    const agora = new Date();

    const [vistoriaExemplo] = await this.sql`
      INSERT INTO visitas (empresa_id, condominio_id, supervisor_id, template_id, protocolo, status, titulo, iniciada_em, finalizada_em, aprovada_em, aprovada_por, tempo_total_segundos)
      VALUES (
        ${empresa.id},
        ${condExemplo.id},
        ${usuario.id},
        ${templateExemplo.id},
        ${protocolo},
        'concluida',
        'Vistoria de Exemplo — Portaria',
        ${new Date(agora.getTime() - 3600000)},
        ${new Date(agora.getTime() - 1800000)},
        ${agora},
        ${usuario.id},
        1800
      )
      RETURNING id
    `;

    // Inserir respostas de exemplo para cada pergunta
    const respostasExemplo = ['ok', 'ok', 'nao_ok', 'ok', 'ok'];
    const observacoesExemplo = [
      null,
      null,
      'Interfone do bloco B com defeito intermitente. Necessário acionar assistência técnica.',
      null,
      null,
    ];

    for (let i = 0; i < perguntasPortaria.length; i++) {
      await this.sql`
        INSERT INTO respostas (visita_id, pergunta_id, resultado, observacao)
        VALUES (
          ${vistoriaExemplo.id},
          ${perguntasPortaria[i].id},
          ${respostasExemplo[i] || 'ok'},
          ${observacoesExemplo[i] || null}
        )
      `;
    }

    // Criar uma pendência de exemplo na resposta "não ok"
    const [respostaNaoOk] = await this.sql`
      SELECT r.id FROM respostas r
      JOIN perguntas p ON p.id = r.pergunta_id
      WHERE r.visita_id = ${vistoriaExemplo.id} AND r.resultado = 'nao_ok'
      LIMIT 1
    `;

    if (respostaNaoOk) {
      await this.sql`
        INSERT INTO pendencias (visita_id, resposta_id, titulo, descricao, prioridade, status, responsavel, prazo)
        VALUES (
          ${vistoriaExemplo.id},
          ${respostaNaoOk.id},
          'Reparo no interfone — Bloco B',
          'Interfone do bloco B apresenta defeito intermitente. Acionar assistência técnica autorizada para diagnóstico e reparo.',
          'media',
          'aberta',
          'Administração',
          ${new Date(agora.getTime() + 7 * 24 * 3600000)}
        )
      `;
    }

    // Criar funcionário (supervisor) de exemplo
    const senhaFuncionario = await bcrypt.hash('123456', 12);
    const [funcionario] = await this.sql`
      INSERT INTO usuarios (empresa_id, nome, email, senha_hash, role, telefone, pode_editar, pode_excluir, cargo)
      VALUES (
        ${empresa.id},
        'Carlos Souza',
        ${'supervisor_' + empresa.id.substring(0, 8) + '@exemplo.com'},
        ${senhaFuncionario},
        'supervisor',
        '(11) 98888-0000',
        false,
        false,
        'Vistoriador'
      )
      RETURNING id
    `;

    // Vincular funcionário ao condomínio de exemplo
    await this.sql`
      INSERT INTO supervisor_condominios (condominio_id, supervisor_id)
      VALUES (${condExemplo.id}, ${funcionario.id})
      ON CONFLICT DO NOTHING
    `;

    this.logger.log(`Nova empresa cadastrada: ${data.empresa_nome} (${data.email})`);

    const payload = {
      sub: usuario.id,
      email: usuario.email,
      role: usuario.role,
      empresa_id: usuario.empresa_id,
      pode_editar: true,
      pode_excluir: true,
    };

    return {
      access_token: this.jwtService.sign(payload),
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        empresa_id: usuario.empresa_id,
        empresa_nome: data.empresa_nome,
        avatar_url: null,
        pode_editar: true,
        pode_excluir: true,
      },
    };
  }

  async esqueciSenha(email: string) {
    const [usuario] = await this.sql`
      SELECT id FROM usuarios WHERE email = ${email} AND ativo = true
    `;

    // Always return success to prevent email enumeration
    if (!usuario) {
      this.logger.warn(`Esqueci senha: email não encontrado (${email})`);
      return { message: 'Se o email existir, você receberá um link de redefinição.' };
    }

    const token = randomUUID();
    const expira = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.sql`
      UPDATE usuarios
      SET reset_token = ${token}, reset_token_expira = ${expira}
      WHERE id = ${usuario.id}
    `;

    // NOTE: Email service (SES) integration pending
    this.logger.log(`Reset token gerado para ${email}`);

    return { message: 'Se o email existir, você receberá um link de redefinição.' };
  }

  async redefinirSenha(token: string, novaSenha: string) {
    const [usuario] = await this.sql`
      SELECT id FROM usuarios
      WHERE reset_token = ${token}
        AND reset_token_expira > NOW()
        AND ativo = true
    `;

    if (!usuario) {
      throw new BadRequestException('Token inválido ou expirado');
    }

    const senhaHash = await bcrypt.hash(novaSenha, 12);

    await this.sql`
      UPDATE usuarios
      SET senha_hash = ${senhaHash}, reset_token = NULL, reset_token_expira = NULL
      WHERE id = ${usuario.id}
    `;

    this.logger.log(`Senha redefinida com sucesso (usuario ${usuario.id})`);

    return { message: 'Senha redefinida com sucesso' };
  }
}
