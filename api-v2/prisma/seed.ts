import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const empresa = await prisma.empresa.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: { id: '00000000-0000-0000-0000-000000000001', nome: 'Empresa Demo' },
  })

  const senhaHash = await bcrypt.hash('admin123', 10)
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      empresaId: empresa.id,
      nome: 'Admin Demo',
      email: 'admin@demo.com',
      senhaHash,
      role: 'admin',
    },
  })

  const vistoriadorHash = await bcrypt.hash('123456', 10)
  await prisma.usuario.upsert({
    where: { email: 'vistoriador@demo.com' },
    update: {},
    create: {
      empresaId: empresa.id,
      nome: 'Vistoriador Demo',
      email: 'vistoriador@demo.com',
      senhaHash: vistoriadorHash,
      role: 'vistoriador',
    },
  })

  const cat = await prisma.categoria.create({
    data: { empresaId: empresa.id, nome: 'Áreas Comuns', ordem: 1 },
  })

  await prisma.pergunta.createMany({
    data: [
      { empresaId: empresa.id, categoriaId: cat.id, texto: 'O hall de entrada está limpo?', ordem: 1 },
      { empresaId: empresa.id, categoriaId: cat.id, texto: 'A iluminação está funcionando?', ordem: 2 },
      { empresaId: empresa.id, categoriaId: cat.id, texto: 'Os extintores estão dentro da validade?', ordem: 3 },
    ],
  })

  console.log('Seed concluído. Login admin: admin@demo.com / admin123')
  console.log('Empresa ID:', empresa.id, '| Admin ID:', admin.id)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
