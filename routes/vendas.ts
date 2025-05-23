import { PrismaClient, Tipos } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'


const prisma = new PrismaClient()

const router = Router()

const vendaSchema = z.object({
  alunoId: z.number(),
  produtoId: z.number(),
  quant: z.number()
})

router.get("/", async (req, res) => {
  try {
    const vendas = await prisma.venda.findMany({
      include: {
        aluno: true,
        produto: true,
      }
    })
    res.status(200).json(vendas)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

router.post("/", async (req, res) => {

  const valida = vendaSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const { alunoId, produtoId, quant } = valida.data

  //pesquisa para obter registro do aluno (recebe-se apenas id)
  const dadoAluno = await prisma.aluno.findUnique({
    where: { id: alunoId}
  })

  const dadoProduto = await prisma.produto.findUnique({
    where: { id: produtoId}
  })


  if (!dadoAluno) {
    res.status(400).json({ erro: "Erro... Codigo do aluno inválido" })
    return
  }

  if (!dadoProduto) {
    res.status(400).json({ erro: "Erro... Codigo do produto inválido" })
    return
  }

  if (dadoProduto.quant < quant) {
    res.status(400).json({ erro: "Erro... não há estoque disponível para realizar a venda." })
    return
  }

  if (quant * Number(dadoProduto.preco) > Number(dadoAluno.saldo)) {
    res.status(400).json({ erro: "Erro... Saldo do aluno insuficiente." })
    return
  }

  const subtotal = quant * Number(dadoProduto.preco)

  try {
    const [venda, aluno, produto] = await prisma.$transaction([
      prisma.venda.create({ 
        data: { alunoId, produtoId, quant, preco: Number(dadoProduto.preco) } 
      }),
      prisma.aluno.update({
        where: { id: alunoId },
        data: { saldo: { decrement: subtotal} }
      }),
      prisma.produto.update({
        where: { id: produtoId },
        data: { quant: { decrement: quant} }
      })])
    res.status(201).json({ venda, aluno })
  } catch (error) {
    res.status(400).json({ error })
  }
})

router.delete("/:id", async (req, res) => {
  const { id } = req.params

  try {

    const vendaExcluida = await prisma.venda.findUnique({ where: { id: Number(id) } })

    const [venda, aluno, produto] = await prisma.$transaction([
      prisma.venda.delete({ where: { id: Number(id) } }),
      prisma.aluno.update({
        where: { id: vendaExcluida?.alunoId },
        data: { saldo: { increment: vendaExcluida?.preco } }
      }),
      prisma.produto.update({
        where: { id: vendaExcluida?.produtoId },
        data: { quant: { increment: vendaExcluida?.quant } }
      })
    ])

    res.status(200).json({ venda, aluno, produto })
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

export default router
