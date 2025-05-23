import { PrismaClient, Tipos } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import nodemailer from 'nodemailer'

const prisma = new PrismaClient()

const router = Router()

const depositoSchema = z.object({
  alunoId: z.number(),
  tipo: z.nativeEnum(Tipos),
  valor: z.number()
})

// const transporter = nodemailer.createTransport({
//   host: "sandbox.smtp.mailtrap.io",
//   port: 587,
//   secure: false, // true for 465, false for other ports
//   auth: {
//     user: "c63636d740b3f9",
//     pass: "2f7682b7e3f7ef",
//   },
// });



// async function enviaEmail(email: string, cliente: string, candidata: string) {
//   let mensagem = '<h2>Concurso Rainha da Fenadoce 2025</h2>'
//   mensagem += `<h3>Estimado cliente ${cliente}</h3>`
//   mensagem += `<h3>Obrigado por votar na candidata ${candidata}</h3>`

//   const info = await transporter.sendMail({
//     from: 'Concurso Rainha da Fenadoce <rainha@gmail.email>',
//     to: email,
//     subject: "Voto no Concurso",
//     text: "Obrigado por votar...", // plain‑text body
//     html: mensagem, // HTML body
//   });

//   console.log("Message sent:", info.messageId);
  
// }

router.get("/", async (req, res) => {
  try {
    const depositos = await prisma.deposito.findMany({
      include: {
        aluno: true,
      }
    })
    res.status(200).json(depositos)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

router.post("/", async (req, res) => {

  const valida = depositoSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const { alunoId, tipo, valor } = valida.data

  //pesquisa para obter registro do aluno (recebe-se apenas id)
  const dadoAluno = await prisma.aluno.findUnique({
    where: { id: alunoId}
  })

  if (!dadoAluno) {
    res.status(400).json({ erro: "Erro... Codigo do aluno inválido" })
    return
  }

  try {
    const [deposito, aluno] = await prisma.$transaction([
      prisma.deposito.create({ 
        data: { alunoId, tipo, valor } 
      }),
      prisma.aluno.update({
        where: { id: alunoId },
        data: { saldo: { increment: valor } }
      })])
    res.status(201).json({ deposito, aluno })
  } catch (error) {
    res.status(400).json({ error })
  }
})

router.delete("/:id", async (req, res) => {
  const { id } = req.params

  try {

    const depositoExcluido = await prisma.deposito.findUnique({ where: { id: Number(id) } })

    const [deposito, aluno] = await prisma.$transaction([
      prisma.deposito.delete({ where: { id: Number(id) } }),
      prisma.aluno.update({
        where: { id: depositoExcluido?.alunoId },
        data: { saldo: { decrement: depositoExcluido?.valor } }
      })])

    res.status(200).json({ deposito, aluno })
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

export default router
